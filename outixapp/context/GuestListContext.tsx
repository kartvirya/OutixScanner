import React, { createContext, useContext, useReducer, useCallback, useMemo, useRef } from 'react';
import { 
  getGuestListPaginated, 
  getCheckedInGuestList, 
  searchGuestList,
  manualCheckIn,
  manualCheckOut 
} from '../services/api';
import { guestListCache } from '../services/guestListCache';

// Types
export interface Attendee {
  id: string;
  name: string;
  email: string;
  ticketType: string;
  scannedIn: boolean;
  scanInTime?: string;
  scanCode?: string;
  // Additional fields
  purchased_date?: string;
  reference_num?: string;
  booking_id?: string;
  ticket_identifier?: string;
  price?: string;
  mobile?: string;
  address?: string;
  notes?: string;
  rawData?: Record<string, unknown>;
}

interface GuestListState {
  // Core data
  guests: Attendee[];
  checkedInGuests: Attendee[];
  searchResults: Attendee[];
  
  // Pagination
  currentPage: number;
  hasMore: boolean;
  totalCount: number;
  
  // UI state
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  searchLoading: boolean;
  
  // Filters
  searchQuery: string;
  filterStatus: 'all' | 'checked-in' | 'not-arrived';
  isSearchMode: boolean;
  
  // Event info
  eventId: string;
  eventTitle: string;
}

// Action types
type GuestListAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_LOADING_MORE'; payload: boolean }
  | { type: 'SET_SEARCH_LOADING'; payload: boolean }
  | { type: 'SET_GUESTS'; payload: { guests: Attendee[]; page: number; hasMore: boolean; totalCount: number } }
  | { type: 'APPEND_GUESTS'; payload: { guests: Attendee[]; hasMore: boolean } }
  | { type: 'SET_CHECKED_IN_GUESTS'; payload: Attendee[] }
  | { type: 'SET_SEARCH_RESULTS'; payload: Attendee[] }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_FILTER_STATUS'; payload: 'all' | 'checked-in' | 'not-arrived' }
  | { type: 'SET_SEARCH_MODE'; payload: boolean }
  | { type: 'UPDATE_GUEST'; payload: { guestId: string; updates: Partial<Attendee> } }
  | { type: 'ADD_GUEST'; payload: Attendee }
  | { type: 'SET_EVENT_INFO'; payload: { eventId: string; eventTitle: string } }
  | { type: 'SYNC_CHECK_IN_STATUS'; payload: Attendee[] }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: GuestListState = {
  guests: [],
  checkedInGuests: [],
  searchResults: [],
  currentPage: 1,
  hasMore: false,
  totalCount: 0,
  loading: false,
  refreshing: false,
  loadingMore: false,
  searchLoading: false,
  searchQuery: '',
  filterStatus: 'all',
  isSearchMode: false,
  eventId: '',
  eventTitle: '',
};

