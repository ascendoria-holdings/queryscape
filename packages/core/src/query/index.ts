/**
 * Query model types and safe query builder
 */

import { QueryError, ValidationError } from "../errors/index.js";
import type { NodeId, PaginationOptions } from "../types/index.js";

// Re-export the fluent QueryBuilder from query-builder.ts
export { QueryBuilder } from "./query-builder.js";

// Re-export types from query-model.ts with aliases to avoid collision with legacy types
export type {
  QueryType as FluentQueryType,
  NodeQuery as FluentNodeQuery,
  EdgeQuery as FluentEdgeQuery,
  NeighborhoodQuery as FluentNeighborhoodQuery,
  PathQuery as FluentPathQuery,
  SearchQuery as FluentSearchQuery,
  Query as FluentQuery,
} from "./query-model.js";

/** Supported query types */
export type QueryType =
  | "getNode"
  | "getEdge"
  | "getNeighbors"
  | "findNodes"
  | "findPath"
  | "expandNode"
  | "search"
  | "sample"
  | "raw";

/** Direction for traversal */
export type Direction = "outgoing" | "incoming" | "both";

/** Comparison operators */
export type ComparisonOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "startsWith" | "endsWith";

/** Property filter */
export interface PropertyFilter {
  readonly key: string;
  readonly op: ComparisonOp;
  readonly value: string | number | boolean;
}

/** Label filter */
export interface LabelFilter {
  readonly labels: readonly string[];
  readonly mode: "any" | "all";
}

/** Base query interface */
export interface BaseQuery {
  readonly type: QueryType;
  readonly pagination?: PaginationOptions;
}

/** Get single node by ID */
export interface GetNodeQuery extends BaseQuery {
  readonly type: "getNode";
  readonly nodeId: NodeId;
}

/** Get neighbors of a node */
export interface GetNeighborsQuery extends BaseQuery {
  readonly type: "getNeighbors";
  readonly nodeId: NodeId;
  readonly direction: Direction;
  readonly edgeTypes?: readonly string[];
  readonly maxDepth?: number;
}

/** Find nodes by criteria */
export interface FindNodesQuery extends BaseQuery {
  readonly type: "findNodes";
  readonly labelFilter?: LabelFilter;
  readonly propertyFilters?: readonly PropertyFilter[];
}

/** Find path between nodes */
export interface FindPathQuery extends BaseQuery {
  readonly type: "findPath";
  readonly sourceId: NodeId;
  readonly targetId: NodeId;
  readonly maxLength?: number;
  readonly edgeTypes?: readonly string[];
}

/** Expand from a node */
export interface ExpandNodeQuery extends BaseQuery {
  readonly type: "expandNode";
  readonly nodeId: NodeId;
  readonly direction: Direction;
  readonly depth?: number;
  readonly edgeTypes?: readonly string[];
  readonly nodeLabels?: readonly string[];
}

/** Full-text search (legacy) */
export interface LegacySearchQuery extends BaseQuery {
  readonly type: "search";
  readonly text: string;
  readonly fields?: readonly string[];
  readonly labels?: readonly string[];
}

/** Sample nodes */
export interface SampleQuery extends BaseQuery {
  readonly type: "sample";
  readonly strategy: "random" | "randomWalk" | "frontier";
  readonly count: number;
  readonly startNodeId?: NodeId;
}

/** Raw query (unsafe, must be explicitly enabled) */
export interface RawQuery extends BaseQuery {
  readonly type: "raw";
  readonly query: string;
  readonly parameters?: Record<string, unknown>;
}

/** Union of all legacy query types */
export type LegacyQuery =
  | GetNodeQuery
  | GetNeighborsQuery
  | FindNodesQuery
  | FindPathQuery
  | ExpandNodeQuery
  | LegacySearchQuery
  | SampleQuery
  | RawQuery;

// For backward compatibility, also export as Query
export { type LegacyQuery as Query };

/** Legacy query builder for safe query construction */
export class LegacyQueryBuilder {
  private pagination?: PaginationOptions;

  /** Set pagination */
  withPagination(options: PaginationOptions): this {
    this.pagination = options;
    return this;
  }

  /** Get node by ID */
  getNode(nodeId: NodeId): GetNodeQuery {
    if (!nodeId || typeof nodeId !== "string") {
      throw new ValidationError("nodeId must be a non-empty string", "nodeId");
    }
    return {
      type: "getNode",
      nodeId,
      pagination: this.pagination,
    };
  }

