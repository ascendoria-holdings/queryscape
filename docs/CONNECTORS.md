# QueryScape Connectors

This document describes the connector architecture and how to implement custom connectors.

## Overview

Connectors provide a unified interface for querying different graph databases. Each connector translates the QueryScape query model into database-specific queries.

## Available Connectors

### Mock Connector

**Status**: Complete

A fully functional connector for testing and demos that generates random graph data.

```typescript
import { createMockConnector } from "@queryscape/connectors";

const connector = createMockConnector({
  dataOptions: {
    nodeCount: 100,
    edgesPerNode: 3,
    labels: ["Person", "Company"],
    edgeTypes: ["KNOWS", "WORKS_AT"],
    seed: 12345, // Reproducible data
  },
  latencyMs: 50, // Simulate network delay
});
```

### Neo4j Connector

**Status**: Complete

Production-ready connector for Neo4j databases.

```typescript
import { createNeo4jConnector } from "@queryscape/connectors";

const connector = createNeo4jConnector({
  uri: "bolt://localhost:7687",
  username: "neo4j",
  password: "password",
  database: "neo4j", // Optional
  maxConnectionPoolSize: 50,
});
```

**Supported Queries**:
- `getNode` - Get node by ID
- `getNeighbors` - Get connected nodes
- `findNodes` - Find by labels and properties
- `findPath` - Shortest path
- `expandNode` - BFS expansion
- `search` - Property-based search
- `raw` - Raw Cypher queries (unsafe mode)

### Neptune Connector

**Status**: Skeleton

Amazon Neptune connector using Gremlin protocol.

```typescript
import { createNeptuneConnector } from "@queryscape/connectors";

const connector = createNeptuneConnector({
  endpoint: "your-cluster.neptune.amazonaws.com",
  port: 8182,
  ssl: true,
  iamAuth: {
    region: "us-east-1",
    // Uses default AWS credentials if not specified
  },
});
```

### Cosmos DB Gremlin Connector

**Status**: Skeleton

Azure Cosmos DB connector using Gremlin API.

```typescript
import { createCosmosGremlinConnector } from "@queryscape/connectors";

const connector = createCosmosGremlinConnector({
  endpoint: "wss://your-account.gremlin.cosmos.azure.com:443/",
  primaryKey: "your-primary-key",
  database: "graphdb",
  container: "graph",
});
```

### Stardog SPARQL Connector

**Status**: Skeleton

Stardog connector using SPARQL protocol with RDF-to-property-graph mapping.

```typescript
import { createStardogConnector } from "@queryscape/connectors";

const connector = createStardogConnector({
  endpoint: "http://localhost:5820",
  database: "mydb",
  username: "admin",
  password: "admin",
  namedGraph: "http://example.org/graph", // Optional
});
```

## Connector Interface

```typescript
interface Connector {
  /** Get unique connector ID */
  getId(): string;

  /** Get connector capabilities */
  getCapabilities(): ConnectorCapabilities;

  /** Connect to data source */
  connect(): Promise<void>;

  /** Disconnect from data source */
  disconnect(): Promise<void>;

  /** Check if connected */
  isConnected(): boolean;

  /** Execute a query */
  executeQuery(query: Query): Promise<QueryResult>;

  /** Test connection */
  testConnection(): Promise<boolean>;
}

interface ConnectorCapabilities {
  connectorType: string;
  supportedQueryTypes: QueryType[];
  supportsFullTextSearch: boolean;
  supportsPagination: boolean;
  supportsRawQueries: boolean;
  maxPageSize: number;
}
```

## Query Types

### GetNode

Retrieve a single node by ID.

```typescript
{
  type: "getNode",
  nodeId: "node-123"
}
```

### GetNeighbors

Get nodes connected to a given node.

```typescript
{
  type: "getNeighbors",
  nodeId: "node-123",
  direction: "both" | "outgoing" | "incoming",
  edgeTypes: ["KNOWS", "WORKS_AT"], // Optional filter
  maxDepth: 1,
  pagination: { limit: 100 }
}
```

### FindNodes

Search for nodes by labels and properties.

