import React, { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { login, isAuthenticated } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useStorage } from "../context/StorageContext";

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
        
        console.log('User not authenticated, attempting login...');
        
        // If not authenticated, attempt to login
        const token = await login();
        
        // If we have a token now, user is authenticated
        if (token) {
          console.log('Login successful, user authenticated');
          // Store token securely
          await setItem('auth_token', token);
          setIsAuthed(true);
        } else {
          console.log('Login failed, redirecting to login page');
          // No token, redirect to login
          setIsAuthed(false);
        }
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.text, { color: colors.text }]}>Connecting to OutixScan...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <Text style={[styles.text, { color: colors.text }]}>Redirecting to login...</Text>
      </View>
    );
  }

  // Redirect based on authentication status
  return isAuthed ? <Redirect href="/(tabs)" /> : <Redirect href="/auth/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
