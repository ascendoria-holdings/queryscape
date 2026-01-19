/**
 * Mock connector for testing and demos
 */

import type {
  Query,
  QueryResult,
  GraphData,
  GraphNode,
  GraphEdge,
  NodeId,
  Direction,
} from "@queryscape/core";

import {
  BaseConnector,
  type ConnectorCapabilities,
  type BaseConnectorConfig,
} from "../interface.js";

/** Mock data generator options */
export interface MockDataOptions {
  /** Number of nodes to generate */
  nodeCount: number;
  /** Average edges per node */
  edgesPerNode: number;
  /** Node labels to use */
  labels: string[];
  /** Edge types to use */
  edgeTypes: string[];
  /** Seed for reproducible data */
  seed?: number;
}

/** Default mock data options */
const DEFAULT_MOCK_OPTIONS: MockDataOptions = {
  nodeCount: 100,
  edgesPerNode: 3,
  labels: ["Person", "Company", "Project", "Document"],
  edgeTypes: ["KNOWS", "WORKS_AT", "CREATED", "REFERENCES"],
};

/** Simple seeded random number generator */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  pick<T>(array: readonly T[]): T {
    return array[this.nextInt(array.length)]!;
  }
}

/** Generate mock graph data */
export function generateMockData(options: Partial<MockDataOptions> = {}): GraphData {
  const opts = { ...DEFAULT_MOCK_OPTIONS, ...options };
  const random = new SeededRandom(opts.seed ?? Date.now());

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Generate nodes
  for (let i = 0; i < opts.nodeCount; i++) {
    const label = random.pick(opts.labels);
    nodes.push({
      id: `n${i}`,
      labels: [label],
      properties: {
        name: `${label} ${i}`,
        created: new Date(Date.now() - random.nextInt(365 * 24 * 60 * 60 * 1000)).toISOString(),
        score: random.next(),
        active: random.next() > 0.3,
      },
    });
  }

  // Generate edges
  const totalEdges = opts.nodeCount * opts.edgesPerNode;
  for (let i = 0; i < totalEdges; i++) {
    const sourceIdx = random.nextInt(opts.nodeCount);
    let targetIdx = random.nextInt(opts.nodeCount);

    // Avoid self-loops
    while (targetIdx === sourceIdx) {
      targetIdx = random.nextInt(opts.nodeCount);
    }

    const edgeType = random.pick(opts.edgeTypes);
    const source = `n${sourceIdx}`;
    const target = `n${targetIdx}`;

    edges.push({
      id: `e${i}`,
      source,
      target,
      type: edgeType,
      properties: {
        weight: random.next(),
        since: new Date(Date.now() - random.nextInt(365 * 24 * 60 * 60 * 1000)).toISOString(),
      },
    });
  }

  return { nodes, edges };
}

/** Mock connector configuration */
export interface MockConnectorConfig extends BaseConnectorConfig {
  /** Pre-generated data or options for generating */
  data?: GraphData;
  dataOptions?: Partial<MockDataOptions>;
  /** Simulated latency in ms */
  latencyMs?: number;
}

/** Mock connector implementation */
export class MockConnector extends BaseConnector {
  private data: GraphData;
  private nodeIndex: Map<NodeId, GraphNode>;
  private edgesBySource: Map<NodeId, GraphEdge[]>;
  private edgesByTarget: Map<NodeId, GraphEdge[]>;
  private readonly latencyMs: number;

