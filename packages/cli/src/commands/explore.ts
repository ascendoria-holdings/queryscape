/**
 * Explore command - interactive graph exploration
 */

import * as readline from "node:readline";

import { createMockConnector } from "@queryscape/connectors";
import { createSession, createQueryBuilder } from "@queryscape/core";
import type { GraphSession } from "@queryscape/core";

import { logSuccess, logError, logInfo, formatGraphData, log, colors } from "../utils.js";

export interface ExploreOptions {
  connector: string;
}

export async function explore(options: ExploreOptions): Promise<void> {
  logInfo(`Starting exploration with ${options.connector} connector...`);

  const session = createSession();

  try {
    // For now, only support mock connector in explore mode
    if (options.connector !== "mock") {
      logError("Explore mode currently only supports mock connector");
      return;
    }

    const connector = createMockConnector({
      dataOptions: {
        nodeCount: 100,
        edgesPerNode: 3,
      },
    });

    await session.connect(connector);
    logSuccess("Connected!");

    // Load initial sample
    await session.executeQuery({
      type: "sample",
      strategy: "random",
      count: 20,
    });

    const state = session.getState();
    logInfo(`Session contains ${state.nodeCount} nodes and ${state.edgeCount} edges`);

    await runInteractiveMode(session);

    await session.disconnect();
    logSuccess("Session ended.");
  } catch (error) {
    logError(error instanceof Error ? error.message : String(error));
  }
}

async function runInteractiveMode(session: GraphSession): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(`${colors.cyan}queryscape>${colors.reset} `, (answer) => {
        resolve(answer.trim());
      });
    });
  };

  log("\nInteractive exploration mode. Commands:", "bright");
  log("  nodes              - List nodes in session");
  log("  edges              - List edges in session");
  log("  expand <nodeId>    - Expand from a node");
  log("  search <text>      - Search for nodes");
  log("  neighbors <nodeId> - Get neighbors of a node");
  log("  undo               - Undo last operation");
  log("  clear              - Clear session");
  log("  stats              - Show session statistics");
  log("  quit               - Exit\n");

  const qb = createQueryBuilder();

  let running = true;
  while (running) {
    const input = await prompt();
    const [command, ...args] = input.split(" ");

    try {
      switch (command) {
        case "nodes": {
          const data = session.getData();
          log(`\nNodes (${data.nodes.length}):`, "bright");
          for (const node of data.nodes.slice(0, 20)) {
            log(`  ${node.id}: [${node.labels.join(", ")}] ${node.properties["name"] ?? ""}`);
          }
          if (data.nodes.length > 20) {
            log(`  ... and ${data.nodes.length - 20} more`);
          }
          log("");
          break;
        }

        case "edges": {
          const data = session.getData();
          log(`\nEdges (${data.edges.length}):`, "bright");
          for (const edge of data.edges.slice(0, 20)) {
            log(`  ${edge.source} -[${edge.type}]-> ${edge.target}`);
          }
          if (data.edges.length > 20) {
            log(`  ... and ${data.edges.length - 20} more`);
          }
          log("");
          break;
        }

        case "expand": {
          const nodeId = args[0];
          if (!nodeId) {
            logError("Usage: expand <nodeId>");
            break;
          }
          const result = await session.executeQuery(
            qb.expandNode(nodeId, { depth: 1 })
          );
          logSuccess(`Expanded: added ${result.data.nodes.length} nodes and ${result.data.edges.length} edges`);
          break;
        }

        case "search": {
          const text = args.join(" ");
          if (!text) {
            logError("Usage: search <text>");
            break;
          }
          const result = await session.executeQuery(qb.search(text));
          log(`\nSearch results for "${text}":`, "bright");
          // eslint-disable-next-line no-console
          console.log(formatGraphData(result.data));
          break;
        }

        case "neighbors": {
          const nodeId = args[0];
          if (!nodeId) {
            logError("Usage: neighbors <nodeId>");
            break;
          }
          const result = await session.executeQuery(
            qb.getNeighbors(nodeId, "both")
          );
          log(`\nNeighbors of ${nodeId}:`, "bright");
          // eslint-disable-next-line no-console
          console.log(formatGraphData(result.data));
          break;
        }

        case "undo": {
          const patch = session.undo();
          if (patch) {
            logSuccess("Undone last operation");
          } else {
            logInfo("Nothing to undo");
          }
          break;
        }

        case "clear": {
          session.clear();
          logSuccess("Session cleared");
          break;
        }

        case "stats": {
          const state = session.getState();
          const cacheStats = session.getCacheStats();
          log("\nSession Statistics:", "bright");
          log(`  Nodes: ${state.nodeCount}`);
          log(`  Edges: ${state.edgeCount}`);
          log(`  Patch history: ${state.patchHistory.length}`);
          log(`  Cache hits: ${cacheStats.hits}`);
          log(`  Cache misses: ${cacheStats.misses}`);
          log("");
          break;
        }

        case "quit":
        case "exit":
        case "q":
          running = false;
          break;

        case "":
          break;

        default:
          logError(`Unknown command: ${command}`);
          break;
      }
    } catch (error) {
      logError(error instanceof Error ? error.message : String(error));
    }
  }

  rl.close();
}
