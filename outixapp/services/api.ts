import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { InternalAxiosRequestConfig } from 'axios';

// Base URL for direct API calls - now that CORS is fixed in the backend
const BASE_URL = 'https://www.outix.co/apis';
// Base URL for images (usually the main domain, not the API subdomain)
const IMAGE_BASE_URL = 'https://www.outix.co/uploads/images/events/';

console.log(`Using direct API URL: ${BASE_URL}`);
console.log(`Using image base URL: ${IMAGE_BASE_URL}`);

// In-memory token storage (no AsyncStorage dependency)
let authToken: string | null = null;

// Flag to prevent auto-login after logout
let isLoggedOut: boolean = false;

// Flag to indicate if AsyncStorage is working
let isAsyncStorageWorking = true;

// Memory storage fallback when AsyncStorage fails
const memoryStorage = new Map<string, string>();

// Performance optimization: Validation result cache
const validationCache = new Map<string, { result: any; timestamp: number; ttl: number }>();
const VALIDATION_CACHE_TTL = 30000; // 30 seconds cache for validation results

// Performance optimization: Guest list cache
const guestListCache = new Map<string, { result: any; timestamp: number; ttl: number }>();
const GUEST_LIST_CACHE_TTL = 60000; // 60 seconds cache for guest lists

// Cache utility functions
const getCachedResult = <T>(cache: Map<string, { result: T; timestamp: number; ttl: number }>, key: string): T | null => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    cache.delete(key);
    return null;
  }
  
  return cached.result;
};

const setCachedResult = <T>(cache: Map<string, { result: T; timestamp: number; ttl: number }>, key: string, result: T, ttl: number): void => {
  cache.set(key, {
    result,
    timestamp: Date.now(),
    ttl
  });
};

const clearCache = (cache: Map<string, any>): void => {
  cache.clear();
};

// Enhanced storage functions to handle AsyncStorage failures
const getStorageItem = async (key: string): Promise<string | null> => {
  try {
    if (isAsyncStorageWorking) {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value !== null) {
          // Also save to memory cache
          memoryStorage.set(key, value);
          return value;
        }
      } catch (error) {
        console.log(`AsyncStorage error reading ${key}:`, error);
        isAsyncStorageWorking = false;
      }
    }
    
    // Fallback to memory storage
    return memoryStorage.get(key) || null;
  } catch (error) {
    console.error(`Error in getStorageItem(${key}):`, error);
    return null;
  }
};

const setStorageItem = async (key: string, value: string): Promise<boolean> => {
  try {
    // Always store in memory
    memoryStorage.set(key, value);
    
    // Try AsyncStorage if working
    if (isAsyncStorageWorking) {
      try {
        await AsyncStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.log(`AsyncStorage error saving ${key}:`, error);
        isAsyncStorageWorking = false;
        // Continue with memory storage only
      }
    }
    
    return true; // Memory storage succeeded
  } catch (error) {
    console.error(`Error in setStorageItem(${key}):`, error);
    return false;
  }
};

const removeStorageItem = async (key: string): Promise<boolean> => {
  try {
    // Always remove from memory
    memoryStorage.delete(key);
    
    // Try AsyncStorage if working
    if (isAsyncStorageWorking) {
      try {
        await AsyncStorage.removeItem(key);
        return true;
      } catch (error) {
        console.log(`AsyncStorage error removing ${key}:`, error);
        isAsyncStorageWorking = false;
        // Continue with memory storage only
      }
    }
    
    return true; // Memory storage succeeded
  } catch (error) {
    console.error(`Error in removeStorageItem(${key}):`, error);
    return false;
  }
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: BASE_URL,
  // Don't set Content-Type globally as it causes issues with GET requests
});

// Add interceptor to automatically add auth token to requests
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    console.log("🔍 Interceptor called for request:", config.method?.toUpperCase(), config.url);
    
    // If no in-memory token, try to get from storage
    if (!authToken) {
      console.log("No token in memory, getting from storage...");
      try {
        authToken = await getStorageItem('auth_token');
        console.log("Token from storage:", authToken ? `${authToken.substring(0, 10)}...` : "null");
      } catch (error) {
        console.log("Error reading token from storage:", error);
      }
    } else {
      console.log("Using token from memory:", authToken.substring(0, 10) + "...");
    }
    
    if (authToken && config.headers) {
      // Use the exact header name 'Auth-Token' as shown in Postman
      config.headers['Auth-Token'] = authToken;
      console.log(`✅ Added Auth-Token to request headers: ${authToken.substring(0, 10)}...`);
      console.log("All headers being sent:", JSON.stringify(config.headers, null, 2));
    } else {
      console.log("❌ No auth token available for request or no headers object");
      console.log("authToken exists:", !!authToken);
      console.log("config.headers exists:", !!config.headers);
    }
    
    // Remove problematic headers for GET requests to avoid API issues
    if (config.method?.toLowerCase() === 'get' && config.headers) {
      if (config.headers['Content-Type']) {
        console.log("Removing Content-Type header for GET request");
        delete config.headers['Content-Type'];
      }
      if (config.headers['Accept']) {
        console.log("Removing Accept header for GET request");
        delete config.headers['Accept'];
      }
    }
    
    console.log("Final request headers:", JSON.stringify(config.headers, null, 2));
    
    return config;
  },
  (error) => {
    console.error("Interceptor error:", error);
    return Promise.reject(error);
  }
);

// Function to safely write to AsyncStorage
const safeAsyncStorageSave = async (key: string, value: string): Promise<boolean> => {
  if (!isAsyncStorageWorking) return false;
  
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.log(`Error saving to AsyncStorage (${key}):`, error);
    isAsyncStorageWorking = false;
    return false;
  }
};

// Removed mock JWT token - authentication should be handled through proper login flow

export const login = async (username?: string, password?: string): Promise<string | null> => {
  try {
    // If we have explicit credentials, try to authenticate with them regardless of logout state
    if (username && password) {
      console.log("Attempting login with provided credentials");
      
      try {
        // Use URLSearchParams for form data since we no longer have form-data dependency
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await axios.post(`${BASE_URL}/auth`, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000
        });
        
        console.log("Login response status:", response.status);
        console.log("Login response data:", JSON.stringify(response.data, null, 2));
        
        // Success path - extract token from response
        if (response.data && response.data.msg && response.data.msg.Auth_Token) {
          const token = response.data.msg.Auth_Token;
          console.log("Got auth token from API:", token);
          console.log("Token length:", token.length);
          console.log("Token first 10 chars:", token.substring(0, 10));
          
          authToken = token;
          isLoggedOut = false; // Reset logout flag on successful login
          
          // Store token in storage
          const stored = await setStorageItem('auth_token', token);
          console.log("Token stored successfully:", stored);
          
          // Verify token was stored correctly
          const retrievedToken = await getStorageItem('auth_token');
          console.log("Retrieved token for verification:", retrievedToken);
          console.log("Tokens match:", token === retrievedToken);
          
          // Store user profile data if available in the response
          if (response.data.msg) {
            console.log("Storing user profile data from login response");
            await setStorageItem('user_profile', JSON.stringify(response.data.msg));
          }
          
          return token;
        }
        
        // Try to extract token from response if structure is different
        if (response.data && response.status === 200) {
          const token = extractTokenFromResponse(response.data);
          if (token) {
            console.log("Extracted token from API response");
            authToken = token;
            isLoggedOut = false; // Reset logout flag on successful login
            await setStorageItem('auth_token', token);
            
            // Store user profile data from response
            if (response.data) {
              console.log("Storing user profile data from extracted response");
              await setStorageItem('user_profile', JSON.stringify(response.data));
            }
            
            return token;
          }
        }
        
        // If we reached here, API returned success but no token
        console.warn("API successful but no token found in response");
        return null;
      } catch (apiError: any) {
        console.error("API login failed:", apiError.message || apiError);
        
        // Check for authentication errors
        if (apiError.response) {
          const status = apiError.response.status;
          const data = apiError.response.data;
          
          console.log("Response status:", status);
          console.log("Response data:", data);
          
          // Handle authentication failures (401, 403, etc.)
          if (status === 401 || status === 403) {
            console.log("Authentication failed - invalid credentials");
            return null;
          }
          
          // Handle other specific errors that indicate credential issues
          if (data && (
            data.message?.toLowerCase().includes('invalid') ||
            data.message?.toLowerCase().includes('unauthorized') ||
            data.message?.toLowerCase().includes('forbidden') ||
            data.error?.toLowerCase().includes('credential')
          )) {
            console.log("Authentication failed - credential error");
            return null;
          }
        }
        
        // For network errors or server issues, we still fail
        console.log("Network or server error during login");
        return null;
      }
    }
    
    // No credentials provided - require explicit login
    console.log("No credentials provided - authentication required");
    return null;
    
  } catch (error) {
    console.error("Unexpected login error:", error);
    authToken = null;
    return null;
  }
};

