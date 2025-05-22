import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://www.outix.co/apis';

// Type definitions
export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: string;
  eventsCreated: number;
  eventsAttended: number;
  profileImage: string | null;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  location: string;
  EventImage?: string;
  EventLogo?: string;
  capacity: number;
  attendees: number;
}

interface AuthResponse {
  msg: {
    Auth_Token: string;
    ClientName: string;
    LoggedName: string;
    email: string;
    Expiry: string;
  };
  error: boolean;
  status: number;
}

// Token storage key
const AUTH_TOKEN_KEY = '@outix_scanner_auth_token';
const USER_PROFILE_KEY = '@outix_scanner_user_profile';

// In-memory token cache
let authToken: string | null = null;

export const login = async (
  username: string = 'Outix@thebend.co',
  password: string = 'Scan$9841'
): Promise<string | null> => {
  try {
    // Clear any existing tokens
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_PROFILE_KEY);
    authToken = null;

    // Create form data
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    // Make login request
    const response = await axios.post<AuthResponse>(`${BASE_URL}/auth`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data?.msg?.Auth_Token) {
      const token = response.data.msg.Auth_Token;
      
      // Store token securely
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      
      // Store user profile
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(response.data.msg));
      
      // Update in-memory token
      authToken = token;
      
      return token;
    }
    
    return null;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
};

export const getToken = async (): Promise<string | null> => {
  if (authToken) return authToken;
  
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      authToken = token;
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getToken();
  return !!token;
};

export const logout = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_PROFILE_KEY);
    authToken = null;
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
};

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to all requests
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token && config.headers) {
      config.headers['Auth-Token'] = token;
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Keep the other functions empty for now as requested
export const getEvents = async (): Promise<Event[]> => {
  return [];
};

export const getGuestList = async (eventId: string): Promise<any[]> => {
  return [];
};

export const checkInGuest = async (eventId: string, bookingReference: string): Promise<any> => {
  return null;
};

export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const profileJson = await AsyncStorage.getItem(USER_PROFILE_KEY);
    if (profileJson) {
      const profile = JSON.parse(profileJson);
      return {
        id: profile.UserID || '',
        name: profile.LoggedName || profile.ClientName || 'User',
        email: profile.email || 'user@example.com',
        role: 'User',
        eventsCreated: 0,
        eventsAttended: 0,
        profileImage: null
      };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
  }
  
  return {
    id: '',
    name: 'User',
    email: 'user@example.com',
    role: 'User',
    eventsCreated: 0,
    eventsAttended: 0,
    profileImage: null
  };
};

export default api; 