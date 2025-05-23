import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { validateQRCode, scanQRCode, unscanQRCode, QRValidationResponse } from '../services/api';

interface QRValidationDemoProps {
  eventId: string;
}

export default function QRValidationDemo({ eventId }: QRValidationDemoProps) {
  const { colors } = useTheme();
  const [scanCode, setScanCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<QRValidationResponse | null>(null);

  const handleValidate = async () => {
    if (!scanCode.trim()) {
      Alert.alert('Error', 'Please enter a scan code');
      return;
    }

    setLoading(true);
    try {
      const result = await validateQRCode(eventId, scanCode.trim());
      setLastResult(result);
      
      if (result) {
        if (result.error) {
          Alert.alert('Validation Failed', result.msg?.message || 'Invalid QR code');
        } else {
          Alert.alert('Validation Success', `Valid ticket for ${result.msg.info.fullname}`);
        }
      } else {
        Alert.alert('Error', 'Failed to validate QR code');
      }
    } catch (error) {
      console.error('Validation error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    if (!scanCode.trim()) {
      Alert.alert('Error', 'Please enter a scan code');
      return;
    }

    setLoading(true);
    try {
      const result = await scanQRCode(eventId, scanCode.trim());
      setLastResult(result);
      
      if (result) {
        if (result.error) {
          Alert.alert('Scan Failed', result.msg?.message || 'Failed to scan QR code');
        } else {
          Alert.alert('Scan Success', `${result.msg.info.fullname} has been admitted`);
        }
      } else {
        Alert.alert('Error', 'Failed to scan QR code');
      }
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUnscan = async () => {
    if (!scanCode.trim()) {
      Alert.alert('Error', 'Please enter a scan code');
      return;
    }

    setLoading(true);
    try {
      const result = await unscanQRCode(eventId, scanCode.trim());
      setLastResult(result);
      
      if (result) {
        if (result.error) {
          Alert.alert('Unscan Failed', result.msg?.message || 'Failed to unscan QR code');
        } else {
          Alert.alert('Unscan Success', `${result.msg.info.fullname} has been un-admitted`);
        }
      } else {
        Alert.alert('Error', 'Failed to unscan QR code');
      }
    } catch (error) {
      console.error('Unscan error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>QR Code Validation Demo</Text>
        
        <Text style={[styles.label, { color: colors.text }]}>Event ID: {eventId}</Text>
        
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          placeholder="Enter scan code"
          placeholderTextColor={colors.secondary}
          value={scanCode}
          onChangeText={setScanCode}
          editable={!loading}
        />
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && styles.disabled]}
            onPress={handleValidate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Validate</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#28a745' }, loading && styles.disabled]}
            onPress={handleScan}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Scan</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#dc3545' }, loading && styles.disabled]}
            onPress={handleUnscan}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Unscan</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {lastResult && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>Last Result</Text>
          <Text style={[styles.resultText, { color: lastResult.error ? '#dc3545' : '#28a745' }]}>
            {lastResult.error ? 'ERROR' : 'SUCCESS'}
          </Text>
          <Text style={[styles.message, { color: colors.text }]}>
            {lastResult.msg?.message || 'No message'}
          </Text>
          
          {!lastResult.error && lastResult.msg?.info && (
            <View style={styles.infoContainer}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>Ticket Information:</Text>
              <Text style={[styles.infoText, { color: colors.secondary }]}>
                Name: {lastResult.msg.info.fullname}
              </Text>
              <Text style={[styles.infoText, { color: colors.secondary }]}>
                Email: {lastResult.msg.info.email}
              </Text>
              <Text style={[styles.infoText, { color: colors.secondary }]}>
                Ticket: {lastResult.msg.info.ticket_title}
              </Text>
              <Text style={[styles.infoText, { color: colors.secondary }]}>
                Admits: {lastResult.msg.info.available}/{lastResult.msg.info.admits}
              </Text>
              <Text style={[styles.infoText, { color: colors.secondary }]}>
                Price: ${lastResult.msg.info.price}
              </Text>
              <Text style={[styles.infoText, { color: colors.secondary }]}>
                Checked In: {lastResult.msg.info.checkedin ? 'Yes' : 'No'}
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    marginBottom: 12,
  },
  infoContainer: {
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
}); 