import React, { createContext, useState, useContext, ReactNode } from 'react';

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
  const colors = isDarkMode ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

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