// Utility function to try to extract token from various response formats
const extractTokenFromResponse = (data: any): string | null => {
  // If the data itself is a string and looks like a token
  if (typeof data === 'string' && data.length > 10) {
    return data;
  }
  
  // If it's in the Auth_Token field directly
  if (data.Auth_Token) {
    return data.Auth_Token;
  }
  
  // If it's in a 'token' field
  if (data.token) {
    return data.token;
  }
  
  // If it's in the msg object
  if (data.msg) {
    if (typeof data.msg === 'string' && data.msg.length > 10) {
      return data.msg;
    }
    if (data.msg.Auth_Token) {
      return data.msg.Auth_Token;
    }
    if (data.msg.token) {
      return data.msg.token;
    }
  }
  
  // If we couldn't find it
  return null;
};

// Create a custom fetch wrapper that works better with React Native
const customFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Create headers object directly to preserve case sensitivity
  const headersObject: Record<string, string> = {};
  
  // Add auth token if available - MUST be exactly 'Auth-Token' (case-sensitive)
  if (authToken) {
    headersObject['Auth-Token'] = authToken;
  }
  
  // Merge with any existing headers
  if (options.headers) {
    const existingHeaders = options.headers as Record<string, string>;
    Object.keys(existingHeaders).forEach(key => {
      headersObject[key] = existingHeaders[key];
    });
  }
  
  const finalOptions: RequestInit = {
    ...options,
    headers: headersObject,
  };
  
  console.log('Custom fetch - URL:', url);
  console.log('Custom fetch - Headers:', JSON.stringify(headersObject, null, 2));
  console.log('Custom fetch - Method:', finalOptions.method || 'GET');
  
  return fetch(url, finalOptions);
};

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  imageUrl?: string;
  // Additional properties that might be present in API responses
  name?: string;
  eventName?: string;
  event_name?: string;
  eventTitle?: string;
  event_title?: string;
  'Event Name'?: string;
  EventName?: string;
  display_name?: string;
  displayName?: string;
  [key: string]: unknown;
}

export const getEvents = async (): Promise<Event[]> => {
  try {
    // Make sure we have the token
    if (typeof authToken !== 'string' ) {
      console.log("No auth token in memory, trying to get from storage");
      const storedToken = await getStorageItem('auth_token');
      console.log("Retrieved token from storage:", storedToken);
      console.log("Storage token length:", storedToken?.length);
      console.log("Storage token first 10 chars:", storedToken?.substring(0, 10));
      
      if (storedToken) {
        authToken = storedToken;
        console.log("Using stored token");
      } else {
        console.log("No token in storage, trying to login");
        const freshToken = await login();
        console.log("Fresh token from login:", freshToken);
        if (freshToken) {
          authToken = freshToken;
        }
      }
    } else {
      console.log("Using existing token from memory");
      console.log("Memory token length:", authToken.length);
      console.log("Memory token first 10 chars:", authToken.substring(0, 10));
    }
    
    if (!authToken) {
      console.error("No auth token available after login attempt");
      return [];
    }
    
    console.log("Sending request with token:", authToken ? `token-exists: ${authToken.substring(0, 10)}...` : "no-token");
    // Debug log removed for production
    console.log("Request URL:", `${BASE_URL}/events`);
    
    try {
      // Create a new axios instance specifically for this request to avoid interceptor issues
      console.log("Making request with dedicated axios instance...");
      
      // Make the request with explicit headers
      const response = await api.get('/events');
      
      console.log("Events API response status:", response.status);
      console.log("Response data type:", typeof response.data);
      console.log("Has msg property:", !!response.data?.msg);
      console.log("Events count:", response.data?.msg?.length || 0);
      
      // Log a sample event for debugging
      if (response.data?.msg?.length > 0) {
        console.log("Sample event data:", JSON.stringify(response.data.msg[0], null, 2));
      }
      
      // Format the event images with the correct base URL
      if (response.data && response.data.msg && Array.isArray(response.data.msg)) {
        const formattedEvents = response.data.msg.map((event: any) => {
          console.log(`Processing event: ${event.name || event.title || event.id}`);
          console.log(`Original image URL: ${event.image}`);
          
          let formattedImageUrl = null;
          if (event.image) {
            // Check if image URL is already complete
            if (event.image.startsWith('http://') || event.image.startsWith('https://')) {
              formattedImageUrl = event.image;
              console.log(`Image URL is already complete: ${formattedImageUrl}`);
            } else {
              // Remove leading slash since IMAGE_BASE_URL already ends with '/'
              const imageUrl = event.image.startsWith('/') ? event.image.substring(1) : event.image;
              // Use IMAGE_BASE_URL for images, not the API base URL
              formattedImageUrl = `${IMAGE_BASE_URL}${imageUrl}`;
              console.log(`Formatted image URL: ${formattedImageUrl}`);
            }
          }
          
          return {
            ...event,
            image: formattedImageUrl
          };
        });
        
        console.log(`Successfully fetched ${formattedEvents.length} events`);
        return formattedEvents;
      } else {
        console.log("No events found in response, returning empty array");
        return [];
      }
      
    } catch (error: any) {
      console.error("Events request failed:", error.message);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      
      // Try to get a fresh token and retry
      console.log("Attempting to get fresh token and retry...");
      
      // Clear the old token first
      authToken = null;
      await removeStorageItem('auth_token');
      
      // Also clear from memory cache
      memoryStorage.delete('auth_token');
      

      
      console.log("All attempts failed, returning empty array");
      return [];
    }
    
  } catch (error: any) {
    console.error("Events API error:", error.message);
    return [];
  }
};

interface Guest {
  id: string;
  name: string;
  email: string;
  ticketType: string;
  checkedIn?: boolean;
  scannedIn?: boolean;
  checkInTime?: string;
  scanInTime?: string;
  bookingId?: string;
  ticketIdentifier?: string;
  price?: string;
  mobile?: string;
  address?: string;
  notes?: string;
  qrCode?: string;
  purchased_date?: string;
  [key: string]: unknown;
}

