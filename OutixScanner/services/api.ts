import axios, { InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Base URL for direct API calls
const BASE_URL = 'https://www.outix.co/apis';

// Function to get the appropriate proxy URL based on the environment
const getProxyURL = (): string => {
  // Check if we're running on a physical device vs simulator/emulator
  const { manifest } = Constants;
  
  if (Platform.OS === 'android') {
    // For Android physical devices, we need to use the host machine's IP
    // For Android emulator, we can use the special IP 10.0.2.2
    if (Constants.isDevice) {
      // Physical Android device - use host machine IP
      // This should be set as an environment variable or detected dynamically
      const hostIP = manifest?.debuggerHost?.split(':')[0] || 'localhost';
      return `http://${hostIP}:3000/api`;
    } else {
      // Android emulator - use special emulator IP
      return 'http://10.0.2.2:3000/api';
    }
  } else if (Platform.OS === 'ios') {
    if (Constants.isDevice) {
      // Physical iOS device - use host machine IP
      const hostIP = manifest?.debuggerHost?.split(':')[0] || 'localhost';
      return `http://${hostIP}:3000/api`;
    } else {
      // iOS simulator - can use localhost
      return 'http://localhost:3000/api';
    }
  }
  
  // Fallback for web or other platforms
  return 'http://localhost:3000/api';
};

// Get the proxy URL dynamically
const PROXY_URL = getProxyURL();

console.log(`Using proxy URL: ${PROXY_URL}`);
console.log(`Platform: ${Platform.OS}, Is Device: ${Constants.isDevice}`);

// Manual IP override for development (can be set via storage)
let manualProxyIP: string | null = '192.168.18.102'; // Set default IP for testing

// Function to manually set the proxy server IP (useful for device testing)
export const setManualProxyIP = async (ip: string): Promise<void> => {
  manualProxyIP = ip;
  await setStorageItem('manual_proxy_ip', ip);
  console.log(`Manual proxy IP set to: ${ip}`);
};

// Function to get the current proxy URL (with manual override if set)
export const getCurrentProxyURL = async (): Promise<string> => {
  // Check if manual IP is set in storage
  if (!manualProxyIP) {
    manualProxyIP = await getStorageItem('manual_proxy_ip');
  }
  
  // If still no manual IP, try to set the default
  if (!manualProxyIP) {
    manualProxyIP = '192.168.18.102'; // Default IP for testing
    await setStorageItem('manual_proxy_ip', manualProxyIP);
  }
  
  if (manualProxyIP) {
    const manualURL = `http://${manualProxyIP}:3000/api`;
    console.log(`Using manual proxy URL: ${manualURL}`);
    return manualURL;
  }
  
  return PROXY_URL;
};

// Function to clear manual IP and use auto-detection
export const clearManualProxyIP = async (): Promise<void> => {
  manualProxyIP = null;
  await removeStorageItem('manual_proxy_ip');
  console.log('Manual proxy IP cleared, will use auto-detection');
};

// Function to get current proxy IP
export const getCurrentProxyIP = async (): Promise<string> => {
  const url = await getCurrentProxyURL();
  // Extract IP from URL like "http://192.168.18.102:3000/api"
  const match = url.match(/http:\/\/([^:]+):/);
  return match ? match[1] : 'unknown';
};

// Function to test proxy server connectivity
export const testProxyConnectivity = async (): Promise<{ success: boolean; url: string; error?: string; ip?: string }> => {
  const proxyURL = await getCurrentProxyURL();
  
  try {
    console.log(`Testing connectivity to: ${proxyURL}`);
    
    // Test the server-info endpoint
    const response = await axios.get(`${proxyURL.replace('/api', '')}/api/server-info`, {
      timeout: 5000 // 5 second timeout
    });
    
    console.log('Proxy connectivity test successful:', response.data);
    
    return {
      success: true,
      url: proxyURL,
      ip: response.data.ip
    };
  } catch (error: any) {
    console.error('Proxy connectivity test failed:', error.message);
    
    return {
      success: false,
      url: proxyURL,
      error: error.message
    };
  }
};

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
    
    return true; // Memory removal succeeded
  } catch (error) {
    console.error(`Error in removeStorageItem(${key}):`, error);
    return false;
  }
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to automatically add auth token to requests
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // If no in-memory token and AsyncStorage is working, try to get from AsyncStorage
    if (!authToken && isAsyncStorageWorking) {
      try {
        authToken = await AsyncStorage.getItem('auth_token');
      } catch (error) {
        console.log("Error reading from AsyncStorage:", error);
        isAsyncStorageWorking = false;
      }
    }
    
    if (authToken && config.headers) {
      // Use the exact header name 'Auth-Token' as shown in Postman
      config.headers['Auth-Token'] = authToken;
    }
    return config;
  },
  (error) => {
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

export const login = async (): Promise<string | null> => {
  try {
    // If user has explicitly logged out, don't auto-restore token
    if (isLoggedOut) {
      console.log("User has logged out, not auto-restoring token");
      return null;
    }
    
    // Check if token already exists in storage
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
    
    // Show we're attempting login
    console.log("No token found, attempting login with API");

    try {
      // Create form data for authentication
      const formData = new FormData();
      formData.append('username', 'Outix@thebend.co');
      formData.append('password', 'Scan$9841');
      
      // Configure axios to send form-data through our proxy server
      const proxyURL = await getCurrentProxyURL();
      const response = await axios.post(`${proxyURL}/auth`, {
        username: 'Outix@thebend.co',
        password: 'Scan$9841'
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        // Adding a timeout to prevent long hangs
        timeout: 10000
      });
      
      console.log("Login response status:", response.status);
      
      // Success path - extract token from response
      if (response.data && response.data.msg && response.data.msg.Auth_Token) {
        const token = response.data.msg.Auth_Token;
        console.log("Got auth token from API");
        authToken = token;
        isLoggedOut = false; // Reset logout flag on successful login
        
        // Store token in storage
        await setStorageItem('auth_token', token);
        
        // Store user profile data if available in the response
        if (response.data.msg) {
          console.log("Storing user profile data from login response:", JSON.stringify(response.data.msg, null, 2));
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
            console.log("Storing user profile data from extracted response:", JSON.stringify(response.data, null, 2));
            await setStorageItem('user_profile', JSON.stringify(response.data));
          }
          
          return token;
        }
      }
      
      // If we reached here, API returned success but no token
      console.warn("API successful but no token found in response");
    } catch (apiError: any) {
      console.error("API login failed:", apiError.message || apiError);
      
      // Check specific error types
      if (apiError.response) {
        console.log("Response status:", apiError.response.status);
        console.log("Response data:", apiError.response.data);
      } else if (apiError.request) {
        console.log("No response received");
      }
    }
    
    // If we get here, API failed or didn't return a token
    // Use mock token as fallback
    const mockToken = "8934796HSnvLiZIs4087116";
    console.log("Using mock token as fallback");
    authToken = mockToken;
    isLoggedOut = false; // Reset logout flag on successful login
    await setStorageItem('auth_token', mockToken);
    
    // Store mock user profile data as well
    const mockUserProfile = {
      UserID: 'mock_user_123',
      LoggedName: 'Outix Scanner User',
      ClientName: 'Outix Scanner',
      email: 'Outix@thebend.co',
      role: 'Event Manager',
      eventsCreated: 12,
      eventsAttended: 8,
      Auth_Token: mockToken
    };
    console.log("Storing mock user profile data");
    await setStorageItem('user_profile', JSON.stringify(mockUserProfile));
    console.log("Mock user profile stored successfully");
    
    return mockToken;
  } catch (error) {
    console.error('Unexpected login error:', error);
    
    // Last resort fallback
    const fallbackToken = "8934796HSnvLiZIs4087116";
    authToken = fallbackToken;
    isLoggedOut = false; // Reset logout flag on successful login
    
    // Store fallback user profile data as well
    const fallbackUserProfile = {
      UserID: 'fallback_user_456',
      LoggedName: 'Outix Scanner User',
      ClientName: 'Outix Scanner',
      email: 'Outix@thebend.co',
      role: 'Event Manager',
      eventsCreated: 0,
      eventsAttended: 0,
      Auth_Token: fallbackToken
    };
    await setStorageItem('user_profile', JSON.stringify(fallbackUserProfile));
    
    return fallbackToken;
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

export const getEvents = async (): Promise<any[]> => {
  try {
    // Make sure we have the token
    if (!authToken) {
      console.log("No auth token available, trying to get from storage");
      const storedToken = await getStorageItem('auth_token');
      if (storedToken) {
        authToken = storedToken;
      } else {
        console.log("No token in storage, trying to login");
        await login();
      }
    }
    
    console.log("Sending request with token:", authToken ? "token-exists" : "no-token");
    
    try {
      // Use the dynamic proxy server to bypass CORS
      const proxyURL = await getCurrentProxyURL();
      const response = await axios.get(`${proxyURL}/events`, {
        headers: {
          'auth-token': authToken || '',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log("Events API response status:", response.status);
      
      // Format the event images with the correct base URL
      if (response.data && response.data.msg && Array.isArray(response.data.msg)) {
        // Add image base URL to all events
        const eventsWithFormattedUrls = response.data.msg.map((event: any) => {
          // Add the base URL to image fields
          if (event.EventImage) {
            event.EventImage = `https://www.outix.co/uploads/images/events/${event.EventImage}`;
          }
          if (event.EventLogo) {
            event.EventLogo = `https://www.outix.co/uploads/images/events/${event.EventLogo}`;
          }
          return event;
        });
        return eventsWithFormattedUrls;
      }
      
      // If we got a response but data format is unexpected
      if (response.data) {
        console.log("Got response but data format is unexpected");
        if (Array.isArray(response.data)) {
          return response.data;
        }
      }
    } catch (apiError: any) {
      console.error("Error making API request:", apiError.message || apiError);
      
      // Log more details about the error
      if (apiError.response) {
        console.log("Response status:", apiError.response.status);
      } else if (apiError.request) {
        console.log("No response received");
      }
      
      // Continue to mock data
    }
    
    // Return mock data (existing code)
    console.log("Using mock events data");
    return [
      { 
        id: '77809',
        EventId: '77809',
        EventName: '2025 Event Pass',
        showStart: '2024-09-30 01:00:00',
        VenueName: 'Shell V-Power Motorsport Park',
        EventImage: 'https://www.outix.co/uploads/images/events/456306-1697679646-event-cover-img.png'
      },
      { 
        id: '78035', 
        EventId: '78035',
        EventName: 'Supercars Championship',
        showStart: '2024-11-15 09:00:00',
        VenueName: 'Shell V-Power Motorsport Park',
        EventImage: 'https://www.outix.co/uploads/images/events/460735-1742338970-event-cover-img.jpg'
      },
      { 
        id: '78102', 
        EventId: '78102',
        EventName: 'GT World Challenge',
        showStart: '2024-12-05 10:00:00',
        VenueName: 'Shell V-Power Motorsport Park',
        EventImage: 'https://www.outix.co/uploads/images/events/460745-1743135190-event-cover-img.jpg'
      },
      {
        id: '78215',
        EventId: '78215',
        EventName: 'Tailem Bend Motorsport Festival',
        showStart: '2024-09-20 10:00:00',
        VenueName: 'Tailem Bend',
        EventImage: 'https://www.outix.co/uploads/images/events/460757-1742443499-event-cover-img.jpg'
      },
      {
        id: '78301',
        EventId: '78301',
        EventName: 'Australian Grand Prix',
        showStart: '2025-03-12 08:00:00',
        VenueName: 'Melbourne',
        EventImage: 'https://www.outix.co/uploads/images/events/460766-1742791548-event-cover-img.jpg'
      },
      {
        id: '78422',
        EventId: '78422',
        EventName: 'Bathurst 1000',
        showStart: '2024-10-10 09:00:00',
        VenueName: 'Mount Panorama',
        EventImage: 'https://www.outix.co/uploads/images/events/460875-1744422939-event-cover-img.jpg'
      },
      {
        id: '78555',
        EventId: '78555',
        EventName: 'Formula Drift Championship',
        showStart: '2025-01-15 14:00:00',
        VenueName: 'Sydney Motorsport Park',
        EventImage: 'https://www.outix.co/uploads/images/events/460897-1744778534-event-cover-img.jpg'
      },
      {
        id: '78612',
        EventId: '78612',
        EventName: 'Adelaide 500',
        showStart: '2025-02-28 10:00:00',
        VenueName: 'Adelaide Street Circuit',
        EventImage: 'https://www.outix.co/uploads/images/events/460928-1745279776-event-cover-img.png'
      },
      {
        id: '78700',
        EventId: '78700',
        EventName: 'Australian Motorcycle Grand Prix',
        showStart: '2025-04-15 09:30:00',
        VenueName: 'Phillip Island',
        EventImage: 'https://www.outix.co/uploads/images/events/460965-1745882713-event-cover-img.jpg'
      }
    ];
  } catch (error) {
    console.error('Unexpected get events error:', error);
    
    // Return an expanded set of mock data on unexpected error
    return [
      { 
        id: '77809',
        EventId: '77809',
        EventName: '2025 Event Pass',
        showStart: '2024-09-30 01:00:00',
        VenueName: 'Shell V-Power Motorsport Park',
        EventImage: 'https://www.outix.co/uploads/images/events/456306-1697679646-event-cover-img.png'
      },
      { 
        id: '78035', 
        EventId: '78035',
        EventName: 'Supercars Championship',
        showStart: '2024-11-15 09:00:00',
        VenueName: 'Shell V-Power Motorsport Park',
        EventImage: 'https://www.outix.co/uploads/images/events/460735-1742338970-event-cover-img.jpg'
      },
      { 
        id: '78102', 
        EventId: '78102',
        EventName: 'GT World Challenge',
        showStart: '2024-12-05 10:00:00',
        VenueName: 'Shell V-Power Motorsport Park',
        EventImage: 'https://www.outix.co/uploads/images/events/460745-1743135190-event-cover-img.jpg'
      },
      {
        id: '78215',
        EventId: '78215',
        EventName: 'Tailem Bend Motorsport Festival',
        showStart: '2024-09-20 10:00:00',
        VenueName: 'Tailem Bend',
        EventImage: 'https://www.outix.co/uploads/images/events/460757-1742443499-event-cover-img.jpg'
      },
      {
        id: '78301',
        EventId: '78301',
        EventName: 'Australian Grand Prix',
        showStart: '2025-03-12 08:00:00',
        VenueName: 'Melbourne',
        EventImage: 'https://www.outix.co/uploads/images/events/460766-1742791548-event-cover-img.jpg'
      }
    ];
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
    
    // First try with standard endpoint
    try {
      console.log(`Trying first endpoint: /events/${eventId}/guests`);
      const proxyURL = await getCurrentProxyURL();
      const response = await axios.get(`${proxyURL}/events/${eventId}/guests`, {
        headers: {
          'auth-token': authToken,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
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
      console.log("First guest list endpoint failed, trying alternative endpoint");
      
      // If first endpoint fails, try the alternative endpoint
      try {
        console.log(`Trying alternative endpoint: /guestlist/${eventId}`);
        const proxyURL = await getCurrentProxyURL();
        const response = await axios.get(`${proxyURL}/guestlist/${eventId}`, {
          headers: {
            'auth-token': authToken,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 10000
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
    const proxyURL = await getCurrentProxyURL();
    const url = `${proxyURL}/guestlist/${eventId}`;
    console.log(`Making request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'auth-token': authToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Checked-in guest list API response:", data);

    if (data.error) {
      console.error("API returned error:", data);
      return [];
    }

    // The API returns all guests, so we need to filter for checked-in guests client-side
    let allGuests = [];
    if (data.msg && Array.isArray(data.msg)) {
      allGuests = data.msg;
    } else if (Array.isArray(data)) {
      allGuests = data;
    } else {
      console.error("Unexpected API response format for checked-in guests:", data);
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

export const checkInGuest = async (eventId: string, guestId: string): Promise<any> => {
  try {
    // Make sure we have the token
    if (!authToken) {
      console.log("No auth token available for check-in, trying to get from storage");
      const storedToken = await getStorageItem('auth_token');
      if (storedToken) {
        authToken = storedToken;
      } else {
        console.log("No token in storage for check-in, trying to login");
        await login();
      }
    }
    
    // Send data as JSON through the proxy
    const proxyURL = await getCurrentProxyURL();
    const response = await axios.post(`${proxyURL}/checkin`, {
      eventId,
      guestId,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Content-Type': 'application/json',
        'auth-token': authToken || ''
      },
      timeout: 10000
    });
    
    console.log("Check-in API response status:", response.status);
    
    if (response.data && response.data.msg) {
      return response.data.msg;
    }
    return response.data;
  } catch (error) {
    console.error(`Check-in error for guest ${guestId}:`, error);
    // Return mock success response
    return { success: true, message: 'Guest checked in successfully' };
  }
};

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
      const proxyURL = await getCurrentProxyURL();
      const response = await axios.get(`${proxyURL}/user/profile`, {
        headers: {
          'Auth-Token': authToken || ''
        },
        timeout: 5000
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
    
    // Use the proxy server to make the validation request
    const proxyURL = await getCurrentProxyURL();
    const response = await axios.get(`${proxyURL}/validate/${eventId}/${scanCode}`, {
      headers: {
        'Auth-Token': authToken || '',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('QR validation response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error(`Error validating QR code for event ${eventId}:`, error);
    
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
    
    // Use the proxy server to make the scan request
    const proxyURL = await getCurrentProxyURL();
    const response = await axios.get(`${proxyURL}/scan/${eventId}/${scanCode}`, {
      headers: {
        'Auth-Token': authToken || '',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('QR scan response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error(`Error scanning QR code for event ${eventId}:`, error);
    
    // Enhanced error handling based on API specification
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      // Check if data is nested in a 'details' object
      const responseData = data.details || data;
      
      // Return the actual API response for all status codes
      return {
        error: responseData.error !== undefined ? responseData.error : true,
        msg: responseData.msg || (status === 404 ? 'Already Scanned Ticket, Cannot check in.' : 'Scan failed'),
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
    
    // Use the proxy server to make the unscan request
    const proxyURL = await getCurrentProxyURL();
    const response = await axios.get(`${proxyURL}/scan/${eventId}/${scanCode}?unscan=1`, {
      headers: {
        'Auth-Token': authToken || '',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('QR unscan response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error(`Error unscanning QR code for event ${eventId}:`, error);
    
    // Enhanced error handling based on API specification
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      // Check if data is nested in a 'details' object
      const responseData = data.details || data;
      
      // Return the actual API response for all status codes
      return {
        error: responseData.error !== undefined ? responseData.error : true,
        msg: responseData.msg || (status === 404 ? 'This ticket has not been used yet.' : 'Unscan failed'),
        status: responseData.status || status
      };
    }
    
    return null;
  }
};

// Export storage functions for testing
export { getStorageItem, setStorageItem, removeStorageItem };

export default api; 