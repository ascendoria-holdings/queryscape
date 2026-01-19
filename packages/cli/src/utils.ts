/**
 * CLI utility functions
 */

import type { GraphData } from "@queryscape/core";

/** Format graph data for console output */
export function formatGraphData(data: GraphData): string {
  const lines: string[] = [];

  lines.push(`Nodes (${data.nodes.length}):`);
  for (const node of data.nodes.slice(0, 10)) {
    const labels = node.labels.join(", ");
    const name = node.properties["name"] ?? node.id;
    lines.push(`  - [${labels}] ${name}`);
  }
  if (data.nodes.length > 10) {
    lines.push(`  ... and ${data.nodes.length - 10} more`);
  }

  lines.push("");
  lines.push(`Edges (${data.edges.length}):`);
  for (const edge of data.edges.slice(0, 10)) {
    lines.push(`  - ${edge.source} -[${edge.type}]-> ${edge.target}`);
  }
  if (data.edges.length > 10) {
    lines.push(`  ... and ${data.edges.length - 10} more`);
  }

  return lines.join("\n");
}

/** Parse command line arguments */
export function parseArgs(args: string[]): {
  command: string;
  options: Record<string, string | boolean>;
  positional: string[];
} {
  const command = args[0] ?? "help";
  const options: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]!;

    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      options[key!] = value ?? true;
    } else if (arg.startsWith("-")) {
      const key = arg.slice(1);
      options[key] = true;
    } else {
      positional.push(arg);
    }
  }

  return { command, options, positional };
}

/** Print help message */
export function printHelp(): void {
  const help = `
QueryScape CLI

Usage:
  queryscape <command> [options]

Commands:
  connect     Connect to a database and explore
  explore     Explore a graph interactively
  export      Export session data
  help        Show this help message

Options:
  --connector <type>   Connector type (mock, neo4j, neptune, cosmos, stardog)
  --uri <uri>          Connection URI
  --user <username>    Username
  --password <pass>    Password
  --output <file>      Output file for export

Examples:
  queryscape explore --connector mock
  queryscape connect --connector neo4j --uri bolt://localhost:7687
  queryscape export --output graph.json
`;

  // eslint-disable-next-line no-console
  console.log(help);
}

/** Color output helpers */
export const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

/** Log with color */
export function log(message: string, color?: keyof typeof colors): void {
  if (color) {
    // eslint-disable-next-line no-console
    console.log(`${colors[color]}${message}${colors.reset}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(message);
  }
}

/** Log error */
export function logError(message: string): void {
  console.error(`${colors.red}Error: ${message}${colors.reset}`);
}

/** Log success */
export function logSuccess(message: string): void {
  log(`✓ ${message}`, "green");
}

/** Log info */
export function logInfo(message: string): void {
  log(`ℹ ${message}`, "cyan");
}
