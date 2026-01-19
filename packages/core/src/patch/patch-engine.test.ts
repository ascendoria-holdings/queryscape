import { describe, it, expect } from 'vitest';

import type { Graph, GraphNode, GraphEdge } from '../types/graph';
import { PatchEngine } from './patch-engine';

describe('PatchEngine', () => {
  const createNode = (id: string, labels: string[] = ['Test']): GraphNode => ({
    id,
    labels,
    properties: { name: `Node ${id}` },
  });

  const createEdge = (id: string, source: string, target: string): GraphEdge => ({
    id,
    source,
    target,
    type: 'CONNECTS',
    properties: {},
  });

  describe('diff', () => {
    it('should detect added nodes', () => {
      const before: Graph = { nodes: [], edges: [] };
      const after: Graph = { nodes: [createNode('n1')], edges: [] };

      const patch = PatchEngine.diff(before, after);

      expect(patch.operations).toHaveLength(1);
      expect(patch.operations[0]).toMatchObject({
        op: 'add',
        type: 'node',
      });
    });

    it('should detect removed nodes', () => {
      const before: Graph = { nodes: [createNode('n1')], edges: [] };
      const after: Graph = { nodes: [], edges: [] };

      const patch = PatchEngine.diff(before, after);

      expect(patch.operations).toHaveLength(1);
      expect(patch.operations[0]).toMatchObject({
        op: 'remove',
        type: 'node',
        nodeId: 'n1',
      });
    });

    it('should detect added edges', () => {
      const n1 = createNode('n1');
      const n2 = createNode('n2');
      const before: Graph = { nodes: [n1, n2], edges: [] };
      const after: Graph = { nodes: [n1, n2], edges: [createEdge('e1', 'n1', 'n2')] };

      const patch = PatchEngine.diff(before, after);

      expect(patch.operations).toHaveLength(1);
      expect(patch.operations[0]).toMatchObject({
        op: 'add',
        type: 'edge',
      });
    });

    it('should detect removed edges', () => {
      const n1 = createNode('n1');
      const n2 = createNode('n2');
      const e1 = createEdge('e1', 'n1', 'n2');
      const before: Graph = { nodes: [n1, n2], edges: [e1] };
      const after: Graph = { nodes: [n1, n2], edges: [] };

      const patch = PatchEngine.diff(before, after);

      expect(patch.operations).toHaveLength(1);
      expect(patch.operations[0]).toMatchObject({
        op: 'remove',
        type: 'edge',
        edgeId: 'e1',
      });
    });

    it('should detect property updates on nodes', () => {
      const before: Graph = {
        nodes: [{ id: 'n1', labels: ['Test'], properties: { name: 'Old' } }],
        edges: [],
      };
      const after: Graph = {
        nodes: [{ id: 'n1', labels: ['Test'], properties: { name: 'New' } }],
        edges: [],
      };

      const patch = PatchEngine.diff(before, after);

      expect(patch.operations).toHaveLength(1);
      expect(patch.operations[0]).toMatchObject({
        op: 'update',
        type: 'node',
        nodeId: 'n1',
        properties: { name: 'New' },
      });
    });

    it('should return empty patch for identical graphs', () => {
      const graph: Graph = {
        nodes: [createNode('n1')],
        edges: [],
      };

      const patch = PatchEngine.diff(graph, graph);

      expect(patch.operations).toHaveLength(0);
    });

    it('should handle complex diffs with multiple operations', () => {
      const before: Graph = {
        nodes: [createNode('n1'), createNode('n2')],
        edges: [createEdge('e1', 'n1', 'n2')],
      };
      const after: Graph = {
        nodes: [createNode('n2'), createNode('n3')],
        edges: [createEdge('e2', 'n2', 'n3')],
      };

      const patch = PatchEngine.diff(before, after);

      // Should have: remove n1, remove e1, add n3, add e2
      expect(patch.operations.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('apply', () => {
    it('should add nodes', () => {
      const graph: Graph = { nodes: [], edges: [] };
      const patch = PatchEngine.createAddPatch([createNode('n1')], []);

      const { graph: result, result: patchResult } = PatchEngine.apply(graph, patch);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]?.id).toBe('n1');
      expect(patchResult.success).toBe(true);
      expect(patchResult.appliedCount).toBe(1);
    });

    it('should add edges', () => {
      const graph: Graph = {
        nodes: [createNode('n1'), createNode('n2')],
        edges: [],
      };
      const patch = PatchEngine.createAddPatch([], [createEdge('e1', 'n1', 'n2')]);

      const { graph: result, result: patchResult } = PatchEngine.apply(graph, patch);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]?.id).toBe('e1');
      expect(patchResult.success).toBe(true);
    });

    it('should remove nodes and their connected edges', () => {
      const graph: Graph = {
        nodes: [createNode('n1'), createNode('n2')],
        edges: [createEdge('e1', 'n1', 'n2')],
      };
      const patch = PatchEngine.createRemovePatch(['n1'], []);

      const { graph: result } = PatchEngine.apply(graph, patch);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]?.id).toBe('n2');
      expect(result.edges).toHaveLength(0); // Edge removed with node
    });

    it('should remove edges', () => {
      const graph: Graph = {
        nodes: [createNode('n1'), createNode('n2')],
        edges: [createEdge('e1', 'n1', 'n2')],
      };
      const patch = PatchEngine.createRemovePatch([], ['e1']);

      const { graph: result } = PatchEngine.apply(graph, patch);

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(0);
    });

    it('should update node properties', () => {
      const graph: Graph = {
        nodes: [{ id: 'n1', labels: ['Test'], properties: { name: 'Old', age: 30 } }],
        edges: [],
      };
      const patch = PatchEngine.fromOperations([
        { op: 'update', type: 'node', nodeId: 'n1', properties: { name: 'New' } },
      ]);

      const { graph: result } = PatchEngine.apply(graph, patch);

      expect(result.nodes[0]?.properties.name).toBe('New');
      expect(result.nodes[0]?.properties.age).toBe(30); // Preserved
    });

    it('should report errors for non-existent nodes', () => {
      const graph: Graph = { nodes: [], edges: [] };
      const patch = PatchEngine.createRemovePatch(['nonexistent'], []);

      const { result: patchResult } = PatchEngine.apply(graph, patch);

      expect(patchResult.success).toBe(false);
      expect(patchResult.errors).toHaveLength(1);
    });

    it('should report errors for duplicate adds', () => {
      const graph: Graph = { nodes: [createNode('n1')], edges: [] };
      const patch = PatchEngine.createAddPatch([createNode('n1')], []);

      const { result: patchResult } = PatchEngine.apply(graph, patch);

      expect(patchResult.success).toBe(false);
      expect(patchResult.errors?.[0]?.message).toContain('already exists');
    });

    it('should be immutable - not modify original graph', () => {
      const original: Graph = { nodes: [createNode('n1')], edges: [] };
      const patch = PatchEngine.createAddPatch([createNode('n2')], []);

      const { graph: result } = PatchEngine.apply(original, patch);

      expect(original.nodes).toHaveLength(1);
      expect(result.nodes).toHaveLength(2);
    });
  });

  describe('createAddPatch', () => {
    it('should create patch with add operations', () => {
      const patch = PatchEngine.createAddPatch(
        [createNode('n1'), createNode('n2')],
        [createEdge('e1', 'n1', 'n2')],
        'test-source'
      );

      expect(patch.operations).toHaveLength(3);
      expect(patch.source).toBe('test-source');
      expect(patch.id).toMatch(/^patch_/);
    });
  });

  describe('createRemovePatch', () => {
    it('should create patch with remove operations (edges first)', () => {
      const patch = PatchEngine.createRemovePatch(['n1'], ['e1', 'e2']);

      // Edges should be removed before nodes
      expect(patch.operations[0]).toMatchObject({ op: 'remove', type: 'edge' });
      expect(patch.operations[1]).toMatchObject({ op: 'remove', type: 'edge' });
      expect(patch.operations[2]).toMatchObject({ op: 'remove', type: 'node' });
    });
  });
});
