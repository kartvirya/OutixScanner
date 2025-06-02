import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeType = 'light' | 'dark';

// Define theme colors
export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  border: string;
  notification: string;
  success: string;
  warning: string;
  error: string;
}

// Define light and dark theme color palettes
const lightColors: ThemeColors = {
  primary: '#FF6B00',
  secondary: '#8E8E93',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#000000',
  border: '#C6C6C8',
  notification: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
};

const darkColors: ThemeColors = {
  primary: '#FF6B00',
  secondary: '#8E8E93',
  background: '#000000',
  surface: '#1C1C1E',
  card: '#2C2C2E',
  text: '#FFFFFF',
  border: '#38383A',
  notification: '#FF453A',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
};

// Define theme context interface
interface ThemeContextType {
  theme: ThemeType;
  colors: ThemeColors;
  isDarkMode: boolean;
  toggleTheme: () => void;
  // Event context
  selectedEventId: string | null;
  setSelectedEventId: (eventId: string) => void;
  selectedEventName: string | null;
  setSelectedEventName: (eventName: string) => void;
}

// Create the context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Create provider component
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<ThemeType>('light');
  const [selectedEventId, setSelectedEventId] = useState<string | null>('77809'); // Default to event 77809
  const [selectedEventName, setSelectedEventName] = useState<string | null>(null);

  // In-memory storage as AsyncStorage fallback
  const memoryStorage = React.useRef(new Map<string, string>()).current;

  // Enhanced AsyncStorage access with fallback
  const getStorageValue = async (key: string, defaultValue: string): Promise<string> => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        // Cache in memory for future use
        memoryStorage.set(key, value);
        return value;
      }
    } catch (error) {
      console.error('Error reading from AsyncStorage:', error);
      // Try getting from memory fallback
      const memValue = memoryStorage.get(key);
      if (memValue) return memValue;
    }
    return defaultValue;
  };

  const setStorageValue = async (key: string, value: string): Promise<void> => {
    // Always update memory storage
    memoryStorage.set(key, value);
    
    // Try AsyncStorage, but don't fail if it doesn't work
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error saving to AsyncStorage:', error);
      // Continue with in-memory storage only
    }
  };

  // Load theme preference from storage on initial render
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await getStorageValue('theme', 'light');
        setTheme(savedTheme as ThemeType);
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };

    const loadSelectedEvent = async () => {
      try {
        const savedEventId = await getStorageValue('selectedEventId', '77809');
        const savedEventName = await getStorageValue('selectedEventName', '');
        setSelectedEventId(savedEventId);
        if (savedEventName) {
          setSelectedEventName(savedEventName);
        }
      } catch (error) {
        console.error('Error loading selected event:', error);
      }
    };

    loadTheme();
    loadSelectedEvent();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Save theme preference to storage
    setStorageValue('theme', newTheme);
  };

  const updateSelectedEventId = async (eventId: string) => {
    setSelectedEventId(eventId);
    try {
      await setStorageValue('selectedEventId', eventId);
    } catch (error) {
      console.error('Error saving selected event ID:', error);
    }
  };

  const updateSelectedEventName = async (eventName: string) => {
    setSelectedEventName(eventName);
    try {
      await setStorageValue('selectedEventName', eventName);
    } catch (error) {
      console.error('Error saving selected event name:', error);
    }
  };

  const colors = theme === 'light' ? lightColors : darkColors;
  const isDarkMode = theme === 'dark';

  return (
    <ThemeContext.Provider value={{
      theme,
      colors,
      isDarkMode,
      toggleTheme,
      selectedEventId,
      setSelectedEventId: updateSelectedEventId,
      selectedEventName,
      setSelectedEventName: updateSelectedEventName,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Create custom hook for easier context usage
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 