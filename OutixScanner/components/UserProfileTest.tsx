import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getUserProfile, login, UserProfile, getStorageItem, removeStorageItem } from '../services/api';

export default function UserProfileTest() {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testGetProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Testing getUserProfile...');
      const userProfile = await getUserProfile();
      console.log('Got user profile:', userProfile);
      setProfile(userProfile);
      Alert.alert('Success', `Profile loaded: ${userProfile.name}`);
    } catch (err: any) {
      console.error('Profile test error:', err);
      setError(err.message || 'Failed to get profile');
      Alert.alert('Error', err.message || 'Failed to get profile');
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Testing login...');
      const token = await login();
      console.log('Got token:', token ? 'Token received' : 'No token');
      if (token) {
        Alert.alert('Login Success', 'Login successful, now test profile');
      } else {
        Alert.alert('Login Failed', 'No token received');
      }
    } catch (err: any) {
      console.error('Login test error:', err);
      setError(err.message || 'Login failed');
      Alert.alert('Error', err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const clearProfile = () => {
    setProfile(null);
    setError(null);
  };

  const clearStorage = async () => {
    setLoading(true);
    try {
      await removeStorageItem('auth_token');
      await removeStorageItem('user_profile');
      console.log('Storage cleared successfully');
      Alert.alert('Storage Cleared', 'All stored data has been cleared. Now try login again.');
    } catch (err: any) {
      console.error('Error clearing storage:', err);
      Alert.alert('Error', 'Failed to clear storage');
    } finally {
      setLoading(false);
    }
  };

  const testStorageContents = async () => {
    try {
      const authToken = await getStorageItem('auth_token');
      const userProfile = await getStorageItem('user_profile');
      
      console.log('Auth token in storage:', authToken ? 'EXISTS' : 'NOT FOUND');
      console.log('User profile in storage:', userProfile ? 'EXISTS' : 'NOT FOUND');
      
      if (userProfile) {
        console.log('Stored user profile data:', userProfile);
      }
      
      Alert.alert(
        'Storage Contents',
        `Auth Token: ${authToken ? 'Found' : 'Not found'}\n` +
        `User Profile: ${userProfile ? 'Found' : 'Not found'}\n\n` +
        `Check console for details.`
      );
    } catch (err: any) {
      console.error('Error checking storage:', err);
      Alert.alert('Error', 'Failed to check storage');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>User Profile Test</Text>
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
          </View>
        )}

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: '#ffebee' }]}>
            <Text style={[styles.errorText, { color: '#c62828' }]}>Error: {error}</Text>
          </View>
        )}

        {profile && (
          <View style={[styles.profileContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.profileTitle, { color: colors.text }]}>Profile Data:</Text>
            <Text style={[styles.profileText, { color: colors.text }]}>ID: {profile.id || 'N/A'}</Text>
            <Text style={[styles.profileText, { color: colors.text }]}>Name: {profile.name}</Text>
            <Text style={[styles.profileText, { color: colors.text }]}>Email: {profile.email}</Text>
            <Text style={[styles.profileText, { color: colors.text }]}>Role: {profile.role}</Text>
            <Text style={[styles.profileText, { color: colors.text }]}>Events Created: {profile.eventsCreated}</Text>
            <Text style={[styles.profileText, { color: colors.text }]}>Events Attended: {profile.eventsAttended}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={testLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Test Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.secondary }]}
            onPress={testGetProfile}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Test Get Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#6c757d' }]}
            onPress={clearProfile}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#6c757d' }]}
            onPress={clearStorage}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Clear Storage</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#6c757d' }]}
            onPress={testStorageContents}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Test Storage Contents</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  profileContainer: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.3)',
  },
  profileTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  profileText: {
    fontSize: 14,
    marginBottom: 4,
  },
  buttonContainer: {
    marginTop: 16,
    gap: 12,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 