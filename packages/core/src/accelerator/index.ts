/**
 * Rust accelerator client with TypeScript fallbacks
 *
 * Note: The AcceleratorClient (./client.js) uses Node.js-specific modules
 * and should be imported directly in Node.js environments:
 *   import { AcceleratorClient } from "@queryscape/core/accelerator/client"
 *
 * The fallback implementations are browser-safe and exported here.
 */

export * from "./protocol.js";
export * from "./fallback.js";

// Re-export types from client for convenience (no runtime code)
export type { AcceleratorConfig } from "./client.js";
