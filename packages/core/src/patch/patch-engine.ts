/**
 * Patch engine for computing and applying incremental graph updates.
 */

import type { GraphNode, GraphEdge, NodeId, EdgeId, PropertyValue, Graph } from '../types';

import type { Patch, PatchOperation, PatchResult } from './patch-types';

/**
 * Generates unique patch IDs.
 */
function generatePatchId(): string {
  return `patch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Engine for computing diffs and applying patches to graphs.
 */
export class PatchEngine {
  /**
   * Compute a patch that transforms `before` into `after`.
   */
  static diff(before: Graph, after: Graph): Patch {
    const operations: PatchOperation[] = [];

    const beforeNodeIds = new Set(before.nodes.map((n) => n.id));
    const afterNodeIds = new Set(after.nodes.map((n) => n.id));
    const beforeEdgeIds = new Set(before.edges.map((e) => e.id));
    const afterEdgeIds = new Set(after.edges.map((e) => e.id));

    const beforeNodeMap = new Map(before.nodes.map((n) => [n.id, n]));
    const afterNodeMap = new Map(after.nodes.map((n) => [n.id, n]));
    const beforeEdgeMap = new Map(before.edges.map((e) => [e.id, e]));
    const afterEdgeMap = new Map(after.edges.map((e) => [e.id, e]));

    // Find removed nodes
    for (const nodeId of beforeNodeIds) {
      if (!afterNodeIds.has(nodeId)) {
        operations.push({ op: 'remove', type: 'node', nodeId });
      }
    }

    // Find removed edges
    for (const edgeId of beforeEdgeIds) {
      if (!afterEdgeIds.has(edgeId)) {
        operations.push({ op: 'remove', type: 'edge', edgeId });
      }
    }

    // Find added nodes
    for (const nodeId of afterNodeIds) {
      if (!beforeNodeIds.has(nodeId)) {
        const node = afterNodeMap.get(nodeId);
        if (node) {
          operations.push({ op: 'add', type: 'node', node });
        }
      }
    }

    // Find added edges
    for (const edgeId of afterEdgeIds) {
      if (!beforeEdgeIds.has(edgeId)) {
        const edge = afterEdgeMap.get(edgeId);
        if (edge) {
          operations.push({ op: 'add', type: 'edge', edge });
        }
      }
    }

    // Find updated nodes (same ID, different properties)
    for (const nodeId of beforeNodeIds) {
      if (afterNodeIds.has(nodeId)) {
        const beforeNode = beforeNodeMap.get(nodeId);
        const afterNode = afterNodeMap.get(nodeId);
        if (beforeNode && afterNode) {
          const propDiff = PatchEngine.diffProperties(beforeNode.properties, afterNode.properties);
          if (Object.keys(propDiff).length > 0) {
            operations.push({ op: 'update', type: 'node', nodeId, properties: propDiff });
          }
        }
      }
    }

    // Find updated edges
    for (const edgeId of beforeEdgeIds) {
      if (afterEdgeIds.has(edgeId)) {
        const beforeEdge = beforeEdgeMap.get(edgeId);
        const afterEdge = afterEdgeMap.get(edgeId);
        if (beforeEdge && afterEdge) {
          const propDiff = PatchEngine.diffProperties(beforeEdge.properties, afterEdge.properties);
          if (Object.keys(propDiff).length > 0) {
            operations.push({ op: 'update', type: 'edge', edgeId, properties: propDiff });
          }
        }
      }
    }

    return {
      id: generatePatchId(),
      timestamp: Date.now(),
      operations,
    };
  }

  /**
   * Compute property diff (returns only changed properties).
   */
  private static diffProperties(
    before: Record<string, PropertyValue>,
    after: Record<string, PropertyValue>
  ): Record<string, PropertyValue> {
    const diff: Record<string, PropertyValue> = {};

    for (const key of Object.keys(after)) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        diff[key] = after[key];
      }
    }

    return diff;
  }

  /**
   * Apply a patch to a graph, returning the new graph.
   * This is an immutable operation.
   */
  static apply(graph: Graph, patch: Patch): { graph: Graph; result: PatchResult } {
    const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
    const edgeMap = new Map(graph.edges.map((e) => [e.id, e]));
    const errors: { index: number; operation: PatchOperation; message: string }[] = [];
    let appliedCount = 0;

    for (let i = 0; i < patch.operations.length; i++) {
      const op = patch.operations[i];
      if (!op) continue;

      try {
        switch (op.op) {
          case 'add':
            if (op.type === 'node') {
              if (nodeMap.has(op.node.id)) {
                errors.push({ index: i, operation: op, message: `Node ${op.node.id} already exists` });
              } else {
                nodeMap.set(op.node.id, op.node);
                appliedCount++;
              }
            } else {
              if (edgeMap.has(op.edge.id)) {
                errors.push({ index: i, operation: op, message: `Edge ${op.edge.id} already exists` });
              } else {
                edgeMap.set(op.edge.id, op.edge);
                appliedCount++;
              }
            }
            break;

          case 'remove':
            if (op.type === 'node') {
              if (nodeMap.has(op.nodeId)) {
                nodeMap.delete(op.nodeId);
                // Also remove connected edges
                for (const [edgeId, edge] of edgeMap) {
                  if (edge.source === op.nodeId || edge.target === op.nodeId) {
                    edgeMap.delete(edgeId);
                  }
                }
                appliedCount++;
              } else {
                errors.push({ index: i, operation: op, message: `Node ${op.nodeId} not found` });
              }
            } else {
              if (edgeMap.has(op.edgeId)) {
                edgeMap.delete(op.edgeId);
                appliedCount++;
              } else {
                errors.push({ index: i, operation: op, message: `Edge ${op.edgeId} not found` });
              }
            }
            break;

          case 'update':
            if (op.type === 'node') {
              const node = nodeMap.get(op.nodeId);
              if (node) {
                nodeMap.set(op.nodeId, {
                  ...node,
                  properties: { ...node.properties, ...op.properties },
                });
                appliedCount++;
              } else {
                errors.push({ index: i, operation: op, message: `Node ${op.nodeId} not found` });
              }
            } else {
              const edge = edgeMap.get(op.edgeId);
              if (edge) {
                edgeMap.set(op.edgeId, {
                  ...edge,
                  properties: { ...edge.properties, ...op.properties },
                });
                appliedCount++;
              } else {
                errors.push({ index: i, operation: op, message: `Edge ${op.edgeId} not found` });
              }
            }
            break;
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        errors.push({ index: i, operation: op, message });
      }
    }

    return {
      graph: {
        nodes: Array.from(nodeMap.values()),
        edges: Array.from(edgeMap.values()),
      },
      result: {
        patchId: patch.id,
        success: errors.length === 0,
        appliedCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  }

  /**
   * Create a patch from a single operation.
   */
  static fromOperations(operations: PatchOperation[], source?: string): Patch {
    return {
      id: generatePatchId(),
      timestamp: Date.now(),
      operations,
      source,
    };
  }

  /**
   * Create a patch to add nodes and edges.
   */
  static createAddPatch(nodes: GraphNode[], edges: GraphEdge[], source?: string): Patch {
    const operations: PatchOperation[] = [
      ...nodes.map((node): PatchOperation => ({ op: 'add', type: 'node', node })),
      ...edges.map((edge): PatchOperation => ({ op: 'add', type: 'edge', edge })),
    ];
    return PatchEngine.fromOperations(operations, source);
  }

  /**
   * Create a patch to remove nodes and edges.
   */
  static createRemovePatch(nodeIds: NodeId[], edgeIds: EdgeId[], source?: string): Patch {
    const operations: PatchOperation[] = [
      ...edgeIds.map((edgeId): PatchOperation => ({ op: 'remove', type: 'edge', edgeId })),
      ...nodeIds.map((nodeId): PatchOperation => ({ op: 'remove', type: 'node', nodeId })),
    ];
    return PatchEngine.fromOperations(operations, source);
  }
}
