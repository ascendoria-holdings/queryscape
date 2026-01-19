/**
 * LRU cache with TTL support for query results
 */

import type { Logger } from "../logger/index.js";
import { noopLogger } from "../logger/index.js";
import type { GraphData } from "../types/index.js";

/** Cache entry */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
}

/** Cache statistics */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
}

/** Cache configuration */
export interface CacheConfig {
  maxSize: number;
  ttlMs: number;
}

/** LRU Cache implementation */
export class LRUCache<T> {
  private readonly cache = new Map<string, CacheEntry<T>>();
  private stats: CacheStats;

  constructor(
    private readonly config: CacheConfig,
    private readonly logger: Logger = noopLogger
  ) {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      maxSize: config.maxSize,
    };
  }

  /** Get value from cache */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.ttlMs) {
      this.cache.delete(key);
      this.stats.size--;
      this.stats.misses++;
      this.logger.debug("Cache entry expired", { key });
      return undefined;
    }

    // Update access count and move to end (most recently used)
    entry.accessCount++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    return entry.value;
  }

  /** Set value in cache */
  set(key: string, value: T): void {
    // If key exists, delete it first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.config.maxSize) {
      // Evict oldest entry (first in map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
        this.stats.size--;
        this.logger.debug("Cache eviction", { evictedKey: oldestKey });
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 1,
    });
    this.stats.size++;
  }

  /** Check if key exists and is valid */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() - entry.timestamp > this.config.ttlMs) {
      this.cache.delete(key);
      this.stats.size--;
      return false;
    }

    return true;
  }

  /** Delete key from cache */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.size--;
    }
    return deleted;
  }

  /** Clear all entries */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
    this.logger.debug("Cache cleared");
  }

  /** Get cache statistics */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /** Get hit rate */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : this.stats.hits / total;
  }

  /** Prune expired entries */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttlMs) {
        this.cache.delete(key);
        pruned++;
      }
    }

    this.stats.size = this.cache.size;
    this.logger.debug("Cache pruned", { prunedCount: pruned });
    return pruned;
  }
}

/** Generate cache key for query */
export function generateQueryCacheKey(
  connectorId: string,
  queryType: string,
  params: Record<string, unknown>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = params[key];
        return acc;
      },
      {} as Record<string, unknown>
    );

  return `${connectorId}:${queryType}:${JSON.stringify(sortedParams)}`;
}

/** Query result cache */
export class QueryCache extends LRUCache<GraphData> {
  constructor(config: CacheConfig, logger?: Logger) {
    super(config, logger);
  }
}