```typescript
{
  type: "findNodes",
  labelFilter: {
    labels: ["Person"],
    mode: "any" | "all"
  },
  propertyFilters: [
    { key: "age", op: "gt", value: 21 },
    { key: "name", op: "contains", value: "John" }
  ],
  pagination: { limit: 100 }
}
```

### FindPath

Find shortest path between two nodes.

```typescript
{
  type: "findPath",
  sourceId: "node-1",
  targetId: "node-2",
  maxLength: 5,
  edgeTypes: ["KNOWS"] // Optional filter
}
```

### ExpandNode

Expand from a node to a specified depth (BFS).

```typescript
{
  type: "expandNode",
  nodeId: "node-123",
  direction: "both",
  depth: 2,
  edgeTypes: ["KNOWS"],
  nodeLabels: ["Person"],
  pagination: { limit: 100 }
}
```

### Search

Full-text search across node properties.

```typescript
{
  type: "search",
  text: "John Smith",
  fields: ["name", "email"], // Optional
  labels: ["Person"], // Optional
  pagination: { limit: 100 }
}
```

### Sample

Random or strategic sampling.

```typescript
{
  type: "sample",
  strategy: "random" | "randomWalk" | "frontier",
  count: 50,
  startNodeId: "node-1" // Required for randomWalk
}
```

### Raw

Execute raw database queries (unsafe mode).

```typescript
{
  type: "raw",
  query: "MATCH (n:Person) RETURN n LIMIT 10",
  parameters: { limit: 10 }
}
```

## Creating Custom Connectors

### Basic Structure

```typescript
import {
  BaseConnector,
  ConnectorCapabilities,
  Query,
  QueryResult,
} from "@queryscape/connectors";

class MyConnector extends BaseConnector {
  constructor(config: MyConnectorConfig) {
    super(config);
    this.config = config;
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      connectorType: "my-database",
      supportedQueryTypes: ["getNode", "getNeighbors", "findNodes"],
      supportsFullTextSearch: true,
      supportsPagination: true,
      supportsRawQueries: false,
      maxPageSize: 1000,
    };
  }

  async connect(): Promise<void> {
    // Initialize connection
    this.client = await MyDatabase.connect(this.config);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    await this.client?.close();
    this.connected = false;
  }

  async executeQuery(query: Query): Promise<QueryResult> {
    this.ensureConnected();
    this.checkQuerySupported(query.type);

    const startTime = Date.now();

    // Translate and execute query
    const result = await this.translateAndExecute(query);

    return {
      data: result,
      metadata: {
        executionTimeMs: Date.now() - startTime,
        totalAvailable: null,
        truncated: false,
        cursor: null,
      },
    };
  }

  private async translateAndExecute(query: Query): Promise<GraphData> {
    switch (query.type) {
      case "getNode":
        return this.executeGetNode(query);
      case "getNeighbors":
        return this.executeGetNeighbors(query);
      // ... other query types
    }
  }
}
```

### Best Practices

1. **Use capability handshake**: Declare exactly what your connector supports
2. **Respect pagination**: Always honor limit parameters
3. **Handle errors gracefully**: Throw typed errors from `@queryscape/core`
4. **Map to common model**: Convert database-specific types to `GraphNode`/`GraphEdge`
5. **Avoid raw queries by default**: Gate behind explicit unsafe mode
6. **Cache connections**: Reuse connection pools where possible

## Error Handling

Use typed errors from the core package:

```typescript
import {
  ConnectionError,
  AuthError,
  QueryError,
  QueryNotSupportedError,
} from "@queryscape/connectors";

// Connection failed
throw new ConnectionError("Failed to connect", host, port);

// Authentication failed
throw new AuthError("Invalid credentials");

// Query execution failed
throw new QueryError("Syntax error in query", queryType);

// Query type not supported
throw new QueryNotSupportedError("fullTextSearch not available", "search");
```

## Testing Connectors

Use the mock connector as a reference and test fixture:

```typescript
import { createMockConnector } from "@queryscape/connectors";
import { createSession } from "@queryscape/core";

describe("MyConnector", () => {
  it("should execute getNode query", async () => {
    const connector = createMockConnector();
    const session = createSession();

    await session.connect(connector);

    const result = await session.executeQuery({
      type: "getNode",
      nodeId: "n0",
    });

    expect(result.data.nodes).toHaveLength(1);
  });
});
```
