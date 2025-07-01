import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { scanQRCode, unscanQRCode, validateQRCode } from '../services/api';

const TicketTestComponent: React.FC = () => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  // Test ticket identifiers from the provided tickets
  const testTickets = [
    { id: '120650044ARUME5E', name: 'Ticket 1 (Valid)', status: 'valid' },
    { id: '12065004TYLEMERE', name: 'Ticket 2 (Valid)', status: 'valid' },
    { id: '120650004NEBAGESU', name: 'Ticket 3 (Invalid)', status: 'invalid' },
  ];

  const eventId = '145'; // The Bend 500 event ID

  const addResult = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setResults(prev => [logEntry, ...prev].slice(0, 10)); // Keep last 10 results
    console.log(logEntry);
  };

  const testTicket = async (ticketId: string, ticketName: string) => {
    setIsLoading(true);
    addResult(`🧪 Testing ${ticketName}: ${ticketId}`);

    try {
      // Step 1: Validate
      const validationResult = await validateQRCode(eventId, ticketId);
      if (validationResult?.error) {
        addResult(`❌ Validation failed: ${validationResult.msg}`);
      } else {
        const guestName = validationResult?.msg?.info?.fullname || 'Unknown';
        addResult(`✅ Validation success: ${guestName}`);
        
        // Step 2: Try scan (check-in)
        try {
          const scanResult = await scanQRCode(eventId, ticketId);
          if (scanResult?.error) {
            addResult(`⚠️ Scan failed: ${scanResult.msg}`);
          } else {
            addResult(`✅ Check-in success: ${scanResult.msg}`);
            
            // Step 3: Try unscan (check-out)
            setTimeout(async () => {
              try {
                const unscanResult = await unscanQRCode(eventId, ticketId);
                if (unscanResult?.error) {
                  addResult(`⚠️ Check-out failed: ${unscanResult.msg}`);
                } else {
                  addResult(`✅ Check-out success: ${unscanResult.msg}`);
                }
              } catch (error) {
                addResult(`❌ Check-out error: ${error}`);
              }
            }, 1000);
          }
        } catch (error) {
          addResult(`❌ Scan error: ${error}`);
        }
      }
    } catch (error) {
      addResult(`❌ Test error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testAllTickets = async () => {
    setIsLoading(true);
    setResults([]);
    addResult('🚀 Starting comprehensive test...');

    for (const ticket of testTickets) {
      await testTicket(ticket.id, ticket.name);
      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    addResult('🎉 All tests completed!');
    setIsLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>Ticket Testing</Text>
        <Text style={[styles.subtitle, { color: colors.secondary }]}>
          Event ID: {eventId}
        </Text>

        <View style={styles.ticketsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Test Tickets:</Text>
          {testTickets.map((ticket, index) => (
            <View key={ticket.id} style={styles.ticketRow}>
              <View style={styles.ticketInfo}>
                <Text style={[styles.ticketName, { color: colors.text }]}>
                  {ticket.name}
                </Text>
                <Text style={[styles.ticketId, { color: colors.secondary }]}>
                  {ticket.id}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.testButton,
                  { backgroundColor: ticket.status === 'valid' ? colors.primary : '#dc3545' },
                  isLoading && styles.disabled
                ]}
                onPress={() => testTicket(ticket.id, ticket.name)}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>Test</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, isLoading && styles.disabled]}
            onPress={testAllTickets}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Testing...' : 'Test All Tickets'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#6c757d' }]}
            onPress={clearResults}
          >
            <Text style={styles.buttonText}>Clear Results</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.resultsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Results:</Text>
          <ScrollView style={[styles.resultsList, { backgroundColor: colors.background }]}>
            {results.length === 0 ? (
              <Text style={[styles.noResults, { color: colors.secondary }]}>
                No test results yet. Run a test to see results here.
              </Text>
            ) : (
              results.map((result, index) => (
                <Text key={index} style={[styles.resultText, { color: colors.text }]}>
                  {result}
                </Text>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  ticketsContainer: {
    marginBottom: 20,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    fontSize: 14,
    fontWeight: '500',
  },
  ticketId: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  testButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsList: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  noResults: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default TicketTestComponent; 