import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://www.outix.co/apis';
// Add proxy URL that points to our local proxy server
const PROXY_URL = 'http://localhost:3000/api';

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
    info: TicketInfo;
  };
  status: number;
}

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

    // Make login request through our proxy instead of directly
    const response = await axios.post<AuthResponse>(`${PROXY_URL}/auth`, {
      username,
      password
    }, {
      headers: {
        'Content-Type': 'application/json',
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
  // Use the proxy URL instead of the direct BASE_URL
  baseURL: PROXY_URL,
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

// Updated implementations to use the proxy
export const getEvents = async (): Promise<Event[]> => {
  try {
    const response = await api.get('/events');
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching events:', error);
  return [];
  }
};

export const getGuestList = async (eventId: string): Promise<any[]> => {
  try {
    const response = await api.get(`/events/${eventId}/guests`);
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error(`Error fetching guest list for event ${eventId}:`, error);
  return [];
  }
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

// QR Code validation functions
export const validateQRCode = async (eventId: string, scanCode: string): Promise<QRValidationResponse | null> => {
  try {
    const response = await api.get(`/validate/${eventId}/${scanCode}`);
    return response.data;
  } catch (error) {
    console.error(`Error validating QR code for event ${eventId}:`, error);
    return null;
  }
};

export const scanQRCode = async (eventId: string, scanCode: string): Promise<QRValidationResponse | null> => {
  try {
    const response = await api.get(`/scan/${eventId}/${scanCode}`);
    return response.data;
  } catch (error) {
    console.error(`Error scanning QR code for event ${eventId}:`, error);
    return null;
  }
};

export const unscanQRCode = async (eventId: string, scanCode: string): Promise<QRValidationResponse | null> => {
  try {
    const response = await api.get(`/scan/${eventId}/${scanCode}?unscan=1`);
    return response.data;
  } catch (error) {
    console.error(`Error unscanning QR code for event ${eventId}:`, error);
    return null;
  }
};

export default api; 