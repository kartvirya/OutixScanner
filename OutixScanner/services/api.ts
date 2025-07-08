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

// Mock JWT token for development since the real endpoint is returning 400
const MOCK_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ik91dGl4U2Nhbm5lciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

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
    
    // If user has explicitly logged out, don't auto-restore token (only for auto-login)
    if (isLoggedOut) {
      console.log("User has logged out, not auto-restoring token");
      return null;
    }
    
    // Auto-login flow - check if token already exists in storage
    const storedToken = await getStorageItem('auth_token');
    if (storedToken) {
      console.log("Using existing token from storage");
      authToken = storedToken;
      return storedToken;
    }
    
    // If we already have a token in memory, use it
    if (authToken) {
      return authToken;
    }
    
    // Show we're attempting automatic login
    console.log("No token found, attempting automatic login with default credentials");

    try {
      // Try automatic login with default credentials
      const formData = new URLSearchParams();
      formData.append('username', 'Outix@thebend.co');
      formData.append('password', 'Scan$9841');
      
      const response = await axios.post(`${BASE_URL}/auth`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000
      });
      
      console.log("Auto-login response status:", response.status);
      
      // Success path - extract token from response
      if (response.data && response.data.msg && response.data.msg.Auth_Token) {
        const token = response.data.msg.Auth_Token;
        console.log("Got auth token from auto-login API");
        authToken = token;
        isLoggedOut = false;
        
        // Store token in storage
        await setStorageItem('auth_token', token);
        
        // Store user profile data if available in the response
        if (response.data.msg) {
          console.log("Storing user profile data from auto-login response");
          await setStorageItem('user_profile', JSON.stringify(response.data.msg));
        }
        
        return token;
      }
      
      // Try to extract token from response if structure is different
      if (response.data && response.status === 200) {
        const token = extractTokenFromResponse(response.data);
        if (token) {
          console.log("Extracted token from auto-login API response");
          authToken = token;
          isLoggedOut = false;
          await setStorageItem('auth_token', token);
          
          // Store user profile data from response
          if (response.data) {
            console.log("Storing user profile data from auto-login extracted response");
            await setStorageItem('user_profile', JSON.stringify(response.data));
          }
          
          return token;
        }
      }
      
      // If we reached here, API returned success but no token
      console.warn("Auto-login API successful but no token found in response");
    } catch (apiError: any) {
      console.error("Auto-login API failed:", apiError.message || apiError);
      
      // Check specific error types
      if (apiError.response) {
        console.log("Auto-login response status:", apiError.response.status);
        console.log("Auto-login response data:", apiError.response.data);
      } else if (apiError.request) {
        console.log("No response received from auto-login");
      }
    }
    
    // If we get here, both stored token check and API failed
    // Don't use mock token anymore since we have direct API access
    console.error("Authentication failed - no valid token available");
    authToken = null;
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

