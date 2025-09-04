import { router, useLocalSearchParams } from 'expo-router';
import { Check, LogIn, Square, UserCheck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRefresh } from '../../context/RefreshContext';
import { useTheme } from '../../context/ThemeContext';
import { scanGroupTickets, scanQRCode, unscanGroupTickets, unscanQRCode } from '../../services/api';
import { feedback } from '../../services/feedback';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface GroupTicket {
  id: string;
  name: string;
  email: string;
  ticketType: string;
  ticketIdentifier: string;
  isCheckedIn: boolean;
  qrCode: string;
}

interface Purchaser {
  email: string;
  name: string;
  bookingId: string;
}

export default function TicketActionScreen() {
  const { colors, isDark } = useTheme();
  const { triggerGuestListRefresh, triggerAttendanceRefresh, triggerAnalyticsRefresh } = useRefresh();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  // Parse URL parameters
  const eventId = params.eventId as string;
  const scanMode = params.scanMode as 'scan-in' | 'scan-out';
  const tickets = params.tickets ? JSON.parse(params.tickets as string) as GroupTicket[] : [];
  const purchaser = params.purchaser ? JSON.parse(params.purchaser as string) as Purchaser : null;
  const singleTicketId = params.singleTicketId as string;
  const scannedTicketId = params.scannedTicketId as string;

  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize selected tickets
  useEffect(() => {
    console.log('🎯 Selection useEffect triggered:', {
      singleTicketId,
      scannedTicketId,
      ticketsCount: tickets.length,
      ticketIds: tickets.map(t => t.id)
    });
    
    if (singleTicketId) {
      // Single ticket flow - pre-select the single ticket
      console.log('Setting single ticket selection:', singleTicketId);
      setSelectedTickets(new Set([singleTicketId]));
    } else if (scannedTicketId && tickets.length > 0) {
      // Group flow - pre-select ONLY the scanned ticket
      const scannedTicket = tickets.find(ticket => 
        ticket.qrCode === scannedTicketId || 
        ticket.ticketIdentifier === scannedTicketId || 
        ticket.id === scannedTicketId
      );
      if (scannedTicket) {
        console.log('🎯 Pre-selecting ONLY scanned ticket:', scannedTicket.id);
        setSelectedTickets(new Set([scannedTicket.id]));
      } else {
        console.log('❌ Scanned ticket not found in group, no pre-selection');
        console.log('Available tickets:', tickets.map(t => ({id: t.id, qrCode: t.qrCode, ticketIdentifier: t.ticketIdentifier})));
        setSelectedTickets(new Set());
      }
    } else {
      // No pre-selection for other cases
      console.log('🔄 No pre-selection - clearing selection');
      setSelectedTickets(new Set());
    }
  }, [singleTicketId, scannedTicketId, tickets.length]);

  const handleTicketSelect = (ticketId: string) => {
    const newSelection = new Set(selectedTickets);
    if (newSelection.has(ticketId)) {
      newSelection.delete(ticketId);
    } else {
      newSelection.add(ticketId);
    }
    setSelectedTickets(newSelection);
  };

  const handleConfirm = async () => {
    if (selectedTickets.size === 0) {
      Alert.alert('No Tickets Selected', 'Please select at least one ticket.');
      return;
    }

    setIsProcessing(true);
    try {
      const selectedTicketsList = Array.from(selectedTickets);
      const isGroup = selectedTicketsList.length > 1;

      let result;
      
      if (isGroup) {
        // Handle group scan - response has 'success' property
        result = await (scanMode === 'scan-in' ? scanGroupTickets : unscanGroupTickets)(
          eventId,
          selectedTicketsList
        );

        if (!result || result.error || (result.hasOwnProperty('success') && !result.success)) {
          feedback.error();
          const errorMsg = result?.msg;
          const errorText = typeof errorMsg === 'string' ? errorMsg : (errorMsg?.message || 'Failed to process group tickets');
          Alert.alert('Error', errorText);
          return;
        }
      } else {
        // Handle single ticket - response does NOT have 'success' property
        const ticketId = selectedTicketsList[0];
        result = await (scanMode === 'scan-in' ? scanQRCode : unscanQRCode)(
          eventId,
          ticketId
        );

        if (!result || result.error) {
          feedback.error();
          const errorMsg = result?.msg;
          const errorText = typeof errorMsg === 'string' ? errorMsg : (errorMsg?.message || 'Failed to process ticket');
          Alert.alert('Error', errorText);
          return;
        }
      }

      feedback.success();
      triggerGuestListRefresh(eventId);
      triggerAttendanceRefresh(eventId);
      triggerAnalyticsRefresh();

      // Show brief success message then auto-navigate back
      Alert.alert(
        '✅ Success',
        `Successfully ${scanMode === 'scan-in' ? 'checked in' : 'checked out'} ${selectedTickets.size} ticket(s)`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Return to scanner
              router.push('/(tabs)/scanner');
            },
          },
        ]
      );

      // Auto-navigate back after 1.5 seconds
      setTimeout(() => {
        router.push('/(tabs)/scanner');
      }, 1500);
    } catch (error) {
      console.error('Error processing tickets:', error);
      feedback.error();
      Alert.alert('Error', 'Failed to process tickets. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    router.push('/(tabs)/scanner');
  };

  const isSmallScreen = screenHeight < 700;
  const isVerySmallScreen = screenHeight < 600;
  const FOOTER_HEIGHT = isVerySmallScreen ? 64 : 72;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[
        styles.header,
        { 
          borderBottomColor: colors.border,
          paddingTop: Math.max(insets.top, 8),
          minHeight: isVerySmallScreen ? 70 : 80
        }
      ]}>
        {/* Action buttons placed above the title */}
        <View style={styles.headerButtonsRow}>
          <TouchableOpacity
            style={[
              styles.headerButton,
              { backgroundColor: isDark ? '#3A3A3C' : '#e0e0e0' }
            ]}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={[styles.headerButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.headerButton,
              { backgroundColor: colors.primary, opacity: selectedTickets.size === 0 ? 0.5 : 1 }
            ]}
            onPress={handleConfirm}
            disabled={selectedTickets.size === 0 || isProcessing}
            activeOpacity={0.7}
          >
            {isProcessing ? (
              <Text style={[styles.headerButtonText, { color: '#FFFFFF' }]}>
                Processing...
              </Text>
            ) : (
              <View style={styles.buttonContent}>
                {scanMode === 'scan-in' ? (
                  <LogIn size={isSmallScreen ? 18 : 20} color="#FFFFFF" />
                ) : (
                  <UserCheck size={isSmallScreen ? 18 : 20} color="#FFFFFF" />
                )}
                <Text style={[styles.headerButtonText, { color: '#FFFFFF' }]}>
                  {scanMode === 'scan-in' ? 'Check In' : 'Check Out'}
                  {selectedTickets.size > 0 && ` (${selectedTickets.size})`}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <Text style={[
          styles.headerTitle, 
          { 
            color: colors.text,
            fontSize: isSmallScreen ? 20 : 24
          }
        ]}>
{scanMode === 'scan-in' ? 'Check In' : 'Check Out'} Tickets
        </Text>
        <Text style={[
          styles.subTitle, 
          { 
            color: colors.text,
            fontSize: isSmallScreen ? 14 : 16
          }
        ]}>
{purchaser?.name ? `${purchaser.name}'s Group - Select tickets to process` : 'Select tickets to process'}
        </Text>
      </View>

      <ScrollView
        style={styles.ticketList}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: Math.max(insets?.bottom || 0, 20) + 40,
          paddingHorizontal: 4
        }}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        {tickets.map((ticket) => (
          <TouchableOpacity
            key={ticket.id}
            style={[
              styles.ticketItem,
              {
                backgroundColor: selectedTickets.has(ticket.id)
                  ? colors.primary
                  : colors.card,
                minHeight: isVerySmallScreen ? 65 : 75,
                marginBottom: isSmallScreen ? 8 : 12,
              },
            ]}
            onPress={() => handleTicketSelect(ticket.id)}
            activeOpacity={0.7}
          >
            <View style={styles.ticketInfo}>
              <Text
                style={[
                  styles.ticketName,
                  {
                    color: selectedTickets.has(ticket.id)
                      ? colors.background
                      : colors.text,
                    fontSize: isSmallScreen ? 15 : 16,
                  },
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {ticket.name}
              </Text>
              <Text
                style={[
                  styles.ticketType,
                  {
                    color: selectedTickets.has(ticket.id)
                      ? colors.background
                      : colors.text,
                    fontSize: isSmallScreen ? 12 : 14,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {ticket.ticketType}
              </Text>
            </View>
            <View style={styles.checkboxContainer}>
              {selectedTickets.has(ticket.id) ? (
                <Check
                  size={isSmallScreen ? 20 : 24}
                  color={colors.background}
                />
              ) : (
                <Square
                  size={isSmallScreen ? 20 : 24}
                  color={colors.text}
                />
              )}
            </View>
          </TouchableOpacity>
        ))}
        
        {/* Add some extra space if tickets list is short */}
        {tickets.length < 3 && (
          <View style={{ minHeight: 200 }} />
        )}
      </ScrollView>

      {/* Footer removed since actions are now in header */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 8,
  },
  headerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  headerButtonText: {
    fontWeight: '700',
  },
  headerTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subTitle: {
    opacity: 0.7,
    marginBottom: 4,
  },
  ticketList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  ticketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketInfo: {
    flex: 1,
    marginRight: 12,
  },
  ticketName: {
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  ticketType: {
    opacity: 0.7,
    lineHeight: 18,
  },
  checkboxContainer: {
    padding: 4,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'stretch',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  cancelButton: {
    // Additional cancel button styles if needed
  },
  confirmButton: {
    // Additional confirm button styles if needed
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  cancelButtonText: {
    // Cancel button text color is set dynamically
  },
  confirmButtonText: {
    color: 'white',
    marginLeft: 8,
  },
});