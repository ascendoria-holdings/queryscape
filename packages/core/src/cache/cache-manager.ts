/**
 * Cache manager for query results and graph data.
 * Uses LRU eviction strategy with TTL support.
 */

import type { Graph, NodeId } from '../types';

export interface CacheEntry<T> {
  readonly key: string;
  readonly value: T;
  readonly createdAt: number;
  accessedAt: number;
  accessOrder: number;
  readonly ttlMs: number;
}

export interface CacheStats {
  readonly size: number;
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
  readonly hitRate: number;
}

interface CacheConfig {
  readonly maxEntries: number;
  readonly defaultTtlMs: number;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxEntries: 1000,
  defaultTtlMs: 5 * 60 * 1000, // 5 minutes
};

/**
 * LRU cache with TTL support.
 */
export class CacheManager<T = Graph> {
  private readonly cache: Map<string, CacheEntry<T>> = new Map();
  private readonly config: CacheConfig;
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private accessCounter = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  /**
   * Generate a cache key from a query.
   */
  static queryKey(query: object): string {
    return `query:${JSON.stringify(query)}`;
  }

  /**
   * Generate a cache key for a node.
   */
  static nodeKey(nodeId: NodeId): string {
    return `node:${nodeId}`;
  }

  /**
   * Get a value from the cache.
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.createdAt > entry.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Update access time and order (LRU tracking)
    entry.accessedAt = Date.now();
    entry.accessOrder = ++this.accessCounter;
    this.hits++;
    return entry.value;
  }

  /**
   * Set a value in the cache.
   */
  set(key: string, value: T, ttlMs?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.config.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      key,
      value,
      createdAt: now,
      accessedAt: now,
      accessOrder: ++this.accessCounter,
      ttlMs: ttlMs ?? this.config.defaultTtlMs,
    });
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() - entry.createdAt > entry.ttlMs) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a specific entry.
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get cache statistics.
   */
  stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Evict the least recently used entry.
   */
  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestOrder = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.accessOrder < oldestOrder) {
        oldestOrder = entry.accessOrder;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.evictions++;
    }
  }

  /**
   * Prune expired entries.
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.createdAt > entry.ttlMs) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }
}