export const getGuestList = async (eventId: string): Promise<Guest[]> => {
  try {
    // Make sure we have the token
    if (!authToken) {
      console.log("No auth token available for guest list, trying to get from storage");
      const storedToken = await getStorageItem('auth_token');
      if (storedToken) {
        authToken = storedToken;
      } else {
        console.log("No token in storage for guest list - authentication required");
        throw new Error('Authentication required. Please login.');
      }
    }
    
    console.log("Sending guest list request with token:", authToken);
    
    // First try with the working guestlist endpoint
    try {
      console.log(`Trying primary endpoint: /guestlist/${eventId}`);
      const response = await api.get(`/guestlist/${eventId}`, {
        timeout: 30000
      });
      
      console.log("Guest list API response status:", response.status);
      
      // Log full response data for debugging
      console.log("Sample response data:", JSON.stringify(response.data).substring(0, 500));
      
      if (response.data && response.data.msg && Array.isArray(response.data.msg)) {
        // Log sample guest data
        if (response.data.msg.length > 0) {
          console.log("Sample guest fields:", Object.keys(response.data.msg[0]));
        }
        // Map and add QR codes to guests
        return response.data.msg.map((guest: any) => ({
          ...guest,
          qrCode: guest.qrCode || guest.qr_code || guest.ticket_identifier || guest.reference_num || `qr_${guest.id || Math.random()}`
        }));
      } else if (response.data && response.data.msg && typeof response.data.msg === 'object') {
        // Log available fields
        console.log("Guest data fields:", Object.keys(response.data.msg));
        // Convert object to array if needed
        const guest = response.data.msg;
        return [{
          ...guest,
          qrCode: guest.qrCode || guest.qr_code || guest.ticket_identifier || guest.reference_num || `qr_${guest.id || Math.random()}`
        }];
      } else if (Array.isArray(response.data)) {
        // Log sample guest data
        if (response.data.length > 0) {
          console.log("Sample guest fields:", Object.keys(response.data[0]));
        }
        return response.data.map((guest: any) => ({
          ...guest,
          qrCode: guest.qrCode || guest.qr_code || guest.ticket_identifier || guest.reference_num || `qr_${guest.id || Math.random()}`
        }));
      } else if (response.data && typeof response.data === 'object') {
        // Log available fields
        console.log("Response data fields:", Object.keys(response.data));
        // Handle case where response might be a single object
        const guest = response.data;
        return [{
          ...guest,
          qrCode: guest.qrCode || guest.qr_code || guest.ticket_identifier || guest.reference_num || `qr_${guest.id || Math.random()}`
        }];
      }
      
      return [];
    } catch (error) {
      console.log("Primary guest list endpoint failed, trying alternative endpoint");
      
      // If first endpoint fails, try the alternative endpoint
      try {
        console.log(`Trying alternative endpoint: /events/${eventId}/guests`);
        const response = await api.get(`/events/${eventId}/guests`, {
          timeout: 30000
        });
        
        console.log("Alternative guest list API response status:", response.status);
        
        // Log full response data for debugging
        console.log("Sample alternative response data:", JSON.stringify(response.data).substring(0, 500));
        
        // Check for different response formats
        if (response.data && response.data.msg && Array.isArray(response.data.msg)) {
          // Log sample guest data
          if (response.data.msg.length > 0) {
            console.log("Sample alternative guest fields:", Object.keys(response.data.msg[0]));
          }
          return response.data.msg.map((guest: any) => ({
            ...guest,
            qrCode: guest.qrCode || guest.qr_code || guest.ticket_identifier || guest.reference_num || `qr_${guest.id || Math.random()}`
          }));
        } else if (response.data && response.data.msg && typeof response.data.msg === 'object') {
          // Log available fields
          console.log("Alternative guest data fields:", Object.keys(response.data.msg));
          // Convert object to array if needed
          const guest = response.data.msg;
          return [{
            ...guest,
            qrCode: guest.qrCode || guest.qr_code || guest.ticket_identifier || guest.reference_num || `qr_${guest.id || Math.random()}`
          }];
        } else if (Array.isArray(response.data)) {
          // Log sample guest data
          if (response.data.length > 0) {
            console.log("Sample alternative guest fields:", Object.keys(response.data[0]));
          }
          return response.data.map((guest: any) => ({
            ...guest,
            qrCode: guest.qrCode || guest.qr_code || guest.ticket_identifier || guest.reference_num || `qr_${guest.id || Math.random()}`
          }));
        } else if (response.data && typeof response.data === 'object') {
          // Log available fields
          console.log("Alternative response data fields:", Object.keys(response.data));
          // Handle case where response might be a single object
          const guest = response.data;
          return [{
            ...guest,
            qrCode: guest.qrCode || guest.qr_code || guest.ticket_identifier || guest.reference_num || `qr_${guest.id || Math.random()}`
          }];
        }
        
        return [];
      } catch (altError) {
        console.error("Both guest list endpoints failed");
      }
    }
    
    console.log("Both guest list endpoints failed, returning empty list");
    return [];
  } catch (error) {
    console.error(`Get guest list error for event ${eventId}:`, error);
    // Return empty list on error
    return [];
  }
};

// New function to fetch paginated guest list (most recent transactions first)
export const getGuestListPaginated = async (eventId: string, page: number = 1, limit: number = 10): Promise<{
  guests: Guest[];
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
}> => {
  try {
    // Make sure we have the token
    if (!authToken) {
      console.log("No auth token available for paginated guest list, trying to get from storage");
      const storedToken = await getStorageItem('auth_token');
      if (storedToken) {
        authToken = storedToken;
      } else {
        console.log("No token in storage for paginated guest list - authentication required");
        throw new Error('Authentication required. Please login.');
      }
    }
    
    console.log(`Fetching paginated guest list for event ${eventId}, page ${page}, limit ${limit}`);
    
    // First get all guests (we'll implement server-side pagination later if API supports it)
    const allGuests = await getGuestList(eventId);
    
    if (!Array.isArray(allGuests)) {
      return {
        guests: [],
        totalCount: 0,
        hasMore: false,
        currentPage: page
      };
    }
    
    // Sort by most recent transaction (purchased_date or check-in time)
    const sortedGuests = allGuests.sort((a, b) => {
      // First prioritize checked-in guests (most recent check-ins first)
      if (a.scannedIn && !b.scannedIn) return -1;
      if (!a.scannedIn && b.scannedIn) return 1;
      
      // For checked-in guests, sort by check-in time (most recent first)
      if (a.scannedIn && b.scannedIn) {
        const aTime = a.checkedin_date || a.check_in_time || a.scanInTime || '0';
        const bTime = b.checkedin_date || b.check_in_time || b.scanInTime || '0';
        return String(bTime).localeCompare(String(aTime));
      }
      
      // For non-checked-in guests, sort by purchase date (most recent first)
      const aDate = a.purchased_date || '0';
      const bDate = b.purchased_date || '0';
      return String(bDate).localeCompare(String(aDate));
    });
    
    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedGuests = sortedGuests.slice(startIndex, endIndex);
    const hasMore = endIndex < sortedGuests.length;
    
    return {
      guests: paginatedGuests.map((guest: any) => ({
        ...guest,
        qrCode: guest.qrCode || guest.qr_code || guest.ticket_identifier || guest.reference_num || `qr_${guest.id || Math.random()}`
      })),
      totalCount: sortedGuests.length,
      hasMore,
      currentPage: page
    };
    
  } catch (error) {
    console.error(`Paginated guest list error for event ${eventId}:`, error);
    
    // Return empty result on error
    return {
      guests: [],
      totalCount: 0,
      hasMore: false,
      currentPage: page
    };
  }
};

// New function to search guests from API
export const searchGuestList = async (eventId: string, searchQuery: string): Promise<Guest[]> => {
  try {
    // Make sure we have the token
    if (!authToken) {
      console.log("No auth token available for guest search, trying to get from storage");
      const storedToken = await getStorageItem('auth_token');
      if (storedToken) {
        authToken = storedToken;
      } else {
        console.log("No token in storage for guest search - authentication required");
        throw new Error('Authentication required. Please login.');
      }
    }
    
    console.log(`Searching guests for event ${eventId} with query: "${searchQuery}"`);
    
    // For now, we'll fetch all guests and filter client-side
    // In the future, this could be optimized with server-side search
    const allGuests = await getGuestList(eventId);
    
    if (!Array.isArray(allGuests) || !searchQuery.trim()) {
      return allGuests || [];
    }
    
    const query = searchQuery.toLowerCase().trim();
    
    // Search across multiple fields
    const filteredGuests = allGuests.filter((guest: any) => {
      const name = (guest.purchased_by || guest.name || guest.fullname || '').toLowerCase();
      const email = (guest.email || '').toLowerCase();
      const ticketType = (guest.ticket_title || guest.ticketType || '').toLowerCase();
      const ticketId = (guest.ticket_identifier || guest.reference_num || '').toLowerCase();
      const mobile = (guest.mobile || '').toLowerCase();
      
      return name.includes(query) || 
             email.includes(query) || 
             ticketType.includes(query) || 
             ticketId.includes(query) ||
             mobile.includes(query);
    });
    
    // Sort search results by relevance (exact matches first, then partial matches)
    return filteredGuests.sort((a, b) => {
      const aName = String(a.purchased_by || a.name || a.fullname || '').toLowerCase();
      const bName = String(b.purchased_by || b.name || b.fullname || '').toLowerCase();
      
      // Prioritize exact name matches
      if (aName === query && bName !== query) return -1;
      if (bName === query && aName !== query) return 1;
      
      // Then prioritize name starts with query
      if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
      if (bName.startsWith(query) && !aName.startsWith(query)) return 1;
      
      // Finally, prioritize checked-in guests
      if (a.scannedIn && !b.scannedIn) return -1;
      if (!a.scannedIn && b.scannedIn) return 1;
      
      return 0;
    }).map((guest: any) => ({
      ...guest,
      qrCode: guest.qrCode || guest.qr_code || guest.ticket_identifier || guest.reference_num || `qr_${guest.id || Math.random()}`
    }));
    
  } catch (error) {
    console.error(`Guest search error for event ${eventId}:`, error);
    return [];
  }
};

