/**
 * Core graph types for QueryScape.
 * These types are database-agnostic and represent the unified graph model.
 */

/** Unique identifier for a node */
export type NodeId = string;

/** Unique identifier for an edge */
export type EdgeId = string;

/** Supported property value types */
export type PropertyValue =
  | string
  | number
  | boolean
  | null
  | PropertyValue[]
  | { [key: string]: PropertyValue };

/** Properties map for nodes and edges */
export type Properties = Record<string, PropertyValue>;

/**
 * A node in the graph.
 * Supports both property graph (labels) and RDF (types as labels) models.
 */
export interface GraphNode {
  /** Unique identifier */
  readonly id: NodeId;

  /** Labels/types for the node (e.g., ["Person", "Employee"]) */
  readonly labels: readonly string[];

  /** Node properties */
  readonly properties: Properties;

  /** Optional metadata (e.g., source database, fetch timestamp) */
  readonly metadata?: {
    readonly source?: string;
    readonly fetchedAt?: number;
    readonly [key: string]: PropertyValue | undefined;
  };
}

/**
 * An edge in the graph.
 * Directed edge from source to target.
 */
export interface GraphEdge {
  /** Unique identifier */
  readonly id: EdgeId;

  /** Source node ID */
  readonly source: NodeId;

  /** Target node ID */
  readonly target: NodeId;

  /** Edge type/label (e.g., "KNOWS", "rdf:type") */
  readonly type: string;

  /** Edge properties */
  readonly properties: Properties;

  /** Optional metadata */
  readonly metadata?: {
    readonly source?: string;
    readonly fetchedAt?: number;
    readonly [key: string]: PropertyValue | undefined;
  };
}

/** Union type for any graph element */
export type GraphElement = GraphNode | GraphEdge;

/**
 * A graph containing nodes and edges.
 * Used for representing query results and session state.
 */
export interface Graph {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
}

/** Type guard for GraphNode */
export function isGraphNode(element: GraphElement): element is GraphNode {
  return 'labels' in element;
}

/** Type guard for GraphEdge */
export function isGraphEdge(element: GraphElement): element is GraphEdge {
  return 'source' in element && 'target' in element;
}