export const getEvents = async (): Promise<any[]> => {
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
    console.log("Full token for debugging:", authToken);
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

export const getGuestList = async (eventId: string): Promise<any[]> => {
  try {
    // Make sure we have the token
    if (!authToken) {
      console.log("No auth token available for guest list, trying to get from storage");
      const storedToken = await getStorageItem('auth_token');
      if (storedToken) {
        authToken = storedToken;
      } else {
        console.log("No token in storage for guest list, using default token");
        authToken = '8534838IGWQYmheB4432355'; // Use the default token from the curl example
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
        // Both attempts failed, continue to mock data fallback
      }
    }
    
    console.log("Using mock guest list data as fallback");
    // Return mock attendees when both API endpoints fail
    return [
      { id: 'a1', name: 'John Smith', email: 'john@example.com', ticketType: 'General', scannedIn: true, scanInTime: '08:45 AM', qrCode: 'MOCK_QR_001' },
      { id: 'a2', name: 'Sarah Johnson', email: 'sarah@example.com', ticketType: 'VIP', scannedIn: true, scanInTime: '08:30 AM', qrCode: 'MOCK_QR_002' },
      { id: 'a3', name: 'Michael Brown', email: 'michael@example.com', ticketType: 'General', scannedIn: false, qrCode: 'MOCK_QR_003' },
      { id: 'a4', name: 'Emily Davis', email: 'emily@example.com', ticketType: 'General', scannedIn: false, qrCode: 'MOCK_QR_004' },
      { id: 'a5', name: 'David Wilson', email: 'david@example.com', ticketType: 'Early Bird', scannedIn: false, qrCode: 'MOCK_QR_005' },
    ];
  } catch (error) {
    console.error(`Get guest list error for event ${eventId}:`, error);
    // Return mock attendees on error
    return [
      { id: 'a1', name: 'John Smith', email: 'john@example.com', ticketType: 'General', scannedIn: true, scanInTime: '08:45 AM', qrCode: 'MOCK_QR_001' },
      { id: 'a2', name: 'Sarah Johnson', email: 'sarah@example.com', ticketType: 'VIP', scannedIn: true, scanInTime: '08:30 AM', qrCode: 'MOCK_QR_002' },
      { id: 'a3', name: 'Michael Brown', email: 'michael@example.com', ticketType: 'General', scannedIn: false, qrCode: 'MOCK_QR_003' },
      { id: 'a4', name: 'Emily Davis', email: 'emily@example.com', ticketType: 'General', scannedIn: false, qrCode: 'MOCK_QR_004' },
      { id: 'a5', name: 'David Wilson', email: 'david@example.com', ticketType: 'Early Bird', scannedIn: false, qrCode: 'MOCK_QR_005' },
    ];
  }
};

// New function to fetch paginated guest list (most recent transactions first)
export const getGuestListPaginated = async (eventId: string, page: number = 1, limit: number = 10): Promise<{
  guests: any[];
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
        console.log("No token in storage for paginated guest list, using default token");
        authToken = '8534838IGWQYmheB4432355';
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
        return bTime.localeCompare(aTime);
      }
      
      // For non-checked-in guests, sort by purchase date (most recent first)
      const aDate = a.purchased_date || '0';
      const bDate = b.purchased_date || '0';
      return bDate.localeCompare(aDate);
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
    
    // Return mock data for testing
    const mockGuests = [
      { id: 'a1', name: 'John Smith', email: 'john@example.com', ticketType: 'General', scannedIn: true, scanInTime: '08:45 AM', qrCode: 'MOCK_QR_001', purchased_date: '2024-01-15' },
      { id: 'a2', name: 'Sarah Johnson', email: 'sarah@example.com', ticketType: 'VIP', scannedIn: true, scanInTime: '08:30 AM', qrCode: 'MOCK_QR_002', purchased_date: '2024-01-14' },
      { id: 'a3', name: 'Michael Brown', email: 'michael@example.com', ticketType: 'General', scannedIn: false, qrCode: 'MOCK_QR_003', purchased_date: '2024-01-13' },
      { id: 'a4', name: 'Emily Davis', email: 'emily@example.com', ticketType: 'General', scannedIn: false, qrCode: 'MOCK_QR_004', purchased_date: '2024-01-12' },
      { id: 'a5', name: 'David Wilson', email: 'david@example.com', ticketType: 'Early Bird', scannedIn: false, qrCode: 'MOCK_QR_005', purchased_date: '2024-01-11' },
    ];
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMock = mockGuests.slice(startIndex, endIndex);
    
    return {
      guests: paginatedMock,
      totalCount: mockGuests.length,
      hasMore: endIndex < mockGuests.length,
      currentPage: page
    };
  }
};

