import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class GuestListCache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly CACHE_PREFIX = '@GuestListCache:';
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Get cached data by key
   * Returns null if not found or expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry) {
        if (Date.now() < memoryEntry.expiresAt) {
          return memoryEntry.data;
        } else {
          // Remove expired entry
          this.memoryCache.delete(key);
        }
      }
      
      // Check persistent storage
      const storageKey = this.CACHE_PREFIX + key;
      const stored = await AsyncStorage.getItem(storageKey);
      
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        
        if (Date.now() < entry.expiresAt) {
          // Restore to memory cache
          this.memoryCache.set(key, entry);
          return entry.data;
        } else {
          // Remove expired entry
          await AsyncStorage.removeItem(storageKey);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  /**
   * Set cache data with optional TTL
   */
  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      };
      
      // Store in memory cache
      this.memoryCache.set(key, entry);
      
      // Store in persistent storage
      const storageKey = this.CACHE_PREFIX + key;
      await AsyncStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  /**
   * Remove specific cache entry
   */
  async remove(key: string): Promise<void> {
    try {
      // Remove from memory cache
      this.memoryCache.delete(key);
      
      // Remove from persistent storage
      const storageKey = this.CACHE_PREFIX + key;
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Cache remove error:', error);
    }
  }
  
  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();
      
      // Clear persistent storage
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
  
  /**
   * Clear expired entries
   */
  async clearExpired(): Promise<void> {
    try {
      const now = Date.now();
      
      // Clear expired from memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (now >= entry.expiresAt) {
          this.memoryCache.delete(key);
        }
      }
      
      // Clear expired from persistent storage
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      for (const storageKey of cacheKeys) {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const entry: CacheEntry<any> = JSON.parse(stored);
          if (now >= entry.expiresAt) {
            await AsyncStorage.removeItem(storageKey);
          }
        }
      }
    } catch (error) {
      console.error('Clear expired cache error:', error);
    }
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryEntries: number;
    storageEntries: number;
    totalSize: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return {
        memoryEntries: this.memoryCache.size,
        storageEntries: cacheKeys.length,
        totalSize,
      };
    } catch (error) {
      console.error('Get cache stats error:', error);
      return {
        memoryEntries: this.memoryCache.size,
        storageEntries: 0,
        totalSize: 0,
      };
    }
  }
  
  /**
   * Batch get multiple cache entries
   */
  async getMultiple<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    
    for (const key of keys) {
      const data = await this.get<T>(key);
      if (data !== null) {
        results.set(key, data);
      }
    }
    
    return results;
  }
  
  /**
   * Batch set multiple cache entries
   */
  async setMultiple<T>(entries: Map<string, T>, ttl?: number): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const [key, data] of entries.entries()) {
      promises.push(this.set(key, data, ttl));
    }
    
    await Promise.all(promises);
  }
}

// Export singleton instance
export const guestListCache = new GuestListCache();

// Export class for testing
export default GuestListCache;
