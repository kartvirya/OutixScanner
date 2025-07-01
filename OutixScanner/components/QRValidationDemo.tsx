import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getGroupTickets, scanGroupTickets, scanQRCode, unscanGroupTickets, unscanQRCode, validateQRCode } from '../services/api';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

const QRValidationDemo: React.FC = () => {
  const { colors } = useTheme();
  const [eventId, setEventId] = useState('145'); // Default event ID for The Bend 500
  const [scanCode, setScanCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  // Test ticket identifiers from the provided tickets
  const testTickets = [
    '120650044ARUME5E',   // Ticket 1
    '12065004TYLEMERE',   // Ticket 2  
    '12065004NEBA6ESU'    // Ticket 3 (CORRECTED)
  ];

  const logResult = (operation: string, result: TestResult) => {
    const timestamp = new Date().toLocaleTimeString();
    const status = result.success ? '✅' : '❌';
    const message = `[${timestamp}] ${status} ${operation}: ${result.message}`;
    
    console.log(message);
    if (result.details) {
      console.log('Details:', JSON.stringify(result.details, null, 2));
    }
    
    setLastResult(message + (result.details ? '\nDetails: ' + JSON.stringify(result.details, null, 2) : ''));
  };

  const validateTicket = async (ticketId: string): Promise<TestResult> => {
    try {
      const result = await validateQRCode(eventId, ticketId);
      if (result) {
        return {
          success: !result.error,
          message: typeof result.msg === 'string' ? result.msg : result.msg.message,
          details: result
        };
      }
      return { success: false, message: 'No response from validation API' };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Validation failed' 
      };
    }
  };

  const scanTicket = async (ticketId: string): Promise<TestResult> => {
    try {
      const result = await scanQRCode(eventId, ticketId);
      if (result) {
        return {
          success: !result.error,
          message: typeof result.msg === 'string' ? result.msg : result.msg.message,
          details: result
        };
      }
      return { success: false, message: 'No response from scan API' };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Scan failed' 
      };
    }
  };

  const unscanTicket = async (ticketId: string): Promise<TestResult> => {
    try {
      const result = await unscanQRCode(eventId, ticketId);
      if (result) {
        return {
          success: !result.error,
          message: typeof result.msg === 'string' ? result.msg : result.msg.message,
          details: result
        };
      }
      return { success: false, message: 'No response from unscan API' };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unscan failed' 
      };
    }
  };

  const testGroupTickets = async (): Promise<TestResult> => {
    try {
      const firstTicket = testTickets[0];
      const result = await getGroupTickets(eventId, firstTicket);
      
      if (result.error) {
        return {
          success: false,
          message: result.msg || 'Group tickets fetch failed',
          details: result
        };
      }

      return {
        success: true,
        message: `Found ${result.tickets?.length || 0} tickets in group`,
        details: result
      };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Group tickets test failed' 
      };
    }
  };

  const runComprehensiveTest = async () => {
    setIsLoading(true);
    setLastResult('Starting comprehensive test...\n');
    
    try {
      // Test 1: Validate all tickets
      console.log('\n=== VALIDATION TESTS ===');
      for (let i = 0; i < testTickets.length; i++) {
        const ticket = testTickets[i];
        const result = await validateTicket(ticket);
        logResult(`Validate Ticket ${i + 1} (${ticket})`, result);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between requests
      }

      // Test 2: Group ticket detection
      console.log('\n=== GROUP TICKET TEST ===');
      const groupResult = await testGroupTickets();
      logResult('Group Tickets', groupResult);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test 3: Individual check-ins
      console.log('\n=== CHECK-IN TESTS ===');
      for (let i = 0; i < testTickets.length; i++) {
        const ticket = testTickets[i];
        const result = await scanTicket(ticket);
        logResult(`Check-in Ticket ${i + 1} (${ticket})`, result);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Test 4: Try to check in already checked tickets (should fail)
      console.log('\n=== DUPLICATE CHECK-IN TESTS ===');
      for (let i = 0; i < testTickets.length; i++) {
        const ticket = testTickets[i];
        const result = await scanTicket(ticket);
        logResult(`Duplicate Check-in Ticket ${i + 1} (${ticket})`, result);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Test 5: Check-outs
      console.log('\n=== CHECK-OUT TESTS ===');
      for (let i = 0; i < testTickets.length; i++) {
        const ticket = testTickets[i];
        const result = await unscanTicket(ticket);
        logResult(`Check-out Ticket ${i + 1} (${ticket})`, result);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Test 6: Try to check out already checked out tickets (should fail)
      console.log('\n=== DUPLICATE CHECK-OUT TESTS ===');
      for (let i = 0; i < testTickets.length; i++) {
        const ticket = testTickets[i];
        const result = await unscanTicket(ticket);
        logResult(`Duplicate Check-out Ticket ${i + 1} (${ticket})`, result);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Test 7: Group scanning (check-in all at once)
      console.log('\n=== GROUP SCAN TESTS ===');
      try {
        const groupScanResult = await scanGroupTickets(eventId, testTickets);
        logResult('Group Check-in', {
          success: !groupScanResult.error,
          message: groupScanResult.msg || 'Group scan completed',
          details: groupScanResult
        });
      } catch (error) {
        logResult('Group Check-in', {
          success: false,
          message: error instanceof Error ? error.message : 'Group scan failed'
        });
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test 8: Group unscan (check-out all at once)
      try {
        const groupUnscanResult = await unscanGroupTickets(eventId, testTickets);
        logResult('Group Check-out', {
          success: !groupUnscanResult.error,
          message: groupUnscanResult.msg || 'Group unscan completed',
          details: groupUnscanResult
        });
      } catch (error) {
        logResult('Group Check-out', {
          success: false,
          message: error instanceof Error ? error.message : 'Group unscan failed'
        });
      }

      console.log('\n=== TEST COMPLETED ===');
      Alert.alert('Test Completed', 'Check console logs for detailed results');

    } catch (error) {
      console.error('Test suite error:', error);
      Alert.alert('Test Error', error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const runSingleTicketTest = async () => {
    if (!scanCode.trim()) {
      Alert.alert('Error', 'Please enter a scan code');
      return;
    }

    setIsLoading(true);
    
    try {
      // Test sequence: Validate -> Scan -> Unscan
      const validateResult = await validateTicket(scanCode.trim());
      logResult(`Validate ${scanCode}`, validateResult);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const scanResult = await scanTicket(scanCode.trim());
      logResult(`Scan ${scanCode}`, scanResult);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const unscanResult = await unscanTicket(scanCode.trim());
      logResult(`Unscan ${scanCode}`, unscanResult);
      
    } catch (error) {
      console.error('Single ticket test error:', error);
      Alert.alert('Test Error', error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>QR Code Ticket Testing</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Event ID"
            value={eventId}
            onChangeText={setEventId}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Scan Code (for single test)"
            value={scanCode}
            onChangeText={setScanCode}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Tickets</Text>
          {testTickets.map((ticket, index) => (
            <Text key={ticket} style={[styles.ticketText, { color: colors.text }]}>
              Ticket {index + 1}: {ticket}
            </Text>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }, isLoading && styles.disabled]}
            onPress={runComprehensiveTest}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              {isLoading ? 'Testing...' : 'Run Full Test Suite'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { backgroundColor: '#28a745' }, isLoading && styles.disabled]}
            onPress={runSingleTicketTest}
            disabled={isLoading || !scanCode.trim()}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Test Single Ticket</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Last Result</Text>
        <ScrollView style={[styles.resultContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.resultText, { color: colors.text }]}>{lastResult}</Text>
        </ScrollView>
      </View>
    </ScrollView>
  );
};

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
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  ticketText: {
    fontSize: 14,
    marginBottom: 5,
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
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    maxHeight: 300,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
});

export default QRValidationDemo; 