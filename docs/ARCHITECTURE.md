# QueryScape Architecture

## Overview

QueryScape is a modular graph visualization toolkit designed for exploring large graph databases. It follows a connector-based architecture that abstracts database-specific implementations behind a unified query interface.

## Design Principles

1. **Minimal Dependencies**: Core functionality works without heavy frameworks
2. **Query-Driven Exploration**: Never load entire databases; always paginate and limit
3. **Incremental Updates**: Patch-based model for efficient UI updates
4. **Optional Acceleration**: Rust sidecar for heavy operations with TS fallbacks
5. **Type Safety**: Full TypeScript strict mode throughout

## Package Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│         (apps/demo-web, custom applications)                 │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌───────────────────┐
│  @queryscape/ │   │   @queryscape/  │   │    @queryscape/   │
│  renderer-    │   │      core       │   │       cli         │
│  cytoscape    │   │                 │   │                   │
└───────────────┘   └─────────────────┘   └───────────────────┘
        │                   │                       │
        │           ┌───────┴───────┐               │
        │           ▼               ▼               │
        │   ┌───────────────┐ ┌───────────────┐     │
        │   │  @queryscape/ │ │ Rust          │     │
        │   │  connectors   │ │ Accelerator   │     │
        │   └───────────────┘ └───────────────┘     │
        │           │                               │
        ▼           ▼                               ▼
   ┌─────────┐  ┌──────────────────────────────────────┐
   │Cytoscape│  │         Graph Databases              │
   │   .js   │  │  (Neo4j, Neptune, Cosmos, Stardog)   │
   └─────────┘  └──────────────────────────────────────┘
```

## Core Package (@queryscape/core)

### Session Manager

The `GraphSession` is the central coordination point:

```typescript
class GraphSession {
  // State management
  private state: GraphData;
  private patchHistory: GraphPatch[];

  // Subsystems
  private limiter: LimitsEnforcer;
  private cache: QueryCache;
  private connector: Connector;

  // Operations
  async executeQuery(query: Query): Promise<QueryResult>;
  addNodes(nodes: GraphNode[]): GraphPatch;
  removeNodes(nodeIds: NodeId[]): GraphPatch;
  undo(): GraphPatch | null;
}
```

### Query Model

Queries are type-safe and database-agnostic:

```typescript
type Query =
  | GetNodeQuery
  | GetNeighborsQuery
  | FindNodesQuery
  | FindPathQuery
  | ExpandNodeQuery
  | SearchQuery
  | SampleQuery
  | RawQuery;
```

The `QueryBuilder` provides a fluent interface:

```typescript
const qb = createQueryBuilder();

qb.getNeighbors("node-1", "both", { edgeTypes: ["KNOWS"] });
qb.findNodes({ labels: ["Person"], filters: [{ key: "age", op: "gt", value: 21 }] });
qb.search("John", { labels: ["Person"] });
```

### Patch Model

All state changes produce patches for efficient updates:

```typescript
interface GraphPatch {
  id: string;
  timestamp: number;
  nodePatch: NodePatch[];
  edgePatch: EdgePatch[];
}