// New function to fetch only checked-in guests for attendance list
export const getCheckedInGuestList = async (eventId: string): Promise<Guest[]> => {
  try {
    // Make sure we have the token
    if (!authToken) {
      console.log("No auth token available for checked-in guest list, trying to get from storage");
      const storedToken = await getStorageItem('auth_token');
      if (storedToken) {
        authToken = storedToken;
      } else {
        console.log("No token in storage for checked-in guest list - authentication required");
        throw new Error('Authentication required. Please login.');
      }
    }
    
    console.log("Fetching checked-in guests for event:", eventId);
    
    // Note: The API doesn't actually filter by checkedin=1 parameter, so we fetch all guests
    // and filter them client-side
    const response = await api.get(`/guestlist/${eventId}`, {
    });

    if (!response.data) {
      throw new Error('No response data from guest list API');
    }

    // The API returns all guests, so we need to filter for checked-in guests client-side
    let allGuests = [];
    if (response.data.msg && Array.isArray(response.data.msg)) {
      allGuests = response.data.msg;
    } else if (Array.isArray(response.data)) {
      allGuests = response.data;
    } else {
      console.error("Unexpected API response format for checked-in guests:", response.data);
      return [];
    }

    // Debug: Log all guests to see their checkedin status
    console.log('All guests checkedin status:', allGuests.map((guest: any) => ({
      id: guest.id,
      name: guest.purchased_by || guest.name,
      checkedin: guest.checkedin,
      checkedinType: typeof guest.checkedin
    })));

    // Filter for only checked-in guests (checkedin === "1" or checkedin === 1)
    const checkedInGuests = allGuests.filter((guest: any) => 
      guest.checkedin === "1" || guest.checkedin === 1
    );

    console.log(`Found ${checkedInGuests.length} checked-in guests out of ${allGuests.length} total guests`);
    
    // Debug: Log sample checked-in guest data to see what time fields are available
    if (checkedInGuests.length > 0) {
      const sampleGuest = checkedInGuests[0];
      console.log('Sample checked-in guest time fields:', {
        id: sampleGuest.id,
        name: sampleGuest.purchased_by || sampleGuest.name,
        checkedin: sampleGuest.checkedin,
        checkedin_date: sampleGuest.checkedin_date,
        check_in_time: sampleGuest.check_in_time,
        checkInTime: sampleGuest.checkInTime,
        allFields: Object.keys(sampleGuest)
      });
    } else if (allGuests.length > 0) {
      // If no checked-in guests, show sample of all guests for debugging
      const sampleGuest = allGuests[0];
      console.log('Sample guest (not checked in) time fields:', {
        id: sampleGuest.id,
        name: sampleGuest.purchased_by || sampleGuest.name,
        checkedin: sampleGuest.checkedin,
        checkedin_date: sampleGuest.checkedin_date,
        check_in_time: sampleGuest.check_in_time,
        checkInTime: sampleGuest.checkInTime,
        allFields: Object.keys(sampleGuest)
      });
    }

    // Return only checked-in guests (production behavior)
    return checkedInGuests;
  } catch (error) {
    console.error("Error fetching checked-in guest list:", error);
    return [];
  }
};

// Manual check-in function (different from QR scan)
export const manualCheckIn = async (eventId: string, guestIdentifier: string): Promise<any> => {
  try {
    console.log(`🔧 Manual check-in for event ${eventId}, guest: ${guestIdentifier}`);
    
    // For manual check-in, we use a different endpoint or add a flag
    // to indicate this is a manual operation, not a QR scan
    const response = await api.post(`/scan/${eventId}`, 
      new URLSearchParams({
        'scanCode': guestIdentifier,
        'manual': '1', // Flag to indicate manual check-in
        'source': 'manual_checkin'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000
      }
    );
    
    console.log('Manual check-in response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Manual check-in error:', error);
    // Return error response format
    return {
      error: true,
      msg: error.response?.data?.msg || error.message || 'Manual check-in failed',
      status: error.response?.status || 500
    };
  }
};

// Manual check-out function (different from QR unscan)
export const manualCheckOut = async (eventId: string, guestIdentifier: string): Promise<any> => {
  try {
    console.log(`🔧 Manual check-out for event ${eventId}, guest: ${guestIdentifier}`);
    
    // For manual check-out, we use the unscan endpoint with a flag
    const response = await api.post(`/unscan/${eventId}`,
      new URLSearchParams({
        'scanCode': guestIdentifier,
        'manual': '1', // Flag to indicate manual operation
        'source': 'manual_checkout'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000
      }
    );
    
    console.log('Manual check-out response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Manual check-out error:', error);
    // Return error response format
    return {
      error: true,
      msg: error.response?.data?.msg || error.message || 'Manual check-out failed',
      status: error.response?.status || 500
    };
  }
};

// Note: For QR code scanning, continue using scanQRCode and unscanQRCode

// Utility function to get token
export const getToken = (): string | null => {
  return authToken;
};

// Type definitions for QR code validation
export interface TicketInfo {
  id: string;
  booking_id: string;
  reference_num: string;
  ticket_identifier: string;
  ticket_title: string;
  checkedin: number;
  checkedin_date: string;
  totaladmits: string;
  admits: string;
  available: number;
  price: string;
  remarks: string;
  email: string;
  fullname: string;
  address: string;
  notes: string;
  purchased_date: string;
  reason: string;
  message: string;
  mobile: string;
  picture_display: string;
  scannable: string;
  ticket_id: string;
  passout: string;
}

export interface QRValidationResponse {
  error: boolean;
  msg: {
    message: string;
    info?: TicketInfo; // Optional for scan/unscan operations
  } | string; // For scan/unscan operations, msg can be a string
  status: number;
}

// Separate interface for scan responses to be more specific
export interface QRScanResponse {
  error: boolean;
  msg: {
    message: string;
  } | string; // Can be object with message or just string
  status: number;
}

// User profile data type
export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: string;
  eventsCreated: number;
  eventsAttended: number;
  profileImage: string | null;
}

// Function to get user profile data
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    // First try to get user data from storage (set during login)
    const storedProfileData = await getStorageItem('user_profile');
    if (storedProfileData) {
      try {
        const profileData = JSON.parse(storedProfileData);
        console.log("Using stored user profile data:", profileData);
        return {
          id: profileData.UserID || profileData.id || '',
          name: profileData.LoggedName || profileData.ClientName || profileData.name || 'Outix Scanner',
          email: profileData.email || 'user@example.com',
          role: profileData.role || profileData.userRole || 'Event Manager',
          eventsCreated: profileData.eventsCreated || profileData.created || 12,
          eventsAttended: profileData.eventsAttended || profileData.attended || 8,
          profileImage: profileData.profileImage || profileData.avatar || null
        };
      } catch (parseError) {
        console.warn("Error parsing stored profile data:", parseError);
      }
    }
    
    // If no stored data, force a login to get fresh data
    console.log("No stored profile data found, forcing login to get user data");
    
    const loginToken = await login();
    if (loginToken) {
      // After login, try again to get stored profile
      const newProfileData = await getStorageItem('user_profile');
      if (newProfileData) {
        try {
          const profileData = JSON.parse(newProfileData);
          console.log("Using profile data from fresh login:", profileData);
          return {
            id: profileData.UserID || profileData.id || '',
            name: profileData.LoggedName || profileData.ClientName || profileData.name || 'Outix Scanner',
            email: profileData.email || 'user@example.com',
            role: profileData.role || profileData.userRole || 'Event Manager',
            eventsCreated: profileData.eventsCreated || profileData.created || 12,
            eventsAttended: profileData.eventsAttended || profileData.attended || 8,
            profileImage: profileData.profileImage || profileData.avatar || null
          };
        } catch (parseError) {
          console.warn("Error parsing fresh profile data:", parseError);
        }
      }
    }
    
    // If login didn't provide profile data, try the API endpoint
    try {
      console.log("Trying to fetch user profile through proxy after login");
      const response = await api.get('/user/profile', {
        timeout: 30000
      });
      
      if (response.data && response.data.msg) {
        const userData = response.data.msg;
        // Store the fresh data
        await setStorageItem('user_profile', JSON.stringify(userData));
        
        return {
          id: userData.id || userData.userId || userData.UserID || '',
          name: userData.name || userData.fullName || userData.LoggedName || userData.ClientName || 'Outix Scanner',
          email: userData.email || 'user@example.com',
          role: userData.role || userData.userRole || 'Event Manager',
          eventsCreated: userData.eventsCreated || userData.created || 12,
          eventsAttended: userData.eventsAttended || userData.attended || 8,
          profileImage: userData.profileImage || userData.avatar || null
        };
      }
    } catch (apiError: any) {
      console.warn("API call for user profile failed:", apiError.message);
    }
    
    // Return default data as final fallback
    console.log("Using default user profile data (all other methods failed)");
    const defaultProfile = {
      id: 'default_user',
      name: "Outix Scanner User",
      email: "user@example.com", 
      role: "Event Manager",
      eventsCreated: 12,
      eventsAttended: 8,
      profileImage: null
    };
    
    // Store the default data so we don't keep refetching
    await setStorageItem('user_profile', JSON.stringify(defaultProfile));
    
    return defaultProfile;
  } catch (error) {
    console.error("Unexpected error in getUserProfile:", error);
    // Return default data on any unexpected error
    return {
      id: 'error_fallback',
      name: "Outix Scanner",
      email: "user@example.com",
      role: "Event Manager", 
      eventsCreated: 0,
      eventsAttended: 0,
      profileImage: null
    };
  }
};

