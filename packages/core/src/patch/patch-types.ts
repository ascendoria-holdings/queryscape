/**
 * Patch types for incremental graph updates.
 * Uses JSON Patch-inspired operations for efficiency.
 */

import type { GraphNode, GraphEdge, NodeId, EdgeId, PropertyValue } from '../types';

/** Types of patch operations */
export type PatchOperationType = 'add' | 'remove' | 'update';

/** Add a node to the graph */
export interface AddNodeOperation {
  readonly op: 'add';
  readonly type: 'node';
  readonly node: GraphNode;
}

/** Add an edge to the graph */
export interface AddEdgeOperation {
  readonly op: 'add';
  readonly type: 'edge';
  readonly edge: GraphEdge;
}

/** Remove a node from the graph */
export interface RemoveNodeOperation {
  readonly op: 'remove';
  readonly type: 'node';
  readonly nodeId: NodeId;
}

/** Remove an edge from the graph */
export interface RemoveEdgeOperation {
  readonly op: 'remove';
  readonly type: 'edge';
  readonly edgeId: EdgeId;
}

/** Update node properties */
export interface UpdateNodeOperation {
  readonly op: 'update';
  readonly type: 'node';
  readonly nodeId: NodeId;
  readonly properties: Record<string, PropertyValue>;
}

/** Update edge properties */
export interface UpdateEdgeOperation {
  readonly op: 'update';
  readonly type: 'edge';
  readonly edgeId: EdgeId;
  readonly properties: Record<string, PropertyValue>;
}

/** Union type for all patch operations */
export type PatchOperation =
  | AddNodeOperation
  | AddEdgeOperation
  | RemoveNodeOperation
  | RemoveEdgeOperation
  | UpdateNodeOperation
  | UpdateEdgeOperation;

/**
 * A patch is an ordered list of operations to apply to a graph.
 * Patches should be applied atomically.
 */
export interface Patch {
  /** Unique patch ID for tracking */
  readonly id: string;

  /** Timestamp when patch was created */
  readonly timestamp: number;

  /** Ordered list of operations */
  readonly operations: readonly PatchOperation[];

  /** Optional source identifier (e.g., query ID) */
  readonly source?: string;
}

/**
 * Result of applying a patch.
 */
export interface PatchResult {
  /** Patch ID that was applied */
  readonly patchId: string;

  /** Whether all operations succeeded */
  readonly success: boolean;

  /** Number of operations applied */
  readonly appliedCount: number;

  /** Errors encountered (if any) */
  readonly errors?: readonly {
    readonly index: number;
    readonly operation: PatchOperation;
    readonly message: string;
  }[];
}
