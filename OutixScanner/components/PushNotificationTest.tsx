import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function PushNotificationTest() {
  const { colors } = useTheme();
  const {
    token,
    isInitialized,
    hasPermission,
    isLoading,
    requestPermissions,
    sendTokenToBackend,
  } = usePushNotifications();

  const [sendingToken, setSendingToken] = useState(false);

  const handleRequestPermissions = async () => {
    const granted = await requestPermissions();
    if (granted) {
      Alert.alert('Success', 'Push notification permissions granted!');
    } else {
      Alert.alert('Permission Denied', 'Push notification permissions were denied.');
    }
  };

  const handleSendTokenToBackend = async () => {
    if (!token) {
      Alert.alert('No Token', 'No push notification token available.');
      return;
    }

    setSendingToken(true);
    try {
      const success = await sendTokenToBackend('test-user-id');
      if (success) {
        Alert.alert('Success', 'Token sent to backend successfully!');
      } else {
        Alert.alert('Error', 'Failed to send token to backend.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send token to backend.');
    } finally {
      setSendingToken(false);
    }
  };

  const copyTokenToClipboard = () => {
    if (token) {
      // You can implement clipboard functionality here
      Alert.alert('Token Copied', 'Token copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Initializing push notifications...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Push Notification Test
        </Text>

        <View style={styles.statusContainer}>
          <Text style={[styles.statusLabel, { color: colors.text }]}>
            Initialized:
          </Text>
          <Text style={[styles.statusValue, { color: isInitialized ? colors.success : colors.error }]}>
            {isInitialized ? 'Yes' : 'No'}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <Text style={[styles.statusLabel, { color: colors.text }]}>
            Permission:
          </Text>
          <Text style={[styles.statusValue, { color: hasPermission ? colors.success : colors.error }]}>
            {hasPermission ? 'Granted' : 'Denied'}
          </Text>
        </View>

        {token && (
          <View style={styles.tokenContainer}>
            <Text style={[styles.tokenLabel, { color: colors.text }]}>
              Device Token:
            </Text>
            <Text style={[styles.tokenValue, { color: colors.secondary }]} numberOfLines={3}>
              {token}
            </Text>
            <TouchableOpacity
              style={[styles.copyButton, { backgroundColor: colors.primary }]}
              onPress={copyTokenToClipboard}
            >
              <Text style={styles.copyButtonText}>Copy Token</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {!hasPermission && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleRequestPermissions}
            >
              <Text style={styles.buttonText}>Request Permissions</Text>
            </TouchableOpacity>
          )}

          {token && (
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: sendingToken ? colors.border : colors.secondary }
              ]}
              onPress={handleSendTokenToBackend}
              disabled={sendingToken}
            >
              {sendingToken ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Send Token to Backend</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.infoContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            How to Test:
          </Text>
          <Text style={[styles.infoText, { color: colors.secondary }]}>
            1. Request permissions if not granted{'\n'}
            2. Copy the device token{'\n'}
            3. Use AWS SNS console to send a test message{'\n'}
            4. Or use your backend API to send notifications
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  tokenContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  tokenLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  tokenValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  copyButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 20,
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});


