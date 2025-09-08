// Utility for managing timeouts and intervals
export class TimeoutManager {
  private timeouts = new Set<NodeJS.Timeout>();
  private intervals = new Set<NodeJS.Timeout>();

  setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timeout = setTimeout(() => {
      this.timeouts.delete(timeout);
      callback();
    }, delay);
    this.timeouts.add(timeout);
    return timeout;
  }

  setInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }

  clearTimeout(timeout: NodeJS.Timeout): void {
    clearTimeout(timeout);
    this.timeouts.delete(timeout);
  }

  clearInterval(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    this.intervals.delete(interval);
  }

  clearAll(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.intervals.forEach(interval => clearInterval(interval));
    this.timeouts.clear();
    this.intervals.clear();
  }

  // Clean up when component unmounts
  destroy(): void {
    this.clearAll();
  }
}

// Hook for managing timeouts in React components
export const useTimeoutManager = () => {
  const manager = new TimeoutManager();
  
  // Clean up on unmount
  React.useEffect(() => {
    return () => manager.destroy();
  }, []);

  return manager;
};

// Import React for the hook
import React from 'react';

