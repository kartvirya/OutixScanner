import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { Amplify } from 'aws-amplify';
import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect } from "react";
import { StatusBar, View } from "react-native";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import awsconfig from '../aws-exports';
import { RefreshProvider } from "../context/RefreshContext";
import { StorageProvider } from "../context/StorageContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";

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

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  // Load any resources or fonts needed
  useEffect(() => {
    async function loadResourcesAndDataAsync() {
      try {
        // Configure AWS Amplify
        Amplify.configure(awsconfig);
        
        // Push notifications removed
        
        console.log('AWS Amplify initialized');
        
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
