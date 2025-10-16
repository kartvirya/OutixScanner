import { useCallback, useEffect, useRef } from 'react';

interface PerformanceMetrics {
  apiCalls: number;
  totalTime: number;
  averageTime: number;
  slowestCall: number;
  fastestCall: number;
}

interface UsePerformanceMonitorReturn {
  metrics: PerformanceMetrics;
  measureApiCall: <T>(apiCall: () => Promise<T>, label?: string) => Promise<T>;
  resetMetrics: () => void;
}

export const usePerformanceMonitor = (componentName: string): UsePerformanceMonitorReturn => {
  const metricsRef = useRef<PerformanceMetrics>({
    apiCalls: 0,
    totalTime: 0,
    averageTime: 0,
    slowestCall: 0,
    fastestCall: Infinity,
  });

  const measureApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    label?: string
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Update metrics
      const metrics = metricsRef.current;
      metrics.apiCalls += 1;
      metrics.totalTime += duration;
      metrics.averageTime = metrics.totalTime / metrics.apiCalls;
      metrics.slowestCall = Math.max(metrics.slowestCall, duration);
      metrics.fastestCall = Math.min(metrics.fastestCall, duration);
      
      // Log performance info in development
      if (__DEV__) {
        console.log(`[${componentName}] ${label || 'API Call'} completed in ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Still update metrics even for failed calls
      const metrics = metricsRef.current;
      metrics.apiCalls += 1;
      metrics.totalTime += duration;
      metrics.averageTime = metrics.totalTime / metrics.apiCalls;
      metrics.slowestCall = Math.max(metrics.slowestCall, duration);
      
      if (__DEV__) {
        console.log(`[${componentName}] ${label || 'API Call'} failed after ${duration.toFixed(2)}ms:`, error);
      }
      
      throw error;
    }
  }, [componentName]);

  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      apiCalls: 0,
      totalTime: 0,
      averageTime: 0,
      slowestCall: 0,
      fastestCall: Infinity,
    };
  }, []);

  // Log metrics summary on component unmount in development
  useEffect(() => {
    return () => {
      if (__DEV__ && metricsRef.current.apiCalls > 0) {
        const metrics = metricsRef.current;
        console.log(`[${componentName}] Performance Summary:`, {
          totalCalls: metrics.apiCalls,
          averageTime: `${metrics.averageTime.toFixed(2)}ms`,
          slowestCall: `${metrics.slowestCall.toFixed(2)}ms`,
          fastestCall: metrics.fastestCall === Infinity ? 'N/A' : `${metrics.fastestCall.toFixed(2)}ms`,
        });
      }
    };
  }, [componentName]);

  return {
    metrics: metricsRef.current,
    measureApiCall,
    resetMetrics,
  };
};
