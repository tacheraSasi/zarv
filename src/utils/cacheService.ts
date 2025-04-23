/**
 * Cache service for storing and retrieving AI-generated sample data
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class CacheService {
  private cache: Map<string, CacheItem<any>>;
  private defaultTTL: number; // Time to live in milliseconds

  constructor(defaultTTL = 3600000) { // Default TTL: 1 hour
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate a cache key from the schema definition and options
   */
  generateKey(schemaDefinition: string, options: any): string {
    // Create a deterministic key from the schema and options
    return JSON.stringify({
      schema: schemaDefinition,
      options: options
    });
  }

  /**
   * Set an item in the cache
   */
  set<T>(key: string, data: T, ttl = this.defaultTTL): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });
  }

  /**
   * Get an item from the cache
   * Returns undefined if the item doesn't exist or has expired
   */
  get<T>(key: string): { data: T; fromCache: boolean } | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }

    // Check if the item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return {
      data: item.data,
      fromCache: true
    };
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove a specific item from the cache
   */
  remove(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Get the number of items in the cache
   */
  size(): number {
    return this.cache.size;
  }
}

// Create a singleton instance
const cacheService = new CacheService();

export default cacheService;