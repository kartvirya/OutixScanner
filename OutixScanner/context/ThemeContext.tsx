import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define theme colors
export interface ThemeColors {
  background: string;
  text: string;
  primary: string;
  secondary: string;
  card: string;
  border: string;
  error: string;
  inputBackground: string;
  inputText: string;
  tabBar: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
}

// Define light and dark theme color palettes
const lightTheme: ThemeColors = {
  background: '#FFFFFF',
  text: '#000000',
  primary: '#FF6B00',
  secondary: '#777777',
  card: '#FFFFFF',
  border: '#E0E0E0',
  error: '#FF3B30',
  inputBackground: '#FFFFFF',
  inputText: '#000000',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E0E0E0',
  tabBarActive: '#FF6B00',
  tabBarInactive: '#777777',
};

const darkTheme: ThemeColors = {
  background: '#121212',
  text: '#FFFFFF',
  primary: '#FF6B00',
  secondary: '#A0A0A0',
  card: '#1E1E1E',
  border: '#333333',
  error: '#FF453A',
  inputBackground: '#2C2C2E',
  inputText: '#FFFFFF',
  tabBar: '#1C1C1E',
  tabBarBorder: '#333333',
  tabBarActive: '#FF6B00',
  tabBarInactive: '#8E8E93',
};

// Define theme context interface
interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

// Create the context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Create provider component
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  const colors = isDarkMode ? darkTheme : lightTheme;

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
    const loadThemePreference = async () => {
      try {
        const storedTheme = await getStorageValue('theme_mode', 'light');
        setIsDarkMode(storedTheme === 'dark');
      } catch (error) {
        console.error('Error loading theme preference:', error);
        // Default to light theme on error
        setIsDarkMode(false);
      } finally {
        setIsThemeLoaded(true);
      }
    };

    loadThemePreference();
  }, []);

  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    // Save theme preference to storage
    setStorageValue('theme_mode', newMode ? 'dark' : 'light')
      .catch(error => console.error('Error saving theme preference:', error));
  };

  // Show a minimal loading placeholder until theme is loaded
  if (!isThemeLoaded) {
    return (
      <>
        {/* Empty fragment as placeholder while loading */}
        {null}
      </>
    );
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
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