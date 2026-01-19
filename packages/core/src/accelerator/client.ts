/**
 * Rust accelerator client
 */

import { spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { AcceleratorError, AcceleratorUnavailableError } from "../errors/index.js";
import type { Logger } from "../logger/index.js";
import { noopLogger } from "../logger/index.js";
import type { GraphData } from "../types/index.js";

import * as fallback from "./fallback.js";
import type {
  AcceleratorMethod,
  JsonRpcResponse,
  ProtocolVersionResult,
  RandomSampleParams,
  RandomWalkParams,
  FrontierSampleParams,
  SampleResult,
} from "./protocol.js";
import { PROTOCOL_VERSION, buildRequest, isErrorResponse } from "./protocol.js";

/** Accelerator client configuration */
export interface AcceleratorConfig {
  /** Path to accelerator binary */
  binaryPath?: string;
  /** Communication mode */
  mode: "stdio" | "http";
  /** HTTP port (for http mode) */
  httpPort?: number;
  /** Startup timeout in ms */
  startupTimeoutMs?: number;
  /** Request timeout in ms */
  requestTimeoutMs?: number;
}

/** Default accelerator config */
const DEFAULT_CONFIG: AcceleratorConfig = {
  mode: "stdio",
  startupTimeoutMs: 5000,
  requestTimeoutMs: 30000,
};

/** Accelerator client */
export class AcceleratorClient {
  private process: ChildProcess | null = null;
  private available = false;
  private readonly config: AcceleratorConfig;
  private readonly logger: Logger;
  private responseBuffer = "";
  private pendingRequests = new Map<
    number,
    {
      resolve: (value: JsonRpcResponse) => void;
      reject: (error: Error) => void;
    }
  >();

  constructor(config?: Partial<AcceleratorConfig>, logger?: Logger) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = logger ?? noopLogger;
  }

  /** Find accelerator binary */
  private findBinary(): string | null {
    if (this.config.binaryPath) {
      if (fs.existsSync(this.config.binaryPath)) {
        return this.config.binaryPath;
      }
      return null;
    }

    // Check common locations
    const locations = [
      // Development
      path.join(process.cwd(), "rust", "accelerator", "target", "release", "queryscape-accelerator"),
      path.join(process.cwd(), "rust", "accelerator", "target", "debug", "queryscape-accelerator"),
      // Installed
      path.join(__dirname, "..", "..", "bin", "queryscape-accelerator"),
      // Global
      "queryscape-accelerator",
    ];

    // Add .exe for Windows
    if (process.platform === "win32") {
      const exeLocations = locations.map((l) => l + ".exe");
      locations.push(...exeLocations);
    }

    for (const location of locations) {
      if (fs.existsSync(location)) {
        return location;
      }
    }

    return null;
  }

  /** Start the accelerator sidecar */
  async start(): Promise<boolean> {
    const binaryPath = this.findBinary();

    if (!binaryPath) {
      this.logger.warn(
        "Rust accelerator binary not found. Using TypeScript fallbacks."
      );
      this.available = false;
      return false;
    }

    try {
      this.process = spawn(binaryPath, ["--mode", this.config.mode], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.process.stdout?.on("data", (data: Buffer) => {
        this.handleStdout(data);
      });

      this.process.stderr?.on("data", (data: Buffer) => {
        this.logger.debug("Accelerator stderr", { output: data.toString() });
      });

      this.process.on("error", (error) => {
        this.logger.error("Accelerator process error", { error: error.message });
        this.available = false;
      });

      this.process.on("exit", (code) => {
        this.logger.info("Accelerator process exited", { code });
        this.available = false;
        this.process = null;
      });

      // Wait for startup and verify protocol version
      const versionResult = await this.rpc<unknown, ProtocolVersionResult>(
        "protocol.version",
        {}
      );

      if (versionResult.version !== PROTOCOL_VERSION) {
        this.logger.warn("Protocol version mismatch", {
          expected: PROTOCOL_VERSION,
          actual: versionResult.version,
        });
      }

      this.available = true;
      this.logger.info("Accelerator started successfully", {
        version: versionResult.version,
        features: versionResult.features,
      });

      return true;
    } catch (error) {
      this.logger.warn("Failed to start accelerator", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.available = false;
      return false;
    }
  }

  /** Handle stdout data */
  private handleStdout(data: Buffer): void {
    this.responseBuffer += data.toString();

    // Try to parse complete JSON objects
    let newlineIndex: number;
    while ((newlineIndex = this.responseBuffer.indexOf("\n")) !== -1) {
      const line = this.responseBuffer.substring(0, newlineIndex);
      this.responseBuffer = this.responseBuffer.substring(newlineIndex + 1);

      if (line.trim()) {
        try {
          const response = JSON.parse(line) as JsonRpcResponse;
          const pending = this.pendingRequests.get(response.id);
          if (pending) {
            this.pendingRequests.delete(response.id);
            pending.resolve(response);
          }
        } catch {
          this.logger.debug("Failed to parse response line", { line });
        }
      }
    }
  }

  /** Send JSON-RPC request */
  private async rpc<T, R>(method: AcceleratorMethod, params: T): Promise<R> {
    if (!this.process || !this.available) {
      throw new AcceleratorUnavailableError("Accelerator not available");
    }

    const request = buildRequest(method, params);

    return new Promise<R>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new AcceleratorError(`Request timeout for ${method}`, method));
      }, this.config.requestTimeoutMs);

      this.pendingRequests.set(request.id, {
        resolve: (response: JsonRpcResponse) => {
          clearTimeout(timeout);
          if (isErrorResponse(response)) {
            reject(
              new AcceleratorError(
                response.error.message,
                method
              )
            );
          } else {
            resolve(response.result as R);
          }
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      this.process!.stdin?.write(JSON.stringify(request) + "\n");
    });
  }

  /** Stop the accelerator */
  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.available = false;
      this.logger.info("Accelerator stopped");
    }
  }

  /** Check if accelerator is available */
  isAvailable(): boolean {
    return this.available;
  }

  /** Random sample with fallback */
  async randomSample(
    data: GraphData,
    count: number
  ): Promise<SampleResult> {
    if (this.available) {
      try {
        return await this.rpc<RandomSampleParams, SampleResult>(
          "sample.random",
          {
            nodes: [...data.nodes],
            edges: [...data.edges],
            count,
          }
        );
      } catch (error) {
        this.logger.warn("Accelerator randomSample failed, using fallback", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return fallback.randomSample(data, count);
  }

  /** Random walk sample with fallback */
  async randomWalkSample(
    data: GraphData,
    startNodeId: string,
    walkLength: number,
    numWalks: number
  ): Promise<SampleResult> {
    if (this.available) {
      try {
        return await this.rpc<RandomWalkParams, SampleResult>(
          "sample.randomWalk",
          {
            nodes: [...data.nodes],
            edges: [...data.edges],
            startNodeId,
            walkLength,
            numWalks,
          }
        );
      } catch (error) {
        this.logger.warn("Accelerator randomWalk failed, using fallback", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return fallback.randomWalkSample(data, startNodeId, walkLength, numWalks);
  }

  /** Frontier sample with fallback */
  async frontierSample(
    data: GraphData,
    startNodeIds: string[],
    maxNodes: number
  ): Promise<SampleResult> {
    if (this.available) {
      try {
        return await this.rpc<FrontierSampleParams, SampleResult>(
          "sample.frontier",
          {
            nodes: [...data.nodes],
            edges: [...data.edges],
            startNodeIds,
            maxNodes,
          }
        );
      } catch (error) {
        this.logger.warn("Accelerator frontierSample failed, using fallback", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return fallback.frontierSample(data, startNodeIds, maxNodes);
  }
}

/** Create accelerator client */
export function createAcceleratorClient(
  config?: Partial<AcceleratorConfig>,
  logger?: Logger
): AcceleratorClient {
  return new AcceleratorClient(config, logger);
}