// Helper to extract user data from various response formats
const extractUserData = (data: any): UserProfile => {
  // Try to intelligently extract user data from response
  let name = '';
  let email = '';
  let role = 'Event Manager';
  
  // Look for name in common fields
  if (data.name) name = data.name;
  else if (data.fullName) name = data.fullName;
  else if (data.firstName && data.lastName) name = `${data.firstName} ${data.lastName}`;
  else if (data.username) name = data.username;
  else name = 'Outix Scanner';
  
  // Look for email in common fields
  if (data.email) email = data.email;
  else if (data.userEmail) email = data.userEmail;
  else email = 'user@example.com';
  
  // Look for role in common fields
  if (data.role) role = data.role;
  else if (data.userRole) role = data.userRole;
  else if (data.userType) role = data.userType;
  
  return {
    name,
    email,
    role,
    eventsCreated: data.eventsCreated || data.created || 12,
    eventsAttended: data.eventsAttended || data.attended || 8,
    profileImage: data.profileImage || data.avatar || null
  };
};

// Utility to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  // If user has explicitly logged out, return false
  if (isLoggedOut) {
    console.log('🔐 User has explicitly logged out - not authenticated');
    return false;
  }
  
  // Check in-memory token first
  if (authToken) {
    console.log('🔐 User authenticated with in-memory token');
    return true;
  }
  
  // Try to restore session from storage (unless explicitly logged out)
  console.log('🔐 No in-memory token, attempting to restore session from storage...');
  const restored = await restoreSession();
  if (restored) {
    console.log('🔐 Session restored successfully from storage');
    return true;
  }
  
  console.log('🔐 No stored session found - user not authenticated');
  return false;
};

// Synchronous version for quick checks (only checks memory)
export const isAuthenticatedSync = (): boolean => {
  return !!authToken;
};

// Logout function
export const logout = async (): Promise<boolean> => {
  try {
    console.log('Logging out user...');
    
    // Set logout flag to prevent auto-restoration
    isLoggedOut = true;
    
    // Clear the token from memory
    authToken = null;
    
    // Clear all auth-related data from storage
    await removeStorageItem('auth_token');
    await removeStorageItem('user_profile');
    
    // Also clear from memory storage fallback
    memoryStorage.delete('auth_token');
    memoryStorage.delete('user_profile');
    
    console.log('Logout completed - all tokens cleared');
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    return false;
  }
};

// Function to start a fresh login session (resets logout state)
export const startNewLoginSession = async (): Promise<string | null> => {
  console.log('Starting new login session...');
  isLoggedOut = false;
  authToken = null;
  return await login();
};

// Function to reset logout state (for explicit login)
export const resetLogoutState = (): void => {
  isLoggedOut = false;
  console.log('Logout state reset - user can login again');
};

// Function to explicitly restore session from storage (for remember me functionality)
export const restoreSession = async (): Promise<boolean> => {
  try {
    // Check if we have a stored token
    const storedToken = await getStorageItem('auth_token');
    if (storedToken) {
      console.log('✅ Restoring session from stored token');
      authToken = storedToken;
      isLoggedOut = false; // Reset logout flag when restoring
      return true;
    } else {
      console.log('❌ No stored token found');
      return false;
    }
  } catch (error) {
    console.error('❌ Error restoring session:', error);
    return false;
  }
};

// Clear stored session (removes stored token but doesn't log out current session)
export const clearStoredSession = async (): Promise<void> => {
  try {
    await removeStorageItem('auth_token');
    await removeStorageItem('user_profile');
    memoryStorage.delete('auth_token');
    memoryStorage.delete('user_profile');
    console.log('Stored session cleared');
  } catch (error) {
    console.error('Error clearing stored session:', error);
  }
};

// Enhanced QR Code validation with better error handling and caching
export const validateQRCode = async (eventId: string, scanCode: string, scanMode?: 'scan-in' | 'scan-out'): Promise<QRValidationResponse | null> => {
  try {
    console.log(`Validating QR code for event ${eventId}, scancode: ${scanCode}, scanMode: ${scanMode || 'not specified'}`);
    
    // Create cache key including scanMode for different validation results
    const cacheKey = `${eventId}:${scanCode}:${scanMode || 'default'}`;
    
    // Check cache first
    const cachedResult = getCachedResult(validationCache, cacheKey);
    if (cachedResult) {
      console.log(`🚀 Cache hit for validation: ${cacheKey}`);
      performanceMetrics.cacheHits++;
      return cachedResult;
    }
    
    console.log(`📡 Cache miss, making API call for validation: ${cacheKey}`);
    performanceMetrics.cacheMisses++;
    performanceMetrics.validationCalls++;
    
    const startTime = Date.now();
    
    // Build the URL with scanmode parameter if provided
    let validateUrl = `/validate/${eventId}/${scanCode}`;
    if (scanMode === 'scan-out') {
      validateUrl += '?scanmode=ScanOut';
    }
    
    // Make direct API request to validate endpoint
    const response = await api.get(validateUrl, {
      timeout: 30000
    });
    
    // Track performance metrics
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    performanceMetrics.apiCalls++;
    performanceMetrics.totalResponseTime += responseTime;
    
    // Cache the result
    setCachedResult(validationCache, cacheKey, response.data, VALIDATION_CACHE_TTL);
    console.log(`💾 Cached validation result for: ${cacheKey} (${responseTime}ms)`);
    
    return response.data;
  } catch (error: any) {
    
    // Enhanced error handling - check if we have a response with data
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      console.log(`API returned status ${status} with data:`, JSON.stringify(data, null, 2));
      
      // Check if data is nested in a 'details' object (as seen in the logs)
      const responseData = data.details || data;
      
      // Return the actual API response for ALL status codes
      return {
        error: responseData.error !== undefined ? responseData.error : true,
        msg: responseData.msg || (status === 404 ? 'QR code not found in the system' : 'Ticket validation failed'),
        status: responseData.status || status
      };
    }
    
    // If no response, return null
    console.log('No response data available');
    return null;
  }
};

export const scanQRCode = async (eventId: string, scanCode: string): Promise<QRScanResponse | null> => {
  try {
    console.log(`Scanning QR code for event ${eventId}, scancode: ${scanCode}`);
    
    
    // Make direct API request to scan endpoint
    const response = await api.get(`/scan/${eventId}/${scanCode}`, {
      timeout: 30000
    });
    
    console.log('QR scan response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error(`Error scanning QR code for event ${eventId}:`, error);
    
    // Enhanced error handling based on API specification
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      // If we get 401 Unauthorized, clear the token and try to re-authenticate
      if (status === 401) {
        console.log('Authentication failed during scan, clearing token and retrying...');
        authToken = null;
        await removeStorageItem('auth_token');
        
        // Also clear from memory cache
        memoryStorage.delete('auth_token');
        
        // Try to login again
        const newToken = await login();
        if (newToken) {
          console.log('Re-authentication successful, retrying scan...');
          // Update the in-memory token
          authToken = newToken;
          // Retry the scan with the new token (interceptor will add it)
          try {
            const retryResponse = await api.get(`/scan/${eventId}/${scanCode}`, {
              timeout: 30000
            });
            
            console.log('Retry scan response:', retryResponse.data);
            return retryResponse.data;
          } catch (retryError: any) {
            console.error('Retry scan also failed:', retryError);
            // Fall through to normal error handling
          }
        }
      }
      
      // Check if data is nested in a 'details' object
      const responseData = data.details || data;
      
      // Better error messages for unscan operations
      let errorMsg = responseData.msg || responseData.message;
      if (!errorMsg) {
        if (status === 404) {
          errorMsg = 'Ticket not found or not checked in. Cannot check out.';
        } else if (status === 401) {
          errorMsg = 'Authentication failed. Please check your credentials.';
        } else {
          errorMsg = 'Unscan operation failed';
        }
      }
      
      // Return the actual API response for all status codes
      return {
        error: responseData.error !== undefined ? responseData.error : true,
        msg: errorMsg,
        status: responseData.status || status
      };
    }
    
    return null;
  }
};

