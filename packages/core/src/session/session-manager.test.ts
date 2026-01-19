import { describe, it, expect, beforeEach } from 'vitest';

import { SessionLimitError } from '../errors/error-types';
import { PatchEngine } from '../patch/patch-engine';
import type { GraphNode, GraphEdge } from '../types/graph';

import { SessionManager } from './session-manager';

describe('SessionManager', () => {
  let session: SessionManager;

  const createNode = (id: string): GraphNode => ({
    id,
    labels: ['Test'],
    properties: { name: `Node ${id}` },
  });

  const createEdge = (id: string, source: string, target: string): GraphEdge => ({
    id,
    source,
    target,
    type: 'CONNECTS',
    properties: {},
  });

  beforeEach(() => {
    session = new SessionManager({
      limits: {
        maxNodes: 100,
        maxEdges: 200,
        maxNodesPerQuery: 20,
        maxEdgesPerQuery: 50,
        maxNeighborhoodDepth: 3,
        maxPathLength: 10,
      },
    });
  });

  describe('initialization', () => {
    it('should start with empty graph', () => {
      const state = session.getState();
      expect(state.graph.nodes).toHaveLength(0);
      expect(state.graph.edges).toHaveLength(0);
    });

    it('should have zero query count initially', () => {
      expect(session.getState().queryCount).toBe(0);
    });

    it('should not be near limit when empty', () => {
      expect(session.isNearLimit()).toBe(false);
    });
  });

  describe('addData', () => {
    it('should add nodes to the session', () => {
      const nodes = [createNode('n1'), createNode('n2')];
      session.addData(nodes, []);

      const graph = session.getGraph();
      expect(graph.nodes).toHaveLength(2);
    });

    it('should add edges to the session', () => {
      const nodes = [createNode('n1'), createNode('n2')];
      const edges = [createEdge('e1', 'n1', 'n2')];
      session.addData(nodes, edges);

      const graph = session.getGraph();
      expect(graph.edges).toHaveLength(1);
    });

    it('should return a patch describing the changes', () => {
      const nodes = [createNode('n1')];
      const { patch } = session.addData(nodes, []);

      expect(patch.operations).toHaveLength(1);
      expect(patch.operations[0]).toMatchObject({
        op: 'add',
        type: 'node',
      });
    });

    it('should increment query count', () => {
      session.addData([createNode('n1')], []);
      session.addData([createNode('n2')], []);

      expect(session.getState().queryCount).toBe(2);
    });

    it('should not add duplicate nodes', () => {
      const node = createNode('n1');
      session.addData([node], []);
      const { result } = session.addData([node], []);

      expect(session.getGraph().nodes).toHaveLength(1);
      expect(result.success).toBe(false);
    });

    it('should set source on patch', () => {
      const { patch } = session.addData([createNode('n1')], [], 'test-source');
      expect(patch.source).toBe('test-source');
    });
  });

  describe('removeData', () => {
    it('should remove nodes from the session', () => {
      session.addData([createNode('n1'), createNode('n2')], []);
      session.removeData(['n1'], []);

      const graph = session.getGraph();
      expect(graph.nodes).toHaveLength(1);
      expect(graph.nodes[0]?.id).toBe('n2');
    });

    it('should remove edges from the session', () => {
      const nodes = [createNode('n1'), createNode('n2')];
      const edges = [createEdge('e1', 'n1', 'n2')];
      session.addData(nodes, edges);
      session.removeData([], ['e1']);

      const graph = session.getGraph();
      expect(graph.edges).toHaveLength(0);
    });

    it('should return a patch describing the changes', () => {
      session.addData([createNode('n1')], []);
      const { patch } = session.removeData(['n1'], []);

      expect(patch.operations).toHaveLength(1);
      expect(patch.operations[0]).toMatchObject({
        op: 'remove',
        type: 'node',
        nodeId: 'n1',
      });
    });
  });

  describe('getNode', () => {
    it('should return node by ID', () => {
      session.addData([createNode('n1')], []);
      const node = session.getNode('n1');

      expect(node).toBeDefined();
      expect(node?.id).toBe('n1');
    });

    it('should return undefined for non-existent node', () => {
      expect(session.getNode('nonexistent')).toBeUndefined();
    });
  });

  describe('limits validation', () => {
    it('should throw on exceeding maxNodesPerQuery', () => {
      const nodes = Array.from({ length: 25 }, (_, i) => createNode(`n${i}`));

      expect(() => session.addData(nodes, [])).toThrow(SessionLimitError);
    });

    it('should throw on exceeding maxEdgesPerQuery', () => {
      const nodes = [createNode('n1'), createNode('n2')];
      const edges = Array.from({ length: 55 }, (_, i) => createEdge(`e${i}`, 'n1', 'n2'));

      expect(() => session.addData(nodes, edges)).toThrow(SessionLimitError);
    });

    it('should throw on exceeding maxNodes total', () => {
      // Add nodes in batches to stay under per-query limit
      for (let batch = 0; batch < 5; batch++) {
        const nodes = Array.from({ length: 20 }, (_, i) =>
          createNode(`n${batch * 20 + i}`)
        );
        session.addData(nodes, []);
      }

      // This should exceed the total limit
      const extraNodes = Array.from({ length: 10 }, (_, i) => createNode(`extra${i}`));
      expect(() => session.addData(extraNodes, [])).toThrow(SessionLimitError);
    });

    it('should include limit details in error', () => {
      const nodes = Array.from({ length: 25 }, (_, i) => createNode(`n${i}`));

      try {
        session.addData(nodes, []);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SessionLimitError);
        const limitError = error as SessionLimitError;
        expect(limitError.limitType).toBe('maxNodesPerQuery');
        expect(limitError.limit).toBe(20);
        expect(limitError.attempted).toBe(25);
      }
    });
  });

  describe('isNearLimit', () => {
    it('should return true when approaching node limit', () => {
      const session80 = new SessionManager({
        limits: {
          maxNodes: 100,
          maxEdges: 200,
          maxNodesPerQuery: 100,
          maxEdgesPerQuery: 200,
          maxNeighborhoodDepth: 3,
          maxPathLength: 10,
        },
        limitWarnThreshold: 0.8,
      });

      const nodes = Array.from({ length: 85 }, (_, i) => createNode(`n${i}`));
      session80.addData(nodes, []);

      expect(session80.isNearLimit()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all data', () => {
      session.addData([createNode('n1'), createNode('n2')], []);
      session.clear();

      const graph = session.getGraph();
      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
    });

    it('should reset query count', () => {
      session.addData([createNode('n1')], []);
      session.clear();

      expect(session.getState().queryCount).toBe(0);
    });
  });

  describe('caching', () => {
    it('should cache query results', () => {
      const query = { type: 'node' as const, labels: ['Test'] };
      const graph = { nodes: [createNode('n1')], edges: [] };

      session.setCache(query, graph);
      const cached = session.getCached(query);

      expect(cached).toBeDefined();
      expect(cached?.nodes).toHaveLength(1);
    });

    it('should return undefined for uncached queries', () => {
      const query = { type: 'node' as const, labels: ['Unknown'] };
      expect(session.getCached(query)).toBeUndefined();
    });

    it('should provide cache stats', () => {
      const query = { type: 'node' as const, labels: ['Test'] };
      const graph = { nodes: [], edges: [] };

      session.setCache(query, graph);
      session.getCached(query); // hit
      session.getCached({ type: 'node' as const }); // miss

      const stats = session.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should clear cache on session clear', () => {
      const query = { type: 'node' as const, labels: ['Test'] };
      session.setCache(query, { nodes: [], edges: [] });
      session.clear();

      expect(session.getCached(query)).toBeUndefined();
    });
  });

  describe('applyPatch', () => {
    it('should apply external patches', () => {
      const patch = PatchEngine.createAddPatch([createNode('n1')], []);

      session.applyPatch(patch);

      expect(session.getGraph().nodes).toHaveLength(1);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = session.getConfig();

      expect(config.limits.maxNodes).toBe(100);
      expect(config.limits.maxEdges).toBe(200);
    });
  });
});
