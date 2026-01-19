/**
 * Mock connector for testing and demos
 */

import type {
  Graph,
  GraphNode,
  GraphEdge,
  NodeId,
  NodeQuery,
  EdgeQuery,
  NeighborhoodQuery,
  PathQuery,
  SearchQuery,
} from '@queryscape/core';

import { generateMockData, type MockDataOptions } from './mock-data';

/** Result type for queries */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/** Query result with graph data */
export interface QueryResultData {
  graph: Graph;
  count: number;
  hasMore: boolean;
  executionTimeMs: number;
}

/** Metadata result */
export interface MetadataResult {
  labels: string[];
  relationshipTypes: string[];
  propertyKeys: string[];
  nodeCount: number;
  edgeCount: number;
}

/** Connector capabilities */
export interface ConnectorCapabilities {
  supported: Set<string>;
}

/** Mock connector configuration */
export interface MockConnectorConfig {
  /** Options for generating mock data */
  generateOptions?: MockDataOptions;
  /** Pre-populated initial data */
  initialData?: Graph;
  /** Simulated query latency in ms */
  latencyMs?: number;
}

type Query = NodeQuery | EdgeQuery | NeighborhoodQuery | PathQuery | SearchQuery;

/**
 * Mock connector implementation for testing and demos.
 * Provides an in-memory graph that can be queried like a real database.
 */
export class MockConnector {
  readonly type = 'mock';
  readonly capabilities: ConnectorCapabilities = {
    supported: new Set([
      'nodeById',
      'nodesByLabel',
      'nodesByProperty',
      'edgeById',
      'edgesByType',
      'neighborhood',
      'path',
      'search',
    ]),
  };

  private connected = false;
  private data: Graph;
  private nodeIndex: Map<NodeId, GraphNode>;
  private edgesBySource: Map<NodeId, GraphEdge[]>;
  private edgesByTarget: Map<NodeId, GraphEdge[]>;
  private readonly latencyMs: number;

  constructor(config: MockConnectorConfig = {}) {
    this.data = config.initialData ?? generateMockData(config.generateOptions);
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

  isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    await this.simulateLatency();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    await this.simulateLatency();
    this.connected = false;
  }

  getData(): Graph {
    return this.data;
  }

