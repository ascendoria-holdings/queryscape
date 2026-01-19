# Queryscape

A lightweight, cross-platform graph database visualization toolkit built on Cytoscape.js.

## Features

- **Multi-database support**: Neo4j, Amazon Neptune, Azure Cosmos DB (Gremlin), Stardog (SPARQL/RDF)
- **Query-driven exploration**: Progressive loading, pagination, neighborhood expansion
- **Incremental updates**: Efficient patch-based rendering updates
- **Optional Rust accelerator**: High-performance graph algorithms with pure TypeScript fallbacks
- **Minimal dependencies**: Works with a simple `npm install`

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the demo app
pnpm demo
```

## Packages

| Package | Description |
| ------- | ----------- |
| `@queryscape/core` | Session management, caching, query model, patch engine |
| `@queryscape/connectors` | Database connectors (Neo4j, Neptune, Cosmos, Stardog, Mock) |
| `@queryscape/renderer-cytoscape` | Cytoscape.js wrapper with theming and interactions |
| `@queryscape/cli` | Command-line interface for exploration |

## Usage

### Basic Example

```typescript
import { createSession, createQueryBuilder } from "@queryscape/core";
import { createMockConnector } from "@queryscape/connectors";

// Create a session
const session = createSession({
  config: {
    maxNodes: 10000,
    maxEdges: 50000,
  },
});

// Connect to a data source
const connector = createMockConnector();
await session.connect(connector);

// Execute queries
const qb = createQueryBuilder();
const result = await session.executeQuery(
  qb.getNeighbors("node-1", "both")
);

console.log(`Found ${result.data.nodes.length} nodes`);
```

### With Cytoscape Rendering

```typescript
import cytoscape from "cytoscape";
import { createSession } from "@queryscape/core";
import { createMockConnector } from "@queryscape/connectors";
import { createRenderer } from "@queryscape/renderer-cytoscape";

// Set up session
const session = createSession();
await session.connect(createMockConnector());

// Create renderer
const renderer = createRenderer({
  cytoscape,
  container: document.getElementById("graph"),
  data: session.getData(),
});

// Handle interactions
renderer.setEventHandlers({
  onNodeClick: (nodeId, node) => {
    console.log("Clicked:", node);
  },
  onNodeDoubleClick: async (nodeId) => {
    // Expand neighbors
    await session.executeQuery({ type: "expandNode", nodeId, depth: 1 });
    renderer.setData(session.getData());
  },
});
```

### Neo4j Connection

```typescript
import { createSession } from "@queryscape/core";
import { createNeo4jConnector } from "@queryscape/connectors";

const session = createSession();

await session.connect(
  createNeo4jConnector({
    uri: "bolt://localhost:7687",
    username: "neo4j",
    password: "password",
    database: "neo4j",
  })
);

const result = await session.executeQuery({
  type: "search",
  text: "John",
  labels: ["Person"],
});
```

## Configuration

### Session Limits

```typescript
const session = createSession({
  config: {
    maxNodes: 10000,        // Maximum nodes in session
    maxEdges: 50000,        // Maximum edges in session
    maxElementsPerFetch: 500, // Max elements per query
    cacheTtlMs: 300000,     // Cache TTL (5 minutes)
    enableAccelerator: true, // Use Rust accelerator if available
  },
});
```

### Themes

```typescript
import { createRenderer, DARK_THEME } from "@queryscape/renderer-cytoscape";

const renderer = createRenderer({
  // ...
  theme: DARK_THEME,
});

// Or customize
renderer.setTheme({
  nodeColor: "#4A90D9",
  edgeColor: "#999999",
  nodeSize: 40,
});
```

## Rust Accelerator

The optional Rust accelerator provides high-performance implementations of:

- Random sampling
- Random walk sampling
- Frontier (BFS) sampling
- Community detection (planned)

### Building the Accelerator

```bash
cd rust/accelerator
cargo build --release
```

The accelerator communicates via JSON-RPC over stdin/stdout. If not available, the library automatically falls back to TypeScript implementations.

## CLI

```bash
# Interactive exploration
queryscape explore --connector mock

# Connect to Neo4j
queryscape connect --connector neo4j --uri bolt://localhost:7687 --user neo4j --password secret
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

## License

MIT