  constructor(config: MockConnectorConfig = {}) {
    super(config);

    this.data = config.data ?? generateMockData(config.dataOptions);
    this.latencyMs = config.latencyMs ?? 0;

    // Build indices
    this.nodeIndex = new Map(this.data.nodes.map((n) => [n.id, n]));
    this.edgesBySource = new Map();
    this.edgesByTarget = new Map();

    for (const edge of this.data.edges) {
      const sourceEdges = this.edgesBySource.get(edge.source) ?? [];
      sourceEdges.push(edge);
      this.edgesBySource.set(edge.source, sourceEdges);

      const targetEdges = this.edgesByTarget.get(edge.target) ?? [];
      targetEdges.push(edge);
      this.edgesByTarget.set(edge.target, targetEdges);
    }
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      connectorType: "mock",
      supportedQueryTypes: [
        "getNode",
        "getNeighbors",
        "findNodes",
        "findPath",
        "expandNode",
        "search",
        "sample",
      ],
      supportsFullTextSearch: true,
      supportsPagination: true,
      supportsRawQueries: false,
      maxPageSize: 500,
    };
  }

  async connect(): Promise<void> {
    await this.simulateLatency();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    await this.simulateLatency();
    this.connected = false;
  }

  async executeQuery(query: Query): Promise<QueryResult> {
    this.ensureConnected();
    this.checkQuerySupported(query.type);

    const startTime = Date.now();
    await this.simulateLatency();

    let result: GraphData;

    switch (query.type) {
      case "getNode":
        result = this.handleGetNode(query.nodeId);
        break;
      case "getNeighbors":
        result = this.handleGetNeighbors(
          query.nodeId,
          query.direction,
          query.edgeTypes,
          query.pagination?.limit
        );
        break;
      case "findNodes":
        result = this.handleFindNodes(
          query.labelFilter,
          query.propertyFilters,
          query.pagination?.limit
        );
        break;
      case "expandNode":
        result = this.handleExpandNode(
          query.nodeId,
          query.direction,
          query.depth ?? 1,
          query.pagination?.limit
        );
        break;
      case "search":
        result = this.handleSearch(query.text, query.labels, query.pagination?.limit);
        break;
      case "sample":
        result = this.handleSample(query.strategy, query.count, query.startNodeId);
        break;
      case "findPath":
        result = this.handleFindPath(query.sourceId, query.targetId, query.maxLength);
        break;
      default:
        result = { nodes: [], edges: [] };
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      data: result,
      metadata: {
        executionTimeMs,
        totalAvailable: null,
        truncated: false,
        cursor: null,
      },
    };
  }

  private async simulateLatency(): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }
  }

  private handleGetNode(nodeId: NodeId): GraphData {
    const node = this.nodeIndex.get(nodeId);
    return node ? { nodes: [node], edges: [] } : { nodes: [], edges: [] };
  }

  private handleGetNeighbors(
    nodeId: NodeId,
    direction: Direction,
    edgeTypes?: readonly string[],
    limit?: number
  ): GraphData {
    const edges: GraphEdge[] = [];
    const nodeIds = new Set<NodeId>();

    if (direction === "outgoing" || direction === "both") {
      const outEdges = this.edgesBySource.get(nodeId) ?? [];
      for (const edge of outEdges) {
        if (!edgeTypes || edgeTypes.includes(edge.type)) {
          edges.push(edge);
          nodeIds.add(edge.target);
        }
      }
    }

    if (direction === "incoming" || direction === "both") {
      const inEdges = this.edgesByTarget.get(nodeId) ?? [];
      for (const edge of inEdges) {
        if (!edgeTypes || edgeTypes.includes(edge.type)) {
          edges.push(edge);
          nodeIds.add(edge.source);
        }
      }
    }

    const limitedEdges = limit ? edges.slice(0, limit) : edges;
    const limitedNodeIds = new Set(
      limitedEdges.flatMap((e) => [e.source, e.target])
    );

    const nodes = this.data.nodes.filter((n) => limitedNodeIds.has(n.id));

    return { nodes, edges: limitedEdges };
  }

  private handleFindNodes(
    labelFilter?: { labels: readonly string[]; mode: "any" | "all" },
    propertyFilters?: readonly { key: string; op: string; value: unknown }[],
    limit?: number
  ): GraphData {
    let filtered = [...this.data.nodes];

    if (labelFilter) {
      filtered = filtered.filter((n) => {
        if (labelFilter.mode === "all") {
          return labelFilter.labels.every((l) => n.labels.includes(l));
        }
        return labelFilter.labels.some((l) => n.labels.includes(l));
      });
    }

    if (propertyFilters) {
      for (const filter of propertyFilters) {
        filtered = filtered.filter((n) => {
          const value = n.properties[filter.key];
          switch (filter.op) {
            case "eq":
              return value === filter.value;
            case "neq":
              return value !== filter.value;
            case "contains":
              return String(value).includes(String(filter.value));
            default:
              return true;
          }
        });
      }
    }

    const limitedNodes = limit ? filtered.slice(0, limit) : filtered;

    return { nodes: limitedNodes, edges: [] };
  }

  private handleExpandNode(
    nodeId: NodeId,
    direction: Direction,
    depth: number,
    limit?: number
  ): GraphData {
    const visitedNodes = new Set<NodeId>();
    const visitedEdges = new Set<string>();
    const queue: { id: NodeId; depth: number }[] = [{ id: nodeId, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visitedNodes.has(current.id) || current.depth > depth) continue;
      visitedNodes.add(current.id);

      if (limit && visitedNodes.size >= limit) break;

      const neighbors = this.handleGetNeighbors(current.id, direction);

      for (const edge of neighbors.edges) {
        if (!visitedEdges.has(edge.id)) {
          visitedEdges.add(edge.id);
          const nextId = edge.source === current.id ? edge.target : edge.source;
          if (!visitedNodes.has(nextId)) {
            queue.push({ id: nextId, depth: current.depth + 1 });
          }
        }
      }
    }

    const nodes = this.data.nodes.filter((n) => visitedNodes.has(n.id));
    const edges = this.data.edges.filter((e) => visitedEdges.has(e.id));

    return { nodes, edges };
  }

  private handleSearch(
    text: string,
    labels?: readonly string[],
    limit?: number
  ): GraphData {
    const lowerText = text.toLowerCase();

    let filtered = this.data.nodes.filter((n) => {
      const nameMatch = String(n.properties["name"] ?? "")
        .toLowerCase()
        .includes(lowerText);

      const propsMatch = Object.values(n.properties).some((v) =>
        String(v).toLowerCase().includes(lowerText)
      );

      return nameMatch || propsMatch;
    });

    if (labels && labels.length > 0) {
      filtered = filtered.filter((n) =>
        labels.some((l) => n.labels.includes(l))
      );
    }

    const limitedNodes = limit ? filtered.slice(0, limit) : filtered;

    return { nodes: limitedNodes, edges: [] };
  }

  private handleSample(
    strategy: "random" | "randomWalk" | "frontier",
    count: number,
    startNodeId?: NodeId
  ): GraphData {
    switch (strategy) {
      case "random": {
        const shuffled = [...this.data.nodes].sort(() => Math.random() - 0.5);
        const sampledNodes = shuffled.slice(0, count);
        const nodeIds = new Set(sampledNodes.map((n) => n.id));
        const sampledEdges = this.data.edges.filter(
          (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
        );
        return { nodes: sampledNodes, edges: sampledEdges };
      }
      case "randomWalk": {
        if (!startNodeId) {
          startNodeId = this.data.nodes[0]?.id;
        }
        if (!startNodeId) return { nodes: [], edges: [] };

        const visitedNodes = new Set<NodeId>();
        const visitedEdges = new Set<string>();
        let currentNode = startNodeId;

        for (let i = 0; i < count * 10 && visitedNodes.size < count; i++) {
          visitedNodes.add(currentNode);
          const outEdges = this.edgesBySource.get(currentNode) ?? [];
          const inEdges = this.edgesByTarget.get(currentNode) ?? [];
          const allEdges = [...outEdges, ...inEdges];

          if (allEdges.length === 0) break;

          const randomEdge = allEdges[Math.floor(Math.random() * allEdges.length)]!;
          visitedEdges.add(randomEdge.id);
          currentNode = randomEdge.source === currentNode ? randomEdge.target : randomEdge.source;
        }

        const nodes = this.data.nodes.filter((n) => visitedNodes.has(n.id));
        const edges = this.data.edges.filter((e) => visitedEdges.has(e.id));
        return { nodes, edges };
      }
      case "frontier": {
        const startIds = startNodeId ? [startNodeId] : [this.data.nodes[0]?.id].filter(Boolean) as string[];
        return this.handleExpandNode(startIds[0]!, "both", Math.ceil(count / 10), count);
      }
      default:
        return { nodes: [], edges: [] };
    }
  }

  private handleFindPath(
    sourceId: NodeId,
    targetId: NodeId,
    maxLength?: number
  ): GraphData {
    const maxDepth = maxLength ?? 10;
    const visited = new Map<NodeId, { parent: NodeId | null; edge: GraphEdge | null }>();
    const queue: NodeId[] = [sourceId];
    visited.set(sourceId, { parent: null, edge: null });

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current === targetId) {
        // Reconstruct path
        const pathNodes: GraphNode[] = [];
        const pathEdges: GraphEdge[] = [];
        let node: NodeId | null = targetId;

        while (node !== null) {
          const nodeData = this.nodeIndex.get(node);
          if (nodeData) pathNodes.unshift(nodeData);

          const info = visited.get(node);
          if (info?.edge) pathEdges.unshift(info.edge);
          node = info?.parent ?? null;
        }

        return { nodes: pathNodes, edges: pathEdges };
      }

      const depth = this.getPathDepth(visited, current);
      if (depth >= maxDepth) continue;

      const outEdges = this.edgesBySource.get(current) ?? [];
      const inEdges = this.edgesByTarget.get(current) ?? [];

      for (const edge of [...outEdges, ...inEdges]) {
        const neighbor = edge.source === current ? edge.target : edge.source;
        if (!visited.has(neighbor)) {
          visited.set(neighbor, { parent: current, edge });
          queue.push(neighbor);
        }
      }
    }

    return { nodes: [], edges: [] };
  }

  private getPathDepth(
    visited: Map<NodeId, { parent: NodeId | null; edge: GraphEdge | null }>,
    nodeId: NodeId
  ): number {
    let depth = 0;
    let current: NodeId | null = nodeId;

    while (current !== null) {
      const info = visited.get(current);
      current = info?.parent ?? null;
      if (current !== null) depth++;
    }

    return depth;
  }

  /** Get all data (for testing) */
  getAllData(): GraphData {
    return this.data;
  }
}

/** Create a mock connector */
export function createMockConnector(config?: MockConnectorConfig): MockConnector {
  return new MockConnector(config);
}
