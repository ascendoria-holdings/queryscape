/**
 * Graph session manager with caching and limits
 */

import { QueryCache, generateQueryCacheKey } from "../cache/index.js";
import { ValidationError } from "../errors/index.js";
import { LimitsEnforcer } from "../limits/index.js";
import type { Logger } from "../logger/index.js";
import { noopLogger } from "../logger/index.js";
import type { GraphPatch, PatchSummary } from "../patch/index.js";
import {
  applyPatch,
  calculatePatch,
  getPatchSummary,
  invertPatch,
  isPatchEmpty,
} from "../patch/index.js";
import type { Query } from "../query/index.js";
import type {
  GraphData,
  GraphNode,
  GraphEdge,
  NodeId,
  QueryResult,
  SessionConfig,
  TelemetryHook,
} from "../types/index.js";
import {
  DEFAULT_SESSION_CONFIG,
  NOOP_TELEMETRY_HOOK,
} from "../types/index.js";

import type { Connector } from "./connector.js";

export type { Connector } from "./connector.js";

/** Session state */
export interface SessionState {
  readonly data: GraphData;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly patchHistory: readonly GraphPatch[];
  readonly undoStack: readonly GraphPatch[];
}

/** Session options */
export interface SessionOptions {
  config?: Partial<SessionConfig>;
  logger?: Logger;
  telemetry?: TelemetryHook;
}

/** Graph session manager */
export class GraphSession {
  private state: GraphData = { nodes: [], edges: [] };
  private patchHistory: GraphPatch[] = [];
  private undoStack: GraphPatch[] = [];

  private readonly config: SessionConfig;
  private readonly logger: Logger;
  private readonly telemetry: TelemetryHook;
  private readonly limiter: LimitsEnforcer;
  private readonly cache: QueryCache;

  private connector: Connector | null = null;

  constructor(options: SessionOptions = {}) {
    this.config = { ...DEFAULT_SESSION_CONFIG, ...options.config };
    this.logger = options.logger ?? noopLogger;
    this.telemetry = options.telemetry ?? NOOP_TELEMETRY_HOOK;

    this.limiter = new LimitsEnforcer(this.config, this.logger, this.telemetry);
    this.cache = new QueryCache(
      { maxSize: 100, ttlMs: this.config.cacheTtlMs },
      this.logger
    );
  }

  /** Connect to a data source */
  async connect(connector: Connector): Promise<void> {
    this.connector = connector;
    await connector.connect();
    this.logger.info("Connected to data source", {
      type: connector.getCapabilities().connectorType,
    });
  }

  /** Disconnect from data source */
  async disconnect(): Promise<void> {
    if (this.connector) {
      await this.connector.disconnect();
      this.connector = null;
      this.logger.info("Disconnected from data source");
    }
  }

  /** Get current connector */
  getConnector(): Connector | null {
    return this.connector;
  }

