import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  Alert,
  StatusBar,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { LogIn, LogOut, Calendar, Zap, Users } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { router, useLocalSearchParams } from 'expo-router';
import QRScanner from '../../components/QRScanner';
import { 
  validateQRCode, 
  scanQRCode, 
  unscanQRCode,
  QRValidationResponse,
  getEvents,
  getGroupTickets,
  scanGroupTickets,
} from '../../services/api';
import { feedback, initializeAudio } from '../../services/feedback';

const { width: screenWidth } = Dimensions.get('window');

type ScanMode = 'scan-in' | 'scan-out';

export default function ScannerScreen() {
  const { colors, selectedEventId, selectedEventName } = useTheme();
  const { id } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id || selectedEventId || '77809';
  
  const [currentEventId, setCurrentEventId] = useState(eventId);
  const [currentEventName, setCurrentEventName] = useState(selectedEventName || 'Loading...');
  const [scanMode, setScanMode] = useState<ScanMode>('scan-in');
  const [toggleAnimation] = useState(new Animated.Value(0));
  const [pulseAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    // Update current event ID when route parameter changes
    setCurrentEventId(eventId);
  }, [eventId]);

  useEffect(() => {
    initializeAudio();
    loadEventName();
    startPulseAnimation();
  }, []);

  useEffect(() => {
    // Reload event name when currentEventId changes
    loadEventName();
  }, [currentEventId]);

  useEffect(() => {
    Animated.spring(toggleAnimation, {
      toValue: scanMode === 'scan-in' ? 0 : 1,
      useNativeDriver: false,
      tension: 120,
      friction: 7,
    }).start();
  }, [scanMode]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

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
      const scanResult = await scanQRCode(currentEventId, scanCode);
      
      if (!scanResult || scanResult.error) {
        let errorMessage = 'Failed to scan in guest';
        if (scanResult?.msg) {
          errorMessage = typeof scanResult.msg === 'string' ? scanResult.msg : scanResult.msg.message;
        }
        
        feedback.error();
        Alert.alert('Scan In Failed', errorMessage);
        return;
      }
      
      feedback.checkIn();
      
      let successMessage = 'Scan successful';
      if (typeof scanResult.msg === 'string') {
        successMessage = scanResult.msg;
      } else if (scanResult.msg && typeof scanResult.msg === 'object' && 'message' in scanResult.msg) {
        successMessage = scanResult.msg.message;
      }
      
      let ticketInfo = null;
      if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
        ticketInfo = validationResult.msg.info;
      }
      
        Alert.alert(
        '✅ Guest Checked In',
        `${ticketInfo?.fullname || 'Guest'} has been checked in.\n\n${successMessage}`
      );
      
    } catch (error) {
      console.error('Scan in error:', error);
      feedback.error();
      Alert.alert('Scan In Error', 'Failed to scan in guest. Please try again.');
    }
  };

  const performScanOut = async (scanCode: string, validationResult: QRValidationResponse) => {
    try {
      const unscanResult = await unscanQRCode(currentEventId, scanCode);
      
      if (!unscanResult || unscanResult.error) {
        let errorMessage = 'Failed to scan out guest';
        if (unscanResult?.msg) {
          errorMessage = typeof unscanResult.msg === 'string' ? unscanResult.msg : unscanResult.msg.message;
        }
        
        const isNotUsedError = errorMessage.toLowerCase().includes('not been used') ||
                              errorMessage.toLowerCase().includes('not used yet') ||
                              errorMessage.toLowerCase().includes('no scan') ||
                              errorMessage.toLowerCase().includes('not checked in');
        
        if (isNotUsedError) {
          feedback.warning();
          Alert.alert('Already Scanned Out', 'This ticket has already been scanned out or was never checked in.');
          return;
        }
        
        feedback.error();
        Alert.alert('Scan Out Failed', errorMessage);
        return;
      }
      
      feedback.success();
      
      let successMessage = 'Unscan successful';
      if (typeof unscanResult.msg === 'string') {
        successMessage = unscanResult.msg;
      } else if (unscanResult.msg && typeof unscanResult.msg === 'object' && 'message' in unscanResult.msg) {
        successMessage = unscanResult.msg.message;
      }
      
      let ticketInfo = null;
      if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
        ticketInfo = validationResult.msg.info;
      }
      
        Alert.alert(
        '🚪 Guest Checked Out',
        `${ticketInfo?.fullname || 'Guest'} has been checked out.\n\n${successMessage}`
      );
      
    } catch (error) {
      console.error('Scan out error:', error);
      feedback.error();
      Alert.alert('Scan Out Error', 'Failed to scan out guest. Please try again.');
    }
  };

  const toggleBackgroundColor = toggleAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['#06D6A0', '#F72585'],
  });

  const toggleTranslateX = toggleAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [2, screenWidth / 2 - 20],
  });

  const customHeader = (
    <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
      {/* Event Info Card */}
      <View style={[styles.eventCard, { backgroundColor: colors.card }]}>
        <View style={styles.eventIconContainer}>
          <Calendar size={20} color="#06D6A0" />
        </View>
        <View style={styles.eventDetails}>
          <Text style={[styles.eventLabel, { color: colors.secondary }]}>ACTIVE EVENT</Text>
          <Text style={[styles.eventName, { color: colors.text }]} numberOfLines={1}>
            {currentEventName}
          </Text>
        </View>
        <Animated.View style={[styles.statusIndicator, { transform: [{ scale: pulseAnimation }] }]}>
          <Zap size={16} color="#06D6A0" />
        </Animated.View>
      </View>
      
      {/* Simple Minimal Toggle */}
      <View style={styles.toggleSection}>
        <Text style={[styles.modeLabel, { color: colors.text }]}>
          {scanMode === 'scan-in' ? 'Check In Mode' : 'Check Out Mode'}
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

      {/* Group Scan Button */}
      <TouchableOpacity 
        style={[styles.groupScanButton, { backgroundColor: colors.primary }]}
        onPress={handleGroupScan}
      >
        <Users size={20} color="#FFFFFF" />
        <Text style={styles.groupScanButtonText}>Group Scan</Text>
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
    marginBottom: 24,
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
    marginBottom: 24,
  },
  modeLabel: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 22,
    marginBottom: 16,
  },
  toggleTrack: {
    width: 120,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
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
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
  },
  toggleHint: {
    marginTop: 8,
  },
  toggleHintText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
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