/**
 * Mock data generator for testing and demos
 */

import type { GraphNode, GraphEdge, Graph } from '@queryscape/core';

/** Mock data generator options */
export interface MockDataOptions {
  /** Number of nodes to generate (default: 100) */
  nodeCount?: number;
  /** Average edges per node (default: 2) */
  edgesPerNode?: number;
  /** Seed for reproducible data */
  seed?: number;
}

/** Default mock data options */
const DEFAULT_OPTIONS: Required<Omit<MockDataOptions, 'seed'>> = {
  nodeCount: 100,
  edgesPerNode: 2,
};

/** Simple seeded random number generator */
class SeededRandom {
  private state: number;

  constructor(seed?: number) {
    this.state = seed ?? Date.now();
  }

  next(): number {
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return this.state / 0x7fffffff;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  pick<T>(array: readonly T[]): T {
    return array[this.nextInt(array.length)]!;
  }
}

// Sample data for generating realistic mock data
const FIRST_NAMES = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
  'Ivy', 'Jack', 'Kate', 'Liam', 'Mia', 'Noah', 'Olivia', 'Peter',
  'Quinn', 'Rose', 'Sam', 'Tara', 'Uma', 'Victor', 'Wendy', 'Xavier',
  'Yara', 'Zack',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
];

const CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
  'Fort Worth', 'Columbus', 'Charlotte', 'Seattle', 'Denver', 'Boston',
  'Nashville', 'Portland',
];

const DEPARTMENTS = [
  'Engineering', 'Marketing', 'Sales', 'Product', 'Design', 'Finance',
  'HR', 'Legal', 'Operations', 'Research', 'Support', 'Executive',
];

const COMPANY_NAMES = [
  'TechCorp', 'InnovateTech', 'DataDynamics', 'CloudNine', 'NexGen',
  'ByteWorks', 'CyberSolutions', 'DigitalHorizon', 'FutureSoft', 'SmartSystems',
  'GlobalTech', 'PrimeSoft', 'AlphaInc', 'BetaCorp', 'GammaLabs',
];

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing',
  'Energy', 'Telecommunications', 'Transportation', 'Media', 'Education',
];

const EDGE_TYPES = ['KNOWS', 'WORKS_AT', 'MANAGES', 'REPORTS_TO', 'COLLABORATES'];

/**
 * Generate mock graph data for testing
 */
export function generateMockData(options: MockDataOptions = {}): Graph {
  const nodeCount = options.nodeCount ?? DEFAULT_OPTIONS.nodeCount;
  const edgesPerNode = options.edgesPerNode ?? DEFAULT_OPTIONS.edgesPerNode;
  const random = new SeededRandom(options.seed);

  if (nodeCount === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>(); // Track unique source->target pairs

  // Generate nodes - roughly 70% Person, 30% Company
  for (let i = 0; i < nodeCount; i++) {
    const isPerson = random.next() < 0.7;

    if (isPerson) {
      const firstName = random.pick(FIRST_NAMES);
      const lastName = random.pick(LAST_NAMES);
      nodes.push({
        id: `n${i}`,
        labels: ['Person'],
        properties: {
          name: `${firstName} ${lastName}`,
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          age: 22 + random.nextInt(43), // 22-64
          city: random.pick(CITIES),
          department: random.pick(DEPARTMENTS),
        },
      });
    } else {
      const companyName = random.pick(COMPANY_NAMES);
      nodes.push({
        id: `n${i}`,
        labels: ['Company'],
        properties: {
          name: `${companyName} ${random.nextInt(1000)}`,
          industry: random.pick(INDUSTRIES),
          employees: 10 + random.nextInt(9990),
          founded: 1950 + random.nextInt(74),
          headquarters: random.pick(CITIES),
        },
      });
    }
  }

  // Generate edges
  const totalEdges = nodeCount * edgesPerNode;
  let edgeId = 0;

  for (let i = 0; i < totalEdges && nodeCount > 1; i++) {
    const sourceIdx = random.nextInt(nodeCount);
    let targetIdx = random.nextInt(nodeCount);

    // Avoid self-loops
    let attempts = 0;
    while (targetIdx === sourceIdx && attempts < 10) {
      targetIdx = random.nextInt(nodeCount);
      attempts++;
    }

    if (targetIdx === sourceIdx) {
      continue; // Skip if we can't find a different target
    }

    const source = `n${sourceIdx}`;
    const target = `n${targetIdx}`;
    const edgeKey = `${source}->${target}`;

    // Skip duplicate edges
    if (edgeSet.has(edgeKey)) {
      continue;
    }

    edgeSet.add(edgeKey);

    const type = random.pick(EDGE_TYPES);
    edges.push({
      id: `e${edgeId++}`,
      source,
      target,
      type,
      properties: {
        since: 2000 + random.nextInt(24), // 2000-2023
        weight: Math.round(random.next() * 100) / 100,
      },
    });
  }

  return { nodes, edges };
}
