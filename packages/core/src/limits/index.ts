/**
 * Limit enforcement for session and queries
 */

import { LimitExceededError } from "../errors/index.js";
import type { Logger } from "../logger/index.js";
import { noopLogger } from "../logger/index.js";
import type { SessionConfig, TelemetryHook } from "../types/index.js";
import { NOOP_TELEMETRY_HOOK } from "../types/index.js";

/** Limit check result */
export interface LimitCheckResult {
  readonly allowed: boolean;
  readonly currentValue: number;
  readonly maxValue: number;
  readonly limitType: string;
  readonly message?: string;
}

/** Limits enforcer class */
export class LimitsEnforcer {
  private nodeCount = 0;
  private edgeCount = 0;

  constructor(
    private readonly config: SessionConfig,
    private readonly logger: Logger = noopLogger,
    private readonly telemetry: TelemetryHook = NOOP_TELEMETRY_HOOK
  ) {}

  /** Get current node count */
  getNodeCount(): number {
    return this.nodeCount;
  }

  /** Get current edge count */
  getEdgeCount(): number {
    return this.edgeCount;
  }

  /** Get total element count */
  getTotalCount(): number {
    return this.nodeCount + this.edgeCount;
  }

  /** Update counts */
  updateCounts(nodes: number, edges: number): void {
    this.nodeCount = nodes;
    this.edgeCount = edges;
    this.telemetry.onSessionChange?.(nodes, edges);
  }

  /** Check if adding nodes would exceed limit */
  checkNodeLimit(additionalNodes: number): LimitCheckResult {
    const newCount = this.nodeCount + additionalNodes;
    const allowed = newCount <= this.config.maxNodes;

    if (!allowed) {
      this.telemetry.onLimitReached?.(
        "maxNodes",
        newCount,
        this.config.maxNodes
      );
    }

    const result: LimitCheckResult = {
      allowed,
      currentValue: this.nodeCount,
      maxValue: this.config.maxNodes,
      limitType: "maxNodes",
    };
    if (!allowed) {
      return {
        ...result,
        message: `Adding ${additionalNodes} nodes would exceed limit of ${this.config.maxNodes} (current: ${this.nodeCount})`,
      };
    }
    return result;
  }

  /** Check if adding edges would exceed limit */
  checkEdgeLimit(additionalEdges: number): LimitCheckResult {
    const newCount = this.edgeCount + additionalEdges;
    const allowed = newCount <= this.config.maxEdges;

    if (!allowed) {
      this.telemetry.onLimitReached?.(
        "maxEdges",
        newCount,
        this.config.maxEdges
      );
    }

    const result: LimitCheckResult = {
      allowed,
      currentValue: this.edgeCount,
      maxValue: this.config.maxEdges,
      limitType: "maxEdges",
    };
    if (!allowed) {
      return {
        ...result,
        message: `Adding ${additionalEdges} edges would exceed limit of ${this.config.maxEdges} (current: ${this.edgeCount})`,
      };
    }
    return result;
  }

  /** Check fetch size limit */
  checkFetchLimit(elementCount: number): LimitCheckResult {
    const allowed = elementCount <= this.config.maxElementsPerFetch;

    if (!allowed) {
      this.telemetry.onLimitReached?.(
        "maxElementsPerFetch",
        elementCount,
        this.config.maxElementsPerFetch
      );
    }

    const result: LimitCheckResult = {
      allowed,
      currentValue: elementCount,
      maxValue: this.config.maxElementsPerFetch,
      limitType: "maxElementsPerFetch",
    };
    if (!allowed) {
      return {
        ...result,
        message: `Fetch would return ${elementCount} elements, exceeding limit of ${this.config.maxElementsPerFetch}`,
      };
    }
    return result;
  }

  /** Enforce node limit - throws if exceeded */
  enforceNodeLimit(additionalNodes: number): void {
    const result = this.checkNodeLimit(additionalNodes);
    if (!result.allowed) {
      this.logger.warn("Node limit exceeded", {
        additional: additionalNodes,
        current: result.currentValue,
        max: result.maxValue,
      });
      throw new LimitExceededError(
        result.message ?? "Node limit exceeded",
        result.limitType,
        result.currentValue,
        result.maxValue
      );
    }
  }

  /** Enforce edge limit - throws if exceeded */
  enforceEdgeLimit(additionalEdges: number): void {
    const result = this.checkEdgeLimit(additionalEdges);
    if (!result.allowed) {
      this.logger.warn("Edge limit exceeded", {
        additional: additionalEdges,
        current: result.currentValue,
        max: result.maxValue,
      });
      throw new LimitExceededError(
        result.message ?? "Edge limit exceeded",
        result.limitType,
        result.currentValue,
        result.maxValue
      );
    }
  }

  /** Enforce fetch limit - throws if exceeded */
  enforceFetchLimit(elementCount: number): void {
    const result = this.checkFetchLimit(elementCount);
    if (!result.allowed) {
      this.logger.warn("Fetch limit exceeded", {
        count: elementCount,
        max: result.maxValue,
      });
      throw new LimitExceededError(
        result.message ?? "Fetch limit exceeded",
        result.limitType,
        result.currentValue,
        result.maxValue
      );
    }
  }

  /** Calculate safe fetch limit */
  getSafeFetchLimit(): number {
    const remainingNodes = this.config.maxNodes - this.nodeCount;
    const remainingEdges = this.config.maxEdges - this.edgeCount;
    const remainingTotal = Math.min(remainingNodes, remainingEdges);

    return Math.min(remainingTotal, this.config.maxElementsPerFetch);
  }

  /** Reset counts */
  reset(): void {
    this.nodeCount = 0;
    this.edgeCount = 0;
    this.telemetry.onSessionChange?.(0, 0);
  }
}
