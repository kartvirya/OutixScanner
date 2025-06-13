import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface RefreshContextType {
  // Refresh triggers
  triggerGuestListRefresh: (eventId: string) => void;
  triggerAttendanceRefresh: (eventId: string) => void;
  triggerAnalyticsRefresh: () => void;
  triggerEventRefresh: (eventId: string) => void;
  
  // Refresh listeners
  onGuestListRefresh: (eventId: string, callback: () => void) => () => void;
  onAttendanceRefresh: (eventId: string, callback: () => void) => () => void;
  onAnalyticsRefresh: (callback: () => void) => () => void;
  onEventRefresh: (eventId: string, callback: () => void) => () => void;
  
  // Auto-refresh controls
  setAutoRefreshInterval: (enabled: boolean, intervalMs?: number) => void;
  
  // Manual refresh
  refreshAll: () => void;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default
  
  const listeners = useRef({
    guestList: new Map<string, Set<() => void>>(),
    attendance: new Map<string, Set<() => void>>(),
    analytics: new Set<() => void>(),
    events: new Map<string, Set<() => void>>(),
  });
  
  const autoRefreshTimer = useRef<NodeJS.Timeout | null>(null);

  // Trigger refresh functions
  const triggerGuestListRefresh = useCallback((eventId: string) => {
    console.log(`Triggering guest list refresh for event ${eventId}`);
    const eventListeners = listeners.current.guestList.get(eventId);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Error in guest list refresh callback:', error);
        }
      });
    }
  }, []);

  const triggerAttendanceRefresh = useCallback((eventId: string) => {
    console.log(`Triggering attendance refresh for event ${eventId}`);
    const eventListeners = listeners.current.attendance.get(eventId);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Error in attendance refresh callback:', error);
        }
      });
    }
  }, []);

  const triggerAnalyticsRefresh = useCallback(() => {
    console.log('Triggering analytics refresh');
    listeners.current.analytics.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in analytics refresh callback:', error);
      }
    });
  }, []);

  const triggerEventRefresh = useCallback((eventId: string) => {
    console.log(`Triggering event refresh for event ${eventId}`);
    const eventListeners = listeners.current.events.get(eventId);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Error in event refresh callback:', error);
        }
      });
    }
  }, []);

  // Listener registration functions
  const onGuestListRefresh = useCallback((eventId: string, callback: () => void) => {
    if (!listeners.current.guestList.has(eventId)) {
      listeners.current.guestList.set(eventId, new Set());
    }
    listeners.current.guestList.get(eventId)!.add(callback);
    
    return () => {
      const eventListeners = listeners.current.guestList.get(eventId);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          listeners.current.guestList.delete(eventId);
        }
      }
    };
  }, []);

  const onAttendanceRefresh = useCallback((eventId: string, callback: () => void) => {
    if (!listeners.current.attendance.has(eventId)) {
      listeners.current.attendance.set(eventId, new Set());
    }
    listeners.current.attendance.get(eventId)!.add(callback);
    
    return () => {
      const eventListeners = listeners.current.attendance.get(eventId);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          listeners.current.attendance.delete(eventId);
        }
      }
    };
  }, []);

  const onAnalyticsRefresh = useCallback((callback: () => void) => {
    listeners.current.analytics.add(callback);
    
    return () => {
      listeners.current.analytics.delete(callback);
    };
  }, []);

  const onEventRefresh = useCallback((eventId: string, callback: () => void) => {
    if (!listeners.current.events.has(eventId)) {
      listeners.current.events.set(eventId, new Set());
    }
    listeners.current.events.get(eventId)!.add(callback);
    
    return () => {
      const eventListeners = listeners.current.events.get(eventId);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          listeners.current.events.delete(eventId);
        }
      }
    };
  }, []);

  // Auto-refresh control
  const setAutoRefreshInterval = useCallback((enabled: boolean, intervalMs: number = 30000) => {
    setAutoRefreshEnabled(enabled);
    setRefreshInterval(intervalMs);
    
    if (autoRefreshTimer.current) {
      clearInterval(autoRefreshTimer.current);
      autoRefreshTimer.current = null;
    }
    
    if (enabled) {
      autoRefreshTimer.current = setInterval(() => {
        console.log('Auto-refresh triggered');
        // Trigger refresh for all active listeners
        triggerAnalyticsRefresh();
        
        // Refresh all event-specific data
        listeners.current.guestList.forEach((_, eventId) => {
          triggerGuestListRefresh(eventId);
        });
        listeners.current.attendance.forEach((_, eventId) => {
          triggerAttendanceRefresh(eventId);
        });
        listeners.current.events.forEach((_, eventId) => {
          triggerEventRefresh(eventId);
        });
      }, intervalMs);
    }
  }, [triggerAnalyticsRefresh, triggerGuestListRefresh, triggerAttendanceRefresh, triggerEventRefresh]);

  // Manual refresh all
  const refreshAll = useCallback(() => {
    console.log('Manual refresh all triggered');
    triggerAnalyticsRefresh();
    
    // Get all unique event IDs from all listener maps
    const eventIds = new Set<string>();
    listeners.current.guestList.forEach((_, eventId) => eventIds.add(eventId));
    listeners.current.attendance.forEach((_, eventId) => eventIds.add(eventId));
    listeners.current.events.forEach((_, eventId) => eventIds.add(eventId));
    
    // Trigger refresh for all events
    eventIds.forEach(eventId => {
      triggerGuestListRefresh(eventId);
      triggerAttendanceRefresh(eventId);
      triggerEventRefresh(eventId);
    });
  }, [triggerAnalyticsRefresh, triggerGuestListRefresh, triggerAttendanceRefresh, triggerEventRefresh]);

  const value: RefreshContextType = {
    triggerGuestListRefresh,
    triggerAttendanceRefresh,
    triggerAnalyticsRefresh,
    triggerEventRefresh,
    onGuestListRefresh,
    onAttendanceRefresh,
    onAnalyticsRefresh,
    onEventRefresh,
    setAutoRefreshInterval,
    refreshAll,
  };

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
} 