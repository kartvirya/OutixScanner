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
import SuccessModal from '../../components/SuccessModal';
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
  selectcolor?: string;
}

interface Purchaser {
  email: string;
  name: string;
  bookingId: string;
}

export const options = { title: 'Ticket scan' } as const;

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
  const returnToScanner = params.returnToScanner as string; // Get the return path for navigation

  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    type: 'check-in' | 'check-out' | 'group-check-in' | 'group-check-out';
    guestName?: string;
    ticketType?: string;
    count: number;
    message?: string;
    accentColor?: string;
  } | null>(null);

  // Accent color for theming selection screen (derived from validate API selectcolor)
  const accentColor = (tickets.find(t => t.selectcolor)?.selectcolor as string | undefined) || colors.primary;
  // If a single ticket is selected, use its color for the confirm action
  const selectedAccentColor = (() => {
    if (selectedTickets.size === 1) {
      const onlyId = Array.from(selectedTickets)[0];
      const t = tickets.find(x => x.id === onlyId);
      return (t?.selectcolor as string | undefined) || accentColor;
    }
    return accentColor;
  })();

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

      // Play appropriate sound based on operation type
      if (scanMode === 'scan-in') {
        feedback.checkIn();
      } else {
        feedback.checkOut();
      }
      triggerGuestListRefresh(eventId);
      triggerAttendanceRefresh(eventId);
      triggerAnalyticsRefresh();

      // Show success modal
      const isGroupOperation = selectedTickets.size > 1;
      const firstTicket = tickets.find(t => selectedTickets.has(t.id));
      
      setSuccessData({
        type: isGroupOperation 
          ? (scanMode === 'scan-in' ? 'group-check-in' : 'group-check-out')
          : (scanMode === 'scan-in' ? 'check-in' : 'check-out'),
        guestName: firstTicket?.name,
        ticketType: firstTicket?.ticketType,
        count: selectedTickets.size,
        message: isGroupOperation 
          ? `Successfully ${scanMode === 'scan-in' ? 'checked in' : 'checked out'} ${selectedTickets.size} tickets`
          : undefined,
        accentColor: firstTicket?.selectcolor
      });
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error processing tickets:', error);
      feedback.error();
      Alert.alert('Error', 'Failed to process tickets. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    // Navigate back to scanner with proper return path
    router.push({
      pathname: '/(tabs)/scanner',
      params: returnToScanner ? { returnTo: returnToScanner } : {}
    } as any);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    // Navigate back to scanner with proper return path
    router.push({
      pathname: '/(tabs)/scanner',
      params: returnToScanner ? { returnTo: returnToScanner } : {}
    } as any);
  };

  const isSmallScreen = screenHeight < 700;
  const isVerySmallScreen = screenHeight < 600;
  const FOOTER_HEIGHT = isVerySmallScreen ? 64 : 72;
  const TAB_BAR_HEIGHT = 0; // tab bar is hidden on this screen
  const allSelected = selectedTickets.size === tickets.length && tickets.length > 0;
  const remainingToSelect = Math.max(tickets.length - selectedTickets.size, 0);
  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(tickets.map(t => t.id)));
    }
  };

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
        <Text style={[
          styles.headerTitle, 
          { 
            color: colors.text,
            fontSize: isSmallScreen ? 20 : 24
          }
        ]}>
{scanMode === 'scan-in' ? 'Check In' : 'Pass Out'} Tickets
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
      {/* Select All / Deselect All */}
      <View style={{ position: 'absolute', right: 16, top: Math.max(insets.top, 8) + 8 }}>
        <TouchableOpacity
          onPress={handleToggleSelectAll}
          activeOpacity={0.7}
          style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: isDark ? '#2C2C2E' : '#EFEFEF' }}
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>
            {allSelected ? 'Deselect All' : `Select All (${remainingToSelect})`}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.ticketList}
        contentContainerStyle={{
          paddingTop: 6,
          paddingBottom: Math.max(insets?.bottom || 0, 12) + FOOTER_HEIGHT + TAB_BAR_HEIGHT + 12,
          paddingHorizontal: 8
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
                backgroundColor: colors.card,
                borderColor: (ticket.selectcolor as string | undefined) || accentColor,
                borderWidth: selectedTickets.has(ticket.id) ? 3 : 1,
                minHeight: isVerySmallScreen ? 60 : 70,
                marginBottom: 8,
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
                    color: colors.text,
                    fontSize: isSmallScreen ? 15 : 16,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {ticket.ticketIdentifier}
              </Text>
              <Text
                style={[
                  styles.ticketType,
                  {
                    color: colors.text,
                    fontSize: isSmallScreen ? 12 : 13,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {ticket.ticketType || 'Ticket'}
              </Text>
              <Text
                style={[
                  styles.ticketType,
                  {
                    color: colors.text,
                    fontSize: isSmallScreen ? 12 : 13,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {ticket.name || 'Guest'}
              </Text>
            </View>
            <View style={styles.checkboxContainer}>
              {selectedTickets.has(ticket.id) ? (
                <Check
                  size={isSmallScreen ? 20 : 24}
                  color={(ticket.selectcolor as string | undefined) || accentColor}
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
      </ScrollView>

      {/* Bottom action footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 8) + TAB_BAR_HEIGHT,
            paddingTop: 10,
            height: FOOTER_HEIGHT + Math.max(insets.bottom, 8),
          },
        ]}
      >
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.cancelButton,
              { backgroundColor: isDark ? '#3A3A3C' : '#e0e0e0', flex: 1 },
            ]}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.confirmButton,
              { backgroundColor: scanMode === 'scan-in' ? '#22C55E' : colors.primary, flex: 1, opacity: selectedTickets.size === 0 ? 0.5 : 1 },
            ]}
            onPress={handleConfirm}
            disabled={selectedTickets.size === 0 || isProcessing}
            activeOpacity={0.7}
          >
            {isProcessing ? (
              <Text style={[styles.buttonText, styles.confirmButtonText]}>Processing...</Text>
            ) : (
              <View style={styles.buttonContent}>
                {scanMode === 'scan-in' ? (
                  <LogIn size={18} color="#FFFFFF" />
                ) : (
                  <UserCheck size={18} color="#FFFFFF" />
                )}
                <Text style={[styles.buttonText, styles.confirmButtonText]}>
                  {scanMode === 'scan-in' ? 'Check In' : 'Pass Out'}
                  {selectedTickets.size > 0 && ` (${selectedTickets.size})`}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Success Modal */}
      {successData && (
        <SuccessModal
          visible={showSuccessModal}
          onClose={handleSuccessModalClose}
          type={successData.type}
          guestName={successData.guestName}
          ticketType={successData.ticketType}
          count={successData.count}
          message={successData.message}
          accentColor={successData.accentColor}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subTitle: {
    opacity: 0.7,
    marginBottom: 6,
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
    paddingVertical: 4,
    gap: 12,
    alignItems: 'stretch',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
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
    lineHeight: 22,
    fontSize: 16,
  },
  cancelButtonText: {
    // Cancel button text color is set dynamically
  },
  confirmButtonText: {
    color: 'white',
    marginLeft: 8,
  },
});