  async query(query: Query): Promise<Result<QueryResultData>> {
    if (!this.connected) {
      return {
        ok: false,
        error: new Error('Not connected'),
      };
    }

    const startTime = performance.now();
    await this.simulateLatency();

    try {
      let result: Graph;

      switch (query.type) {
        case 'node':
          result = this.handleNodeQuery(query);
          break;
        case 'edge':
          result = this.handleEdgeQuery(query);
          break;
        case 'neighborhood':
          result = this.handleNeighborhoodQuery(query);
          break;
        case 'path':
          result = this.handlePathQuery(query);
          break;
        case 'search':
          result = this.handleSearchQuery(query);
          break;
        default:
          result = { nodes: [], edges: [] };
      }

      const executionTimeMs = performance.now() - startTime;
      const limit = (query as any).limit ?? 100;
      const hasMore = query.type === 'node' || query.type === 'edge'
        ? this.data.nodes.length > (query as any).offset + result.nodes.length
        : false;

      return {
        ok: true,
        value: {
          graph: result,
          count: result.nodes.length,
          hasMore,
          executionTimeMs,
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async getMetadata(): Promise<Result<MetadataResult>> {
    if (!this.connected) {
      return {
        ok: false,
        error: new Error('Not connected'),
      };
    }

    const labels = new Set<string>();
    const relationshipTypes = new Set<string>();
    const propertyKeys = new Set<string>();

    for (const node of this.data.nodes) {
      for (const label of node.labels) {
        labels.add(label);
      }
      for (const key of Object.keys(node.properties)) {
        propertyKeys.add(key);
      }
    }

    for (const edge of this.data.edges) {
      relationshipTypes.add(edge.type);
      for (const key of Object.keys(edge.properties)) {
        propertyKeys.add(key);
      }
    }

    return {
      ok: true,
      value: {
        labels: Array.from(labels),
        relationshipTypes: Array.from(relationshipTypes),
        propertyKeys: Array.from(propertyKeys),
        nodeCount: this.data.nodes.length,
        edgeCount: this.data.edges.length,
      },
    };
  }

  private async simulateLatency(): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }
  }

  private handleNodeQuery(query: NodeQuery): Graph {
    let nodes: GraphNode[] = [];
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 100;

    if (query.ids && query.ids.length > 0) {
      // Query by IDs
      nodes = query.ids
        .map((id) => this.nodeIndex.get(id))
        .filter((n): n is GraphNode => n !== undefined);
    } else {
      // Filter by labels and properties
      nodes = [...this.data.nodes];

      if (query.labels && query.labels.length > 0) {
        nodes = nodes.filter((n) =>
          query.labels!.every((label) => n.labels.includes(label))
        );
      }

      if (query.properties) {
        const propEntries = Object.entries(query.properties);
        nodes = nodes.filter((n) =>
          propEntries.every(([key, value]) => n.properties[key] === value)
        );
      }
    }

    // Apply pagination
    nodes = nodes.slice(offset, offset + limit);

    return { nodes, edges: [] };
  }

  private handleEdgeQuery(query: EdgeQuery): Graph {
    let edges: GraphEdge[] = [...this.data.edges];
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 100;

    if (query.ids && query.ids.length > 0) {
      const idSet = new Set(query.ids);
      edges = edges.filter((e) => idSet.has(e.id));
    }

    if (query.types && query.types.length > 0) {
      edges = edges.filter((e) => query.types!.includes(e.type));
    }

    if (query.sourceId) {
      edges = edges.filter((e) => e.source === query.sourceId);
    }

    if (query.targetId) {
      edges = edges.filter((e) => e.target === query.targetId);
    }

    // Apply pagination
    edges = edges.slice(offset, offset + limit);

    // Get the nodes for these edges
    const nodeIds = new Set<NodeId>();
    for (const edge of edges) {
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    }

    const nodes = this.data.nodes.filter((n) => nodeIds.has(n.id));

    return { nodes, edges };
  }

  private handleNeighborhoodQuery(query: NeighborhoodQuery): Graph {
    const visited = new Set<NodeId>();
    const visitedEdges = new Set<string>();
    const queue: { id: NodeId; depth: number }[] = [{ id: query.nodeId, depth: 0 }];

    const maxDepth = query.depth ?? 1;
    const direction = query.direction ?? 'both';
    const edgeTypes = query.edgeTypes;
    const neighborLabels = query.neighborLabels;

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      if (current.depth >= maxDepth) continue;

      // Get edges based on direction
      let edges: GraphEdge[] = [];

      if (direction === 'outgoing' || direction === 'both') {
        edges.push(...(this.edgesBySource.get(current.id) ?? []));
      }

      if (direction === 'incoming' || direction === 'both') {
        edges.push(...(this.edgesByTarget.get(current.id) ?? []));
      }

      // Filter by edge types if specified
      if (edgeTypes && edgeTypes.length > 0) {
        edges = edges.filter((e) => edgeTypes.includes(e.type));
      }

      for (const edge of edges) {
        const neighbor = edge.source === current.id ? edge.target : edge.source;
        const neighborNode = this.nodeIndex.get(neighbor);

        // Filter by neighbor labels if specified
        if (neighborLabels && neighborLabels.length > 0 && neighborNode) {
          if (!neighborLabels.some((label) => neighborNode.labels.includes(label))) {
            continue;
          }
        }

        visitedEdges.add(edge.id);

        if (!visited.has(neighbor)) {
          queue.push({ id: neighbor, depth: current.depth + 1 });
        }
      }
    }

    const nodes = this.data.nodes.filter((n) => visited.has(n.id));
    const edges = this.data.edges.filter((e) => visitedEdges.has(e.id));

    return { nodes, edges };
  }

  private handlePathQuery(query: PathQuery): Graph {
    const maxLength = query.maxLength ?? 10;
    const visited = new Map<NodeId, { parent: NodeId | null; edge: GraphEdge | null }>();
    const queue: NodeId[] = [query.sourceId];
    visited.set(query.sourceId, { parent: null, edge: null });

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current === query.targetId) {
        // Reconstruct path
        const pathNodes: GraphNode[] = [];
        const pathEdges: GraphEdge[] = [];
        let node: NodeId | null = query.targetId;

        while (node !== null) {
          const nodeData = this.nodeIndex.get(node);
          if (nodeData) pathNodes.unshift(nodeData);

          const info = visited.get(node);
          if (info?.edge) pathEdges.unshift(info.edge);
          node = info?.parent ?? null;
        }

        return { nodes: pathNodes, edges: pathEdges };
      }

      // Check depth
      let depth = 0;
      let curr: NodeId | null = current;
      while (curr !== null) {
        const info = visited.get(curr);
        curr = info?.parent ?? null;
        if (curr !== null) depth++;
      }

      if (depth >= maxLength) continue;

      // Get neighbors (bidirectional)
      const outEdges = this.edgesBySource.get(current) ?? [];
      const inEdges = this.edgesByTarget.get(current) ?? [];

      // Filter by edge types if specified
      let edges = [...outEdges, ...inEdges];
      if (query.edgeTypes && query.edgeTypes.length > 0) {
        edges = edges.filter((e) => query.edgeTypes!.includes(e.type));
      }

      for (const edge of edges) {
        const neighbor = edge.source === current ? edge.target : edge.source;
        if (!visited.has(neighbor)) {
          visited.set(neighbor, { parent: current, edge });
          queue.push(neighbor);
        }
      }
    }

    // No path found
    return { nodes: [], edges: [] };
  }

  private handleSearchQuery(query: SearchQuery): Graph {
    const text = query.caseSensitive ? query.text : query.text.toLowerCase();
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    let nodes = this.data.nodes.filter((n) => {
      // Check labels filter
      if (query.labels && query.labels.length > 0) {
        if (!query.labels.some((label) => n.labels.includes(label))) {
          return false;
        }
      }

      // Search in specified fields or all properties
      const fieldsToSearch = query.fields ?? Object.keys(n.properties);

      for (const field of fieldsToSearch) {
        const value = n.properties[field];
        if (value !== undefined) {
          const strValue = query.caseSensitive
            ? String(value)
            : String(value).toLowerCase();
          if (strValue.includes(text)) {
            return true;
          }
        }
      }

      return false;
    });

    // Apply pagination
    nodes = nodes.slice(offset, offset + limit);

    return { nodes, edges: [] };
  }
}
