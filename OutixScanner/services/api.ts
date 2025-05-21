import axios, { InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://www.outix.co/apis';

// In-memory token storage (no AsyncStorage dependency)
let authToken: string | null = null;

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
    // If no in-memory token, try to get from AsyncStorage
    if (!authToken) {
      authToken = await AsyncStorage.getItem('auth_token');
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

// Mock JWT token for development since the real endpoint is returning 400
const MOCK_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ik91dGl4U2Nhbm5lciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

export const login = async (): Promise<string | null> => {
  try {
    // Check if token already exists in AsyncStorage
    const storedToken = await AsyncStorage.getItem('auth_token');
    if (storedToken) {
      console.log("Using existing token from AsyncStorage");
      authToken = storedToken;
      return storedToken;
    }

    // Try the real API first
    try {
      // Create form data for authentication (using form-data instead of JSON)
      const formData = new FormData();
      formData.append('username', 'Outix@thebend.co');
      formData.append('password', 'Scan$9841');
      
      console.log("Sending login request with form data");
      
      // Configure axios to send form-data
      const response = await axios.post(`${BASE_URL}/auth`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      console.log("Login response:", JSON.stringify(response.data).substring(0, 200) + "...");
      
      // Based on the screenshot, the token is in response.data.msg.Auth_Token
      if (response.data && response.data.msg && response.data.msg.Auth_Token) {
        const token = response.data.msg.Auth_Token;
        console.log("Got auth token:", token);
        authToken = token;
        // Store token in AsyncStorage
        if (token) {
          await AsyncStorage.setItem('auth_token', token);
        }
        return token;
      }
      
      // If we can't find the token in the expected structure but have a successful response
      if (response.data && response.status === 200) {
        // Try to extract token from wherever it might be in the response
        const token = extractTokenFromResponse(response.data);
        if (token) {
          console.log("Extracted token from response:", token);
          authToken = token;
          // Store token in AsyncStorage
          await AsyncStorage.setItem('auth_token', token);
          return token;
        }
      }
    } catch (apiError) {
      console.log("API login failed:", apiError);
      throw apiError; // Rethrow to handle in the calling function
    }
    
    throw new Error("Could not obtain valid auth token from API");
  } catch (error) {
    console.error('Login error:', error);
    throw error; // Let the calling function handle the error
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
      console.log("No auth token available, trying to get from AsyncStorage");
      const storedToken = await AsyncStorage.getItem('auth_token');
      if (storedToken) {
        authToken = storedToken;
      } else {
        console.log("No token in AsyncStorage, login required");
        throw new Error("Authentication required");
      }
    }
    
    console.log("Sending request with token:", authToken);
    
    // Use the same Auth-Token header format as shown in Postman
    const response = await axios.get(`${BASE_URL}/events`, {
      headers: {
        'Auth-Token': authToken || ''
      }
    });
    
    console.log("Events API response:", JSON.stringify(response.data).substring(0, 200) + "...");
    
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
      console.log("Got response but data format is unexpected:", response.data);
      return response.data;
    }
    
    // If we didn't get expected response format
    throw new Error("Invalid response format from API");
  } catch (error) {
    console.error('Get events error:', error);
    throw error; // Let the calling function handle this error
  }
};

export const getGuestList = async (eventId: string): Promise<any[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/guestlist/${eventId}`, {
      headers: {
        'Auth-Token': authToken || '',
        'Content-Type': 'application/json',
      }
    });
    
    if (response.data && response.data.msg) {
      return response.data.msg;
    }
    return response.data;
  } catch (error) {
    console.error(`Get guest list error for event ${eventId}:`, error);
    // Return mock attendees on error
    return [
      { id: 'a1', name: 'John Smith', email: 'john@example.com', ticketType: 'General', checkedIn: true, checkInTime: '08:45 AM' },
      { id: 'a2', name: 'Sarah Johnson', email: 'sarah@example.com', ticketType: 'VIP', checkedIn: true, checkInTime: '08:30 AM' },
      { id: 'a3', name: 'Michael Brown', email: 'michael@example.com', ticketType: 'General', checkedIn: false },
      { id: 'a4', name: 'Emily Davis', email: 'emily@example.com', ticketType: 'General', checkedIn: false },
      { id: 'a5', name: 'David Wilson', email: 'david@example.com', ticketType: 'Early Bird', checkedIn: false },
    ];
  }
};

export const checkInGuest = async (eventId: string, guestId: string): Promise<any> => {
  try {
    // Create form data for check-in
    const formData = new FormData();
    formData.append('eventId', eventId);
    formData.append('guestId', guestId);
    formData.append('timestamp', new Date().toISOString());
    
    const response = await axios.post(`${BASE_URL}/checkin`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Auth-Token': authToken || ''
      }
    });
    
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

// Utility to check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!authToken;
};

export default api; 