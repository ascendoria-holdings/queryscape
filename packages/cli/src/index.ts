#!/usr/bin/env node
/**
 * QueryScape CLI entry point
 */

import { connect } from "./commands/connect.js";
import { explore } from "./commands/explore.js";
import { parseArgs, printHelp, logError } from "./utils.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, options } = parseArgs(args);

  switch (command) {
    case "connect":
      await connect({
        connector: (options["connector"] as string) ?? "mock",
        uri: options["uri"] as string | undefined,
        user: options["user"] as string | undefined,
        password: options["password"] as string | undefined,
      });
      break;

    case "explore":
      await explore({
        connector: (options["connector"] as string) ?? "mock",
      });
      break;

    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;

    default:
      logError(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((error) => {
  logError(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