export const unscanQRCode = async (eventId: string, scanCode: string): Promise<QRScanResponse | null> => {
  try {
    console.log(`Unscanning QR code for event ${eventId}, scancode: ${scanCode}`);
    
    
    // Check if this is a manual check-out (starting with MANUAL_)
    if (scanCode.startsWith('MANUAL_')) {
      console.log('Manual checkout detected, skipping API call');
      return {
        error: false,
        msg: {
          message: 'Guest checked out locally (manual operation).'
        },
        status: 200
      };
    }
    
    // Make direct API request to unscan endpoint
    // Use the scan endpoint with unscan=1 parameter (standard approach)
    const response = await api.get(`/scan/${eventId}/${scanCode}?unscan=1`, {
      timeout: 30000
    });
    
    console.log('QR unscan response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error(`Error unscanning QR code for event ${eventId}:`, error);
    
    // Enhanced error handling based on API specification
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      console.log('Unscan error response status:', status);
      console.log('Unscan error response data:', JSON.stringify(data, null, 2));
      
      // Check if data is nested in a 'details' object
      const responseData = data.details || data;
      
      // Provide clearer error messages based on status
      let errorMessage = responseData.msg || responseData.message;
      if (!errorMessage) {
        if (status === 404) {
          errorMessage = 'Ticket not found or has not been checked in yet.';
        } else if (status === 400) {
          errorMessage = 'Cannot check out: ticket is not currently checked in.';
        } else if (status === 401) {
          errorMessage = 'Authentication failed. Please re-login.';
        } else {
          errorMessage = `Check-out failed (Error ${status})`;
        }
      }
      
      // Return the actual API response for all status codes
      return {
        error: responseData.error !== undefined ? responseData.error : true,
        msg: errorMessage,
        status: responseData.status || status
      };
    }
    
    // Network or other errors
    return {
      error: true,
      msg: error.code === 'ECONNABORTED' 
        ? 'Request timeout - check your internet connection' 
        : error.message || 'Failed to check out ticket',
      status: 500
    };
  }
};

// Export storage functions for testing
export { getStorageItem, removeStorageItem, setStorageItem };

// Export cache management functions for performance optimization
export const clearValidationCache = (): void => {
  clearCache(validationCache);
  console.log('🧹 Validation cache cleared');
};

export const clearGuestListCache = (): void => {
  clearCache(guestListCache);
  console.log('🧹 Guest list cache cleared');
};

export const clearAllCaches = (): void => {
  clearValidationCache();
  clearGuestListCache();
  console.log('🧹 All caches cleared');
};

// Performance monitoring and metrics
const performanceMetrics = {
  apiCalls: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalResponseTime: 0,
  validationCalls: 0,
  guestListCalls: 0,
  scanCalls: 0,
  batchOperations: 0
};

// Cache statistics for debugging
export const getCacheStats = () => {
  return {
    validationCache: {
      size: validationCache.size,
      keys: Array.from(validationCache.keys())
    },
    guestListCache: {
      size: guestListCache.size,
      keys: Array.from(guestListCache.keys())
    }
  };
};

// Performance metrics for monitoring
export const getPerformanceMetrics = () => {
  const avgResponseTime = performanceMetrics.apiCalls > 0 
    ? performanceMetrics.totalResponseTime / performanceMetrics.apiCalls 
    : 0;
  
  const cacheHitRate = (performanceMetrics.cacheHits + performanceMetrics.cacheMisses) > 0
    ? (performanceMetrics.cacheHits / (performanceMetrics.cacheHits + performanceMetrics.cacheMisses)) * 100
    : 0;
  
  return {
    ...performanceMetrics,
    avgResponseTime: Math.round(avgResponseTime),
    cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    apiCallReduction: performanceMetrics.cacheHits > 0 ? `${performanceMetrics.cacheHits} API calls saved` : 'No cache hits yet'
  };
};

// Reset performance metrics
export const resetPerformanceMetrics = () => {
  Object.keys(performanceMetrics).forEach(key => {
    (performanceMetrics as any)[key] = 0;
  });
  console.log('📊 Performance metrics reset');
};

