/**
 * JSON-RPC protocol for Rust accelerator
 */

import type { GraphNode, GraphEdge } from "../types/index.js";

/** Protocol version */
export const PROTOCOL_VERSION = "1.0.0";

/** JSON-RPC request */
export interface JsonRpcRequest<T = unknown> {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly method: string;
  readonly params: T;
}

/** JSON-RPC success response */
export interface JsonRpcSuccessResponse<T = unknown> {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly result: T;
}

/** JSON-RPC error response */
export interface JsonRpcErrorResponse {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly error: {
    readonly code: number;
    readonly message: string;
    readonly data?: unknown;
  };
}

/** JSON-RPC response */
export type JsonRpcResponse<T = unknown> =
  | JsonRpcSuccessResponse<T>
  | JsonRpcErrorResponse;

/** Check if response is error */
export function isErrorResponse(
  response: JsonRpcResponse
): response is JsonRpcErrorResponse {
  return "error" in response;
}

/** Accelerator methods */
export type AcceleratorMethod =
  | "protocol.version"
  | "sample.random"
  | "sample.randomWalk"
  | "sample.frontier"
  | "community.louvain"
  | "index.build"
  | "index.search"
  | "subgraph.extract";

/** Random sample parameters */
export interface RandomSampleParams {
  nodes: GraphNode[];
  edges: GraphEdge[];
  count: number;
}

/** Random walk sample parameters */
export interface RandomWalkParams {
  nodes: GraphNode[];
  edges: GraphEdge[];
  startNodeId: string;
  walkLength: number;
  numWalks: number;
}

/** Frontier sample parameters */
export interface FrontierSampleParams {
  nodes: GraphNode[];
  edges: GraphEdge[];
  startNodeIds: string[];
  maxNodes: number;
}

/** Sample result */
export interface SampleResult {
  sampledNodes: GraphNode[];
  sampledEdges: GraphEdge[];
}

/** Community detection parameters */
export interface CommunityParams {
  nodes: GraphNode[];
  edges: GraphEdge[];
  resolution?: number;
}

/** Community detection result */
export interface CommunityResult {
  communities: Map<string, number>;
  modularity: number;
}

/** Protocol version result */
export interface ProtocolVersionResult {
  version: string;
  features: string[];
}

/** Build request ID */
let requestIdCounter = 0;

export function buildRequest<T>(
  method: AcceleratorMethod,
  params: T
): JsonRpcRequest<T> {
  return {
    jsonrpc: "2.0",
    id: ++requestIdCounter,
    method,
    params,
  };
}
