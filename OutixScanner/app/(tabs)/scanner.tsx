import { router, useLocalSearchParams } from 'expo-router';
import { LogIn, LogOut, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import QRScanner from '../../components/QRScanner';
import { useRefresh } from '../../context/RefreshContext';
import { useTheme } from '../../context/ThemeContext';
import {
    QRValidationResponse,
    getEvents,
    scanQRCode,
    unscanQRCode,
    validateQRCode
} from '../../services/api';
import { feedback, initializeAudio } from '../../services/feedback';

const { width: screenWidth } = Dimensions.get('window');

type ScanMode = 'scan-in' | 'scan-out';

export default function ScannerScreen() {
  const { colors, selectedEventId, selectedEventName } = useTheme();
  const { triggerGuestListRefresh, triggerAttendanceRefresh, triggerAnalyticsRefresh } = useRefresh();
  const { eventId: paramEventId } = useLocalSearchParams();
  
  const [currentEventId, setCurrentEventId] = useState<string>('');
  const [currentEventName, setCurrentEventName] = useState<string>('');
  const [scanMode, setScanMode] = useState<ScanMode>('scan-in');
  // Remove unused animations for simplified UI

  useEffect(() => {
    // Update current event ID when route parameter changes
    const eventId = Array.isArray(paramEventId) ? paramEventId[0] : paramEventId || selectedEventId || '77809';
    setCurrentEventId(eventId);
  }, [paramEventId, selectedEventId]);

  useEffect(() => {
    initializeAudio();
    loadEventName();
  }, []);

  useEffect(() => {
    // Reload event name when currentEventId changes
    loadEventName();
  }, [currentEventId]);

  const loadEventName = async () => {
    try {
      console.log('Loading event name for ID:', currentEventId);
      const events = await getEvents();
      console.log('Available events:', events);
      
      // Try to find event by string ID first, then by numeric ID
      const currentEvent = events.find(event => 
        event.id === currentEventId || 
        event.id === parseInt(currentEventId) ||
        event.id?.toString() === currentEventId
      );
      
      if (currentEvent) {
        const eventName = currentEvent.title || 
                         currentEvent.name || 
                         currentEvent.eventName || 
                         currentEvent.event_name ||
                         currentEvent.eventTitle ||
                         currentEvent.event_title ||
                         `Event #${currentEventId}`;
        console.log('Found event:', currentEvent, 'Using name:', eventName);
        setCurrentEventName(eventName);
      } else {
        console.log('Event not found, using fallback name');
        setCurrentEventName(`Event #${currentEventId}`);
    }
    } catch (error) {
      console.error('Error loading event name:', error);
      setCurrentEventName(`Event #${currentEventId}`);
    }
  };

  const toggleScanMode = () => {
    feedback.buttonPress();
    setScanMode(scanMode === 'scan-in' ? 'scan-out' : 'scan-in');
  };

  const handleClose = () => {
    feedback.buttonPress();
    router.back();
  };

  const handleGroupScan = () => {
    feedback.buttonPress();
    router.push(`/group-scan/${currentEventId}`);
  };

  const handleScanResult = useCallback(async (data: string) => {
    try {
      console.log('QR Code scanned:', data);
      console.log('Current scan mode:', scanMode);
      
      const validationResult = await validateQRCode(currentEventId, data);
      
      if (!validationResult) {
        feedback.error();
        Alert.alert('Validation Error', 'Failed to validate QR code. Please try again.');
        return;
      }
      
      if (scanMode === 'scan-out') {
        console.log('Scan out mode - checking validation result:', validationResult);
        
        if (validationResult.error) {
          let errorMessage = 'This QR code is not valid for this event.';
          if (typeof validationResult.msg === 'string') {
            errorMessage = validationResult.msg;
          } else if (validationResult.msg && typeof validationResult.msg === 'object' && 'message' in validationResult.msg) {
            errorMessage = validationResult.msg.message;
          }
          
          const isCheckInRelatedError = errorMessage.toLowerCase().includes('already') || 
                                       errorMessage.toLowerCase().includes('scanned') ||
                                       errorMessage.toLowerCase().includes('checked in') ||
                                       errorMessage.toLowerCase().includes('cannot check in') ||
                                       errorMessage.toLowerCase().includes('not valid') ||
                                       errorMessage.toLowerCase().includes('ticket') ||
                                       validationResult.status === 409 ||
                                       validationResult.status === 400;
          
          if (!isCheckInRelatedError) {
            feedback.qrScanError();
            Alert.alert('Invalid QR Code', errorMessage);
            return;
          }
          
          console.log('Check-in related error detected - proceeding with scan out attempt');
        }
        
        feedback.success();
        console.log('Performing scan out...');
        await performScanOut(data, validationResult);
        return;
      }
      
      if (validationResult.error) {
        feedback.qrScanError();
        let errorMessage = 'This QR code is not valid for this event.';
        if (typeof validationResult.msg === 'string') {
          errorMessage = validationResult.msg;
        } else if (validationResult.msg && typeof validationResult.msg === 'object' && 'message' in validationResult.msg) {
          errorMessage = validationResult.msg.message;
        }
        
        Alert.alert('Invalid QR Code', errorMessage);
        return;
      }
      
      feedback.success();
      
      console.log('Performing scan in...');
      await performScanIn(data, validationResult);
      
    } catch (error) {
      console.error('QR scan error:', error);
      feedback.error();
      Alert.alert('Error', 'An unexpected error occurred while processing the QR code.');
    }
  }, [currentEventId, scanMode]);

  const performScanIn = async (scanCode: string, validationResult: QRValidationResponse) => {
    try {
      console.log('Scanning QR code for event', currentEventId, ', scancode:', scanCode);
      const scanResult = await scanQRCode(currentEventId, scanCode);
      
      if (!scanResult || scanResult.error) {
        feedback.error();
        let errorMessage = 'Failed to check in guest.';
        if (scanResult?.msg && typeof scanResult.msg === 'string') {
          errorMessage = scanResult.msg;
        } else if (scanResult?.msg && typeof scanResult.msg === 'object' && 'message' in scanResult.msg) {
          errorMessage = scanResult.msg.message;
        }
        
        Alert.alert('Check-in Failed', errorMessage);
        return;
      }
      
      feedback.checkIn();
      let successMessage = 'Guest successfully checked in!';
      if (typeof scanResult.msg === 'string') {
        successMessage = scanResult.msg;
      } else if (scanResult.msg && typeof scanResult.msg === 'object' && 'message' in scanResult.msg) {
        successMessage = scanResult.msg.message;
      }
      
      const ticketInfo = validationResult.msg && typeof validationResult.msg === 'object' ? validationResult.msg.info : undefined;
      Alert.alert(
        'Guest Checked In Successfully',
        `${ticketInfo?.fullname || 'Guest'} has been checked in.\n\n${successMessage}\n\nAttendance count updated across the app.`
      );
      
      // Trigger refresh for all related components
      triggerGuestListRefresh(currentEventId);
      triggerAttendanceRefresh(currentEventId);
      triggerAnalyticsRefresh();
      
    } catch (error) {
      console.error('Scan in error:', error);
      feedback.error();
      Alert.alert('Scan In Error', 'Failed to check in guest via API. Please try again.');
    }
  };

  const performScanOut = async (scanCode: string, validationResult: QRValidationResponse) => {
    try {
      console.log('Unscanning QR code for event', currentEventId, ', scancode:', scanCode);
      const unscanResult = await unscanQRCode(currentEventId, scanCode);
      
      if (!unscanResult || unscanResult.error) {
        feedback.error();
        let errorMessage = 'Failed to check out guest.';
        if (unscanResult?.msg && typeof unscanResult.msg === 'string') {
          errorMessage = unscanResult.msg;
        } else if (unscanResult?.msg && typeof unscanResult.msg === 'object' && 'message' in unscanResult.msg) {
          errorMessage = unscanResult.msg.message;
        }
        
        Alert.alert('Check-out Failed', errorMessage);
        return;
      }
      
      feedback.success();
      let successMessage = 'Guest successfully checked out!';
      if (typeof unscanResult.msg === 'string') {
        successMessage = unscanResult.msg;
      } else if (unscanResult.msg && typeof unscanResult.msg === 'object' && 'message' in unscanResult.msg) {
        successMessage = unscanResult.msg.message;
      }
      
      const ticketInfo = validationResult.msg && typeof validationResult.msg === 'object' ? validationResult.msg.info : undefined;
      Alert.alert(
        'Guest Checked Out Successfully',
        `${ticketInfo?.fullname || 'Guest'} has been checked out.\n\n${successMessage}\n\nAttendance count updated across the app.`
      );
      
      // Trigger refresh for all related components
      triggerGuestListRefresh(currentEventId);
      triggerAttendanceRefresh(currentEventId);
      triggerAnalyticsRefresh();
      
    } catch (error) {
      console.error('Scan out error:', error);
      feedback.error();
      Alert.alert('Scan Out Error', 'Failed to check out guest via API. Please try again.');
    }
  };

  // Simplified UI without complex animations

  const customHeader = (
    <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
      {/* Simple Event Info */}
      <View style={styles.simpleEventInfo}>
        <Text style={[styles.eventNameSimple, { color: colors.text }]} numberOfLines={1}>
          {currentEventName}
        </Text>
      </View>
      
      {/* Large Toggle Buttons */}
      <View style={styles.modeToggleContainer}>
        <TouchableOpacity 
          style={[
            styles.modeButton, 
            styles.checkInButton,
            scanMode === 'scan-in' && styles.activeButton,
            { backgroundColor: scanMode === 'scan-in' ? '#06D6A0' : colors.card }
          ]}
          onPress={() => {
            if (scanMode !== 'scan-in') toggleScanMode();
          }}
          activeOpacity={0.8}
        >
          <LogIn size={24} color={scanMode === 'scan-in' ? '#FFFFFF' : '#06D6A0'} strokeWidth={2.5} />
          <Text style={[
            styles.modeButtonText, 
            { color: scanMode === 'scan-in' ? '#FFFFFF' : '#06D6A0' }
          ]}>
            Check In
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.modeButton, 
            styles.checkOutButton,
            scanMode === 'scan-out' && styles.activeButton,
            { backgroundColor: scanMode === 'scan-out' ? '#F72585' : colors.card }
          ]}
          onPress={() => {
            if (scanMode !== 'scan-out') toggleScanMode();
          }}
          activeOpacity={0.8}
        >
          <LogOut size={24} color={scanMode === 'scan-out' ? '#FFFFFF' : '#F72585'} strokeWidth={2.5} />
          <Text style={[
            styles.modeButtonText, 
            { color: scanMode === 'scan-out' ? '#FFFFFF' : '#F72585' }
          ]}>
            Check Out
          </Text>
        </TouchableOpacity>
      </View>

      {/* Simple Group Scan Button */}
      <TouchableOpacity 
        style={[styles.groupScanButtonSimple, { backgroundColor: colors.primary }]}
        onPress={handleGroupScan}
      >
        <Users size={18} color="#FFFFFF" />
        <Text style={styles.groupScanButtonTextSimple}>Group Scan</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <QRScanner
        onScan={handleScanResult}
        onClose={handleClose} 
        customHeader={customHeader}
        showCloseButton={false}
        headerTitle={scanMode === 'scan-in' ? 'Check In Mode' : 'Check Out Mode'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  // Simplified Event Info
  simpleEventInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  eventNameSimple: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Large Toggle Buttons
  modeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
    gap: 15,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  checkInButton: {
    borderWidth: 2,
    borderColor: '#06D6A0',
  },
  checkOutButton: {
    borderWidth: 2,
    borderColor: '#F72585',
  },
  activeButton: {
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  // Simple Group Scan Button
  groupScanButtonSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  groupScanButtonTextSimple: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
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
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 10,
  },
  ticketIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#06D6A0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
    fontSize: 15,
    fontWeight: '700',
  },
  ticketEmail: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  ticketStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  cancelButton: {
    padding: 10,
    borderRadius: 5,
  },
  confirmButton: {
    padding: 10,
    borderRadius: 5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  groupScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  groupScanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
}); 