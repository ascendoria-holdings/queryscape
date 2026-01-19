/**
 * Connect command
 */

import { createMockConnector, createNeo4jConnector } from "@queryscape/connectors";
import { createSession } from "@queryscape/core";

import { logSuccess, logError, logInfo, formatGraphData } from "../utils.js";

export interface ConnectOptions {
  connector: string;
  uri?: string;
  user?: string;
  password?: string;
}

export async function connect(options: ConnectOptions): Promise<void> {
  logInfo(`Connecting with ${options.connector} connector...`);

  const session = createSession();

  try {
    let connector;

    switch (options.connector) {
      case "mock":
        connector = createMockConnector({
          dataOptions: {
            nodeCount: 50,
            edgesPerNode: 2,
          },
        });
        break;

      case "neo4j":
        if (!options.uri || !options.user || !options.password) {
          logError("Neo4j connector requires --uri, --user, and --password");
          return;
        }
        connector = createNeo4jConnector({
          uri: options.uri,
          username: options.user,
          password: options.password,
        });
        break;

      default:
        logError(`Unknown connector: ${options.connector}`);
        return;
    }

    await session.connect(connector);
    logSuccess("Connected successfully!");

    // Get some sample data
    const result = await session.executeQuery({
      type: "sample",
      strategy: "random",
      count: 10,
    });

    logInfo("Sample data:");
    // eslint-disable-next-line no-console
    console.log(formatGraphData(result.data));

    await session.disconnect();
    logSuccess("Disconnected.");
  } catch (error) {
    logError(error instanceof Error ? error.message : String(error));
  }
}
