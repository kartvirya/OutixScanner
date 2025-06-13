import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { 
  QrCode, 
  Users, 
  CheckCircle,
  ArrowLeft,
  RefreshCw,
  UserCheck,
  Zap,
  LogIn,
  LogOut
} from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useRefresh } from '../../../context/RefreshContext';
import { 
  getGroupTickets,
  scanGroupTickets,
  unscanGroupTickets,
  validateQRCode,
  getEvents,
} from '../../../services/api';
import QRScanner from '../../../components/QRScanner';
import { feedback, initializeAudio } from '../../../services/feedback';

interface GroupTicket {
  id: string;
  name: string;
  email: string;
  ticketType: string;
  isCheckedIn: boolean;
  qrCode: string;
}

type ScanMode = 'scan-in' | 'scan-out';

export default function GroupScanPage() {
  const { colors } = useTheme();
  const { triggerGuestListRefresh, triggerAttendanceRefresh, triggerAnalyticsRefresh } = useRefresh();
  const { id } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id || '1';
  
  const [loading, setLoading] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [showScanner, setShowScanner] = useState(true);
  const [groupTickets, setGroupTickets] = useState<GroupTicket[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('scan-in');
  const [toggleAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    initializeAudio();
    loadEventName();
  }, []);

  useEffect(() => {
    Animated.spring(toggleAnimation, {
      toValue: scanMode === 'scan-in' ? 0 : 1,
      useNativeDriver: false,
      tension: 120,
      friction: 7,
    }).start();
  }, [scanMode]);

  const loadEventName = async () => {
    try {
      const events = await getEvents();
      const currentEvent = events.find(event => 
        event.id === eventId || 
        event.id === parseInt(eventId) ||
        event.id?.toString() === eventId
      );
      
      if (currentEvent) {
        const eventName = currentEvent.title || 
                         currentEvent.name || 
                         currentEvent.eventName || 
                         currentEvent.event_name ||
                         currentEvent.eventTitle ||
                         currentEvent.event_title ||
                         `Event #${eventId}`;
        setEventTitle(eventName);
      } else {
        setEventTitle(`Event #${eventId}`);
      }
    } catch (error) {
      console.error('Error loading event name:', error);
      setEventTitle(`Event #${eventId}`);
    }
  };

  const handleClose = () => {
    feedback.buttonPress();
    router.back();
  };

  const toggleScanMode = () => {
    feedback.buttonPress();
    setScanMode(scanMode === 'scan-in' ? 'scan-out' : 'scan-in');
  };

  const handleScanResult = useCallback(async (data: string) => {
    try {
      console.log('QR Code scanned:', data);
      console.log('Current scan mode:', scanMode);
      setShowScanner(false);
      setLoading(true);
      
      // First validate the QR code
      const validation = await validateQRCode(eventId, data);
      
      if (!validation) {
        feedback.error();
        Alert.alert('Validation Error', 'Failed to validate QR code. Please try again.');
        setShowScanner(true);
        return;
      }
      
      console.log('Validation result:', validation);
      
      // For scan-out mode, we expect tickets to be already checked in
      // So a 403 error with "Cannot check in" is actually what we want
      if (scanMode === 'scan-out') {
        if (validation.error) {
          const errorMsg = typeof validation.msg === 'string' 
            ? validation.msg 
            : validation.msg?.message || '';
          
          // Check if this is the expected "already checked in" error
          const isCheckedInError = (
            errorMsg.toLowerCase().includes('cannot check in') ||
            errorMsg.toLowerCase().includes('already') || 
            errorMsg.toLowerCase().includes('scanned') ||
            errorMsg.toLowerCase().includes('checked in') ||
            validation.status === 403
          ) && validation.msg && typeof validation.msg === 'object' && validation.msg.info;
          
          if (!isCheckedInError) {
            feedback.error();
            Alert.alert('Invalid QR Code', errorMsg);
            setShowScanner(true);
            return;
          }
          // Continue with group scan - this is expected for checkout
          console.log('Ticket is checked in, proceeding with group checkout logic');
        }
      } else {
        // For scan-in mode, ticket should be valid (not already checked in)
        if (validation.error) {
          feedback.error();
          const errorMsg = typeof validation.msg === 'string' 
            ? validation.msg 
            : validation.msg?.message || 'Invalid ticket for group scan';
          Alert.alert('Invalid QR Code', errorMsg);
          setShowScanner(true);
          return;
        }
      }
      
      const groupResult = await getGroupTickets(eventId, data);
      
      if (groupResult.error) {
        feedback.error();
        const errorMessage = typeof groupResult.msg === 'string' 
          ? groupResult.msg 
          : groupResult.msg?.message || 'Failed to get group tickets';
        Alert.alert('Group Scan Error', errorMessage);
        setShowScanner(true);
        return;
      }
      
      if (!groupResult.tickets || groupResult.tickets.length === 0) {
        feedback.warning();
        Alert.alert('No Group Found', 'No tickets found for this purchaser.');
        setShowScanner(true);
        return;
      }

      console.log('All group tickets:', groupResult.tickets);

      // Filter tickets based on scan mode
      const filteredTickets = scanMode === 'scan-in' 
        ? groupResult.tickets.filter((ticket: GroupTicket) => !ticket.isCheckedIn)
        : groupResult.tickets.filter((ticket: GroupTicket) => ticket.isCheckedIn);

      console.log('Filtered tickets for', scanMode, ':', filteredTickets);

      if (filteredTickets.length === 0) {
        feedback.warning();
        Alert.alert(
          scanMode === 'scan-in' ? 'Already Checked In' : 'Not Checked In',
          scanMode === 'scan-in' 
            ? 'All tickets in this group are already checked in.'
            : 'No checked-in tickets found in this group to check out.'
        );
        setShowScanner(true);
        return;
      }
      
      // Show group confirmation modal
      setGroupTickets(filteredTickets);
      setShowGroupModal(true);
      feedback.success();
      
    } catch (error) {
      console.error('Group scan error:', error);
      feedback.error();
      Alert.alert('Group Scan Error', 'Failed to process group scan. Please try again.');
      setShowScanner(true);
    } finally {
      setLoading(false);
    }
  }, [eventId, scanMode]);

  const confirmGroupScan = async () => {
    try {
      setShowGroupModal(false);
      feedback.buttonPress();
      
      const ticketIds = groupTickets.map(ticket => ticket.qrCode || ticket.id);
      
      let result;
      if (scanMode === 'scan-in') {
        result = await scanGroupTickets(eventId, ticketIds);
      } else {
        result = await unscanGroupTickets(eventId, ticketIds);
      }
      
      if (result.error) {
        feedback.error();
        const errorMessage = typeof result.msg === 'string'
          ? result.msg
          : result.msg?.message || `Failed to ${scanMode === 'scan-in' ? 'check in' : 'check out'} group`;
        Alert.alert(
          scanMode === 'scan-in' ? 'Group Check-in Failed' : 'Group Check-out Failed',
          errorMessage
        );
        setShowScanner(true);
        return;
      }
      
      feedback.checkIn();
      const message = `Successfully ${scanMode === 'scan-in' ? 'checked in' : 'checked out'} ${result.successful} out of ${result.total} tickets`;
      
      if (result.failed > 0) {
        Alert.alert('Partial Success', `${message}.\n${result.failed} tickets failed to process.\n\nAttendance data has been updated across the app.`);
      } else {
        Alert.alert(
          scanMode === 'scan-in' ? '✅ Group Check-in Complete' : '🚪 Group Check-out Complete',
          `${message}\n\nAttendance data has been updated across the app.`
        );
      }
      
      // Trigger refresh for all related components
      triggerGuestListRefresh(eventId);
      triggerAttendanceRefresh(eventId);
      triggerAnalyticsRefresh();
      
      setGroupTickets([]);
      setShowScanner(true);
      
    } catch (error) {
      console.error('Group confirmation error:', error);
      feedback.error();
      Alert.alert(
        scanMode === 'scan-in' ? 'Group Check-in Error' : 'Group Check-out Error',
        `Failed to ${scanMode === 'scan-in' ? 'check in' : 'check out'} group. Please try again.`
      );
      setShowScanner(true);
    }
  };

  const cancelGroupScan = () => {
    setShowGroupModal(false);
    setGroupTickets([]);
    setShowScanner(true);
    feedback.buttonPress();
  };

  const toggleBackgroundColor = toggleAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['#06D6A0', '#F72585'],
  });

  const toggleTranslateX = toggleAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 42],
  });

  const customHeader = (
    <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.eventCard, { backgroundColor: colors.card }]}>
        <View style={styles.eventIconContainer}>
          <Users size={20} color="#06D6A0" />
        </View>
        <View style={styles.eventDetails}>
          <Text style={[styles.eventLabel, { color: colors.secondary }]}>GROUP SCAN MODE</Text>
          <Text style={[styles.eventName, { color: colors.text }]} numberOfLines={1}>
            {eventTitle}
          </Text>
        </View>
        <View style={styles.statusIndicator}>
          <Zap size={16} color="#06D6A0" />
        </View>
      </View>
      
      {/* Mode Toggle */}
      <View style={styles.toggleSection}>
        <Text style={[styles.modeLabel, { color: colors.text }]}>
          {scanMode === 'scan-in' ? 'Group Check In' : 'Group Check Out'}
        </Text>
        
        <TouchableOpacity onPress={toggleScanMode} activeOpacity={0.7}>
          <Animated.View style={[styles.toggleTrack, { backgroundColor: toggleBackgroundColor }]}>
            <Animated.View 
              style={[
                styles.toggleThumb, 
                { transform: [{ translateX: toggleTranslateX }] }
              ]}
            >
              {scanMode === 'scan-in' ? (
                <LogIn size={16} color="#06D6A0" strokeWidth={2} />
              ) : (
                <LogOut size={16} color="#F72585" strokeWidth={2} />
              )}
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
        
        <View style={styles.toggleHint}>
          <Text style={[styles.toggleHintText, { color: colors.secondary }]}>
            Tap to switch modes
          </Text>
        </View>
      </View>
      
      <View style={styles.instructionContainer}>
        <Text style={[styles.instructionText, { color: colors.text }]}>
          {scanMode === 'scan-in'
            ? 'Scan any ticket from the group to check in all tickets purchased together'
            : 'Scan any ticket from the group to check out all checked-in tickets from the group'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ 
        title: scanMode === 'scan-in' ? "Group Check In" : "Group Check Out",
        headerShown: true,
        headerLeft: () => (
          <TouchableOpacity onPress={handleClose}>
            <ArrowLeft size={24} color={colors.primary} />
          </TouchableOpacity>
        )
      }} />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Processing group scan...</Text>
        </View>
      ) : showScanner ? (
        <QRScanner
          onScan={handleScanResult}
          onClose={handleClose}
          customHeader={customHeader}
          showCloseButton={false}
          headerTitle={scanMode === 'scan-in' ? "Group Check In" : "Group Check Out"}
        />
      ) : null}
      
      {/* Group Scan Modal */}
      <Modal
        visible={showGroupModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={cancelGroupScan}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {scanMode === 'scan-in' ? 'Group Check-in' : 'Group Check-out'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>
              {groupTickets.length} tickets found
            </Text>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {groupTickets.map((ticket, index) => (
              <View key={ticket.id || index} style={[styles.ticketItem, { backgroundColor: colors.card }]}>
                <View style={styles.ticketIcon}>
                  <Text style={styles.ticketNumber}>{index + 1}</Text>
                </View>
                <View style={styles.ticketDetails}>
                  <Text style={[styles.ticketName, { color: colors.text }]}>
                    {ticket.name || 'Guest'}
                  </Text>
                  <Text style={[styles.ticketEmail, { color: colors.secondary }]}>
                    {ticket.email || 'No email'}
                  </Text>
                  <Text style={[styles.ticketStatus, { color: ticket.isCheckedIn ? '#F72585' : '#06D6A0' }]}>
                    {ticket.isCheckedIn ? 'Currently checked in' : 'Ready to check in'}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
          
          <View style={[styles.modalActions, { backgroundColor: colors.card }]}>
            <TouchableOpacity 
              style={[styles.cancelButton, { backgroundColor: colors.secondary }]} 
              onPress={cancelGroupScan}
            >
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.confirmButton, { backgroundColor: colors.primary }]} 
              onPress={confirmGroupScan}
            >
              <Text style={styles.actionButtonText}>
                {scanMode === 'scan-in' 
                  ? `Check In All (${groupTickets.length})`
                  : `Check Out All (${groupTickets.length})`}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  eventIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(6, 214, 160, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDetails: {
    flex: 1,
    marginLeft: 16,
  },
  eventLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
    opacity: 0.7,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  statusIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(6, 214, 160, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleTrack: {
    width: 80,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleThumb: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    top: 2,
    left: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  toggleHint: {
    marginTop: 8,
  },
  toggleHintText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
  instructionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalContent: {
    padding: 20,
  },
  ticketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  ticketIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#06D6A0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ticketNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ticketDetails: {
    flex: 1,
  },
  ticketName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  ticketEmail: {
    fontSize: 13,
    marginBottom: 4,
  },
  ticketStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
  },
  confirmButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
}); 