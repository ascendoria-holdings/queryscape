# Security Guidelines

## Overview

QueryScape is designed to connect to production graph databases. This document outlines security best practices for safe usage.

## Credential Management

### Never Hardcode Credentials

```typescript
// BAD - Never do this
const connector = createNeo4jConnector({
  password: "my-secret-password",
});

// GOOD - Use environment variables
const connector = createNeo4jConnector({
  uri: process.env.NEO4J_URI!,
  username: process.env.NEO4J_USER!,
  password: process.env.NEO4J_PASSWORD!,
});
```

### Use Secrets Management

- Use AWS Secrets Manager, Azure Key Vault, or similar services
- Rotate credentials regularly
- Use service accounts with minimal required permissions

### Environment Variables

Create a `.env` file (never commit this):

```bash
# .env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=secret

# AWS credentials for Neptune
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Azure credentials for Cosmos
COSMOS_ENDPOINT=...
COSMOS_PRIMARY_KEY=...
```

## Query Safety

### Avoid Raw Queries

Raw queries bypass the safe query builder and can be dangerous:

```typescript
// UNSAFE - SQL/Cypher injection risk
session.executeQuery({
  type: "raw",
  query: `MATCH (n) WHERE n.name = '${userInput}' RETURN n`, // DANGER!
});

// SAFE - Use parameterized queries
session.executeQuery(
  QueryBuilder.unsafe(
    "MATCH (n) WHERE n.name = $name RETURN n",
    { name: userInput }
  )
);

// SAFEST - Use the query builder
session.executeQuery(
  qb.findNodes({
    filters: [{ key: "name", op: "eq", value: userInput }],
  })
);
```

### Query Validation

The query builder validates inputs:

```typescript
// Throws ValidationError
qb.getNode(""); // Empty nodeId
qb.sample("randomWalk", 10); // Missing startNodeId for randomWalk
```

## Logging

### Sensitive Data Redaction

The logger automatically redacts sensitive fields:

```typescript
import { redactSensitive } from "@queryscape/core";

const context = {
  username: "admin",
  password: "secret123",
  query: "MATCH...",
};

console.log(redactSensitive(context));
// Output: { username: "admin", password: "[REDACTED]", query: "MATCH..." }
```

### Avoid Logging Credentials

```typescript
// BAD
logger.info("Connecting", { uri, username, password });

// GOOD
logger.info("Connecting", { uri, username });
```

## Network Security

### Use TLS/SSL

```typescript
// Neo4j with encryption
createNeo4jConnector({
  uri: "bolt+s://host:7687", // Note: bolt+s for encrypted
});

// Neptune with SSL
createNeptuneConnector({
  endpoint: "cluster.neptune.amazonaws.com",
  ssl: true,
});
```

### Use IAM Authentication

For AWS services, prefer IAM authentication over static credentials:

```typescript
createNeptuneConnector({
  endpoint: "cluster.neptune.amazonaws.com",
  iamAuth: {
    region: "us-east-1",
    // Uses default credential chain
  },
});
```

## Session Security

### Limit Data Exposure

```typescript
const session = createSession({
  config: {
    maxNodes: 10000, // Prevent memory exhaustion
    maxEdges: 50000,
    maxElementsPerFetch: 500, // Limit per-query exposure
  },
});
```

### Clear Sensitive Data

```typescript
// Clear session when switching users/contexts
session.clear();

// Disconnect from database
await session.disconnect();
```

## Browser Security

### Content Security Policy

If using in a browser application:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  connect-src 'self' wss://your-database.com;
  script-src 'self';
">
```

### Avoid Storing Credentials in Frontend

```typescript
// BAD - Credentials in browser
createNeo4jConnector({
  password: localStorage.getItem("password"),
});

// GOOD - Use backend proxy
await fetch("/api/graph/query", {
  method: "POST",
  body: JSON.stringify(query),
});
```

## Rust Accelerator Security

### Binary Verification

Verify binary signatures before deployment:

```bash
# Check binary hash
sha256sum queryscape-accelerator
```

### Sandboxing

The accelerator communicates via stdin/stdout only. It:
- Does not open network connections
- Does not access the filesystem
- Processes only the data sent to it

## Dependency Security

### Regular Updates

```bash
# Check for vulnerabilities
pnpm audit

# Update dependencies
pnpm update
```

### Minimal Dependencies

QueryScape uses minimal dependencies to reduce attack surface:

| Package | Dependencies |
|---------|--------------|
| @queryscape/core | 0 (runtime) |
| @queryscape/connectors | 1 (core) |
| @queryscape/renderer-cytoscape | 1 (core) + cytoscape (peer) |

## Reporting Vulnerabilities

Please report security vulnerabilities by emailing security@queryscape.dev.

Do NOT file public GitHub issues for security vulnerabilities.

## Checklist

- [ ] Credentials stored in environment variables or secrets manager
- [ ] TLS/SSL enabled for database connections
- [ ] Raw queries avoided or properly parameterized
- [ ] Session limits configured appropriately
- [ ] Dependencies regularly updated
- [ ] No sensitive data in logs
- [ ] Frontend uses backend proxy for database access
