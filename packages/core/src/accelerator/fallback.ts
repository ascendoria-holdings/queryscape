/**
 * TypeScript fallback implementations for accelerator operations
 */

import type { GraphData, GraphEdge, NodeId } from "../types/index.js";

import type { SampleResult } from "./protocol.js";

/** Random sample - select random nodes and their edges */
export function randomSample(data: GraphData, count: number): SampleResult {
  const nodeCount = Math.min(count, data.nodes.length);

  // Fisher-Yates shuffle to select random nodes
  const indices = Array.from({ length: data.nodes.length }, (_, i) => i);

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }

  const selectedIndices = indices.slice(0, nodeCount);
  const sampledNodes = selectedIndices.map((i) => data.nodes[i]!);
  const sampledNodeIds = new Set(sampledNodes.map((n) => n.id));

  // Include edges where both endpoints are in sampled nodes
  const sampledEdges = data.edges.filter(
    (e) => sampledNodeIds.has(e.source) && sampledNodeIds.has(e.target)
  );

  return { sampledNodes, sampledEdges };
}

/** Random walk sample - perform random walks from start node */
export function randomWalkSample(
  data: GraphData,
  startNodeId: string,
  walkLength: number,
  numWalks: number
): SampleResult {
  // Build adjacency list
  const adjacency = new Map<NodeId, GraphEdge[]>();

  for (const node of data.nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of data.edges) {
    adjacency.get(edge.source)?.push(edge);
    adjacency.get(edge.target)?.push({ ...edge, source: edge.target, target: edge.source });
  }

  const visitedNodes = new Set<NodeId>();
  const visitedEdges = new Set<string>();

  // Perform random walks
  for (let walk = 0; walk < numWalks; walk++) {
    let currentNode = startNodeId;
    visitedNodes.add(currentNode);

    for (let step = 0; step < walkLength; step++) {
      const edges = adjacency.get(currentNode) ?? [];
      if (edges.length === 0) break;

      const randomEdge = edges[Math.floor(Math.random() * edges.length)]!;
      visitedEdges.add(randomEdge.id);
      currentNode = randomEdge.target;
      visitedNodes.add(currentNode);
    }
  }

  const sampledNodes = data.nodes.filter((n) => visitedNodes.has(n.id));
  const sampledEdges = data.edges.filter((e) => visitedEdges.has(e.id));

  return { sampledNodes, sampledEdges };
}

/** Frontier sample - BFS from start nodes up to max nodes */
export function frontierSample(
  data: GraphData,
  startNodeIds: string[],
  maxNodes: number
): SampleResult {
  // Build adjacency list
  const adjacency = new Map<NodeId, GraphEdge[]>();

  for (const node of data.nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of data.edges) {
    adjacency.get(edge.source)?.push(edge);
    adjacency.get(edge.target)?.push({ ...edge, source: edge.target, target: edge.source });
  }

  const visitedNodes = new Set<NodeId>();
  const visitedEdges = new Set<string>();
  const queue: NodeId[] = [...startNodeIds];

  // BFS
  while (queue.length > 0 && visitedNodes.size < maxNodes) {
    const currentNode = queue.shift()!;

    if (visitedNodes.has(currentNode)) continue;
    visitedNodes.add(currentNode);

    const edges = adjacency.get(currentNode) ?? [];
    for (const edge of edges) {
      if (!visitedNodes.has(edge.target) && visitedNodes.size < maxNodes) {
        visitedEdges.add(edge.id);
        queue.push(edge.target);
      }
    }
  }

  const sampledNodes = data.nodes.filter((n) => visitedNodes.has(n.id));
  const sampledEdges = data.edges.filter((e) => visitedEdges.has(e.id));

  return { sampledNodes, sampledEdges };
}
