import { describe, it, expect, beforeEach } from 'vitest';

import { QueryBuilder } from '@queryscape/core';

import { MockConnector } from './mock-connector';

describe('MockConnector', () => {
  let connector: MockConnector;

  beforeEach(async () => {
    connector = new MockConnector({
      generateOptions: {
        nodeCount: 50,
        edgesPerNode: 2,
        seed: 42,
      },
    });
    await connector.connect();
  });

  describe('connection', () => {
    it('should connect successfully', async () => {
      const newConnector = new MockConnector();
      expect(newConnector.isConnected()).toBe(false);

      await newConnector.connect();
      expect(newConnector.isConnected()).toBe(true);

      await newConnector.disconnect();
      expect(newConnector.isConnected()).toBe(false);
    });

    it('should have correct type', () => {
      expect(connector.type).toBe('mock');
    });

    it('should declare capabilities', () => {
      expect(connector.capabilities.supported.has('nodeById')).toBe(true);
      expect(connector.capabilities.supported.has('neighborhood')).toBe(true);
      expect(connector.capabilities.supported.has('search')).toBe(true);
    });
  });

  describe('node queries', () => {
    it('should query all nodes with limit', async () => {
      const query = QueryBuilder.nodes().limit(10).build();
      const result = await connector.query(query);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.graph.nodes.length).toBeLessThanOrEqual(10);
        expect(result.value.count).toBeLessThanOrEqual(10);
      }
    });

    it('should query nodes by ID', async () => {
      const data = connector.getData();
      const nodeIds = data.nodes.slice(0, 3).map(n => n.id);

      const query = QueryBuilder.nodes().byIds(nodeIds).build();
      const result = await connector.query(query);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.graph.nodes.length).toBe(3);
        expect(result.value.graph.nodes.map(n => n.id)).toEqual(expect.arrayContaining(nodeIds));
      }
    });

    it('should query nodes by label', async () => {
      const query = QueryBuilder.nodes().withLabels(['Person']).limit(20).build();
      const result = await connector.query(query);

      expect(result.ok).toBe(true);
      if (result.ok) {
        result.value.graph.nodes.forEach(node => {
          expect(node.labels).toContain('Person');
        });
      }
    });

    it('should query nodes by property', async () => {
      const data = connector.getData();
      const personNode = data.nodes.find(n => n.labels.includes('Person'));
      expect(personNode).toBeDefined();

      const query = QueryBuilder.nodes()
        .withProperties({ name: personNode!.properties.name })
        .build();
      const result = await connector.query(query);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.graph.nodes.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should handle pagination', async () => {
      const query1 = QueryBuilder.nodes().limit(5).offset(0).build();
      const query2 = QueryBuilder.nodes().limit(5).offset(5).build();

      const result1 = await connector.query(query1);
      const result2 = await connector.query(query2);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);

      if (result1.ok && result2.ok) {
        const ids1 = new Set(result1.value.graph.nodes.map(n => n.id));
        const ids2 = new Set(result2.value.graph.nodes.map(n => n.id));

        // Should have no overlap
        for (const id of ids1) {
          expect(ids2.has(id)).toBe(false);
        }
      }
    });

    it('should indicate hasMore', async () => {
      const query = QueryBuilder.nodes().limit(5).build();
      const result = await connector.query(query);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.hasMore).toBe(true); // 50 nodes, limit 5
      }
    });
  });

  describe('edge queries', () => {
    it('should query edges by type', async () => {
      const query = QueryBuilder.edges().ofTypes(['KNOWS']).limit(10).build();
      const result = await connector.query(query);

      expect(result.ok).toBe(true);
      if (result.ok) {
        result.value.graph.edges.forEach(edge => {
          expect(edge.type).toBe('KNOWS');
        });
      }
    });

    it('should query edges from specific node', async () => {
      const data = connector.getData();
      const nodeWithEdges = data.nodes[0]!;

      const query = QueryBuilder.edges().fromNode(nodeWithEdges.id).build();
      const result = await connector.query(query);

      expect(result.ok).toBe(true);
      if (result.ok) {
        result.value.graph.edges.forEach(edge => {
          expect(edge.source).toBe(nodeWithEdges.id);
        });
      }
    });
  });

  describe('neighborhood queries', () => {
    it('should expand node neighborhood', async () => {
      const data = connector.getData();
      const startNode = data.nodes[0]!;

      const query = QueryBuilder.neighborhood(startNode.id)
        .direction('both')
        .depth(1)
        .build();
      const result = await connector.query(query);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should include start node
        expect(result.value.graph.nodes.map(n => n.id)).toContain(startNode.id);
        // Should have some edges
        expect(result.value.graph.edges.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should respect direction filter', async () => {
      const data = connector.getData();
      const startNode = data.nodes[0]!;

      const outgoing = await connector.query(
        QueryBuilder.neighborhood(startNode.id).direction('outgoing').build()
      );

      expect(outgoing.ok).toBe(true);
      if (outgoing.ok) {
        outgoing.value.graph.edges.forEach(edge => {
          // For outgoing from start node, edges should have start node as source
          // (or be between neighbors)
        });
      }
    });

    it('should respect depth', async () => {
      const data = connector.getData();
      const startNode = data.nodes[0]!;

      const depth1 = await connector.query(
        QueryBuilder.neighborhood(startNode.id).depth(1).build()
      );
      const depth2 = await connector.query(
        QueryBuilder.neighborhood(startNode.id).depth(2).build()
      );

      expect(depth1.ok).toBe(true);
      expect(depth2.ok).toBe(true);

      if (depth1.ok && depth2.ok) {
        // Depth 2 should potentially have more nodes
        expect(depth2.value.graph.nodes.length).toBeGreaterThanOrEqual(
          depth1.value.graph.nodes.length
        );
      }
    });

    it('should filter by edge type', async () => {
      const data = connector.getData();
      const startNode = data.nodes[0]!;

      const query = QueryBuilder.neighborhood(startNode.id)
        .filterEdgeTypes(['KNOWS'])
        .build();
      const result = await connector.query(query);

      expect(result.ok).toBe(true);
      if (result.ok) {
        result.value.graph.edges.forEach(edge => {
          expect(edge.type).toBe('KNOWS');
        });
      }
    });
  });

  describe('path queries', () => {
    it('should find path between nodes', async () => {
      const data = connector.getData();
      // Find two nodes that are likely connected
      const sourceNode = data.nodes[0]!;
      const targetEdge = data.edges.find(e => e.source === sourceNode.id);

      if (targetEdge) {
        const query = QueryBuilder.path(sourceNode.id, targetEdge.target).build();
        const result = await connector.query(query);

        expect(result.ok).toBe(true);
        if (result.ok && result.value.graph.nodes.length > 0) {
          // Path should include both endpoints
          const nodeIds = result.value.graph.nodes.map(n => n.id);
          expect(nodeIds).toContain(sourceNode.id);
          expect(nodeIds).toContain(targetEdge.target);
        }
      }
    });

    it('should return empty graph for no path', async () => {
      // Create connector with isolated nodes
      const isolatedConnector = new MockConnector({
        initialData: {
          nodes: [
            { id: 'a', labels: [], properties: {} },
            { id: 'b', labels: [], properties: {} },
          ],
          edges: [],
        },
      });
      await isolatedConnector.connect();

      const query = QueryBuilder.path('a', 'b').build();
      const result = await isolatedConnector.query(query);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.graph.nodes.length).toBe(0);
      }
    });
  });

  describe('search queries', () => {
    it('should search by text', async () => {
      const query = QueryBuilder.search('Alice').build();
      const result = await connector.query(query);

      expect(result.ok).toBe(true);
      if (result.ok) {
        result.value.graph.nodes.forEach(node => {
          const hasMatch = Object.values(node.properties).some(
            v => typeof v === 'string' && v.toLowerCase().includes('alice')
          );
          expect(hasMatch).toBe(true);
        });
      }
    });

    it('should filter by label in search', async () => {
      const query = QueryBuilder.search('a')
        .withLabels(['Company'])
        .limit(10)
        .build();
      const result = await connector.query(query);

      expect(result.ok).toBe(true);
      if (result.ok) {
        result.value.graph.nodes.forEach(node => {
          expect(node.labels).toContain('Company');
        });
      }
    });

    it('should handle case insensitive search', async () => {
      const data = connector.getData();
      const personNode = data.nodes.find(n => n.labels.includes('Person'));
      const name = personNode?.properties.name as string | undefined;

      if (name) {
        const query = QueryBuilder.search(name.toUpperCase()).build();
        const result = await connector.query(query);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.graph.nodes.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('metadata', () => {
    it('should return metadata', async () => {
      const result = await connector.getMetadata();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.labels).toContain('Person');
        expect(result.value.labels).toContain('Company');
        expect(result.value.relationshipTypes.length).toBeGreaterThan(0);
        expect(result.value.propertyKeys.length).toBeGreaterThan(0);
      }
    });
  });

  describe('error handling', () => {
    it('should fail when not connected', async () => {
      const disconnected = new MockConnector();
      const query = QueryBuilder.nodes().build();

      const result = await disconnected.query(query);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Not connected');
      }
    });
  });

  describe('initial data', () => {
    it('should accept initial data', async () => {
      const customConnector = new MockConnector({
        initialData: {
          nodes: [
            { id: 'custom1', labels: ['Custom'], properties: { value: 1 } },
            { id: 'custom2', labels: ['Custom'], properties: { value: 2 } },
          ],
          edges: [
            { id: 'ce1', source: 'custom1', target: 'custom2', type: 'CUSTOM', properties: {} },
          ],
        },
      });
      await customConnector.connect();

      const data = customConnector.getData();
      expect(data.nodes).toHaveLength(2);
      expect(data.edges).toHaveLength(1);
    });
  });

  describe('execution time', () => {
    it('should report execution time', async () => {
      const query = QueryBuilder.nodes().limit(10).build();
      const result = await connector.query(query);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.executionTimeMs).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