interface NodePatch {
  operation: "add" | "remove" | "update";
  node: GraphNode;
  previousNode?: GraphNode;
}
```

### Limits Enforcement

Hard limits prevent memory issues:

```typescript
const session = createSession({
  config: {
    maxNodes: 10000,
    maxEdges: 50000,
    maxElementsPerFetch: 500,
  },
});
```

## Connectors Package (@queryscape/connectors)

### Connector Interface

All connectors implement a common interface:

```typescript
interface Connector {
  getId(): string;
  getCapabilities(): ConnectorCapabilities;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  executeQuery(query: Query): Promise<QueryResult>;
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

### Connector Implementations

| Connector | Status | Notes |
|-----------|--------|-------|
| Mock | Complete | Full implementation for testing |
| Neo4j | Complete | Production-ready, uses neo4j-driver |
| Neptune | Skeleton | Gremlin-based, needs implementation |
| Cosmos | Skeleton | Gremlin-based, needs implementation |
| Stardog | Skeleton | SPARQL-based, RDF mapping |

## Renderer Package (@queryscape/renderer-cytoscape)

### GraphRenderer

Wraps Cytoscape.js with a clean API:

```typescript
class GraphRenderer {
  setData(data: GraphData): void;
  applyPatch(patch: GraphPatch): void;
  highlightSearch(text: string): NodeId[];
  focusNode(nodeId: NodeId): void;
  runLayout(options?: LayoutOptions): void;
  setTheme(theme: Partial<Theme>): void;
}
```

### Layout System

Supports multiple algorithms:

- `cose` - Force-directed (default)
- `cola` - Constraint-based (extension)
- `dagre` - Hierarchical (extension)
- `grid`, `circle`, `concentric`, `breadthfirst`

### Theme System

Declarative theming without React dependency:

```typescript
interface Theme {
  nodeColor: string;
  nodeBorderColor: string;
  nodeSize: number;
  edgeColor: string;
  edgeWidth: number;
  textColor: string;
  fontSize: number;
  // ...
}
```

## Rust Accelerator

### Communication Protocol

JSON-RPC 2.0 over stdin/stdout:

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sample.randomWalk",
  "params": {
    "nodes": [...],
    "edges": [...],
    "startNodeId": "n1",
    "walkLength": 100,
    "numWalks": 10
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "sampledNodes": [...],
    "sampledEdges": [...]
  }
}
```

### Fallback Strategy

The `AcceleratorClient` automatically falls back to TypeScript:

```typescript
async randomSample(data: GraphData, count: number): Promise<SampleResult> {
  if (this.available) {
    try {
      return await this.rpc("sample.random", { ...data, count });
    } catch {
      // Fall back to TS implementation
    }
  }
  return fallback.randomSample(data, count);
}
```

## Data Flow

### Query Execution

```
User Action
    │
    ▼
QueryBuilder.buildQuery()
    │
    ▼
Session.executeQuery(query)
    │
    ├── Check cache
    │       │
    │       ▼ (miss)
    ├── Connector.executeQuery(query)
    │       │
    │       ▼
    ├── LimitsEnforcer.enforce()
    │       │
    │       ▼
    ├── Session.mergeData()
    │       │
    │       ▼
    └── Calculate GraphPatch
            │
            ▼
    Renderer.applyPatch(patch)
            │
            ▼
    Cytoscape.batch(() => { ... })
```

### Undo/Redo

```
Session State
    │
    ├── patchHistory: [p1, p2, p3]
    │                          ▲
    │                          │ (current)
    └── undoStack: []

After undo():
    │
    ├── patchHistory: [p1, p2]
    │                      ▲
    │                      │ (current)
    └── undoStack: [p3]
```

## Performance Considerations

### Recommended Limits

| Metric | Recommended | Hard Limit |
|--------|-------------|------------|
| Nodes in session | 5,000 | 10,000 |
| Edges in session | 25,000 | 50,000 |
| Elements per fetch | 100 | 500 |
| Layout animation | 500ms | 1000ms |

### Optimization Strategies

1. **Use sampling** for initial exploration
2. **Expand incrementally** rather than loading large subgraphs
3. **Enable caching** for repeated queries
4. **Use Rust accelerator** for graphs > 1000 nodes
5. **Disable animation** for large updates

## Security

See [SECURITY.md](SECURITY.md) for security guidelines.

## Extension Points

### Custom Connectors

```typescript
class MyConnector extends BaseConnector {
  getCapabilities(): ConnectorCapabilities { ... }
  connect(): Promise<void> { ... }
  disconnect(): Promise<void> { ... }
  executeQuery(query: Query): Promise<QueryResult> { ... }
}
```

### Custom Layouts

Register Cytoscape extensions:

```typescript
import cola from "cytoscape-cola";
cytoscape.use(cola);

renderer.runLayout({ algorithm: "cola" });
```

### Custom Themes

```typescript
const myTheme: Theme = {
  ...DEFAULT_THEME,
  nodeColor: "#custom",
};

createRenderer({ theme: myTheme });
```
