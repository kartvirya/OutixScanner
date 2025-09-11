import { useEffect, useRef, useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache configuration
interface CacheConfig {
  duration?: number; // Cache duration in milliseconds
  maxSize?: number; // Maximum number of items in cache
  persistent?: boolean; // Whether to persist cache to AsyncStorage
}

// Performance monitoring
interface PerformanceMetrics {
  renderTime: number;
  apiCallTime: number;
  cacheHitRate: number;
  memoryUsage?: number;
}

// Generic cache class
export class DataCache<T> {
  private cache: Map<string, { data: T; timestamp: number }>;
  private config: Required<CacheConfig>;
  private hitCount = 0;
  private missCount = 0;
  private storageKey: string;

  constructor(storageKey: string, config: CacheConfig = {}) {
    this.cache = new Map();
    this.storageKey = storageKey;
    this.config = {
      duration: config.duration || 5 * 60 * 1000, // 5 minutes default
      maxSize: config.maxSize || 100,
      persistent: config.persistent || false
    };
    
    if (this.config.persistent) {
      this.loadFromStorage();
    }
  }

  // Load cache from AsyncStorage
  private async loadFromStorage() {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Restore cache but check expiration
        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
          if (Date.now() - value.timestamp < this.config.duration) {
            this.cache.set(key, value);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load cache from storage:', error);
    }
  }

  // Save cache to AsyncStorage
  private async saveToStorage() {
    if (!this.config.persistent) return;
    
    try {
      const cacheObject: Record<string, any> = {};
      this.cache.forEach((value, key) => {
        cacheObject[key] = value;
      });
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Failed to save cache to storage:', error);
    }
  }

  // Get item from cache
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.missCount++;
      return null;
    }
    
    // Check if expired
    if (Date.now() - item.timestamp > this.config.duration) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }
    
    this.hitCount++;
    return item.data;
  }

  // Set item in cache
  async set(key: string, data: T): Promise<void> {
    // Enforce max size
    if (this.cache.size >= this.config.maxSize) {
      // Remove oldest item
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, { data, timestamp: Date.now() });
    await this.saveToStorage();
  }

  // Clear cache
  async clear(): Promise<void> {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    
    if (this.config.persistent) {
      await AsyncStorage.removeItem(this.storageKey);
    }
  }

  // Get cache statistics
  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      hitRate: total > 0 ? this.hitCount / total : 0,
      hits: this.hitCount,
      misses: this.missCount,
      size: this.cache.size
    };
  }

  // Invalidate specific keys
  invalidate(pattern?: string | RegExp): void {
    if (!pattern) {
      this.clear();
      return;
    }

    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.saveToStorage();
  }
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef(Date.now());
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    apiCallTime: 0,
    cacheHitRate: 0
  });

  useEffect(() => {
    const renderTime = Date.now() - renderStartTime.current;
    setMetrics(prev => ({ ...prev, renderTime }));
    
    if (__DEV__) {
      console.log(`[Performance] ${componentName} rendered in ${renderTime}ms`);
    }
  }, [componentName]);

  const measureApiCall = useCallback(async <T,>(
    apiCall: () => Promise<T>,
    label?: string
  ): Promise<T> => {
    const startTime = Date.now();
    try {
      const result = await apiCall();
      const duration = Date.now() - startTime;
      
      setMetrics(prev => ({ 
        ...prev, 
        apiCallTime: prev.apiCallTime + duration 
      }));
      
      if (__DEV__) {
        console.log(`[Performance] API call ${label || 'unknown'} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Performance] API call ${label || 'unknown'} failed after ${duration}ms`);
      throw error;
    }
  }, []);

  return { metrics, measureApiCall };
}

// Debounce hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());
  const timeout = useRef<NodeJS.Timeout>();

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = now;
    } else {
      clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        callback(...args);
        lastRun.current = Date.now();
      }, delay - (now - lastRun.current));
    }
  }, [callback, delay]) as T;
}

// Lazy loading hook
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await loader();
      if (mounted.current) {
        setData(result);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err as Error);
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, dependencies);

  return { data, loading, error, load };
}

// Intersection observer hook for lazy loading components
export function useInView(threshold = 0.1) {
  const [isInView, setIsInView] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);
  const ref = useRef<any>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // For React Native, we'll use a simpler approach
    // In a real implementation, you might use a library like react-native-intersection-observer
    setIsInView(true);
    setHasBeenInView(true);
  }, []);

  return { ref, isInView, hasBeenInView };
}

// Batch API calls
export class BatchProcessor<T, R> {
  private queue: Array<{ item: T; resolve: (value: R) => void; reject: (error: any) => void }> = [];
  private timer: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(
    private processor: (items: T[]) => Promise<R[]>,
    private batchSize = 10,
    private delay = 100
  ) {}

  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });
      this.scheduleProcess();
    });
  }

  private scheduleProcess() {
    if (this.timer) return;
    
    this.timer = setTimeout(() => {
      this.timer = null;
      this.process();
    }, this.delay);
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      const items = batch.map(b => b.item);
      const results = await this.processor(items);
      
      batch.forEach((b, index) => {
        b.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach(b => b.reject(error));
    } finally {
      this.processing = false;
      
      if (this.queue.length > 0) {
        this.scheduleProcess();
      }
    }
  }
}

// Memory-efficient list virtualization helper
export function calculateVisibleRange(
  scrollOffset: number,
  containerHeight: number,
  itemHeight: number,
  itemCount: number,
  overscan = 3
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollOffset / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(itemCount, start + visibleCount + overscan * 2);
  
  return { start, end };
}

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>();

export async function deduplicatedRequest<T>(
  key: string,
  request: () => Promise<T>
): Promise<T> {
  // Check if there's already a pending request with this key
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  // Create new request and store it
  const promise = request().finally(() => {
    // Clean up after request completes
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// Performance-optimized state update
export function useMergedState<T extends object>(initialState: T) {
  const [state, setState] = useState(initialState);

  const mergeState = useCallback((updates: Partial<T>) => {
    setState(prev => {
      // Only update if values actually changed
      const hasChanges = Object.keys(updates).some(
        key => prev[key as keyof T] !== updates[key as keyof T]
      );
      
      return hasChanges ? { ...prev, ...updates } : prev;
    });
  }, []);

  return [state, mergeState] as const;
}

// Export a singleton cache for events
export const eventCache = new DataCache<any>('event_cache', {
  duration: 10 * 60 * 1000, // 10 minutes
  maxSize: 50,
  persistent: true
});

// Export a singleton cache for guest lists
export const guestListCache = new DataCache<any>('guest_list_cache', {
  duration: 5 * 60 * 1000, // 5 minutes
  maxSize: 20,
  persistent: true
});

// Performance logger
export const perfLog = {
  start(label: string): number {
    const startTime = Date.now();
    if (__DEV__) {
      console.log(`[PERF START] ${label}`);
    }
    return startTime;
  },

  end(label: string, startTime: number): number {
    const duration = Date.now() - startTime;
    if (__DEV__) {
      console.log(`[PERF END] ${label}: ${duration}ms`);
    }
    return duration;
  },

  measure<T>(label: string, fn: () => T): T {
    const startTime = this.start(label);
    const result = fn();
    this.end(label, startTime);
    return result;
  },

  async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const startTime = this.start(label);
    try {
      const result = await fn();
      this.end(label, startTime);
      return result;
    } catch (error) {
      this.end(label + ' (failed)', startTime);
      throw error;
    }
  }
};