  /** Get neighbors of a node */
  getNeighbors(
    nodeId: NodeId,
    direction: Direction = "both",
    options?: { edgeTypes?: string[]; maxDepth?: number }
  ): GetNeighborsQuery {
    if (!nodeId || typeof nodeId !== "string") {
      throw new ValidationError("nodeId must be a non-empty string", "nodeId");
    }
    return {
      type: "getNeighbors",
      nodeId,
      direction,
      edgeTypes: options?.edgeTypes,
      maxDepth: options?.maxDepth,
      pagination: this.pagination,
    };
  }

  /** Find nodes by criteria */
  findNodes(options?: {
    labels?: string[];
    labelMode?: "any" | "all";
    filters?: PropertyFilter[];
  }): FindNodesQuery {
    return {
      type: "findNodes",
      labelFilter: options?.labels
        ? { labels: options.labels, mode: options.labelMode ?? "any" }
        : undefined,
      propertyFilters: options?.filters,
      pagination: this.pagination,
    };
  }

  /** Find shortest path */
  findPath(
    sourceId: NodeId,
    targetId: NodeId,
    options?: { maxLength?: number; edgeTypes?: string[] }
  ): FindPathQuery {
    if (!sourceId || typeof sourceId !== "string") {
      throw new ValidationError(
        "sourceId must be a non-empty string",
        "sourceId"
      );
    }
    if (!targetId || typeof targetId !== "string") {
      throw new ValidationError(
        "targetId must be a non-empty string",
        "targetId"
      );
    }
    return {
      type: "findPath",
      sourceId,
      targetId,
      maxLength: options?.maxLength,
      edgeTypes: options?.edgeTypes,
      pagination: this.pagination,
    };
  }

  /** Expand from node */
  expandNode(
    nodeId: NodeId,
    options?: {
      direction?: Direction;
      depth?: number;
      edgeTypes?: string[];
      nodeLabels?: string[];
    }
  ): ExpandNodeQuery {
    if (!nodeId || typeof nodeId !== "string") {
      throw new ValidationError("nodeId must be a non-empty string", "nodeId");
    }
    return {
      type: "expandNode",
      nodeId,
      direction: options?.direction ?? "both",
      depth: options?.depth,
      edgeTypes: options?.edgeTypes,
      nodeLabels: options?.nodeLabels,
      pagination: this.pagination,
    };
  }

  /** Full-text search */
  search(
    text: string,
    options?: { fields?: string[]; labels?: string[] }
  ): LegacySearchQuery {
    if (!text || typeof text !== "string") {
      throw new ValidationError(
        "search text must be a non-empty string",
        "text"
      );
    }
    return {
      type: "search",
      text,
      fields: options?.fields,
      labels: options?.labels,
      pagination: this.pagination,
    };
  }

  /** Sample nodes */
  sample(
    strategy: "random" | "randomWalk" | "frontier",
    count: number,
    startNodeId?: NodeId
  ): SampleQuery {
    if (count <= 0) {
      throw new ValidationError("count must be positive", "count");
    }
    if (strategy === "randomWalk" && !startNodeId) {
      throw new ValidationError(
        "randomWalk strategy requires startNodeId",
        "startNodeId"
      );
    }
    return {
      type: "sample",
      strategy,
      count,
      startNodeId,
      pagination: this.pagination,
    };
  }

  /** Raw query (unsafe) - must be explicitly called */
  static unsafe(query: string, parameters?: Record<string, unknown>): RawQuery {
    if (!query || typeof query !== "string") {
      throw new QueryError("Raw query string is required", "raw");
    }
    return {
      type: "raw",
      query,
      parameters,
    };
  }
}

/** Create a new legacy query builder */
export function createQueryBuilder(): LegacyQueryBuilder {
  return new LegacyQueryBuilder();
}

/** Validate query structure */
export function validateQuery(query: LegacyQuery): void {
  if (!query || typeof query !== "object") {
    throw new ValidationError("Query must be an object");
  }

  if (!query.type) {
    throw new ValidationError("Query must have a type", "type");
  }

  switch (query.type) {
    case "getNode":
      if (!query.nodeId) {
        throw new ValidationError("getNode requires nodeId", "nodeId");
      }
      break;
    case "getNeighbors":
      if (!query.nodeId) {
        throw new ValidationError("getNeighbors requires nodeId", "nodeId");
      }
      break;
    case "findPath":
      if (!query.sourceId || !query.targetId) {
        throw new ValidationError("findPath requires sourceId and targetId");
      }
      break;
    case "expandNode":
      if (!query.nodeId) {
        throw new ValidationError("expandNode requires nodeId", "nodeId");
      }
      break;
    case "search":
      if (!query.text) {
        throw new ValidationError("search requires text", "text");
      }
      break;
    case "sample":
      if (!query.count || query.count <= 0) {
        throw new ValidationError("sample requires positive count", "count");
      }
      break;
    case "raw":
      if (!query.query) {
        throw new ValidationError("raw query requires query string", "query");
      }
      break;
  }
}
