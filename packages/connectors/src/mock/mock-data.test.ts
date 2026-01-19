import { describe, it, expect } from 'vitest';

import { generateMockData } from './mock-data';

describe('generateMockData', () => {
  it('should generate specified number of nodes', () => {
    const data = generateMockData({ nodeCount: 50 });
    expect(data.nodes.length).toBe(50);
  });

  it('should generate edges based on edgesPerNode', () => {
    const data = generateMockData({ nodeCount: 20, edgesPerNode: 3 });
    // Should have approximately nodeCount * edgesPerNode edges
    // (may be less due to deduplication and self-loop prevention)
    expect(data.edges.length).toBeGreaterThan(0);
    expect(data.edges.length).toBeLessThanOrEqual(20 * 3);
  });

  it('should be deterministic with seed', () => {
    const data1 = generateMockData({ nodeCount: 30, seed: 12345 });
    const data2 = generateMockData({ nodeCount: 30, seed: 12345 });

    expect(data1.nodes.length).toBe(data2.nodes.length);
    expect(data1.edges.length).toBe(data2.edges.length);

    // Same nodes should be generated
    expect(data1.nodes[0]?.properties.name).toBe(data2.nodes[0]?.properties.name);
  });

  it('should generate different data with different seeds', () => {
    const data1 = generateMockData({ nodeCount: 30, seed: 111 });
    const data2 = generateMockData({ nodeCount: 30, seed: 222 });

    // At least some properties should differ
    const names1 = data1.nodes.map(n => n.properties.name);
    const names2 = data2.nodes.map(n => n.properties.name);

    expect(names1).not.toEqual(names2);
  });

  it('should generate both Person and Company nodes', () => {
    const data = generateMockData({ nodeCount: 100, seed: 42 });

    const personCount = data.nodes.filter(n => n.labels.includes('Person')).length;
    const companyCount = data.nodes.filter(n => n.labels.includes('Company')).length;

    expect(personCount).toBeGreaterThan(0);
    expect(companyCount).toBeGreaterThan(0);
    expect(personCount + companyCount).toBe(100);
  });

  it('should generate Person nodes with expected properties', () => {
    const data = generateMockData({ nodeCount: 50, seed: 42 });
    const person = data.nodes.find(n => n.labels.includes('Person'));

    expect(person).toBeDefined();
    expect(person!.properties).toHaveProperty('name');
    expect(person!.properties).toHaveProperty('firstName');
    expect(person!.properties).toHaveProperty('lastName');
    expect(person!.properties).toHaveProperty('email');
    expect(person!.properties).toHaveProperty('age');
    expect(person!.properties).toHaveProperty('city');
    expect(person!.properties).toHaveProperty('department');
  });

  it('should generate Company nodes with expected properties', () => {
    const data = generateMockData({ nodeCount: 50, seed: 42 });
    const company = data.nodes.find(n => n.labels.includes('Company'));

    expect(company).toBeDefined();
    expect(company!.properties).toHaveProperty('name');
    expect(company!.properties).toHaveProperty('industry');
    expect(company!.properties).toHaveProperty('employees');
    expect(company!.properties).toHaveProperty('founded');
    expect(company!.properties).toHaveProperty('headquarters');
  });

  it('should generate valid edges', () => {
    const data = generateMockData({ nodeCount: 30, edgesPerNode: 2, seed: 42 });

    const nodeIds = new Set(data.nodes.map(n => n.id));

    data.edges.forEach(edge => {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
      expect(edge.source).not.toBe(edge.target); // No self-loops
      expect(edge.type).toBeDefined();
      expect(edge.properties).toHaveProperty('since');
      expect(edge.properties).toHaveProperty('weight');
    });
  });

  it('should generate unique node IDs', () => {
    const data = generateMockData({ nodeCount: 100 });
    const ids = data.nodes.map(n => n.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(100);
  });

  it('should generate unique edge IDs', () => {
    const data = generateMockData({ nodeCount: 50, edgesPerNode: 3 });
    const ids = data.edges.map(e => e.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(data.edges.length);
  });

  it('should not generate duplicate edges', () => {
    const data = generateMockData({ nodeCount: 20, edgesPerNode: 5, seed: 42 });

    const edgeKeys = data.edges.map(e => `${e.source}->${e.target}`);
    const uniqueKeys = new Set(edgeKeys);

    expect(uniqueKeys.size).toBe(edgeKeys.length);
  });

  it('should use default options', () => {
    const data = generateMockData();

    expect(data.nodes.length).toBe(100); // default nodeCount
    expect(data.edges.length).toBeGreaterThan(0);
  });

  it('should handle zero nodes', () => {
    const data = generateMockData({ nodeCount: 0 });

    expect(data.nodes.length).toBe(0);
    expect(data.edges.length).toBe(0);
  });

  it('should handle single node', () => {
    const data = generateMockData({ nodeCount: 1, edgesPerNode: 5 });

    expect(data.nodes.length).toBe(1);
    expect(data.edges.length).toBe(0); // Can't have edges with single node
  });
});
