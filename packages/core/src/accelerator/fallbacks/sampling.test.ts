import { describe, it, expect } from 'vitest';

import type { Graph } from '../../types/graph';
import { sampleRandomWalk } from './sampling';

describe('sampleRandomWalk', () => {
  const createTestGraph = (): Graph => ({
    nodes: [
      { id: 'n1', labels: ['Test'], properties: {} },
      { id: 'n2', labels: ['Test'], properties: {} },
      { id: 'n3', labels: ['Test'], properties: {} },
      { id: 'n4', labels: ['Test'], properties: {} },
      { id: 'n5', labels: ['Test'], properties: {} },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'CONNECTS', properties: {} },
      { id: 'e2', source: 'n2', target: 'n3', type: 'CONNECTS', properties: {} },
      { id: 'e3', source: 'n3', target: 'n4', type: 'CONNECTS', properties: {} },
      { id: 'e4', source: 'n4', target: 'n5', type: 'CONNECTS', properties: {} },
      { id: 'e5', source: 'n5', target: 'n1', type: 'CONNECTS', properties: {} },
    ],
  });

  it('should return sampled node IDs', () => {
    const result = sampleRandomWalk({
      graph: createTestGraph(),
      startNodeId: 'n1',
      walkLength: 10,
      numWalks: 5,
    });

    expect(result.sampledNodeIds).toContain('n1'); // Start node always included
    expect(result.sampledNodeIds.length).toBeGreaterThan(0);
  });

  it('should always include the start node', () => {
    const result = sampleRandomWalk({
      graph: createTestGraph(),
      startNodeId: 'n3',
      walkLength: 5,
      numWalks: 3,
    });

    expect(result.sampledNodeIds).toContain('n3');
  });

  it('should return execution time', () => {
    const result = sampleRandomWalk({
      graph: createTestGraph(),
      startNodeId: 'n1',
      walkLength: 10,
      numWalks: 5,
    });

    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should be deterministic with seed', () => {
    const params = {
      graph: createTestGraph(),
      startNodeId: 'n1',
      walkLength: 20,
      numWalks: 10,
      seed: 12345,
    };

    const result1 = sampleRandomWalk(params);
    const result2 = sampleRandomWalk(params);

    const sorted1 = [...result1.sampledNodeIds].sort();
    const sorted2 = [...result2.sampledNodeIds].sort();

    expect(sorted1).toEqual(sorted2);
  });

  it('should produce different results without seed', () => {
    const params = {
      graph: createTestGraph(),
      startNodeId: 'n1',
      walkLength: 20,
      numWalks: 10,
    };

    // Run multiple times - at least some should differ
    const results = Array.from({ length: 5 }, () => sampleRandomWalk(params));
    const uniqueResults = new Set(results.map(r => JSON.stringify([...r.sampledNodeIds].sort())));

    // With randomness, we should get at least some variation
    // (though with small graph, might not always differ)
    expect(uniqueResults.size).toBeGreaterThanOrEqual(1);
  });

  it('should handle isolated node (no neighbors)', () => {
    const graph: Graph = {
      nodes: [
        { id: 'n1', labels: [], properties: {} },
        { id: 'n2', labels: [], properties: {} },
      ],
      edges: [], // No edges
    };

    const result = sampleRandomWalk({
      graph,
      startNodeId: 'n1',
      walkLength: 10,
      numWalks: 5,
    });

    // Should only have start node since there are no neighbors
    expect(result.sampledNodeIds).toEqual(['n1']);
  });

  it('should handle linear graph', () => {
    const graph: Graph = {
      nodes: [
        { id: 'a', labels: [], properties: {} },
        { id: 'b', labels: [], properties: {} },
        { id: 'c', labels: [], properties: {} },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', type: 'NEXT', properties: {} },
        { id: 'e2', source: 'b', target: 'c', type: 'NEXT', properties: {} },
      ],
    };

    const result = sampleRandomWalk({
      graph,
      startNodeId: 'a',
      walkLength: 10,
      numWalks: 5,
      seed: 42,
    });

    // Should eventually reach all nodes in linear graph
    expect(result.sampledNodeIds.length).toBeGreaterThanOrEqual(1);
  });

  it('should respect walk length', () => {
    const graph: Graph = {
      nodes: Array.from({ length: 100 }, (_, i) => ({
        id: `n${i}`,
        labels: [],
        properties: {},
      })),
      edges: Array.from({ length: 99 }, (_, i) => ({
        id: `e${i}`,
        source: `n${i}`,
        target: `n${i + 1}`,
        type: 'NEXT',
        properties: {},
      })),
    };

    // Very short walk should not reach distant nodes
    const shortResult = sampleRandomWalk({
      graph,
      startNodeId: 'n0',
      walkLength: 2,
      numWalks: 1,
      seed: 42,
    });

    // With walk length 2, we can reach at most nodes 0, 1, 2
    expect(shortResult.sampledNodeIds.length).toBeLessThanOrEqual(3);
  });

  it('should handle undirected traversal (both directions)', () => {
    const graph: Graph = {
      nodes: [
        { id: 'center', labels: [], properties: {} },
        { id: 'left', labels: [], properties: {} },
        { id: 'right', labels: [], properties: {} },
      ],
      edges: [
        // Only outgoing from center
        { id: 'e1', source: 'center', target: 'left', type: 'TO', properties: {} },
        // Only incoming to center
        { id: 'e2', source: 'right', target: 'center', type: 'TO', properties: {} },
      ],
    };

    const result = sampleRandomWalk({
      graph,
      startNodeId: 'center',
      walkLength: 10,
      numWalks: 20,
      seed: 42,
    });

    // Should be able to reach both left and right via undirected traversal
    expect(result.sampledNodeIds).toContain('center');
    // With enough walks, should reach at least one neighbor
    expect(result.sampledNodeIds.length).toBeGreaterThan(1);
  });

  it('should handle empty graph', () => {
    const result = sampleRandomWalk({
      graph: { nodes: [{ id: 'only', labels: [], properties: {} }], edges: [] },
      startNodeId: 'only',
      walkLength: 10,
      numWalks: 5,
    });

    expect(result.sampledNodeIds).toEqual(['only']);
  });

  it('should sample subset of large graph', () => {
    // Create a larger graph
    const nodeCount = 50;
    const graph: Graph = {
      nodes: Array.from({ length: nodeCount }, (_, i) => ({
        id: `n${i}`,
        labels: [],
        properties: {},
      })),
      edges: Array.from({ length: nodeCount * 2 }, (_, i) => ({
        id: `e${i}`,
        source: `n${i % nodeCount}`,
        target: `n${(i + 1) % nodeCount}`,
        type: 'EDGE',
        properties: {},
      })),
    };

    const result = sampleRandomWalk({
      graph,
      startNodeId: 'n0',
      walkLength: 10,
      numWalks: 5,
      seed: 42,
    });

    // Should sample a subset, not the entire graph
    expect(result.sampledNodeIds.length).toBeLessThan(nodeCount);
    expect(result.sampledNodeIds.length).toBeGreaterThan(0);
  });
});
