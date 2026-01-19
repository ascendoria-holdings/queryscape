/**
 * Graph patch model for incremental updates
 */

import type { GraphData, GraphEdge, GraphNode, NodeId, EdgeId } from "../types/index.js";

/** Patch operation types */
export type PatchOperationType = "add" | "remove" | "update";

/** Node patch operation */
export interface NodePatch {
  readonly operation: PatchOperationType;
  readonly node: GraphNode;
  readonly previousNode?: GraphNode; // For update operations
}

/** Edge patch operation */
export interface EdgePatch {
  readonly operation: PatchOperationType;
  readonly edge: GraphEdge;
  readonly previousEdge?: GraphEdge; // For update operations
}

/** Complete graph patch */
export interface GraphPatch {
  readonly id: string;
  readonly timestamp: number;
  readonly nodePatch: readonly NodePatch[];
  readonly edgePatch: readonly EdgePatch[];
}

/** Patch summary for logging/telemetry */
export interface PatchSummary {
  readonly nodesAdded: number;
  readonly nodesRemoved: number;
  readonly nodesUpdated: number;
  readonly edgesAdded: number;
  readonly edgesRemoved: number;
  readonly edgesUpdated: number;
}

/** Generate unique patch ID */
function generatePatchId(): string {
  return `patch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** Calculate diff between two graph states */
export function calculatePatch(
  oldState: GraphData,
  newState: GraphData
): GraphPatch {
  const nodePatch: NodePatch[] = [];
  const edgePatch: EdgePatch[] = [];

  // Build maps for efficient lookup
  const oldNodeMap = new Map(oldState.nodes.map((n) => [n.id, n]));
  const newNodeMap = new Map(newState.nodes.map((n) => [n.id, n]));
  const oldEdgeMap = new Map(oldState.edges.map((e) => [e.id, e]));
  const newEdgeMap = new Map(newState.edges.map((e) => [e.id, e]));

  // Find added and updated nodes
  for (const newNode of newState.nodes) {
    const oldNode = oldNodeMap.get(newNode.id);
    if (!oldNode) {
      nodePatch.push({ operation: "add", node: newNode });
    } else if (!nodesEqual(oldNode, newNode)) {
      nodePatch.push({
        operation: "update",
        node: newNode,
        previousNode: oldNode,
      });
    }
  }

  // Find removed nodes
  for (const oldNode of oldState.nodes) {
    if (!newNodeMap.has(oldNode.id)) {
      nodePatch.push({ operation: "remove", node: oldNode });
    }
  }

  // Find added and updated edges
  for (const newEdge of newState.edges) {
    const oldEdge = oldEdgeMap.get(newEdge.id);
    if (!oldEdge) {
      edgePatch.push({ operation: "add", edge: newEdge });
    } else if (!edgesEqual(oldEdge, newEdge)) {
      edgePatch.push({
        operation: "update",
        edge: newEdge,
        previousEdge: oldEdge,
      });
    }
  }

  // Find removed edges
  for (const oldEdge of oldState.edges) {
    if (!newEdgeMap.has(oldEdge.id)) {
      edgePatch.push({ operation: "remove", edge: oldEdge });
    }
  }

  return {
    id: generatePatchId(),
    timestamp: Date.now(),
    nodePatch,
    edgePatch,
  };
}

/** Apply patch to graph state */
export function applyPatch(state: GraphData, patch: GraphPatch): GraphData {
  const nodeMap = new Map(state.nodes.map((n) => [n.id, n]));
  const edgeMap = new Map(state.edges.map((e) => [e.id, e]));

  // Apply node patches
  for (const np of patch.nodePatch) {
    switch (np.operation) {
      case "add":
      case "update":
        nodeMap.set(np.node.id, np.node);
        break;
      case "remove":
        nodeMap.delete(np.node.id);
        break;
    }
  }

  // Apply edge patches
  for (const ep of patch.edgePatch) {
    switch (ep.operation) {
      case "add":
      case "update":
        edgeMap.set(ep.edge.id, ep.edge);
        break;
      case "remove":
        edgeMap.delete(ep.edge.id);
        break;
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

/** Invert a patch (for undo) */
export function invertPatch(patch: GraphPatch): GraphPatch {
  const invertedNodePatch: NodePatch[] = patch.nodePatch.map((np) => {
    switch (np.operation) {
      case "add":
        return { operation: "remove" as const, node: np.node };
      case "remove":
        return { operation: "add" as const, node: np.node };
      case "update":
        return {
          operation: "update" as const,
          node: np.previousNode!,
          previousNode: np.node,
        };
    }
  });

  const invertedEdgePatch: EdgePatch[] = patch.edgePatch.map((ep) => {
    switch (ep.operation) {
      case "add":
        return { operation: "remove" as const, edge: ep.edge };
      case "remove":
        return { operation: "add" as const, edge: ep.edge };
      case "update":
        return {
          operation: "update" as const,
          edge: ep.previousEdge!,
          previousEdge: ep.edge,
        };
    }
  });

  return {
    id: generatePatchId(),
    timestamp: Date.now(),
    nodePatch: invertedNodePatch,
    edgePatch: invertedEdgePatch,
  };
}

/** Get patch summary */
export function getPatchSummary(patch: GraphPatch): PatchSummary {
  return {
    nodesAdded: patch.nodePatch.filter((p) => p.operation === "add").length,
    nodesRemoved: patch.nodePatch.filter((p) => p.operation === "remove")
      .length,
    nodesUpdated: patch.nodePatch.filter((p) => p.operation === "update")
      .length,
    edgesAdded: patch.edgePatch.filter((p) => p.operation === "add").length,
    edgesRemoved: patch.edgePatch.filter((p) => p.operation === "remove")
      .length,
    edgesUpdated: patch.edgePatch.filter((p) => p.operation === "update")
      .length,
  };
}

/** Check if patch is empty */
export function isPatchEmpty(patch: GraphPatch): boolean {
  return patch.nodePatch.length === 0 && patch.edgePatch.length === 0;
}

/** Merge multiple patches */
export function mergePatches(patches: readonly GraphPatch[]): GraphPatch {
  const allNodePatches: NodePatch[] = [];
  const allEdgePatches: EdgePatch[] = [];

  for (const patch of patches) {
    allNodePatches.push(...patch.nodePatch);
    allEdgePatches.push(...patch.edgePatch);
  }

  // Consolidate patches for the same elements
  const nodeConsolidated = consolidateNodePatches(allNodePatches);
  const edgeConsolidated = consolidateEdgePatches(allEdgePatches);

  return {
    id: generatePatchId(),
    timestamp: Date.now(),
    nodePatch: nodeConsolidated,
    edgePatch: edgeConsolidated,
  };
}

/** Consolidate node patches for same node ID */
function consolidateNodePatches(patches: NodePatch[]): NodePatch[] {
  const byId = new Map<NodeId, NodePatch[]>();

  for (const patch of patches) {
    const existing = byId.get(patch.node.id) ?? [];
    existing.push(patch);
    byId.set(patch.node.id, existing);
  }

  const result: NodePatch[] = [];

  for (const [, nodePatches] of byId) {
    if (nodePatches.length === 1) {
      result.push(nodePatches[0]!);
    } else {
      // Get final state
      const first = nodePatches[0]!;
      const last = nodePatches[nodePatches.length - 1]!;

      if (first.operation === "add" && last.operation === "remove") {
        // Add then remove = no-op
        continue;
      } else if (first.operation === "remove" && last.operation === "add") {
        // Remove then add = update (if different) or no-op
        result.push({ operation: "update", node: last.node });
      } else {
        result.push(last);
      }
    }
  }

  return result;
}

/** Consolidate edge patches for same edge ID */
function consolidateEdgePatches(patches: EdgePatch[]): EdgePatch[] {
  const byId = new Map<EdgeId, EdgePatch[]>();

  for (const patch of patches) {
    const existing = byId.get(patch.edge.id) ?? [];
    existing.push(patch);
    byId.set(patch.edge.id, existing);
  }

  const result: EdgePatch[] = [];

  for (const [, edgePatches] of byId) {
    if (edgePatches.length === 1) {
      result.push(edgePatches[0]!);
    } else {
      const first = edgePatches[0]!;
      const last = edgePatches[edgePatches.length - 1]!;

      if (first.operation === "add" && last.operation === "remove") {
        continue;
      } else if (first.operation === "remove" && last.operation === "add") {
        result.push({ operation: "update", edge: last.edge });
      } else {
        result.push(last);
      }
    }
  }

  return result;
}

/** Check if two nodes are equal */
function nodesEqual(a: GraphNode, b: GraphNode): boolean {
  if (a.id !== b.id) return false;
  if (a.labels.length !== b.labels.length) return false;
  if (!a.labels.every((l, i) => l === b.labels[i])) return false;
  return JSON.stringify(a.properties) === JSON.stringify(b.properties);
}

/** Check if two edges are equal */
function edgesEqual(a: GraphEdge, b: GraphEdge): boolean {
  if (a.id !== b.id) return false;
  if (a.source !== b.source) return false;
  if (a.target !== b.target) return false;
  if (a.type !== b.type) return false;
  return JSON.stringify(a.properties) === JSON.stringify(b.properties);
}