export const getGroupTickets = async (eventId: string, qrData: string, preValidation?: any): Promise<any> => {
  try {
    console.log('🔍 getGroupTickets called with:', { eventId, qrData });
    
    // Use caller-provided validation when available to avoid duplicate API calls
    const validation = preValidation ? preValidation : await validateQRCode(eventId, qrData);
    console.log('📋 Validation result:', validation);
    
    if (!validation) {
      return {
        error: true,
        msg: 'Failed to validate ticket'
      };
    }
    
    // Extract purchaser information - even from error responses
    let purchaserEmail = null;
    let purchaserName = null;
    let purchaserBookingId = null;
    let purchaserReferenceNum = null;
    
    // Check if we have ticket info (can be present even in error responses)
    if (validation.msg && typeof validation.msg === 'object' && 'info' in validation.msg) {
      const info = validation.msg.info;
      purchaserEmail = info?.email;
      purchaserName = info?.fullname;
      purchaserBookingId = info?.booking_id;
      purchaserReferenceNum = info?.reference_num;
    }
    
    // If validation failed but we don't have purchaser info, it's a real error
    if (validation.error && !purchaserEmail && !purchaserName && !purchaserBookingId && !purchaserReferenceNum) {
      return {
        error: true,
        msg: typeof validation.msg === 'string' 
          ? validation.msg 
          : validation.msg?.message || 'Invalid ticket for group scan'
      };
    }
    
    // If we don't have purchaser info by now, we can't proceed
    if (!purchaserEmail && !purchaserName && !purchaserBookingId && !purchaserReferenceNum) {
      return {
        error: true,
        msg: 'Cannot identify purchaser for group scan'
      };
    }
    
    console.log('Purchaser info extracted:', { purchaserEmail, purchaserName, purchaserBookingId, purchaserReferenceNum });
    
    // Try to use targeted guest list query if we have booking info
    let guestListUrl = `/guestlist/${eventId}`;
    let cacheKey = `guestlist:${eventId}`;
    
    // If we have booking information, try to fetch only relevant guests
    if (purchaserBookingId || purchaserReferenceNum) {
      if (purchaserBookingId) {
        guestListUrl += `?booking_id=${purchaserBookingId}`;
        cacheKey = `guestlist:${eventId}:booking:${purchaserBookingId}`;
      } else if (purchaserReferenceNum) {
        guestListUrl += `?reference=${purchaserReferenceNum}`;
        cacheKey = `guestlist:${eventId}:ref:${purchaserReferenceNum}`;
      }
      console.log('🎯 Using targeted guest list query:', guestListUrl);
    } else {
      console.log('📞 Fetching full guest list for event:', eventId);
    }
    
    // Check cache first
    const cachedGuestList = getCachedResult(guestListCache, cacheKey);
    let responseData;
    
    if (cachedGuestList) {
      console.log(`🚀 Cache hit for guest list: ${cacheKey}`);
      responseData = cachedGuestList;
    } else {
      console.log(`📡 Cache miss, making API call for guest list: ${cacheKey}`);
      const response = await api.get(guestListUrl, {
        timeout: 30000
      });
      console.log('📋 Guest list response status:', response.status);
      
      if (!response.data) {
        throw new Error('No response data from guest list API');
      }
      
      responseData = response.data;
      // Cache the result
      setCachedResult(guestListCache, cacheKey, response.data, GUEST_LIST_CACHE_TTL);
      console.log(`💾 Cached guest list result for: ${cacheKey}`);
    }
    
    // Extract guests from response - the correct format is responseData.msg
    let allGuests = [];
    if (responseData.msg && Array.isArray(responseData.msg)) {
      allGuests = responseData.msg;
    } else if (Array.isArray(responseData)) {
      allGuests = responseData;
    } else if (responseData.data && Array.isArray(responseData.data)) {
      allGuests = responseData.data;
    } else if (responseData.guests && Array.isArray(responseData.guests)) {
      allGuests = responseData.guests;
    } else {
      throw new Error('Unexpected guest list response format');
    }
    
    console.log('Total guests found:', allGuests.length);
    
    // Try to locate the scanned ticket in the guest list first. This lets us
    // derive reliable grouping keys (booking_reference/booking_id) even when the
    // validation payload does not include purchaser info on success responses.
    const scannedGuest: any | undefined = allGuests.find((g: any) => g.ticket_identifier === qrData);
    if (scannedGuest) {
      purchaserReferenceNum = purchaserReferenceNum || scannedGuest.booking_reference || null;
      purchaserBookingId = purchaserBookingId || scannedGuest.booking_id || null;
      purchaserEmail = purchaserEmail || scannedGuest.email || null;
      purchaserName = purchaserName || scannedGuest.purchased_by || scannedGuest.fullname || null;
      console.log('🔑 Derived grouping keys from scanned guest:', {
        purchaserReferenceNum,
        purchaserBookingId,
        purchaserEmail,
        purchaserName
      });
    }

    // Filter attendees by same purchaser email, name, or booking ID
    // Note: guest list structure uses different field names
    console.log('🔍 Filtering guests by purchaser info:', { purchaserEmail, purchaserName, purchaserBookingId, purchaserReferenceNum });
    console.log('🔍 Sample guest booking references:', allGuests.slice(0, 3).map((g: any) => ({
      ticket_identifier: g.ticket_identifier,
      booking_reference: g.booking_reference,
      booking_id: g.booking_id
    })));
    
    const groupTickets = allGuests.filter((attendee: any) => {
      // Match by reference number (reference_num from validation vs booking_reference in guest list)
      if (purchaserReferenceNum && attendee.booking_reference === purchaserReferenceNum) {
        console.log('✅ Matched by reference number:', attendee.booking_reference, 'vs', purchaserReferenceNum);
        return true;
      }
      // Match by booking reference (booking_reference in guest list vs booking_id in validation)
      if (purchaserBookingId && (attendee.booking_reference === purchaserBookingId || attendee.booking_id === purchaserBookingId)) {
        console.log('✅ Matched by booking ID:', attendee.booking_reference, 'vs', purchaserBookingId);
        return true;
      }
      if (purchaserEmail && attendee.email === purchaserEmail) {
        console.log('✅ Matched by email:', attendee.email);
        return true;
      }
      // Match by name (purchased_by in guest list vs fullname in validation)
      if (purchaserName && (attendee.purchased_by === purchaserName || attendee.fullname === purchaserName)) {
        console.log('✅ Matched by name:', attendee.purchased_by || attendee.fullname);
        return true;
      }
      
      // NEW: If no purchaser info is available, check if this is the same ticket by ticket_identifier
      if (!purchaserEmail && !purchaserName && !purchaserBookingId && !purchaserReferenceNum) {
        console.log('⚠️ No purchaser info available, checking if this is the scanned ticket');
        if (attendee.ticket_identifier === qrData) {
          console.log('✅ This is the scanned ticket itself:', attendee.ticket_identifier);
          return true;
        }
      }
      
      return false;
    });
    
    console.log('Group tickets found:', groupTickets.length);
    
    // If no group tickets found but we have the scanned ticket, create a single-ticket group
    if (groupTickets.length === 0) {
      console.log('⚠️ No group tickets found, checking if scanned ticket exists in guest list');
      console.log('🔍 Looking for QR data:', qrData);
      console.log('🔍 Available ticket identifiers:', allGuests.slice(0, 5).map((g: any) => g.ticket_identifier));
      
      const scannedTicket = scannedGuest || allGuests.find((attendee: any) => attendee.ticket_identifier === qrData);
      if (scannedTicket) {
        console.log('✅ Found scanned ticket in guest list, creating single-ticket group');
        // Before falling back to single, try one last time to expand by booking reference
        const bookingRef = scannedTicket.booking_reference || scannedTicket.booking_id;
        if (bookingRef) {
          const candidates = allGuests.filter((g: any) => (g.booking_reference === bookingRef || g.booking_id === bookingRef));
          if (candidates.length > 0) {
            console.log(`🔗 Expanded group via booking reference (${bookingRef}):`, candidates.length);
            groupTickets.push(...candidates);
          } else {
            groupTickets.push(scannedTicket);
          }
        } else {
          groupTickets.push(scannedTicket);
        }
      } else {
        console.log('❌ Scanned ticket not found in guest list');
        console.log('🔍 First few guest ticket identifiers:', allGuests.slice(0, 3).map((g: any) => ({
          ticket_identifier: g.ticket_identifier,
          booking_reference: g.booking_reference
        })));
      }
    }
    
    // Map to consistent format using guest list field names
    const formattedTickets = groupTickets.map((ticket: any, index: number) => {
      console.log(`Ticket ${index + 1} raw data:`, {
        ticket_identifier: ticket.ticket_identifier,
        booking_reference: ticket.booking_reference,
        purchased_by: ticket.purchased_by,
        email: ticket.email,
        checkedin: ticket.checkedin,
        ticket_title: ticket.ticket_title
      });
      
      // Use ticket_identifier as the primary QR code (this is what we scan)
      const qrCode = ticket.ticket_identifier;
      
      // Helper function to extract guest name from ticket data
      const extractGuestName = (ticket: any): string => {
        if (ticket.purchased_by && ticket.purchased_by.trim()) {
          return ticket.purchased_by.trim();
        } else if (ticket.admit_name && ticket.admit_name.trim()) {
          return ticket.admit_name.trim();
        } else if (ticket.name && ticket.name.trim()) {
          return ticket.name.trim();
        } else if (ticket.email && ticket.email.trim()) {
          return ticket.email.trim();
        } else if (ticket.firstName || ticket.lastName) {
          return `${ticket.firstName || ''} ${ticket.lastName || ''}`.trim();
        } else if (ticket.ticket_identifier) {
          return `Ticket ${ticket.ticket_identifier.slice(-6)}`;
        }
        return 'Guest';
      };
      
      return {
        id: qrCode, // Use the ticket identifier as the unique ID
        name: extractGuestName(ticket),
        email: ticket.email || 'No email',
        ticketType: ticket.ticket_title || 'General Admission',
        ticketIdentifier: ticket.ticket_identifier,
        isCheckedIn: ticket.checkedin === '1' || ticket.checkedin === 1 || false,
        isPassedOut: ticket.passout === '1' || ticket.passout === 1 || false,
        qrCode: qrCode
      };
    });
    
    console.log('Formatted tickets with unique IDs:', formattedTickets.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })));
    
    return {
      success: true,
      tickets: formattedTickets,
      purchaser: {
        email: purchaserEmail,
        name: purchaserName,
        bookingId: purchaserBookingId
      }
    };
    
  } catch (error) {
    console.error('Group tickets error:', error);
    
    
    return {
      error: true,
      msg: error instanceof Error ? error.message : 'Failed to get group tickets'
    };
  }
};

