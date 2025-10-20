import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import AppLayout from "../components/AppLayout";
import { useStorage } from "../context/StorageContext";
import { useTheme } from "../context/ThemeContext";
import { isAuthenticated, restoreSession } from "../services/api";

export default function Index() {
  const { colors } = useTheme();
  const { getItem, setItem } = useStorage();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking authentication status...');
        
        // Check if user is already authenticated
        const authenticated = await isAuthenticated();
        
        if (authenticated) {
          console.log('User is already authenticated');
          setIsAuthed(true);
          setIsLoading(false);
          return;
        }
        
        // Try restoring session from stored token
        console.log('Attempting to restore session from storage...');
        const restored = await restoreSession();
        if (restored) {
          console.log('Session restored from storage. Proceeding to app.');
          setIsAuthed(true);
          setIsLoading(false);
          return;
        }

        console.log('User not authenticated and no stored session, redirecting to login');
        setIsAuthed(false);
      } catch (err) {
        console.error("Authentication error:", err);
        setError("Failed to authenticate. Please try again.");
        setIsAuthed(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <AppLayout contentStyle={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.text, { color: colors.text }]}>Connecting to OutixScan...</Text>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout contentStyle={styles.centered}>
        <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
        <Text style={[styles.text, { color: colors.text }]}>Redirecting to login...</Text>
      </AppLayout>
    );
  }

  // Redirect based on authentication status
  return isAuthed ? <Redirect href="/(tabs)" /> : <Redirect href="/auth/login" />;
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    flex: 1,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
});
