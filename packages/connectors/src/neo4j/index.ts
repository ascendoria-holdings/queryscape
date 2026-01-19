/**
 * Neo4j connector
 */

import type {
  Query,
  QueryResult,
  GraphData,
  GraphNode,
  GraphEdge,
  NodeId,
  Properties,
} from "@queryscape/core";
import { QueryError, ConnectionError, AuthError } from "@queryscape/core";

import {
  BaseConnector,
  type ConnectorCapabilities,
  type BaseConnectorConfig,
} from "../interface.js";

/** Neo4j connector configuration */
export interface Neo4jConnectorConfig extends BaseConnectorConfig {
  /** Connection URI (e.g., neo4j://localhost:7687) */
  uri: string;
  /** Username */
  username: string;
  /** Password */
  password: string;
  /** Database name (optional, defaults to neo4j) */
  database?: string;
  /** Connection pool size */
  maxConnectionPoolSize?: number;
}

/** Neo4j driver types (imported dynamically) */
interface Neo4jDriver {
  session(config?: { database?: string }): Neo4jSession;
  close(): Promise<void>;
  verifyConnectivity(): Promise<void>;
}

interface Neo4jSession {
  run(query: string, params?: Record<string, unknown>): Promise<Neo4jResult>;
  close(): Promise<void>;
}

interface Neo4jResult {
  records: Neo4jRecord[];
}

interface Neo4jRecord {
  get(key: string): unknown;
  keys: string[];
}

/** Neo4j connector implementation */
export class Neo4jConnector extends BaseConnector {
  private driver: Neo4jDriver | null = null;
  private readonly config: Neo4jConnectorConfig;

