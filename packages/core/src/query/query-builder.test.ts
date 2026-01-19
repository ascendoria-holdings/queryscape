import { describe, it, expect } from 'vitest';

import { QueryBuilder } from './query-builder';

describe('QueryBuilder', () => {
  describe('nodes()', () => {
    it('should build basic node query', () => {
      const query = QueryBuilder.nodes().build();

      expect(query.type).toBe('node');
      expect(query.limit).toBe(100); // default
      expect(query.offset).toBe(0);
    });

    it('should build query with IDs', () => {
      const query = QueryBuilder.nodes()
        .byIds(['n1', 'n2', 'n3'])
        .build();

      expect(query.ids).toEqual(['n1', 'n2', 'n3']);
    });

    it('should build query with labels', () => {
      const query = QueryBuilder.nodes()
        .withLabels(['Person', 'Employee'])
        .build();

      expect(query.labels).toEqual(['Person', 'Employee']);
    });

    it('should build query with properties', () => {
      const query = QueryBuilder.nodes()
        .withProperties({ name: 'Alice', age: 30 })
        .build();

      expect(query.properties).toEqual({ name: 'Alice', age: 30 });
    });

    it('should respect limit bounds', () => {
      const query = QueryBuilder.nodes()
        .limit(5000) // exceeds max
        .build();

      expect(query.limit).toBe(1000); // capped at max
    });

    it('should respect minimum limit', () => {
      const query = QueryBuilder.nodes()
        .limit(-5)
        .build();

      expect(query.limit).toBe(1); // minimum is 1
    });

    it('should build query with offset', () => {
      const query = QueryBuilder.nodes()
        .offset(50)
        .build();

      expect(query.offset).toBe(50);
    });

    it('should prevent negative offset', () => {
      const query = QueryBuilder.nodes()
        .offset(-10)
        .build();

      expect(query.offset).toBe(0);
    });

    it('should build query with timeout', () => {
      const query = QueryBuilder.nodes()
        .timeout(5000)
        .build();

      expect(query.timeoutMs).toBe(5000);
    });
  });

  describe('edges()', () => {
    it('should build basic edge query', () => {
      const query = QueryBuilder.edges().build();

      expect(query.type).toBe('edge');
    });

    it('should build query with IDs', () => {
      const query = QueryBuilder.edges()
        .byIds(['e1', 'e2'])
        .build();

      expect(query.ids).toEqual(['e1', 'e2']);
    });

    it('should build query with types', () => {
      const query = QueryBuilder.edges()
        .ofTypes(['KNOWS', 'WORKS_AT'])
        .build();

      expect(query.types).toEqual(['KNOWS', 'WORKS_AT']);
    });

    it('should build query with source/target filters', () => {
      const query = QueryBuilder.edges()
        .fromNode('n1')
        .toNode('n2')
        .build();

      expect(query.sourceId).toBe('n1');
      expect(query.targetId).toBe('n2');
    });
  });

  describe('neighborhood()', () => {
    it('should build neighborhood query with node ID', () => {
      const query = QueryBuilder.neighborhood('n1').build();

      expect(query.type).toBe('neighborhood');
      expect(query.nodeId).toBe('n1');
      expect(query.direction).toBe('both'); // default
      expect(query.depth).toBe(1); // default
    });

    it('should build query with direction', () => {
      const outgoing = QueryBuilder.neighborhood('n1')
        .direction('outgoing')
        .build();

      const incoming = QueryBuilder.neighborhood('n1')
        .direction('incoming')
        .build();

      expect(outgoing.direction).toBe('outgoing');
      expect(incoming.direction).toBe('incoming');
    });

    it('should build query with depth', () => {
      const query = QueryBuilder.neighborhood('n1')
        .depth(3)
        .build();

      expect(query.depth).toBe(3);
    });

    it('should cap depth at maximum', () => {
      const query = QueryBuilder.neighborhood('n1')
        .depth(100)
        .build();

      expect(query.depth).toBe(5); // max is 5
    });

    it('should build query with edge type filter', () => {
      const query = QueryBuilder.neighborhood('n1')
        .filterEdgeTypes(['KNOWS', 'FRIEND_OF'])
        .build();

      expect(query.edgeTypes).toEqual(['KNOWS', 'FRIEND_OF']);
    });

    it('should build query with neighbor label filter', () => {
      const query = QueryBuilder.neighborhood('n1')
        .filterNeighborLabels(['Person'])
        .build();

      expect(query.neighborLabels).toEqual(['Person']);
    });
  });

  describe('path()', () => {
    it('should build path query with source and target', () => {
      const query = QueryBuilder.path('n1', 'n5').build();

      expect(query.type).toBe('path');
      expect(query.sourceId).toBe('n1');
      expect(query.targetId).toBe('n5');
      expect(query.shortestOnly).toBe(true); // default
    });

    it('should build query for all paths', () => {
      const query = QueryBuilder.path('n1', 'n5')
        .allPaths()
        .build();

      expect(query.shortestOnly).toBe(false);
    });

    it('should build query with max length', () => {
      const query = QueryBuilder.path('n1', 'n5')
        .maxLength(5)
        .build();

      expect(query.maxLength).toBe(5);
    });

    it('should cap max length', () => {
      const query = QueryBuilder.path('n1', 'n5')
        .maxLength(100)
        .build();

      expect(query.maxLength).toBe(20); // max is 20
    });

    it('should build query with edge type filter', () => {
      const query = QueryBuilder.path('n1', 'n5')
        .filterEdgeTypes(['ROAD'])
        .build();

      expect(query.edgeTypes).toEqual(['ROAD']);
    });
  });

  describe('search()', () => {
    it('should build search query with text', () => {
      const query = QueryBuilder.search('Alice').build();

      expect(query.type).toBe('search');
      expect(query.text).toBe('Alice');
      expect(query.caseSensitive).toBe(false); // default
    });

    it('should build query with field filter', () => {
      const query = QueryBuilder.search('Alice')
        .inFields(['name', 'email'])
        .build();

      expect(query.fields).toEqual(['name', 'email']);
    });

    it('should build query with label filter', () => {
      const query = QueryBuilder.search('Alice')
        .withLabels(['Person'])
        .build();

      expect(query.labels).toEqual(['Person']);
    });

    it('should build case-sensitive query', () => {
      const query = QueryBuilder.search('Alice')
        .caseSensitive()
        .build();

      expect(query.caseSensitive).toBe(true);
    });
  });

  describe('chaining', () => {
    it('should allow fluent chaining', () => {
      const query = QueryBuilder.nodes()
        .withLabels(['Person'])
        .withProperties({ active: true })
        .limit(50)
        .offset(10)
        .timeout(5000)
        .build();

      expect(query.type).toBe('node');
      expect(query.labels).toEqual(['Person']);
      expect(query.properties).toEqual({ active: true });
      expect(query.limit).toBe(50);
      expect(query.offset).toBe(10);
      expect(query.timeoutMs).toBe(5000);
    });
  });
});
