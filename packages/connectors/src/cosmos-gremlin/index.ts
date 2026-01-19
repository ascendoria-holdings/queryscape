/**
 * Azure Cosmos DB Gremlin connector
 * Skeleton implementation
 */

import type { Query, QueryResult } from "@queryscape/core";
import { QueryNotSupportedError } from "@queryscape/core";

import {
  BaseConnector,
  type ConnectorCapabilities,
  type BaseConnectorConfig,
} from "../interface.js";

/** Cosmos Gremlin connector configuration */
export interface CosmosGremlinConnectorConfig extends BaseConnectorConfig {
  /** Cosmos DB account endpoint */
  endpoint: string;
  /** Primary key */
  primaryKey: string;
  /** Database name */
  database: string;
  /** Container/Graph name */
  container: string;
}

/** Cosmos Gremlin connector implementation (skeleton) */
export class CosmosGremlinConnector extends BaseConnector {
  protected readonly cosmosConfig: CosmosGremlinConnectorConfig;

  constructor(config: CosmosGremlinConnectorConfig) {
    super(config);
    this.cosmosConfig = config;
  }

  /** Get Cosmos DB configuration */
  getConfig(): CosmosGremlinConnectorConfig {
    return this.cosmosConfig;
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      connectorType: "cosmos-gremlin",
      supportedQueryTypes: [
        "getNode",
        "getNeighbors",
        "findNodes",
        "findPath",
        "expandNode",
      ],
      supportsFullTextSearch: false,
      supportsPagination: true,
      supportsRawQueries: true,
      maxPageSize: 1000,
    };
  }

  async connect(): Promise<void> {
    // TODO: Implement Gremlin connection with Cosmos auth
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async executeQuery(query: Query): Promise<QueryResult> {
    this.ensureConnected();
    this.checkQuerySupported(query.type);

    throw new QueryNotSupportedError(
      "Cosmos Gremlin connector not yet implemented",
      query.type
    );
  }
}

/** Create Cosmos Gremlin connector */
export function createCosmosGremlinConnector(
  config: CosmosGremlinConnectorConfig
): CosmosGremlinConnector {
  return new CosmosGremlinConnector(config);
}