// Reducer with optimized updates
const guestListReducer = (state: GuestListState, action: GuestListAction): GuestListState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_REFRESHING':
      return { ...state, refreshing: action.payload };
    
    case 'SET_LOADING_MORE':
      return { ...state, loadingMore: action.payload };
    
    case 'SET_SEARCH_LOADING':
      return { ...state, searchLoading: action.payload };
    
    case 'SET_GUESTS':
      return {
        ...state,
        guests: action.payload.guests,
        currentPage: action.payload.page,
        hasMore: action.payload.hasMore,
        totalCount: action.payload.totalCount,
      };
    
    case 'APPEND_GUESTS':
      return {
        ...state,
        guests: [...state.guests, ...action.payload.guests],
        hasMore: action.payload.hasMore,
      };
    
    case 'SET_CHECKED_IN_GUESTS':
      return { ...state, checkedInGuests: action.payload };
    
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload };
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_FILTER_STATUS':
      return { ...state, filterStatus: action.payload };
    
    case 'SET_SEARCH_MODE':
      return { ...state, isSearchMode: action.payload };
    
    case 'UPDATE_GUEST': {
      const updateGuest = (list: Attendee[]) => 
        list.map(g => g.id === action.payload.guestId 
          ? { ...g, ...action.payload.updates } 
          : g
        );
      
      return {
        ...state,
        guests: updateGuest(state.guests),
        searchResults: updateGuest(state.searchResults),
        checkedInGuests: action.payload.updates.scannedIn 
          ? [...state.checkedInGuests, state.guests.find(g => g.id === action.payload.guestId)!].filter(Boolean)
          : state.checkedInGuests.filter(g => g.id !== action.payload.guestId),
      };
    }
    
    case 'ADD_GUEST':
      return {
        ...state,
        guests: [...state.guests, action.payload],
        totalCount: state.totalCount + 1,
        checkedInGuests: action.payload.scannedIn 
          ? [...state.checkedInGuests, action.payload]
          : state.checkedInGuests,
      };
    
    case 'SET_EVENT_INFO':
      return {
        ...state,
        eventId: action.payload.eventId,
        eventTitle: action.payload.eventTitle,
      };
    
    case 'SYNC_CHECK_IN_STATUS': {
      const checkedInMap = new Map(
        action.payload.map(g => [g.ticket_identifier || g.id, g])
      );
      
      const syncedGuests = state.guests.map(guest => {
        const key = guest.ticket_identifier || guest.id;
        const checkedInGuest = checkedInMap.get(key);
        
        if (checkedInGuest && !guest.scannedIn) {
          return {
            ...guest,
            scannedIn: true,
            scanInTime: checkedInGuest.scanInTime || guest.scanInTime,
            scanCode: checkedInGuest.scanCode || guest.scanCode,
          };
        } else if (!checkedInGuest && guest.scannedIn) {
          return {
            ...guest,
            scannedIn: false,
            scanInTime: undefined,
            scanCode: undefined,
          };
        }
        return guest;
      });
      
      return {
        ...state,
        guests: syncedGuests,
        checkedInGuests: action.payload,
      };
    }
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
};

// Context
interface GuestListContextType {
  state: GuestListState;
  actions: {
    fetchGuestsPaginated: (page: number, reset?: boolean) => Promise<void>;
    fetchCheckedInGuests: () => Promise<void>;
    searchGuests: (query: string) => Promise<void>;
    refreshGuestList: () => Promise<void>;
    loadMore: () => Promise<void>;
    setSearchQuery: (query: string) => void;
    setFilterStatus: (status: 'all' | 'checked-in' | 'not-arrived') => void;
    clearSearch: () => void;
    checkInGuest: (guest: Attendee) => Promise<boolean>;
    checkOutGuest: (guest: Attendee) => Promise<boolean>;
    setEventInfo: (eventId: string, eventTitle: string) => void;
  };
  computed: {
    filteredGuests: Attendee[];
    checkedInCount: number;
    attendancePercentage: number;
  };
}

const GuestListContext = createContext<GuestListContextType | undefined>(undefined);