  constructor(config: Neo4jConnectorConfig) {
    super(config);
    this.config = config;
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      connectorType: "neo4j",
      supportedQueryTypes: [
        "getNode",
        "getNeighbors",
        "findNodes",
        "findPath",
        "expandNode",
        "search",
        "raw",
      ],
      supportsFullTextSearch: true,
      supportsPagination: true,
      supportsRawQueries: true,
      maxPageSize: 1000,
    };
  }

  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid requiring neo4j-driver when not used
      const neo4j = await import("neo4j-driver");

      this.driver = neo4j.default.driver(
        this.config.uri,
        neo4j.default.auth.basic(this.config.username, this.config.password),
        {
          maxConnectionPoolSize: this.config.maxConnectionPoolSize ?? 50,
        }
      ) as unknown as Neo4jDriver;

      await this.driver.verifyConnectivity();
      this.connected = true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("authentication")) {
          throw new AuthError(`Neo4j authentication failed: ${error.message}`);
        }
        throw new ConnectionError(
          `Failed to connect to Neo4j: ${error.message}`,
          this.config.uri
        );
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      this.connected = false;
    }
  }

  async executeQuery(query: Query): Promise<QueryResult> {
    this.ensureConnected();
    this.checkQuerySupported(query.type);

    const startTime = Date.now();

    try {
      let result: GraphData;

      switch (query.type) {
        case "getNode":
          result = await this.executeGetNode(query.nodeId);
          break;
        case "getNeighbors":
          result = await this.executeGetNeighbors(
            query.nodeId,
            query.direction,
            query.edgeTypes,
            query.pagination?.limit ?? 100
          );
          break;
        case "findNodes":
          result = await this.executeFindNodes(
            query.labelFilter,
            query.propertyFilters,
            query.pagination?.limit ?? 100
          );
          break;
        case "findPath":
          result = await this.executeFindPath(
            query.sourceId,
            query.targetId,
            query.maxLength ?? 10
          );
          break;
        case "expandNode":
          result = await this.executeExpandNode(
            query.nodeId,
            query.direction,
            query.depth ?? 1,
            query.pagination?.limit ?? 100
          );
          break;
        case "search":
          result = await this.executeSearch(
            query.text,
            query.labels,
            query.pagination?.limit ?? 100
          );
          break;
        case "raw":
          result = await this.executeRaw(query.query, query.parameters);
          break;
        default:
          result = { nodes: [], edges: [] };
      }

      return {
        data: result,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          totalAvailable: null,
          truncated: false,
          cursor: null,
        },
      };
    } catch (error) {
      throw new QueryError(
        `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
        query.type
      );
    }
  }

  private async runCypher(
    cypher: string,
    params?: Record<string, unknown>
  ): Promise<Neo4jResult> {
    const session = this.driver!.session({ database: this.config.database });
    try {
      return await session.run(cypher, params);
    } finally {
      await session.close();
    }
  }

  private async executeGetNode(nodeId: NodeId): Promise<GraphData> {
    const result = await this.runCypher(
      "MATCH (n) WHERE elementId(n) = $nodeId OR n.id = $nodeId RETURN n",
      { nodeId }
    );

    const nodes = result.records.map((r) => this.recordToNode(r.get("n")));
    return { nodes, edges: [] };
  }

  private async executeGetNeighbors(
    nodeId: NodeId,
    direction: "outgoing" | "incoming" | "both",
    edgeTypes?: readonly string[],
    limit?: number
  ): Promise<GraphData> {
    const typeFilter = edgeTypes?.length ? `:${edgeTypes.join("|")}` : "";
    const directionPattern =
      direction === "outgoing"
        ? `-[r${typeFilter}]->`
        : direction === "incoming"
          ? `<-[r${typeFilter}]-`
          : `-[r${typeFilter}]-`;

    const cypher = `
      MATCH (n)${directionPattern}(m)
      WHERE elementId(n) = $nodeId OR n.id = $nodeId
      RETURN n, r, m
      LIMIT $limit
    `;

    const result = await this.runCypher(cypher, { nodeId, limit: limit ?? 100 });

    const nodeMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    for (const record of result.records) {
      const n = this.recordToNode(record.get("n"));
      const m = this.recordToNode(record.get("m"));
      const r = this.recordToEdge(record.get("r"), n.id, m.id);

      nodeMap.set(n.id, n);
      nodeMap.set(m.id, m);
      edges.push(r);
    }

    return { nodes: Array.from(nodeMap.values()), edges };
  }

  private async executeFindNodes(
    labelFilter?: { labels: readonly string[]; mode: "any" | "all" },
    propertyFilters?: readonly { key: string; op: string; value: unknown }[],
    limit?: number
  ): Promise<GraphData> {
    let labelClause = "";
    if (labelFilter?.labels.length) {
      if (labelFilter.mode === "all") {
        labelClause = labelFilter.labels.map((l) => `:${l}`).join("");
      } else {
        labelClause = `:${labelFilter.labels[0]}`;
      }
    }

    const whereConditions: string[] = [];
    const params: Record<string, unknown> = { limit: limit ?? 100 };

    if (propertyFilters) {
      propertyFilters.forEach((filter, idx) => {
        const paramName = `prop${idx}`;
        params[paramName] = filter.value;

        switch (filter.op) {
          case "eq":
            whereConditions.push(`n.${filter.key} = $${paramName}`);
            break;
          case "neq":
            whereConditions.push(`n.${filter.key} <> $${paramName}`);
            break;
          case "contains":
            whereConditions.push(`n.${filter.key} CONTAINS $${paramName}`);
            break;
          case "startsWith":
            whereConditions.push(`n.${filter.key} STARTS WITH $${paramName}`);
            break;
        }
      });
    }

    const whereClause = whereConditions.length
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    const cypher = `MATCH (n${labelClause}) ${whereClause} RETURN n LIMIT $limit`;
    const result = await this.runCypher(cypher, params);

    const nodes = result.records.map((r) => this.recordToNode(r.get("n")));
    return { nodes, edges: [] };
  }

  private async executeFindPath(
    sourceId: NodeId,
    targetId: NodeId,
    maxLength: number
  ): Promise<GraphData> {
    const cypher = `
      MATCH path = shortestPath((source)-[*1..${maxLength}]-(target))
      WHERE (elementId(source) = $sourceId OR source.id = $sourceId)
        AND (elementId(target) = $targetId OR target.id = $targetId)
      RETURN nodes(path) as nodes, relationships(path) as rels
      LIMIT 1
    `;

    const result = await this.runCypher(cypher, { sourceId, targetId });

    if (result.records.length === 0) {
      return { nodes: [], edges: [] };
    }

    const record = result.records[0]!;
    const rawNodes = record.get("nodes") as unknown[];
    const rawRels = record.get("rels") as unknown[];

    const nodes = rawNodes.map((n) => this.recordToNode(n));
    const edges = rawRels.map((r, idx) =>
      this.recordToEdge(r, nodes[idx]?.id ?? "", nodes[idx + 1]?.id ?? "")
    );

    return { nodes, edges };
  }

  private async executeExpandNode(
    nodeId: NodeId,
    direction: "outgoing" | "incoming" | "both",
    depth: number,
    limit: number
  ): Promise<GraphData> {
    const dirPattern =
      direction === "outgoing"
        ? `-[r*1..${depth}]->`
        : direction === "incoming"
          ? `<-[r*1..${depth}]-`
          : `-[r*1..${depth}]-`;

    const cypher = `
      MATCH path = (start)${dirPattern}(end)
      WHERE elementId(start) = $nodeId OR start.id = $nodeId
      UNWIND nodes(path) as n
      UNWIND relationships(path) as rel
      RETURN DISTINCT n, rel
      LIMIT $limit
    `;

    const result = await this.runCypher(cypher, { nodeId, limit });

    const nodeMap = new Map<string, GraphNode>();
    const edgeMap = new Map<string, GraphEdge>();

    for (const record of result.records) {
      const n = this.recordToNode(record.get("n"));
      nodeMap.set(n.id, n);

      const rel = record.get("rel");
      if (rel) {
        const edge = this.recordToEdge(rel, "", "");
        edgeMap.set(edge.id, edge);
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values()),
    };
  }

  private async executeSearch(
    text: string,
    labels?: readonly string[],
    limit?: number
  ): Promise<GraphData> {
    // Basic search using CONTAINS - for production, use full-text indexes
    const labelClause = labels?.length ? `:${labels[0]}` : "";

    const cypher = `
      MATCH (n${labelClause})
      WHERE any(prop in keys(n) WHERE toString(n[prop]) CONTAINS $text)
      RETURN n
      LIMIT $limit
    `;

    const result = await this.runCypher(cypher, { text, limit: limit ?? 100 });

    const nodes = result.records.map((r) => this.recordToNode(r.get("n")));
    return { nodes, edges: [] };
  }

  private async executeRaw(
    query: string,
    parameters?: Record<string, unknown>
  ): Promise<GraphData> {
    const result = await this.runCypher(query, parameters);

    const nodeMap = new Map<string, GraphNode>();
    const edgeMap = new Map<string, GraphEdge>();

    for (const record of result.records) {
      for (const key of record.keys) {
        const value = record.get(key);
        if (this.isNode(value)) {
          const node = this.recordToNode(value);
          nodeMap.set(node.id, node);
        } else if (this.isRelationship(value)) {
          const edge = this.recordToEdge(value, "", "");
          edgeMap.set(edge.id, edge);
        }
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values()),
    };
  }

  private isNode(value: unknown): boolean {
    return (
      typeof value === "object" &&
      value !== null &&
      "labels" in value &&
      "properties" in value
    );
  }

  private isRelationship(value: unknown): boolean {
    return (
      typeof value === "object" &&
      value !== null &&
      "type" in value &&
      "properties" in value &&
      !("labels" in value)
    );
  }

  private recordToNode(record: unknown): GraphNode {
    const node = record as {
      identity?: { toString(): string };
      elementId?: string;
      labels: string[];
      properties: Properties;
    };

    return {
      id: node.elementId ?? node.identity?.toString() ?? "",
      labels: node.labels,
      properties: node.properties,
    };
  }

  private recordToEdge(
    record: unknown,
    defaultSource: string,
    defaultTarget: string
  ): GraphEdge {
    const rel = record as {
      identity?: { toString(): string };
      elementId?: string;
      type: string;
      properties: Properties;
      start?: { toString(): string };
      end?: { toString(): string };
      startNodeElementId?: string;
      endNodeElementId?: string;
    };

    return {
      id: rel.elementId ?? rel.identity?.toString() ?? "",
      source:
        rel.startNodeElementId ?? rel.start?.toString() ?? defaultSource,
      target: rel.endNodeElementId ?? rel.end?.toString() ?? defaultTarget,
      type: rel.type,
      properties: rel.properties,
    };
  }
}

/** Create Neo4j connector */
export function createNeo4jConnector(
  config: Neo4jConnectorConfig
): Neo4jConnector {
  return new Neo4jConnector(config);
}