  /** Execute query and merge results */
  async executeQuery(query: Query): Promise<QueryResult> {
    if (!this.connector) {
      throw new ValidationError("No connector attached to session");
    }

    // Query validation is done by the connector

    const queryId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const startTime = Date.now();

    this.telemetry.onQueryStart?.(queryId, query.type);

    try {
      // Check cache first
      const cacheKey = generateQueryCacheKey(
        this.connector.getId(),
        query.type,
        query as unknown as Record<string, unknown>
      );

      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug("Cache hit for query", { queryType: query.type });
        const duration = Date.now() - startTime;
        this.telemetry.onQueryComplete?.(
          queryId,
          duration,
          cached.nodes.length + cached.edges.length
        );
        return {
          data: cached,
          metadata: {
            executionTimeMs: duration,
            totalAvailable: null,
            truncated: false,
            cursor: null,
          },
        };
      }

      // Execute query
      const result = await this.connector.executeQuery(query);

      // Check limits before merging
      const newNodes = result.data.nodes.filter(
        (n) => !this.state.nodes.some((existing) => existing.id === n.id)
      );
      const newEdges = result.data.edges.filter(
        (e) => !this.state.edges.some((existing) => existing.id === e.id)
      );

      this.limiter.enforceNodeLimit(newNodes.length);
      this.limiter.enforceEdgeLimit(newEdges.length);

      // Merge results
      this.mergeData(result.data);

      // Cache results
      this.cache.set(cacheKey, result.data);

      const duration = Date.now() - startTime;
      this.telemetry.onQueryComplete?.(
        queryId,
        duration,
        result.data.nodes.length + result.data.edges.length
      );

      this.logger.debug("Query executed", {
        queryType: query.type,
        durationMs: duration,
        nodesReturned: result.data.nodes.length,
        edgesReturned: result.data.edges.length,
      });

      return result;
    } catch (error) {
      this.telemetry.onQueryError?.(
        queryId,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /** Merge graph data into session */
  private mergeData(data: GraphData): void {
    const oldState = this.state;

    const nodeMap = new Map(this.state.nodes.map((n) => [n.id, n]));
    const edgeMap = new Map(this.state.edges.map((e) => [e.id, e]));

    for (const node of data.nodes) {
      nodeMap.set(node.id, node);
    }

    for (const edge of data.edges) {
      edgeMap.set(edge.id, edge);
    }

    const newState: GraphData = {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values()),
    };

    const patch = calculatePatch(oldState, newState);

    if (!isPatchEmpty(patch)) {
      this.state = newState;
      this.patchHistory.push(patch);
      this.undoStack = []; // Clear redo stack on new changes
      this.limiter.updateCounts(newState.nodes.length, newState.edges.length);
    }
  }

  /** Add nodes to session */
  addNodes(nodes: GraphNode[]): GraphPatch {
    this.limiter.enforceNodeLimit(nodes.length);

    const oldState = this.state;
    const nodeMap = new Map(this.state.nodes.map((n) => [n.id, n]));

    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    const newState: GraphData = {
      nodes: Array.from(nodeMap.values()),
      edges: this.state.edges,
    };

    const patch = calculatePatch(oldState, newState);
    this.state = newState;
    this.patchHistory.push(patch);
    this.undoStack = [];
    this.limiter.updateCounts(newState.nodes.length, newState.edges.length);

    return patch;
  }

  /** Add edges to session */
  addEdges(edges: GraphEdge[]): GraphPatch {
    this.limiter.enforceEdgeLimit(edges.length);

    const oldState = this.state;
    const edgeMap = new Map(this.state.edges.map((e) => [e.id, e]));

    for (const edge of edges) {
      edgeMap.set(edge.id, edge);
    }

    const newState: GraphData = {
      nodes: this.state.nodes,
      edges: Array.from(edgeMap.values()),
    };

    const patch = calculatePatch(oldState, newState);
    this.state = newState;
    this.patchHistory.push(patch);
    this.undoStack = [];
    this.limiter.updateCounts(newState.nodes.length, newState.edges.length);

    return patch;
  }

  /** Remove nodes by ID */
  removeNodes(nodeIds: NodeId[]): GraphPatch {
    const nodeIdSet = new Set(nodeIds);
    const oldState = this.state;

    const remainingNodes = this.state.nodes.filter((n) => !nodeIdSet.has(n.id));
    // Also remove edges connected to removed nodes
    const remainingEdges = this.state.edges.filter(
      (e) => !nodeIdSet.has(e.source) && !nodeIdSet.has(e.target)
    );

    const newState: GraphData = {
      nodes: remainingNodes,
      edges: remainingEdges,
    };

    const patch = calculatePatch(oldState, newState);
    this.state = newState;
    this.patchHistory.push(patch);
    this.undoStack = [];
    this.limiter.updateCounts(newState.nodes.length, newState.edges.length);

    return patch;
  }

  /** Undo last patch */
  undo(): GraphPatch | null {
    const lastPatch = this.patchHistory.pop();
    if (!lastPatch) {
      return null;
    }

    const invertedPatch = invertPatch(lastPatch);
    this.state = applyPatch(this.state, invertedPatch);
    this.undoStack.push(lastPatch);
    this.limiter.updateCounts(
      this.state.nodes.length,
      this.state.edges.length
    );

    return invertedPatch;
  }

  /** Redo last undone patch */
  redo(): GraphPatch | null {
    const patchToRedo = this.undoStack.pop();
    if (!patchToRedo) {
      return null;
    }

    this.state = applyPatch(this.state, patchToRedo);
    this.patchHistory.push(patchToRedo);
    this.limiter.updateCounts(
      this.state.nodes.length,
      this.state.edges.length
    );

    return patchToRedo;
  }

  /** Get current state */
  getState(): SessionState {
    return {
      data: this.state,
      nodeCount: this.state.nodes.length,
      edgeCount: this.state.edges.length,
      patchHistory: this.patchHistory,
      undoStack: this.undoStack,
    };
  }

  /** Get graph data */
  getData(): GraphData {
    return this.state;
  }

  /** Get node by ID */
  getNode(nodeId: NodeId): GraphNode | undefined {
    return this.state.nodes.find((n) => n.id === nodeId);
  }

  /** Get edges for a node */
  getEdgesForNode(nodeId: NodeId): GraphEdge[] {
    return this.state.edges.filter(
      (e) => e.source === nodeId || e.target === nodeId
    );
  }

  /** Get patch history */
  getPatchHistory(): readonly GraphPatch[] {
    return this.patchHistory;
  }

  /** Get last patch summary */
  getLastPatchSummary(): PatchSummary | null {
    const lastPatch = this.patchHistory[this.patchHistory.length - 1];
    return lastPatch ? getPatchSummary(lastPatch) : null;
  }

  /** Clear session */
  clear(): void {
    this.state = { nodes: [], edges: [] };
    this.patchHistory = [];
    this.undoStack = [];
    this.cache.clear();
    this.limiter.reset();
    this.logger.info("Session cleared");
  }

  /** Get cache statistics */
  getCacheStats(): ReturnType<QueryCache["getStats"]> {
    return this.cache.getStats();
  }

  /** Check limits */
  checkLimits(): {
    nodeCheck: ReturnType<LimitsEnforcer["checkNodeLimit"]>;
    edgeCheck: ReturnType<LimitsEnforcer["checkEdgeLimit"]>;
  } {
    return {
      nodeCheck: this.limiter.checkNodeLimit(0),
      edgeCheck: this.limiter.checkEdgeLimit(0),
    };
  }

  /** Export session to JSON */
  toJSON(): string {
    return JSON.stringify({
      data: this.state,
      patchHistory: this.patchHistory,
      timestamp: new Date().toISOString(),
    });
  }

  /** Import session from JSON */
  static fromJSON(json: string, options?: SessionOptions): GraphSession {
    const parsed = JSON.parse(json) as {
      data: GraphData;
      patchHistory: GraphPatch[];
    };

    const session = new GraphSession(options);
    session.state = parsed.data;
    session.patchHistory = parsed.patchHistory;
    session.limiter.updateCounts(
      parsed.data.nodes.length,
      parsed.data.edges.length
    );

    return session;
  }
}

/** Create a new graph session */
export function createSession(options?: SessionOptions): GraphSession {
  return new GraphSession(options);
}