// Provider component
export const GuestListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(guestListReducer, initialState);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to extract guest name
  const extractGuestName = useCallback((guest: any): string => {
    if (guest.purchased_by?.trim()) return guest.purchased_by.trim();
    if (guest.admit_name?.trim()) return guest.admit_name.trim();
    if (guest.name?.trim()) return guest.name.trim();
    if (guest.email?.trim()) return guest.email.trim();
    if (guest.firstName || guest.lastName) {
      return `${guest.firstName || ''} ${guest.lastName || ''}`.trim();
    }
    if (guest.ticket_identifier) {
      return `Ticket ${guest.ticket_identifier.slice(-6)}`;
    }
    return 'Guest';
  }, []);

  // Process guest data
  const processGuestData = useCallback((guest: any): Attendee => ({
    id: guest.id || guest.guestId || String(Math.random()),
    name: extractGuestName(guest),
    email: guest.email || 'N/A',
    ticketType: guest.ticket_title || guest.ticketType || guest.ticket_type || 'General',
    scannedIn: guest.checkedIn || guest.checked_in || guest.scannedIn || guest.admitted || guest.is_admitted || false,
    scanInTime: guest.checkInTime || guest.check_in_time || guest.admitted_time || undefined,
    scanCode: guest.scanCode || undefined,
    purchased_date: guest.purchased_date || undefined,
    reference_num: guest.booking_reference || guest.reference_num || undefined,
    booking_id: guest.booking_id || undefined,
    ticket_identifier: guest.ticket_identifier || guest.qrCode || guest.qr_code || undefined,
    price: guest.price || undefined,
    mobile: guest.mobile || undefined,
    address: guest.address || undefined,
    notes: guest.notes || undefined,
    rawData: guest,
  }), [extractGuestName]);

  // Actions
  const actions = useMemo(() => ({
    fetchGuestsPaginated: async (page: number, reset = false) => {
      if (!state.eventId) return;
      
      try {
        dispatch({ type: reset ? 'SET_REFRESHING' : page === 1 ? 'SET_LOADING' : 'SET_LOADING_MORE', payload: true });
        
        // Check cache first
        const cacheKey = `guests_${state.eventId}_${page}`;
        const cached = await guestListCache.get(cacheKey);
        
        if (cached && !reset) {
          const processedGuests = cached.guests.map(processGuestData);
          
          if (reset || page === 1) {
            dispatch({ 
              type: 'SET_GUESTS', 
              payload: { 
                guests: processedGuests, 
                page, 
                hasMore: cached.hasMore, 
                totalCount: cached.totalCount 
              } 
            });
          } else {
            dispatch({ 
              type: 'APPEND_GUESTS', 
              payload: { guests: processedGuests, hasMore: cached.hasMore } 
            });
          }
        } else {
          const result = await getGuestListPaginated(state.eventId, page, 10);
          const processedGuests = result.guests.map(processGuestData);
          
          // Cache the results
          await guestListCache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes
          
          if (reset || page === 1) {
            dispatch({ 
              type: 'SET_GUESTS', 
              payload: { 
                guests: processedGuests, 
                page, 
                hasMore: result.hasMore, 
                totalCount: result.totalCount 
              } 
            });
          } else {
            dispatch({ 
              type: 'APPEND_GUESTS', 
              payload: { guests: processedGuests, hasMore: result.hasMore } 
            });
          }
        }
        
        // Sync with checked-in guests if we have them
        if (state.checkedInGuests.length > 0) {
          dispatch({ type: 'SYNC_CHECK_IN_STATUS', payload: state.checkedInGuests });
        }
      } catch (error) {
        console.error('Failed to fetch guests:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_REFRESHING', payload: false });
        dispatch({ type: 'SET_LOADING_MORE', payload: false });
      }
    },

    fetchCheckedInGuests: async () => {
      if (!state.eventId) return;
      
      try {
        const checkedInData = await getCheckedInGuestList(state.eventId);
        
        if (checkedInData && Array.isArray(checkedInData)) {
          const processedGuests = checkedInData.map(guest => {
            const timeField = guest.checkInTime || guest.check_in_time || 
                            guest.checkedin_date || guest.checkedin_time || 
                            guest.scan_time || guest.timestamp;
            
            return {
              ...processGuestData(guest),
              scannedIn: true,
              scanInTime: timeField || 'Unknown time',
            };
          });
          
          dispatch({ type: 'SET_CHECKED_IN_GUESTS', payload: processedGuests });
          dispatch({ type: 'SYNC_CHECK_IN_STATUS', payload: processedGuests });
        }
      } catch (error) {
        console.error('Failed to fetch checked-in guests:', error);
      }
    },

    searchGuests: async (query: string) => {
      if (!state.eventId || !query.trim()) return;
      
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // Debounce search
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          dispatch({ type: 'SET_SEARCH_LOADING', payload: true });
          dispatch({ type: 'SET_SEARCH_MODE', payload: true });
          
          const results = await searchGuestList(state.eventId, query);
          const processedResults = results.map(processGuestData);
          
          dispatch({ type: 'SET_SEARCH_RESULTS', payload: processedResults });
        } catch (error) {
          console.error('Search failed:', error);
          dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
        } finally {
          dispatch({ type: 'SET_SEARCH_LOADING', payload: false });
        }
      }, 300);
    },

    refreshGuestList: async () => {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
      dispatch({ type: 'SET_SEARCH_MODE', payload: false });
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
      
      await Promise.all([
        actions.fetchGuestsPaginated(1, true),
        actions.fetchCheckedInGuests(),
      ]);
    },

    loadMore: async () => {
      if (!state.hasMore || state.loadingMore || state.isSearchMode) return;
      await actions.fetchGuestsPaginated(state.currentPage + 1);
    },

    setSearchQuery: (query: string) => {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
      if (query.trim()) {
        actions.searchGuests(query);
      } else {
        actions.clearSearch();
      }
    },

    setFilterStatus: (status: 'all' | 'checked-in' | 'not-arrived') => {
      dispatch({ type: 'SET_FILTER_STATUS', payload: status });
    },

    clearSearch: () => {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
      dispatch({ type: 'SET_SEARCH_MODE', payload: false });
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
    },

    checkInGuest: async (guest: Attendee): Promise<boolean> => {
      try {
        const guestIdentifier = guest.ticket_identifier || guest.reference_num || guest.booking_id || guest.id;
        
        if (!guestIdentifier) {
          console.error('No valid identifier for manual check-in');
          return false;
        }
        
        console.log(`👤 Manual check-in for guest: ${guest.name} (${guestIdentifier})`);
        
        // Update UI optimistically
        const checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        dispatch({ 
          type: 'UPDATE_GUEST', 
          payload: { 
            guestId: guest.id, 
            updates: { 
              scannedIn: true, 
              scanInTime: checkInTime,
              scanCode: `MANUAL_${Date.now()}`,
            } 
          } 
        });
        
        // Call manual check-in API (not scan API)
        const result = await manualCheckIn(state.eventId, guestIdentifier);
        
        if (result && !result.error) {
          console.log('✅ Manual check-in successful');
          await actions.fetchCheckedInGuests();
          return true;
        }
        
        console.log('❌ Manual check-in failed, reverting UI');
        // Revert on failure
        dispatch({ 
          type: 'UPDATE_GUEST', 
          payload: { 
            guestId: guest.id, 
            updates: { scannedIn: false, scanInTime: undefined, scanCode: undefined } 
          } 
        });
        
        return false;
      } catch (error) {
        console.error('Manual check-in error:', error);
        // Revert UI on error
        dispatch({ 
          type: 'UPDATE_GUEST', 
          payload: { 
            guestId: guest.id, 
            updates: { scannedIn: false, scanInTime: undefined, scanCode: undefined } 
          } 
        });
        return false;
      }
    },

    checkOutGuest: async (guest: Attendee): Promise<boolean> => {
      try {
        const guestIdentifier = guest.ticket_identifier || guest.reference_num || guest.booking_id || guest.scanCode || guest.id;
        
        console.log(`👤 Manual check-out for guest: ${guest.name} (${guestIdentifier})`);
        
        // Update UI optimistically
        dispatch({ 
          type: 'UPDATE_GUEST', 
          payload: { 
            guestId: guest.id, 
            updates: { scannedIn: false, scanInTime: undefined, scanCode: undefined } 
          } 
        });
        
        if (guestIdentifier) {
          // Call manual check-out API (not unscan API)
          const result = await manualCheckOut(state.eventId, guestIdentifier);
          
          if (result && !result.error) {
            console.log('✅ Manual check-out successful');
            await actions.fetchCheckedInGuests();
            return true;
          } else {
            console.log('⚠️ Manual check-out API failed, keeping local update');
          }
        }
        
        // Keep the optimistic update even if API fails (local-first approach)
        return true;
      } catch (error) {
        console.error('Manual check-out error:', error);
        // Still return true for local update (local-first approach)
        return true;
      }
    },

    setEventInfo: (eventId: string, eventTitle: string) => {
      dispatch({ type: 'SET_EVENT_INFO', payload: { eventId, eventTitle } });
    },
  }), [state.eventId, state.checkedInGuests.length, state.hasMore, state.loadingMore, state.isSearchMode, processGuestData]);

  // Computed values with memoization
  const computed = useMemo(() => {
    const guestList = state.isSearchMode ? state.searchResults : state.guests;
    
    const filteredGuests = guestList.filter(guest => {
      if (state.filterStatus === 'checked-in') return guest.scannedIn;
      if (state.filterStatus === 'not-arrived') return !guest.scannedIn;
      return true;
    });
    
    return {
      filteredGuests,
      checkedInCount: state.checkedInGuests.length,
      attendancePercentage: state.totalCount ? Math.round((state.checkedInGuests.length / state.totalCount) * 100) : 0,
    };
  }, [state.guests, state.searchResults, state.isSearchMode, state.filterStatus, state.checkedInGuests.length, state.totalCount]);

  const value = useMemo(() => ({
    state,
    actions,
    computed,
  }), [state, actions, computed]);

  return <GuestListContext.Provider value={value}>{children}</GuestListContext.Provider>;
};

// Hook to use the context
export const useGuestList = () => {
  const context = useContext(GuestListContext);
  if (!context) {
    throw new Error('useGuestList must be used within a GuestListProvider');
  }
  return context;
};