export const scanGroupTickets = async (eventId: string, ticketIds: string[]): Promise<any> => {
  try {
    console.log(`🚀 Batch scanning ${ticketIds.length} tickets in parallel`);
    const startTime = Date.now();
    performanceMetrics.batchOperations++;
    performanceMetrics.scanCalls += ticketIds.length;
    
    // Performance optimization: True parallel processing with concurrency limit
    const CONCURRENCY_LIMIT = 5; // Process max 5 tickets simultaneously
    const results = [];
    
    for (let i = 0; i < ticketIds.length; i += CONCURRENCY_LIMIT) {
      const batch = ticketIds.slice(i, i + CONCURRENCY_LIMIT);
      console.log(`📦 Processing batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}/${Math.ceil(ticketIds.length / CONCURRENCY_LIMIT)}: ${batch.length} tickets`);
      
      const batchPromises = batch.map(ticketId => 
        scanQRCode(eventId, ticketId)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
    }
    
    const endTime = Date.now();
    console.log(`⚡ Batch scan completed in ${endTime - startTime}ms (${ticketIds.length} tickets)`);
    
    const successful = results.filter(result => {
      if (result.status === 'fulfilled' && result.value) {
        // Handle both string and object message types
        if (typeof result.value.msg === 'string') {
          return !result.value.error;
        } else if (result.value.msg && typeof result.value.msg === 'object') {
          return !result.value.error && result.value.msg.message !== undefined;
        }
      }
      return false;
    }).length;
    
    const failed = results.length - successful;
    
    return {
      success: true,
      total: results.length,
      successful,
      failed,
      msg: successful > 0 ? 'Group scan processed successfully' : 'Failed to process group scan',
      results: results.map(r => {
        if (r.status === 'fulfilled' && r.value) {
          return {
            ...r.value,
            msg: typeof r.value.msg === 'string' ? r.value.msg : r.value.msg?.message
          };
        }
        return {
          error: true,
          msg: 'Failed to process ticket',
          status: 500
        };
      })
    };
    
  } catch (error) {
    console.error('Group scan error:', error);
    return {
      error: true,
      msg: error instanceof Error ? error.message : 'Failed to scan group tickets'
    };
  }
};

export const unscanGroupTickets = async (eventId: string, ticketIds: string[]): Promise<any> => {
  try {
    console.log(`🚀 Batch unscannning ${ticketIds.length} tickets in parallel`);
    const startTime = Date.now();
    performanceMetrics.batchOperations++;
    performanceMetrics.scanCalls += ticketIds.length;
    
    // Performance optimization: True parallel processing with concurrency limit
    const CONCURRENCY_LIMIT = 5; // Process max 5 tickets simultaneously
    const results = [];
    
    for (let i = 0; i < ticketIds.length; i += CONCURRENCY_LIMIT) {
      const batch = ticketIds.slice(i, i + CONCURRENCY_LIMIT);
      console.log(`📦 Processing batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}/${Math.ceil(ticketIds.length / CONCURRENCY_LIMIT)}: ${batch.length} tickets`);
      
      const batchPromises = batch.map(ticketId => 
        unscanQRCode(eventId, ticketId)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
    }
    
    const endTime = Date.now();
    console.log(`⚡ Batch unscan completed in ${endTime - startTime}ms (${ticketIds.length} tickets)`);
    
    const successful = results.filter(result => {
      if (result.status === 'fulfilled' && result.value) {
        // Handle both string and object message types
        if (typeof result.value.msg === 'string') {
          return !result.value.error;
        } else if (result.value.msg && typeof result.value.msg === 'object') {
          return !result.value.error && result.value.msg.message !== undefined;
        }
      }
      return false;
    }).length;
    
    const failed = results.length - successful;
    
    return {
      success: true,
      total: results.length,
      successful,
      failed,
      msg: successful > 0 ? 'Group unscan processed successfully' : 'Failed to process group unscan',
      results: results.map(r => {
        if (r.status === 'fulfilled' && r.value) {
          return {
            ...r.value,
            msg: typeof r.value.msg === 'string' ? r.value.msg : r.value.msg?.message
          };
        }
        return {
          error: true,
          msg: 'Failed to process ticket unscan',
          status: 500
        };
      })
    };
    
  } catch (error) {
    console.error('Group unscan error:', error);
    return {
      error: true,
      msg: error instanceof Error ? error.message : 'Failed to unscan group tickets'
    };
  }
};

// Registration interface - matches actual API response
export interface Registration {
  id: string;
  EventName: string;
  EventSubtitle: string;
  EventDuration: string;
  organizerName: string;
  urlShortName: string;
  EventLogo: string;
  EventImage: string;
  showStart: string;
  VenueName: string;
  VenueAddress: string;
  City: string;
  PostCode: string;
  WaiverLink?: string;
  WaiverLogo?: string;
  WaiverBgImage?: string;
}

// Waiver interface - matches actual API response  
export interface Waiver {
  Ref: string;
  RegisteredDate: string;
  Category: string;
  ItemName: string;
  'Client Name': string;
  Email: string;
  Mobile: string;
  'Contact Name': string;
  Address: string;
  CrewNames: string;
  Amount: string;
  'Driver Rider Name': string;
  Manufacturer: string;
  Model: string;
  'Engine Capacity': string;
  Year: string;
  Sponsors?: string;
  'Quickest ET': string;
  'Quickest MPH': string;
  'ANDRA License Number': string;
  'IHRA License Number'?: string;
  'License Expiry Date'?: string;
  'Drivers License Number'?: string;
  'Emergency Contact Name': string;
  'Emergency Contact Number': string;
  'Racing Number': string;
  WaiverSigned: string;
  CheckedIn: string;
  WaiverLink: string;
}

// Get list of registrations
export const getRegistrations = async (): Promise<Registration[]> => {
  try {
    console.log('Fetching registrations list');
    
    if (!authToken) {
      console.error('No auth token available for registrations');
      throw new Error('Authentication required');
    }

    const response = await api.get('/registrations');
    console.log('Registrations response:', response.data);
    
    // The API returns data in { msg: [...], error: false, status: 200 } format
    if (response.data && !response.data.error && Array.isArray(response.data.msg)) {
      return response.data.msg;
    } else if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      return response.data.data;
    } else {
      console.warn('Unexpected registrations response format:', response.data);
      return [];
    }
  } catch (error: any) {
    console.error('Error fetching registrations:', error);
    
    if (error.response?.status === 401) {
      throw new Error('Authentication failed');
    } else if (error.response?.status === 404) {
      console.log('No registrations found');
      return [];
    } else {
      throw new Error(error.response?.data?.message || 'Failed to fetch registrations');
    }
  }
};

// Get list of waivers for a specific event
export const getWaivers = async (eventId: string): Promise<Waiver[]> => {
  try {
    console.log('Fetching waivers for event:', eventId);
    
    if (!authToken) {
      console.error('No auth token available for waivers');
      throw new Error('Authentication required');
    }

    if (!eventId) {
      throw new Error('Event ID is required');
    }

    const response = await api.get(`/listwaivers/${eventId}`);
    console.log('Waivers response:', response.data);
    
    // The API returns data in { msg: [...], error: false, status: 200 } format
    if (response.data && !response.data.error && Array.isArray(response.data.msg)) {
      return response.data.msg;
    } else if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      return response.data.data;
    } else {
      console.warn('Unexpected waivers response format:', response.data);
      return [];
    }
  } catch (error: any) {
    console.error('Error fetching waivers:', error);
    
    if (error.response?.status === 401) {
      throw new Error('Authentication failed');
    } else if (error.response?.status === 404) {
      console.log('No waivers found for event:', eventId);
      return [];
    } else {
      throw new Error(error.response?.data?.message || 'Failed to fetch waivers');
    }
  }
};

export interface WaiverSigningData {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  signature?: string; // Optional since we won't send it
  acknowledged: boolean;
  campaign_token?: string;
  stoken?: string;
}

export const signWaiver = async (data: WaiverSigningData): Promise<any> => {
  try {
    const formData = new URLSearchParams();
    
    // Add all fields except signature
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'signature' && value) { // Skip signature and undefined values
        formData.append(key, value.toString());
      }
    });

    const response = await axios.post('https://www.outix.co/services/waiver/sign', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Error signing waiver:', error.message || error);
    throw error;
  }
};

export interface WaiverSubmissionData {
  // Updated interface to match the new API requirements
  waiverType: 'Entrant' | 'Crew';
  waiver_ref: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  email_address: string;
  mobile_number: string;
  witness_name: string;
  applicant_name: string;
  witness_address: string;
  applicantSignFile: string; // Base64 encoded signature
  witnessSignFile: string; // Base64 encoded signature
  signed_by_parent?: boolean; // New field for parent signature indicator
  parent_name?: string; // New field for parent name
}

export interface WaiverSubmissionResponse {
  success: boolean;
  message: string;
  waiverUrl?: string;
  waiverRef?: string;
  submissionId?: string;
  error?: boolean;
  status?: number;
}

export const submitWaiver = async (data: WaiverSubmissionData): Promise<WaiverSubmissionResponse> => {
  try {
    console.log('Submitting waiver with data:', {
      ...data,
      applicantSignFile: data.applicantSignFile ? `[${data.applicantSignFile.length} chars]` : 'none',
      witnessSignFile: data.witnessSignFile ? `[${data.witnessSignFile.length} chars]` : 'none'
    });

    // Prepare the form data for the API
    const formData = new URLSearchParams();
    formData.append('waiverType', data.waiverType);
    formData.append('waiver_ref', data.waiver_ref);
    formData.append('first_name', data.first_name);
    formData.append('last_name', data.last_name);
    formData.append('date_of_birth', data.date_of_birth);
    formData.append('email_address', data.email_address);
    formData.append('mobile_number', data.mobile_number);
    formData.append('witness_name', data.witness_name);
    formData.append('applicant_name', data.applicant_name);
    formData.append('witness_address', data.witness_address);
    formData.append('applicantSignFile', data.applicantSignFile);
    formData.append('witnessSignFile', data.witnessSignFile);

    // Add parent-related fields if present
    if (data.signed_by_parent) {
      formData.append('signed_by_parent', 'true');
      formData.append('parent_name', data.parent_name || '');
    }

    console.log('Sending waiver submission to /waiver/personal endpoint...');
    
    // Use the correct endpoint with axios instance that has auth token interceptor
    const response = await api.post('/waiver/personal', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000
    });

    console.log('Waiver submission response:', response.data);

    // Return success response
    const successResponse: WaiverSubmissionResponse = {
      success: true,
      message: response.data.message || 'Waiver submitted successfully',
      waiverUrl: response.data.waiverUrl,
      waiverRef: response.data.waiverRef || data.waiver_ref,
      submissionId: response.data.submissionId || response.data.id?.toString(),
      status: response.status
    };

    return successResponse;

  } catch (error: any) {
    console.error('Error submitting waiver:', error);
    
    // Return error response
    const errorResponse: WaiverSubmissionResponse = {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to submit waiver',
      error: true,
      status: error.response?.status || 500
    };
    
    return errorResponse;
  }
};

export default api; 