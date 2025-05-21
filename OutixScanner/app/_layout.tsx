import React, { useEffect, useCallback } from "react";
import { Stack } from "expo-router";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { StorageProvider } from "../context/StorageContext";
import { StatusBar, View } from "react-native";
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

// StatusBar component that changes with theme
function ThemedStatusBar() {
  const { isDarkMode } = useTheme();
  return <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />;
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
      } finally {
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
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <StorageProvider>
        <ThemeProvider>
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
        </ThemeProvider>
      </StorageProvider>
    </View>
  );
}

// Add Expo configuration
export const expo = {
  name: "OutixScanner",
  slug: "outixscanner",
  plugins: [
    [
      "expo-barcode-scanner",
      {
        "cameraPermission": "Allow OutixScanner to access your camera to scan QR codes."
      }
    ]
  ]
};
