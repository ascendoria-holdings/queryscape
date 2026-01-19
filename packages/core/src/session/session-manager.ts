/**
 * Session manager for graph exploration.
 * Maintains session state, enforces limits, and coordinates with cache and patch engine.
 */

import { CacheManager } from '../cache/cache-manager';
import { SessionLimitError } from '../errors/error-types';
import { PatchEngine } from '../patch/patch-engine';
import type { Patch, PatchResult } from '../patch/patch-types';
import type { Graph, GraphNode, GraphEdge, NodeId } from '../types';

export interface SessionLimits {
  readonly maxNodes: number;
  readonly maxEdges: number;
  readonly maxNodesPerQuery: number;
  readonly maxEdgesPerQuery: number;
  readonly maxNeighborhoodDepth: number;
  readonly maxPathLength: number;
}

export interface SessionConfig {
  readonly limits: SessionLimits;
  readonly cacheTtlMs: number;
  readonly maxCacheEntries: number;
  readonly warnOnLimitApproach: boolean;
  readonly limitWarnThreshold: number;
}

export interface SessionState {
  readonly graph: Graph;
  readonly queryCount: number;
  readonly startedAt: number;
  readonly lastActivityAt: number;
  readonly isNearLimit: boolean;
}

const DEFAULT_LIMITS: SessionLimits = {
  maxNodes: 10000,
  maxEdges: 50000,
  maxNodesPerQuery: 500,
  maxEdgesPerQuery: 2000,
  maxNeighborhoodDepth: 3,
  maxPathLength: 10,
};

const DEFAULT_SESSION_CONFIG: SessionConfig = {
  limits: DEFAULT_LIMITS,
  cacheTtlMs: 5 * 60 * 1000,
  maxCacheEntries: 1000,
  warnOnLimitApproach: true,
  limitWarnThreshold: 0.8,
};

export class SessionManager {
  private readonly config: SessionConfig;
  private readonly cache: CacheManager<Graph>;
  private graph: Graph = { nodes: [], edges: [] };
  private queryCount = 0;
  private readonly startedAt: number;
  private lastActivityAt: number;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      ...DEFAULT_SESSION_CONFIG,
      ...config,
      limits: { ...DEFAULT_LIMITS, ...config.limits },
    };
    this.cache = new CacheManager({
      maxEntries: this.config.maxCacheEntries,
      defaultTtlMs: this.config.cacheTtlMs,
    });
    this.startedAt = Date.now();
    this.lastActivityAt = this.startedAt;
  }

  getState(): SessionState {
    return {
      graph: this.graph,
      queryCount: this.queryCount,
      startedAt: this.startedAt,
      lastActivityAt: this.lastActivityAt,
      isNearLimit: this.isNearLimit(),
    };
  }

  getGraph(): Graph {
    return this.graph;
  }

  getNode(nodeId: NodeId): GraphNode | undefined {
    return this.graph.nodes.find((n) => n.id === nodeId);
  }

  isNearLimit(): boolean {
    const { limits, limitWarnThreshold } = this.config;
    return (
      this.graph.nodes.length >= limits.maxNodes * limitWarnThreshold ||
      this.graph.edges.length >= limits.maxEdges * limitWarnThreshold
    );
  }

  validateLimits(nodes: readonly GraphNode[], edges: readonly GraphEdge[]): void {
    const { limits } = this.config;

    if (nodes.length > limits.maxNodesPerQuery) {
      throw new SessionLimitError('maxNodesPerQuery', limits.maxNodesPerQuery, nodes.length);
    }
    if (edges.length > limits.maxEdgesPerQuery) {
      throw new SessionLimitError('maxEdgesPerQuery', limits.maxEdgesPerQuery, edges.length);
    }

    const existingNodeIds = new Set(this.graph.nodes.map((n) => n.id));
    const existingEdgeIds = new Set(this.graph.edges.map((e) => e.id));

    const newNodes = nodes.filter((n) => !existingNodeIds.has(n.id));
    const newEdges = edges.filter((e) => !existingEdgeIds.has(e.id));

    const totalNodes = this.graph.nodes.length + newNodes.length;
    const totalEdges = this.graph.edges.length + newEdges.length;

    if (totalNodes > limits.maxNodes) {
      throw new SessionLimitError('maxNodes', limits.maxNodes, totalNodes);
    }
    if (totalEdges > limits.maxEdges) {
      throw new SessionLimitError('maxEdges', limits.maxEdges, totalEdges);
    }
  }

  addData(
    nodes: readonly GraphNode[],
    edges: readonly GraphEdge[],
    source?: string
  ): { patch: Patch; result: PatchResult } {
    this.validateLimits(nodes, edges);

    const patch = PatchEngine.createAddPatch([...nodes], [...edges], source);
    const { graph, result } = PatchEngine.apply(this.graph, patch);

    this.graph = graph;
    this.queryCount++;
    this.lastActivityAt = Date.now();

    return { patch, result };
  }

  removeData(
    nodeIds: readonly NodeId[],
    edgeIds: readonly string[],
    source?: string
  ): { patch: Patch; result: PatchResult } {
    const patch = PatchEngine.createRemovePatch([...nodeIds], [...edgeIds], source);
    const { graph, result } = PatchEngine.apply(this.graph, patch);

    this.graph = graph;
    this.lastActivityAt = Date.now();

    return { patch, result };
  }

  applyPatch(patch: Patch): PatchResult {
    const { graph, result } = PatchEngine.apply(this.graph, patch);
    this.graph = graph;
    this.lastActivityAt = Date.now();

    return result;
  }

  getCached(query: object): Graph | undefined {
    const key = CacheManager.queryKey(query);
    return this.cache.get(key);
  }

  setCache(query: object, result: Graph): void {
    const key = CacheManager.queryKey(query);
    this.cache.set(key, result);
  }

  getCacheStats(): ReturnType<CacheManager['stats']> {
    return this.cache.stats();
  }

  clear(): void {
    this.graph = { nodes: [], edges: [] };
    this.cache.clear();
    this.queryCount = 0;
    this.lastActivityAt = Date.now();
  }

  getConfig(): SessionConfig {
    return this.config;
  }
}
