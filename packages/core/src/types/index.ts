/**
 * Core type definitions for Queryscape
 */

/** Unique identifier for graph elements */
export type NodeId = string;
export type EdgeId = string;

/** Property value types supported in graph databases */
export type PropertyValue =
  | string
  | number
  | boolean
  | null
  | PropertyValue[]
  | { [key: string]: PropertyValue };

/** Node properties map */
export type Properties = Record<string, PropertyValue>;

/** Graph node representation */
export interface GraphNode {
  readonly id: NodeId;
  readonly labels: readonly string[];
  readonly properties: Properties;
}

/** Graph edge representation */
export interface GraphEdge {
  readonly id: EdgeId;
  readonly source: NodeId;
  readonly target: NodeId;
  readonly type: string;
  readonly properties: Properties;
}

/** Graph data container */
export interface GraphData {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
}

/** Alias for GraphData */
export type Graph = GraphData;

/** Mutable graph data for internal use */
export interface MutableGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Session configuration */
export interface SessionConfig {
  /** Maximum nodes allowed in session */
  readonly maxNodes: number;
  /** Maximum edges allowed in session */
  readonly maxEdges: number;
  /** Maximum elements (nodes + edges) per fetch operation */
  readonly maxElementsPerFetch: number;
  /** Cache TTL in milliseconds */
  readonly cacheTtlMs: number;
  /** Enable Rust accelerator if available */
  readonly enableAccelerator: boolean;
}

/** Default session configuration */
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  maxNodes: 10000,
  maxEdges: 50000,
  maxElementsPerFetch: 500,
  cacheTtlMs: 5 * 60 * 1000, // 5 minutes
  enableAccelerator: true,
} as const;

/** Query result metadata */
export interface QueryMetadata {
  readonly executionTimeMs: number;
  readonly totalAvailable: number | null;
  readonly truncated: boolean;
  readonly cursor: string | null;
}

/** Query result with data and metadata */
export interface QueryResult {
  readonly data: GraphData;
  readonly metadata: QueryMetadata;
}

/** Pagination options */
export interface PaginationOptions {
  readonly limit: number;
  readonly cursor?: string;
  readonly offset?: number;
}

/** Telemetry hook interface */
export interface TelemetryHook {
  onQueryStart?(queryId: string, queryType: string): void;
  onQueryComplete?(queryId: string, durationMs: number, elementCount: number): void;
  onQueryError?(queryId: string, error: Error): void;
  onSessionChange?(nodeCount: number, edgeCount: number): void;
  onLimitReached?(limitType: string, currentValue: number, maxValue: number): void;
}

/** Noop telemetry hook (default) */
export const NOOP_TELEMETRY_HOOK: TelemetryHook = Object.freeze({});
