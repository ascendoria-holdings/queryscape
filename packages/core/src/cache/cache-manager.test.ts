import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { CacheManager } from './cache-manager';

describe('CacheManager', () => {
  let cache: CacheManager<string>;

  beforeEach(() => {
    cache = new CacheManager<string>({
      maxEntries: 5,
      defaultTtlMs: 1000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('get/set', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should overwrite existing values', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for missing keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove entries', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should return false when deleting non-existent keys', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });

    it('should reset stats', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('missing'); // miss
      cache.clear();

      const stats = cache.stats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', () => {
      vi.useFakeTimers();

      cache.set('key1', 'value1', 100); // 100ms TTL

      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(150);

      expect(cache.get('key1')).toBeUndefined();
    });

    it('should not expire entries before TTL', () => {
      vi.useFakeTimers();

      cache.set('key1', 'value1', 1000);

      vi.advanceTimersByTime(500);

      expect(cache.get('key1')).toBe('value1');
    });

    it('has() should return false for expired entries', () => {
      vi.useFakeTimers();

      cache.set('key1', 'value1', 100);
      vi.advanceTimersByTime(150);

      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entries when at capacity', () => {
      // Cache has maxEntries: 5
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4');
      cache.set('key5', 'value5');

      // Access key1 to make it more recently used
      cache.get('key1');

      // Add new entry, should evict key2 (oldest accessed)
      cache.set('key6', 'value6');

      expect(cache.get('key1')).toBe('value1'); // Still present
      expect(cache.get('key2')).toBeUndefined(); // Evicted
      expect(cache.get('key6')).toBe('value6'); // New entry present
    });
  });

  describe('stats', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1');

      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('missing'); // miss

      const stats = cache.stats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });

    it('should track size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.stats().size).toBe(2);
    });

    it('should track evictions', () => {
      // Fill cache
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      // Trigger evictions
      cache.set('extra1', 'value');
      cache.set('extra2', 'value');

      expect(cache.stats().evictions).toBe(2);
    });

    it('should return 0 hit rate when no gets', () => {
      expect(cache.stats().hitRate).toBe(0);
    });
  });

  describe('prune', () => {
    it('should remove expired entries', () => {
      vi.useFakeTimers();

      cache.set('key1', 'value1', 100);
      cache.set('key2', 'value2', 200);
      cache.set('key3', 'value3', 1000);

      vi.advanceTimersByTime(250);

      const pruned = cache.prune();

      expect(pruned).toBe(2);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe('value3');
    });
  });

  describe('static helpers', () => {
    it('queryKey should generate consistent keys', () => {
      const query = { type: 'node' as const, labels: ['Person'] };
      const key1 = CacheManager.queryKey(query);
      const key2 = CacheManager.queryKey(query);

      expect(key1).toBe(key2);
      expect(key1).toContain('query:');
    });

    it('nodeKey should generate consistent keys', () => {
      const key = CacheManager.nodeKey('n123');
      expect(key).toBe('node:n123');
    });
  });
});