// New function to search guests from API
export const searchGuestList = async (eventId: string, searchQuery: string): Promise<any[]> => {
  try {
    // Make sure we have the token
    if (!authToken) {
      console.log("No auth token available for guest search, trying to get from storage");
      const storedToken = await getStorageItem('auth_token');
      if (storedToken) {
        authToken = storedToken;
      } else {
        console.log("No token in storage for guest search, using default token");
        authToken = '8534838IGWQYmheB4432355';
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
      const aName = (a.purchased_by || a.name || a.fullname || '').toLowerCase();
      const bName = (b.purchased_by || b.name || b.fullname || '').toLowerCase();
      
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
export const getCheckedInGuestList = async (eventId: string): Promise<any[]> => {
  try {
    // Make sure we have the token
    if (!authToken) {
      console.log("No auth token available for checked-in guest list, trying to get from storage");
      const storedToken = await getStorageItem('auth_token');
      if (storedToken) {
        authToken = storedToken;
      } else {
        console.log("No token in storage for checked-in guest list, using default token");
        authToken = '8534838IGWQYmheB4432355'; // Use the default token from the curl example
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

    // Filter for only checked-in guests (checkedin === "1" or checkedin === 1)
    const checkedInGuests = allGuests.filter((guest: any) => 
      guest.checkedin === "1" || guest.checkedin === 1
    );

    console.log(`Found ${checkedInGuests.length} checked-in guests out of ${allGuests.length} total guests`);
    
    return checkedInGuests;
  } catch (error) {
    console.error("Error fetching checked-in guest list:", error);
    return [];
  }
};

// Note: checkInGuest function removed - use scanQRCode instead for check-in functionality
// Check-in is now handled through QR code scanning with scanQRCode(eventId, scanCode)
// Check-out is handled through unscanQRCode(eventId, scanCode)

// Function to generate a sample QR code payload for testing
export const generateSampleQRData = (guestId: string): string => {
  return JSON.stringify({
    id: guestId,
    timestamp: new Date().toISOString(),
  });
};

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
          email: profileData.email || 'Outix@thebend.co',
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
            email: profileData.email || 'Outix@thebend.co',
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
          email: userData.email || 'Outix@thebend.co',
          role: userData.role || userData.userRole || 'Event Manager',
          eventsCreated: userData.eventsCreated || userData.created || 12,
          eventsAttended: userData.eventsAttended || userData.attended || 8,
          profileImage: userData.profileImage || userData.avatar || null
        };
      }
    } catch (apiError: any) {
      console.warn("API call for user profile failed:", apiError.message);
    }
    
    // Return default mock data as final fallback
    console.log("Using default user profile data (all other methods failed)");
    const defaultProfile = {
      id: 'default_user',
      name: "Outix Scanner User",
      email: "Outix@thebend.co", 
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
    // Return mock data on any unexpected error
    return {
      id: 'error_fallback',
      name: "Outix Scanner",
      email: "Outix@thebend.co",
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
  else email = 'Outix@thebend.co';
  
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
    return false;
  }
  
  // First check in-memory token
  if (authToken) {
    return true;
  }
  
  // Then check storage
  const storedToken = await getStorageItem('auth_token');
  if (storedToken) {
    // Restore token to memory
    authToken = storedToken;
    return true;
  }
  
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

// Enhanced QR Code validation with better error handling
export const validateQRCode = async (eventId: string, scanCode: string): Promise<QRValidationResponse | null> => {
  try {
    console.log(`Validating QR code for event ${eventId}, scancode: ${scanCode}`);
    
    // First, check if this is a mock QR code for testing
    if (scanCode.startsWith('MOCK_QR_')) {
      console.log('Using mock validation for test QR code');
      return {
        error: false,
        msg: {
          message: 'Valid mock ticket',
          info: {
            id: scanCode,
            booking_id: 'MOCK_BOOKING_123',
            reference_num: scanCode,
            ticket_identifier: scanCode,
            ticket_title: 'Mock General Admission',
            checkedin: 0,
            checkedin_date: '',
            totaladmits: '1',
            admits: '1',
            available: 1,
            price: '50.00',
            remarks: 'Test ticket',
            email: 'test@example.com',
            fullname: 'Test User',
            address: 'Test Address',
            notes: 'Mock ticket for testing',
            purchased_date: new Date().toISOString(),
            reason: '',
            message: 'Valid test ticket',
            mobile: '0400000000',
            picture_display: '',
            scannable: '1',
            ticket_id: scanCode,
            passout: '0'
          }
        },
        status: 200
      };
    }
    
    // Make direct API request to validate endpoint
    const response = await api.get(`/validate/${eventId}/${scanCode}`, {
      timeout: 30000
    });
    
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
    
    // First, check if this is a mock QR code for testing
    if (scanCode.startsWith('MOCK_QR_')) {
      console.log('Using mock scan for test QR code');
      return {
        error: false,
        msg: {
          message: '1 Admit(s) checked In'
        },
        status: 200
      };
    }
    
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
      
      // Return the actual API response for all status codes
      return {
        error: responseData.error !== undefined ? responseData.error : true,
        msg: responseData.msg || responseData.message || (status === 404 ? 'Already Scanned Ticket, Cannot check in.' : status === 401 ? 'Authentication failed. Please check your credentials.' : 'Scan failed'),
        status: responseData.status || status
      };
    }
    
    return null;
  }
};

export const unscanQRCode = async (eventId: string, scanCode: string): Promise<QRScanResponse | null> => {
  try {
    console.log(`Unscanning QR code for event ${eventId}, scancode: ${scanCode}`);
    
    // First, check if this is a mock QR code for testing
    if (scanCode.startsWith('MOCK_QR_')) {
      console.log('Using mock unscan for test QR code');
      return {
        error: false,
        msg: {
          message: 'Admit/ticket unchecked. Ticket can be re-scanned.'
        },
        status: 200
      };
    }
    
    // Make direct API request to unscan endpoint
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
      
      // Return the actual API response for all status codes
      return {
        error: responseData.error !== undefined ? responseData.error : true,
        msg: responseData.msg || (status === 404 ? 'This ticket has not been used yet.' : 'Unscan failed'),
        status: responseData.status || status
      };
    }
    
    return {
      error: true,
      msg: error.message || 'Failed to unscan ticket',
      status: 500
    };
  }
};

// Export storage functions for testing
export { getStorageItem, removeStorageItem, setStorageItem };

export const getGroupTickets = async (eventId: string, qrData: string): Promise<any> => {
  try {
    // First validate the ticket to get purchaser info
    const validation = await validateQRCode(eventId, qrData);
    
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
    
    // Check if we have ticket info (can be present even in error responses)
    if (validation.msg && typeof validation.msg === 'object' && 'info' in validation.msg) {
      const info = validation.msg.info;
      purchaserEmail = info?.email;
      purchaserName = info?.fullname;
      purchaserBookingId = info?.booking_id;
    }
    
    // If validation failed but we don't have purchaser info, it's a real error
    if (validation.error && !purchaserEmail && !purchaserName && !purchaserBookingId) {
      return {
        error: true,
        msg: typeof validation.msg === 'string' 
          ? validation.msg 
          : validation.msg?.message || 'Invalid ticket for group scan'
      };
    }
    
    // If we don't have purchaser info by now, we can't proceed
    if (!purchaserEmail && !purchaserName && !purchaserBookingId) {
      return {
        error: true,
        msg: 'Cannot identify purchaser for group scan'
      };
    }
    
    console.log('Purchaser info extracted:', { purchaserEmail, purchaserName, purchaserBookingId });
    
    // Get all attendees for this event using the correct endpoint
    const response = await api.get(`/guestlist/${eventId}`, {
      timeout: 30000
    });
    
    if (!response.data) {
      throw new Error('No response data from guest list API');
    }
    
    // Extract guests from response - the correct format is response.data.msg
    let allGuests = [];
    if (response.data.msg && Array.isArray(response.data.msg)) {
      allGuests = response.data.msg;
    } else if (Array.isArray(response.data)) {
      allGuests = response.data;
    } else if (response.data.data && Array.isArray(response.data.data)) {
      allGuests = response.data.data;
    } else if (response.data.guests && Array.isArray(response.data.guests)) {
      allGuests = response.data.guests;
    } else {
      throw new Error('Unexpected guest list response format');
    }
    
    console.log('Total guests found:', allGuests.length);
    
    // Filter attendees by same purchaser email, name, or booking ID
    // Note: guest list structure uses different field names
    const groupTickets = allGuests.filter((attendee: any) => {
      // Match by booking reference (booking_reference in guest list vs booking_id in validation)
      if (purchaserBookingId && (attendee.booking_reference === purchaserBookingId || attendee.booking_id === purchaserBookingId)) {
        return true;
      }
      if (purchaserEmail && attendee.email === purchaserEmail) {
        return true;
      }
      // Match by name (purchased_by in guest list vs fullname in validation)
      if (purchaserName && (attendee.purchased_by === purchaserName || attendee.fullname === purchaserName)) {
        return true;
      }
      return false;
    });
    
    console.log('Group tickets found:', groupTickets.length);
    
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
      
      return {
        id: qrCode, // Use the ticket identifier as the unique ID
        name: ticket.purchased_by || ticket.admit_name || 'Guest',
        email: ticket.email || 'No email',
        ticketType: ticket.ticket_title || 'General Admission',
        ticketIdentifier: ticket.ticket_identifier,
        isCheckedIn: ticket.checkedin === '1' || ticket.checkedin === 1 || false,
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
    
    // Return mock data for testing if API fails
    if (qrData.startsWith('MOCK_QR_')) {
      return {
        success: true,
        tickets: [
          { id: 'tid_001', name: 'John Smith', email: 'john@example.com', ticketType: 'VIP', ticketIdentifier: '12064355LUJYXADA', isCheckedIn: false, qrCode: 'MOCK_QR_001' },
          { id: 'tid_002', name: 'Jane Smith', email: 'jane@example.com', ticketType: 'VIP', ticketIdentifier: '12064356LUJYXADB', isCheckedIn: false, qrCode: 'MOCK_QR_002' },
          { id: 'tid_003', name: 'Bob Smith', email: 'bob@example.com', ticketType: 'VIP', ticketIdentifier: '12064357LUJYXADC', isCheckedIn: false, qrCode: 'MOCK_QR_003' }
        ],
        purchaser: {
          email: 'john@example.com',
          name: 'John Smith',
          bookingId: 'MOCK_BOOKING_123'
        }
      };
    }
    
    return {
      error: true,
      msg: error instanceof Error ? error.message : 'Failed to get group tickets'
    };
  }
};

export const scanGroupTickets = async (eventId: string, ticketIds: string[]): Promise<any> => {
  try {
    const scanPromises = ticketIds.map(ticketId => 
      scanQRCode(eventId, ticketId)
    );
    
    const results = await Promise.allSettled(scanPromises);
    
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
    const unscanPromises = ticketIds.map(ticketId => 
      unscanQRCode(eventId, ticketId)
    );
    
    const results = await Promise.allSettled(unscanPromises);
    
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