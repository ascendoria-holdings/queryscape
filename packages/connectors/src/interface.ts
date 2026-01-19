/**
 * Connector interface and types
 */

import type {
  Query,
  QueryType,
  QueryResult,
} from "@queryscape/core";
import {
  ConnectionError,
  AuthError,
  QueryError,
  QueryNotSupportedError,
  ValidationError,
} from "@queryscape/core";

/** Re-export error types */
export {
  ConnectionError,
  AuthError,
  QueryError,
  QueryNotSupportedError,
  ValidationError,
};

/** Connector capabilities declaration */
export interface ConnectorCapabilities {
  /** Connector type identifier */
  readonly connectorType: string;
  /** Supported query types */
  readonly supportedQueryTypes: readonly QueryType[];
  /** Supports full-text search */
  readonly supportsFullTextSearch: boolean;
  /** Supports cursor-based pagination */
  readonly supportsPagination: boolean;
  /** Supports raw queries (requires explicit unsafe mode) */
  readonly supportsRawQueries: boolean;
  /** Maximum page size */
  readonly maxPageSize: number;
}

/** Base connector configuration */
export interface BaseConnectorConfig {
  /** Unique identifier for this connector instance */
  id?: string;
}

/** Connector interface */
export interface Connector {
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

/** Abstract base connector with common functionality */
export abstract class BaseConnector implements Connector {
  protected connected = false;
  protected readonly connectorId: string;

  constructor(config?: BaseConnectorConfig) {
    this.connectorId =
      config?.id ?? `connector_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  getId(): string {
    return this.connectorId;
  }

  abstract getCapabilities(): ConnectorCapabilities;

  abstract connect(): Promise<void>;

  abstract disconnect(): Promise<void>;

  isConnected(): boolean {
    return this.connected;
  }

  abstract executeQuery(query: Query): Promise<QueryResult>;

  async testConnection(): Promise<boolean> {
    try {
      if (!this.connected) {
        await this.connect();
      }
      return true;
    } catch {
      return false;
    }
  }

  /** Check if query type is supported */
  protected checkQuerySupported(queryType: QueryType): void {
    const capabilities = this.getCapabilities();
    if (!capabilities.supportedQueryTypes.includes(queryType)) {
      throw new QueryNotSupportedError(
        `Query type '${queryType}' is not supported by ${capabilities.connectorType}`,
        queryType
      );
    }
  }

  /** Ensure connected before query */
  protected ensureConnected(): void {
    if (!this.connected) {
      throw new ConnectionError("Connector is not connected");
    }
  }
}

/** Helper to generate edge ID from source, target, type */
export function generateEdgeId(
  source: string,
  target: string,
  type: string
): string {
  return `${source}_${type}_${target}`;
}

/** Helper to create empty query result */
export function emptyQueryResult(executionTimeMs: number): QueryResult {
  return {
    data: { nodes: [], edges: [] },
    metadata: {
      executionTimeMs,
      totalAvailable: 0,
      truncated: false,
      cursor: null,
    },
  };
}
