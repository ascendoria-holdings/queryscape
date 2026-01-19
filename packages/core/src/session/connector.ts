/**
 * Connector interface types for session module
 * Re-exported from connectors package for convenience
 */

import type { Query, QueryType } from "../query/index.js";
import type { QueryResult } from "../types/index.js";

/** Connector capabilities */
export interface ConnectorCapabilities {
  readonly connectorType: string;
  readonly supportedQueryTypes: readonly QueryType[];
  readonly supportsFullTextSearch: boolean;
  readonly supportsPagination: boolean;
  readonly supportsRawQueries: boolean;
  readonly maxPageSize: number;
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
}
