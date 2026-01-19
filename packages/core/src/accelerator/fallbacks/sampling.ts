/**
 * Sampling algorithms for graph exploration.
 * These are TypeScript fallbacks when the Rust accelerator is not available.
 */

import type { Graph, NodeId, GraphEdge } from '../../types/graph';

export interface RandomWalkParams {
  graph: Graph;
  startNodeId: NodeId;
  walkLength: number;
  numWalks: number;
  seed?: number;
}

export interface RandomWalkResult {
  sampledNodeIds: NodeId[];
  executionTimeMs: number;
}

/**
 * Simple seeded PRNG (Linear Congruential Generator)
 */
function createRng(seed?: number): () => number {
  let state = seed ?? Math.floor(Math.random() * 2147483647);
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/**
 * Performs random walk sampling on a graph.
 *
 * Random walk sampling explores the graph by starting at a node and
 * repeatedly moving to a random neighbor. This is useful for sampling
 * a representative subset of a large graph.
 */
export function sampleRandomWalk(params: RandomWalkParams): RandomWalkResult {
  const startTime = performance.now();
  const { graph, startNodeId, walkLength, numWalks, seed } = params;

  const random = createRng(seed);

  // Build adjacency list (undirected - both directions)
  const adjacency = new Map<NodeId, NodeId[]>();

  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  }

  const visitedNodes = new Set<NodeId>();
  visitedNodes.add(startNodeId);

  // Perform random walks
  for (let walk = 0; walk < numWalks; walk++) {
    let currentNode = startNodeId;

    for (let step = 0; step < walkLength; step++) {
      const neighbors = adjacency.get(currentNode);

      if (!neighbors || neighbors.length === 0) {
        // Dead end - stay at current node or restart
        break;
      }

      // Pick a random neighbor
      const randomIndex = Math.floor(random() * neighbors.length);
      currentNode = neighbors[randomIndex]!;
      visitedNodes.add(currentNode);
    }
  }

  const executionTimeMs = performance.now() - startTime;

  return {
    sampledNodeIds: Array.from(visitedNodes),
    executionTimeMs,
  };
}

export interface FrontierSampleParams {
  graph: Graph;
  startNodeIds: NodeId[];
  maxNodes: number;
  seed?: number;
}

export interface FrontierSampleResult {
  sampledNodeIds: NodeId[];
  sampledEdgeIds: string[];
  executionTimeMs: number;
}

/**
 * Performs frontier-based sampling starting from given nodes.
 * Uses BFS to expand from start nodes up to maxNodes.
 */
export function sampleFrontier(params: FrontierSampleParams): FrontierSampleResult {
  const startTime = performance.now();
  const { graph, startNodeIds, maxNodes } = params;

  // Build adjacency list
  const adjacency = new Map<NodeId, GraphEdge[]>();

  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of graph.edges) {
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

  const executionTimeMs = performance.now() - startTime;

  return {
    sampledNodeIds: Array.from(visitedNodes),
    sampledEdgeIds: Array.from(visitedEdges),
    executionTimeMs,
  };
}

export interface RandomSampleParams {
  graph: Graph;
  count: number;
  seed?: number;
}

export interface RandomSampleResult {
  sampledNodeIds: NodeId[];
  sampledEdgeIds: string[];
  executionTimeMs: number;
}

/**
 * Randomly samples nodes from the graph.
 */
export function sampleRandom(params: RandomSampleParams): RandomSampleResult {
  const startTime = performance.now();
  const { graph, count, seed } = params;

  const random = createRng(seed);
  const nodeCount = Math.min(count, graph.nodes.length);

  // Fisher-Yates shuffle to select random nodes
  const indices = Array.from({ length: graph.nodes.length }, (_, i) => i);

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }

  const selectedIndices = indices.slice(0, nodeCount);
  const sampledNodeIds = selectedIndices.map((i) => graph.nodes[i]!.id);
  const sampledNodeIdSet = new Set(sampledNodeIds);

  // Include edges where both endpoints are in sampled nodes
  const sampledEdgeIds = graph.edges
    .filter((e) => sampledNodeIdSet.has(e.source) && sampledNodeIdSet.has(e.target))
    .map((e) => e.id);

  const executionTimeMs = performance.now() - startTime;

  return {
    sampledNodeIds,
    sampledEdgeIds,
    executionTimeMs,
  };
}
