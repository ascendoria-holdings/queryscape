# Contributing to Queryscape

Thank you for your interest in contributing to Queryscape!

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Rust 1.75+ (optional, for accelerator)

### Setup

```bash
# Clone the repository
git clone https://github.com/queryscape/queryscape.git
cd queryscape

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Messages

Follow conventional commits:

```
feat(core): add session export functionality
fix(connectors): handle Neo4j connection timeout
docs: update API documentation
refactor(renderer): simplify layout logic
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run `pnpm test` and `pnpm lint`
6. Create a pull request

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use explicit return types for public functions
- Use type imports: `import type { ... }`

```typescript
// Good
export function createSession(options?: SessionOptions): GraphSession {
  // ...
}

// Avoid
export function createSession(options) {
  // ...
}
```

### Formatting

```bash
# Format code
pnpm format

# Check formatting
pnpm format:check
```

### Linting

```bash
# Run linter
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests for a specific package
pnpm --filter @queryscape/core test
```

### Writing Tests

Use Vitest with descriptive test names:

```typescript
import { describe, it, expect } from "vitest";

describe("GraphSession", () => {
  describe("executeQuery", () => {
    it("should return matching nodes for getNode query", async () => {
      const session = createSession();
      // ...
      expect(result.data.nodes).toHaveLength(1);
    });

    it("should throw when not connected", async () => {
      const session = createSession();
      await expect(session.executeQuery(query)).rejects.toThrow(ValidationError);
    });
  });
});
```

## Adding Features

### New Query Types

1. Add type to `packages/core/src/query/index.ts`
2. Update `QueryBuilder` methods
3. Implement in mock connector
4. Implement in other connectors
5. Add tests

### New Connectors

1. Create directory `packages/connectors/src/my-connector/`
2. Extend `BaseConnector`
3. Implement `getCapabilities()` and `executeQuery()`
4. Export from `packages/connectors/src/index.ts`
5. Add documentation to `docs/CONNECTORS.md`
6. Add tests

### New Accelerator Operations

1. Add protocol types to `rust/accelerator/src/protocol.rs`
2. Implement algorithm in `rust/accelerator/src/`
3. Add handler in `main.rs`
4. Add TypeScript fallback in `packages/core/src/accelerator/fallback.ts`
5. Add client method in `packages/core/src/accelerator/client.ts`

## Documentation

### Code Comments

Document public APIs with JSDoc:

```typescript
/**
 * Create a new graph session
 *
 * @param options - Session configuration options
 * @returns A new GraphSession instance
 *
 * @example
 * ```typescript
 * const session = createSession({
 *   config: { maxNodes: 10000 }
 * });
 * ```
 */
export function createSession(options?: SessionOptions): GraphSession {
  // ...
}
```

### README Updates

Update relevant READMEs when adding features:

- `README.md` - Main documentation
- `packages/*/README.md` - Package-specific docs

## Changesets

For any changes that affect users, add a changeset:

```bash
pnpm changeset
```

Select the affected packages and describe the change.

## Release Process

Releases are automated via GitHub Actions:

1. Changesets are collected in `.changeset/`
2. PR merges trigger changeset processing
3. Version bumps and CHANGELOGs are generated
4. Packages are published to npm

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Questions?

- Open a GitHub issue for bugs or features
- Use Discussions for questions
- Check existing issues before creating new ones

Thank you for contributing!
