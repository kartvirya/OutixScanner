import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useState } from "react";
import { StatusBar, View } from "react-native";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { RefreshProvider } from "../context/RefreshContext";
import { StorageProvider } from "../context/StorageContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { isAuthenticatedSync, onAuthChange, restoreSession } from "../services/api";

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

// StatusBar component that changes with theme
function ThemedStatusBar() {
  const { isDark } = useTheme();
  return (
    <StatusBar 
      barStyle={isDark ? "light-content" : "dark-content"}
      backgroundColor="transparent"
      translucent={true}
    />
  );
}

// Component that handles authentication state
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const isCheckingRef = React.useRef(false);
  const lastCheckRef = React.useRef<number>(0);

  const checkAuthState = async () => {
    try {
      // Prevent duplicate checks within a short window or while in-flight
      const now = Date.now();
      if (isCheckingRef.current || (now - lastCheckRef.current) < 2500) {
        return;
      }
      isCheckingRef.current = true;
      console.log('Checking authentication state...');
      
      // First check if we have a token in memory
      if (isAuthenticatedSync()) {
        console.log('Token found in memory, user is authenticated');
        setIsAuthenticated(true);
        return;
      }

      // Try to restore session from storage with validation
      const sessionRestored = await restoreSession();
      if (sessionRestored) {
        console.log('Session restored from storage with valid token');
        setIsAuthenticated(true);
      } else {
        console.log('No valid session found, user needs to login');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setIsAuthenticated(false);
    } finally {
      lastCheckRef.current = Date.now();
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    checkAuthState();
    // Subscribe to auth state events (logout/login)
    const unsubscribe = onAuthChange((authed) => {
      setIsAuthenticated(authed);
    });
    return () => {
      try { unsubscribe && unsubscribe(); } catch {}
    };
  }, []);

  // Recheck only when we are unauthenticated and navigation changes (avoid duplicate token validation)
  useEffect(() => {
    if (isAuthenticated === false) {
      console.log('Navigation changed, rechecking authentication...');
      checkAuthState();
    }
  }, [segments, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated === null) {
      // Still checking authentication
      return;
    }

    const inAuthGroup = segments[0] === 'auth';
    
    if (isAuthenticated && inAuthGroup) {
      // User is authenticated but in auth screens, redirect to main app
      console.log('User authenticated, redirecting to main app');
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthGroup) {
      // User is not authenticated but not in auth screens, redirect to login
      console.log('User not authenticated, redirecting to login');
      router.replace('/auth/login');
    }
  }, [isAuthenticated, segments]);

  // Don't render anything while checking authentication
  if (isAuthenticated === null) {
    return null;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  // Load any resources or fonts needed
  useEffect(() => {
    async function loadResourcesAndDataAsync() {
      try {
        // Load fonts if needed, but Lucide doesn't require extra fonts
        setFontsLoaded(true);
      } catch (e) {
        // We might want to provide this error information to an error reporting service
        console.warn('Error loading resources:', e);
        setFontsLoaded(true);
      }
    }

    loadResourcesAndDataAsync();
  }, []);

  // Once fonts are loaded, hide the splash screen
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <StorageProvider>
        <ThemeProvider>
          <RefreshProvider>
            <AuthProvider>
              <ThemedStatusBar />
              <Stack
                screenOptions={{
                  headerStyle: {
                    backgroundColor: '#FFFFFF', 
                  },
                  headerTintColor: '#000000',
                  headerTitleStyle: {
                    fontWeight: 'bold',
                  },
                }}
              >
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
              <Toast />
            </AuthProvider>
          </RefreshProvider>
        </ThemeProvider>
      </StorageProvider>
    </View>
    </SafeAreaProvider>
  );
}

// Add Expo configuration
export const expo = {
  name: "OutixScanner",
  slug: "outixscanner",
  plugins: []
};