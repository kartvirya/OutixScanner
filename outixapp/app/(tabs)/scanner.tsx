import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LogIn, Scan } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    BackHandler,
    Dimensions,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import ErrorModal from '../../components/ErrorModal';
import SuccessModal from '../../components/SuccessModal';
import QRScanner from '../../components/QRScanner';
import ModernQRScanner from '../../components/ModernQRScanner';
import { useRefresh } from '../../context/RefreshContext';
import { useTheme } from '../../context/ThemeContext';
import {
    QRValidationResponse,
    getEvents,
    validateQRCode,
    scanQRCode,
    unscanQRCode
} from '../../services/api';
import { feedback, initializeAudio } from '../../services/feedback';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type ScanMode = 'scan-in' | 'scan-out';
type QRScannerMode = 'scan-in' | 'passout';

const DEBUG_MODE = false;

export default function ScannerScreen() {
  const { colors, isDark, selectedEventId, selectedEventName } = useTheme();
  const { triggerGuestListRefresh, triggerAttendanceRefresh, triggerAnalyticsRefresh } = useRefresh();
  const { eventId: paramEventId, returnTo } = useLocalSearchParams();
  
  // State management
  const [currentEventId, setCurrentEventId] = useState<string>('');
  const [currentEventName, setCurrentEventName] = useState<string>('');
  const [scanMode, setScanMode] = useState<ScanMode>('scan-in');
  const [showEventSelection, setShowEventSelection] = useState(false);
  const [isValidatingEvent, setIsValidatingEvent] = useState(true);
  const [isScanning, setIsScanning] = useState(true);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [showCamera, setShowCamera] = useState(true);
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);
  const [showErrorModalState, setShowErrorModalState] = useState(false);
  const [errorData, setErrorData] = useState<{
    type: 'already-scanned' | 'not-checked-in' | 'invalid-ticket' | 'general';
    title?: string;
    message?: string;
    guestName?: string;
    ticketType?: string;
    checkedInDate?: string;
  } | null>(null);
  const [showSuccessModalState, setShowSuccessModalState] = useState(false);
  const [successData, setSuccessData] = useState<{
    type: 'check-in' | 'check-out' | 'group-check-in' | 'group-check-out';
    guestName?: string;
    ticketType?: string;
    message?: string;
  } | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const toggleSlideAnim = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const scanSuccessAnim = useRef(new Animated.Value(1)).current;
  const scanPulseAnim = useRef(new Animated.Value(1)).current;
  
  // Refs
  const lastProcessedRef = useRef<{ data: string; time: number }>({ data: '', time: 0 });
  
  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  // Pulse animation for scan icon
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);
  
  // Toggle animation
  useEffect(() => {
    Animated.spring(toggleSlideAnim, {
      toValue: scanMode === 'scan-in' ? 0 : 1,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [scanMode]);

  // Camera initialization and cleanup
  useEffect(() => {
    console.log('🔄 Scanner component mounted - ensuring camera is ready');
    setShowCamera(true);
    setIsScanning(true);
    
    // Cleanup function - runs when component unmounts
    return () => {
      console.log('🔄 Scanner component unmounting - stopping camera');
      setShowCamera(false);
      setIsScanning(false);
    };
  }, []);

  // Focus effect - handle both focus and unfocus events
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Scanner screen focused - ensuring camera is ready');
      
      if (isNavigatingAway) {
        console.log('🔄 Resetting navigation flag - back to scanner');
        setIsNavigatingAway(false);
      }
      
      // Smooth camera restart with fade
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }).start(() => {
        setShowCamera(false);
        setTimeout(() => {
          setShowCamera(true);
          setIsScanning(true);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, 50);
      });

      // Cleanup function - runs when screen loses focus (user navigates away)
      return () => {
        console.log('🔄 Scanner screen unfocused - stopping camera');
        setShowCamera(false);
        setIsScanning(false);
      };
    }, [isNavigatingAway])
  );

  // Audio initialization
  useEffect(() => {
    initializeAudio();
    
    const checkEventSelection = async () => {
      setIsValidatingEvent(true);
      
      try {
        const eventId = selectedEventId || (Array.isArray(paramEventId) ? paramEventId[0] : paramEventId) || '';
        
        console.log('Scanner - Event Selection Debug:', { 
          selectedEventId, 
          selectedEventName,
          paramEventId,
          chosenEventId: eventId,
        });
      
        if (!eventId || eventId === '') {
          console.log('❌ No event ID found, showing event selection screen');
          setShowEventSelection(true);
          setIsValidatingEvent(false);
          return;
        }
      
        console.log(`✅ Setting currentEventId to: ${eventId}`);
        setCurrentEventId(eventId);
        
        if (selectedEventName && selectedEventName !== '' && selectedEventId === eventId) {
          console.log(`🎯 Using event from context: "${selectedEventName}" (ID: ${eventId})`);
          setCurrentEventName(selectedEventName);
          setShowEventSelection(false);
          setIsValidatingEvent(false);
          return;
        }
        
        console.log(`🔍 Fetching event name from API for ID: ${eventId}`);
        try {
          const events = await getEvents();
          console.log(`📋 Found ${Array.isArray(events) ? events.length : 0} events from API`);
        
          const eventExists = Array.isArray(events) && events.find((event: any) => {
            const matches = event.id === eventId || 
                           event.id === parseInt(eventId) ||
                           event.id?.toString() === eventId ||
                           String(event.id) === String(eventId);
            if (matches) {
              console.log(`🔍 Found matching event:`, event);
            }
            return matches;
          });
        
          if (eventExists) {
            const eventName = eventExists.title || 
                             eventExists.name || 
                             eventExists.eventName || 
                             eventExists.event_name ||
                             eventExists.eventTitle ||
                             eventExists.event_title ||
                             eventExists['Event Name'] ||
                             eventExists.EventName ||
                             eventExists.display_name ||
                             eventExists.displayName ||
                             `Untitled Event ${eventId}`;
            console.log(`✅ Valid event found: "${eventName}" (ID: ${eventId})`);
            setCurrentEventName(eventName);
          } else {
            console.log(`❌ Event ID ${eventId} not found in API, using fallback name`);
            setCurrentEventName(`Untitled Event ${eventId}`);
          }
          setShowEventSelection(false);
        } catch (error) {
          console.error('❌ Error fetching events (proceeding with fallback):', error);
          setCurrentEventName(`Untitled Event ${eventId}`);
          setShowEventSelection(false);
        }
      } finally {
        setIsValidatingEvent(false);
      }
    };
    
    checkEventSelection();
  }, [selectedEventId, selectedEventName, paramEventId]);

  const toggleScanMode = () => {
    feedback.buttonPress();
    setScanMode(scanMode === 'scan-in' ? 'scan-out' : 'scan-in');
    setShowCamera(true);
    setIsScanning(true);
    
    // Animate header
    Animated.sequence([
      Animated.timing(headerOpacity, {
        toValue: 0.5,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleClose = () => {
    feedback.buttonPress();
    
    // Fade out animation before closing
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (returnTo) {
        router.push(returnTo as string);
      } else if (router.canGoBack()) {
        router.back();
      } else {
        const eventId = selectedEventId || paramEventId || currentEventId;
        if (eventId) {
          router.replace(`/(tabs)/${eventId}`);
        } else {
          router.replace('/(tabs)');
        }
      }
    });
  };

  const handleSelectEvent = () => {
    feedback.buttonPress();
    router.push('/(tabs)');
  };

  const handleRequestResume = useCallback(() => {
    console.log('🔄 handleRequestResume called - resuming scanning');
    setIsScanning(true);
    setShowCamera(true);
  }, []);

  const playScanSuccessAnimation = useCallback(() => {
    // Reset animation values
    scanSuccessAnim.setValue(1);
    scanPulseAnim.setValue(1);
    
    // Play success animation sequence
    Animated.sequence([
      // Quick pulse effect
      Animated.parallel([
        Animated.timing(scanPulseAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scanSuccessAnim, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      // Return to normal with slight bounce
      Animated.parallel([
        Animated.spring(scanPulseAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scanSuccessAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [scanSuccessAnim, scanPulseAnim]);

  const showErrorModal = useCallback((errorInfo: {
    type: 'already-scanned' | 'not-checked-in' | 'invalid-ticket' | 'general';
    title?: string;
    message?: string;
    guestName?: string;
    ticketType?: string;
    checkedInDate?: string;
  }) => {
    setErrorData(errorInfo);
    setShowErrorModalState(true);
    
    // Smooth camera close animation
    Animated.timing(fadeAnim, {
      toValue: 0.3,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    setShowCamera(false); // Close camera when showing error modal
    setIsScanning(false); // Stop scanning when showing error modal
  }, [fadeAnim]);

  const showSuccessModal = useCallback((successInfo: {
    type: 'check-in' | 'check-out' | 'group-check-in' | 'group-check-out';
    guestName?: string;
    ticketType?: string;
    message?: string;
  }) => {
    setSuccessData(successInfo);
    setShowSuccessModalState(true);
    
    // Smooth camera close animation
    Animated.timing(fadeAnim, {
      toValue: 0.3,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    setShowCamera(false); // Close camera when showing success modal
    setIsScanning(false); // Stop scanning when showing success modal
  }, [fadeAnim]);

  const handleErrorModalClose = useCallback(() => {
    setShowErrorModalState(false);
    setErrorData(null);
    
    // Restore fade animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    setIsScanning(true);
    setShowCamera(true);
  }, [fadeAnim]);

  const handleSuccessModalClose = useCallback(() => {
    setShowSuccessModalState(false);
    setSuccessData(null);
    
    // Restore fade animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    
    setIsScanning(true);
    setShowCamera(true);
  }, [fadeAnim]);

  useEffect(() => {
    console.log('🔁 Scan mode changed to', scanMode, '- clearing last processed guard');
    lastProcessedRef.current = { data: '', time: 0 };
  }, [scanMode]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleClose();
        return true;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [returnTo, selectedEventId, paramEventId, currentEventId])
  );

  const handleScanResult = useCallback(async (data: string) => {
    const now = Date.now();
    if (lastProcessedRef.current.data === data && now - lastProcessedRef.current.time < 3000) {
      console.log('⚠️ Ignoring duplicate scan of the same code within 3s');
      return;
    }
    lastProcessedRef.current = { data, time: now };
    
    // Play scan success animation immediately when QR is detected
    playScanSuccessAnimation();
    
    const emergencyResumeTimeout = setTimeout(() => {
      console.log('🚨 EMERGENCY: Force resuming scanning after 8 seconds');
      setIsScanning(true);
      setShowCamera(true);
    }, 8000);
    
    try {
      console.log('QR Code scanned:', data);
      setIsScanning(false);
      
      if (!currentEventId || currentEventId === '' || isValidatingEvent) {
        console.log('Scanner not ready - currentEventId:', currentEventId);
        feedback.warning();
        setShowCamera(false); // Close camera when showing warning alert
        setIsScanning(false); // Stop scanning when showing warning alert
        Alert.alert(
          'Scanner Not Ready', 
          'Please wait for event validation to complete before scanning.',
          [{ text: 'OK', onPress: () => {
            setIsScanning(true);
            setShowCamera(true);
          }}]
        );
        return;
      }
      
      console.log('📍 Starting QR validation...');
      let validationResult: QRValidationResponse | null;
      
      if (DEBUG_MODE) {
        validationResult = {
          error: false,
          msg: {
            message: 'Debug validation success',
            info: {
              id: '123',
              booking_id: 'debug_booking',
              reference_num: 'debug_ref',
              ticket_identifier: data,
              ticket_title: 'Debug Ticket',
              checkedin: scanMode === 'scan-out' ? 1 : 0,
              checkedin_date: '',
              totaladmits: '1',
              admits: '1',
              available: 1,
              price: '0',
              remarks: '',
              email: 'debug@test.com',
              fullname: 'Debug User',
              address: '',
              notes: '',
              purchased_date: '',
              reason: '',
              message: '',
              mobile: '',
              picture_display: '',
              scannable: '1',
              ticket_id: '123',
              passout: '0'
            }
          },
          status: 200
        };
      } else {
        try {
          const validationTimeout = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Validation timed out')), 5000)
          );
          const validationPromise = validateQRCode(currentEventId, data, scanMode === 'scan-out' ? 'ScanOut' : undefined);
          validationResult = await Promise.race([validationPromise, validationTimeout]);
        } catch (validationError) {
          console.error('❌ Validation error:', validationError);
          feedback.checkInError();
          showErrorModal({
            type: 'general',
            title: 'Validation Error',
            message: 'Failed to validate QR code. Please try again.',
            guestName: undefined,
            ticketType: undefined
          });
          return;
        }
      }
      
      if (!validationResult) {
        console.log('❌ No validation result received');
        feedback.error();
        setShowCamera(false); // Close camera when showing validation error alert
        setIsScanning(false); // Stop scanning when showing validation error alert
        Alert.alert('Validation Error', 'Failed to validate QR code. Please try again.', [
          { text: 'OK', onPress: () => {
            setIsScanning(true);
            setShowCamera(true);
          }}
        ]);
        return;
      }
      
      console.log('✅ Validation complete:', JSON.stringify(validationResult, null, 2));

      // Handle scan-in mode
      if (scanMode === 'scan-in') {
        if (validationResult.error) {
          let errorMessage = 'This QR code is not valid for this event.';
          if (typeof validationResult.msg === 'string') {
            errorMessage = validationResult.msg;
          } else if (validationResult.msg && typeof validationResult.msg === 'object' && 'message' in validationResult.msg) {
            errorMessage = validationResult.msg.message;
          }
          
          const isAlreadyScannedError = errorMessage.toLowerCase().includes('already') || 
                                       errorMessage.toLowerCase().includes('scanned') ||
                                       errorMessage.toLowerCase().includes('checked in') ||
                                       validationResult.status === 409 ||
                                       validationResult.status === 400;
          
          if (isAlreadyScannedError) {
            let guestName = 'Guest';
            let ticketType = 'Ticket';
            let checkedInDate = 'Unknown time';
            
            if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
              const info = (validationResult.msg as any).info;
              guestName = info?.fullname || 'Guest';
              ticketType = info?.ticket_title || 'Ticket';
              checkedInDate = info?.checkedin_date ? new Date(info.checkedin_date).toLocaleString() : 'Unknown time';
            }
            
            feedback.alreadyScanned();
            showErrorModal({
              type: 'already-scanned',
              title: 'Already Scanned Ticket',
              message: 'Ticket is already checked in.',
              guestName,
              ticketType,
              checkedInDate
            });
            setTimeout(() => {
              if (!isScanning) {
                setIsScanning(true);
                setShowCamera(true);
              }
            }, 3000);
            return;
          }
          
          const isBlockingError = errorMessage.toLowerCase().includes('invalid') ||
                                 errorMessage.toLowerCase().includes('not found') ||
                                 errorMessage.toLowerCase().includes('expired') ||
                                 errorMessage.toLowerCase().includes('ticket not valid') ||
                                 validationResult.status === 404 ||
                                 validationResult.status === 403;
          
          if (isBlockingError) {
            let guestName = 'Guest';
            let ticketType = 'Ticket';
            
            if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
              const info = (validationResult.msg as any).info;
              guestName = info?.fullname || 'Guest';
              ticketType = info?.ticket_title || 'Ticket';
            }
            
            feedback.checkInError();
            showErrorModal({
              type: 'invalid-ticket',
              title: 'Ticket Not Valid',
              message: errorMessage,
              guestName,
              ticketType
            });
            setTimeout(() => {
              if (!isScanning) {
                setIsScanning(true);
                setShowCamera(true);
              }
            }, 3000);
            return;
          }
        }
        
        await performScanIn(data, validationResult);
        return;
      }
      
      // Handle scan-out mode
      if (scanMode === 'scan-out') {
        if (validationResult.error) {
          let errorMessage = 'This QR code is not valid for this event.';
          if (typeof validationResult.msg === 'string') {
            errorMessage = validationResult.msg;
          } else if (validationResult.msg && typeof validationResult.msg === 'object' && 'message' in validationResult.msg) {
            errorMessage = validationResult.msg.message;
          }
          
          const isNotCheckedInError = errorMessage.toLowerCase().includes('not checked in') ||
                                     errorMessage.toLowerCase().includes('not scanned');
          
          if (isNotCheckedInError) {
            let guestName = 'Guest';
            let ticketType = 'Ticket';
            
            if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
              const info = (validationResult.msg as any).info;
              guestName = info?.fullname || 'Guest';
              ticketType = info?.ticket_title || 'Ticket';
            }
            
            feedback.checkInError();
            showErrorModal({
              type: 'not-checked-in',
              title: 'Not Checked In',
              message: 'Ticket is not checked in.',
              guestName,
              ticketType
            });
            return;
          }
        }

        const info = (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg)
          ? (validationResult.msg as any).info
          : {};
        const isCheckedIn = info?.checkedin === 1 || info?.checkedin === '1' || info?.checkedin === true;
        
        if (!isCheckedIn) {
          const guestName = info?.fullname || 'Guest';
          const ticketType = info?.ticket_title || 'Ticket';
          feedback.checkInError();
          showErrorModal({
            type: 'not-checked-in',
            title: 'Not Checked In',
            message: 'Cannot check out. This ticket has not been checked in yet.',
            guestName,
            ticketType
          });
          return;
        }

        await performScanOut(data, validationResult);
        return;
      }
      
      feedback.checkInError();
      setShowCamera(false); // Close camera when showing error alert
      setIsScanning(false); // Stop scanning when showing error alert
      Alert.alert('Error', 'Unknown scan mode or validation issue.', [
        { text: 'OK', onPress: () => {
          setIsScanning(true);
          setShowCamera(true);
        }}
      ]);
      
    } catch (error) {
      console.error('QR scan error:', error);
      feedback.error();
      setShowCamera(false); // Close camera when showing error alert
      setIsScanning(false); // Stop scanning when showing error alert
      Alert.alert('Error', 'An unexpected error occurred while processing the QR code.', [
        { text: 'OK', onPress: () => {
          setIsScanning(true);
          setShowCamera(true);
        }}
      ]);
    } finally {
      clearTimeout(emergencyResumeTimeout);
    }
  }, [currentEventId, scanMode, isValidatingEvent]);

  const performScanIn = async (scanCode: string, validationResult: QRValidationResponse) => {
    try {
      const info = (validationResult && typeof validationResult.msg === 'object' && 'info' in validationResult.msg)
        ? (validationResult.msg as any).info
        : {};
      const available = Array.isArray(info?.availabletickets) ? info.availabletickets : [];
      
      if (available.length === 1) {
        const result = await scanQRCode(currentEventId, scanCode);
        if (!result || result.error) {
          feedback.checkInError();
          setShowCamera(false); // Close camera when showing scan failed alert
          setIsScanning(false); // Stop scanning when showing scan failed alert
          Alert.alert('Scan Failed', typeof result?.msg === 'string' ? result?.msg : (result?.msg?.message || 'Failed to check in'), [
            { text: 'OK', onPress: () => {
              setIsScanning(true);
              setShowCamera(true);
            }}
          ]);
          return;
        }
        feedback.checkIn();
        triggerGuestListRefresh(currentEventId);
        triggerAttendanceRefresh(currentEventId);
        triggerAnalyticsRefresh();
        
        // Show success modal for single ticket check-in
        const successMessage = typeof result.msg === 'string' ? result.msg : (result.msg?.message || 'Guest checked in successfully');
        showSuccessModal({
          type: 'check-in',
          guestName: info?.fullname || 'Guest',
          ticketType: info?.ticket_title || 'Ticket',
          message: successMessage
        });
        
        // Auto-close success modal and return to scanning after 2 seconds
        setTimeout(() => {
          handleSuccessModalClose();
        }, 2000);
        return;
      }

      setShowCamera(false);
      setIsScanning(false);
      setIsNavigatingAway(true);
      
      const purchaser = {
        email: info?.email || null,
        name: info?.fullname || null,
        bookingId: info?.booking_id || null
      };
      
      const tickets = (available.length > 0 ? available : [{
        ticket_identifier: scanCode,
        ticket_title: info?.ticket_title,
        checkedin: info?.checkedin,
        admit_name: info?.fullname,
        email: info?.email
      }]).map((t: any) => {
        const qr = t.ticket_identifier;
        return {
          id: qr,
          name: (t.admit_name && String(t.admit_name).trim()) ? t.admit_name : (purchaser.name || 'Guest'),
          email: purchaser.email || 'No email',
          ticketType: t.ticket_title || 'Ticket',
          ticketIdentifier: qr,
          isCheckedIn: t.checkedin === '1' || t.checkedin === 1 || false,
          qrCode: qr
        };
      });

      // Stop camera before navigating to ticket selection screen
      console.log('🔄 Stopping camera before ticket selection (scan-in)');
      setShowCamera(false);
      setIsScanning(false);
      setIsNavigatingAway(true);

      // Add delay to ensure camera fully stops before navigation
      setTimeout(() => {
        router.replace({
          pathname: '/(tabs)/ticket-action',
          params: {
            eventId: currentEventId,
            scanMode: 'scan-in',
            tickets: JSON.stringify(tickets),
            purchaser: JSON.stringify(purchaser),
            scannedTicketId: scanCode,
            singleTicketId: scanCode,
            returnToScanner: returnTo || ''
          }
        });
      }, 300); // 300ms delay to ensure camera stops
    } catch (err) {
      console.error('Scan in redirect error:', err);
      setIsNavigatingAway(false);
      feedback.error();
      Alert.alert('Error', 'Failed to open ticket action screen.');
    }
  };

  const performScanOut = async (scanCode: string, validationResult: QRValidationResponse) => {
    try {
      const info = (validationResult && typeof validationResult.msg === 'object' && 'info' in validationResult.msg)
        ? (validationResult.msg as any).info
        : {};
      const available = Array.isArray(info?.availabletickets) ? info.availabletickets : [];
      
      if (available.length === 1) {
        const result = await unscanQRCode(currentEventId, scanCode);
        if (!result || result.error) {
          feedback.checkInError();
          setShowCamera(false); // Close camera when showing check out failed alert
          setIsScanning(false); // Stop scanning when showing check out failed alert
          Alert.alert('Check Out Failed', typeof result?.msg === 'string' ? result?.msg : (result?.msg?.message || 'Failed to check out'), [
            { text: 'OK', onPress: () => {
              setIsScanning(true);
              setShowCamera(true);
            }}
          ]);
          return;
        }
        feedback.checkOut?.() || feedback.buttonPress();
        triggerGuestListRefresh(currentEventId);
        triggerAttendanceRefresh(currentEventId);
        triggerAnalyticsRefresh();
        
        // Show success modal for single ticket check-out
        const successMessage = typeof result.msg === 'string' ? result.msg : (result.msg?.message || 'Guest checked out successfully');
        showSuccessModal({
          type: 'check-out',
          guestName: info?.fullname || 'Guest',
          ticketType: info?.ticket_title || 'Ticket',
          message: successMessage
        });
        
        // Auto-close success modal and return to scanning after 2 seconds
        setTimeout(() => {
          handleSuccessModalClose();
        }, 2000);
        return;
      }

      setShowCamera(false);
      setIsScanning(false);
      setIsNavigatingAway(true);
      
      const purchaser = {
        email: info?.email || null,
        name: info?.fullname || null,
        bookingId: info?.booking_id || null
      };
      
      const tickets = (available.length > 0 ? available : [{
        ticket_identifier: scanCode,
        ticket_title: info?.ticket_title,
        checkedin: info?.checkedin,
        admit_name: info?.fullname,
        email: info?.email
      }]).map((t: any) => {
        const qr = t.ticket_identifier;
        return {
          id: qr,
          name: (t.admit_name && String(t.admit_name).trim()) ? t.admit_name : (purchaser.name || 'Guest'),
          email: purchaser.email || 'No email',
          ticketType: t.ticket_title || 'Ticket',
          ticketIdentifier: qr,
          isCheckedIn: t.checkedin === '1' || t.checkedin === 1 || false,
          qrCode: qr
        };
      });
      
      // Stop camera before navigating to ticket selection screen
      console.log('🔄 Stopping camera before ticket selection (scan-out)');
      setShowCamera(false);
      setIsScanning(false);
      setIsNavigatingAway(true);

      // Add delay to ensure camera fully stops before navigation
      setTimeout(() => {
        router.replace({
          pathname: '/(tabs)/ticket-action',
          params: {
            eventId: currentEventId,
            scanMode: 'scan-out',
            tickets: JSON.stringify(tickets),
            purchaser: JSON.stringify(purchaser),
            scannedTicketId: scanCode,
            singleTicketId: scanCode,
            returnToScanner: returnTo || ''
          }
        });
      }, 300); // 300ms delay to ensure camera stops
      
    } catch (err) {
      console.error('Scan out redirect error:', err);
      setIsNavigatingAway(false);
      feedback.error();
      Alert.alert('Error', 'Failed to open ticket action screen.');
    }
  };

  const customHeader = (
    <Animated.View 
      style={[
        styles.headerContainer, 
        { 
          backgroundColor: colors.background,
          opacity: headerOpacity
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.backButton}
        onPress={handleClose}
        activeOpacity={0.7}
      >
        <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.simpleEventHeader}
        onPress={() => setIsHeaderExpanded(!isHeaderExpanded)}
        activeOpacity={0.7}
      >
        <Text 
          style={[styles.eventNameSimple, { color: colors.text }]} 
          numberOfLines={isHeaderExpanded ? 0 : 1}
          ellipsizeMode="tail"
        >
          {isValidatingEvent ? 'Loading event...' : 
           (currentEventName && currentEventName !== '' ? currentEventName : 
            (currentEventId ? `Event #${currentEventId}` : 'Select Event'))}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  if (showEventSelection) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor="transparent" 
          translucent 
        />
        
        <Animated.View 
          style={[
            styles.eventSelectionContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ]
            }
          ]}
        >
          <View style={styles.eventSelectionContent}>
            <Animated.View 
              style={[
                styles.iconContainer,
                { 
                  backgroundColor: `${colors.primary}15`,
                  transform: [{ scale: pulseAnim }]
                }
              ]}
            >
              <LogIn size={60} color={colors.primary} strokeWidth={1.5} />
            </Animated.View>
            
            <Text style={[styles.eventSelectionTitle, { color: colors.text }]}>
              Select an Event
            </Text>
            
            <Text style={[styles.eventSelectionMessage, { color: isDark ? '#8E8E93' : '#666' }]}>
              Please choose an event first before you can start scanning QR codes for check-in or check-out.
            </Text>
            
            <TouchableOpacity
              style={[styles.selectEventButton, { backgroundColor: colors.primary }]}
              onPress={handleSelectEvent}
              activeOpacity={0.8}
            >
              <Text style={styles.selectEventButtonText}>Choose Event</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelButtonText, { color: isDark ? '#8E8E93' : '#666' }]}>
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor="transparent" 
        translucent 
      />
      
      <Animated.View 
        style={[
          styles.scannerWrapper,
          { 
            opacity: fadeAnim,
            transform: [
              { scale: Animated.multiply(scaleAnim, scanSuccessAnim) },
              { scale: scanPulseAnim }
            ]
          }
        ]}
      >
        <ModernQRScanner
          key={`scanner-${currentEventId}-${scanMode}-${showCamera ? 'active' : 'stopped'}`}
          onScan={handleScanResult}
          onClose={handleClose}
          headerTitle={currentEventName || 'Event Scanner'}
          pauseScanning={!isScanning}
          scanMode={scanMode === 'scan-out' ? 'passout' : 'scan-in' as QRScannerMode}
          onScanModeChange={(mode: QRScannerMode) => setScanMode(mode === 'passout' ? 'scan-out' : 'scan-in')}
          showCamera={showCamera}
        />
      </Animated.View>

      {errorData && (
        <ErrorModal
          visible={showErrorModalState}
          onClose={handleErrorModalClose}
          type={errorData.type}
          title={errorData.title}
          message={errorData.message}
          guestName={errorData.guestName}
          ticketType={errorData.ticketType}
          checkedInDate={errorData.checkedInDate}
        />
      )}

      {successData && (
        <SuccessModal
          visible={showSuccessModalState}
          onClose={handleSuccessModalClose}
          type={successData.type}
          guestName={successData.guestName}
          ticketType={successData.ticketType}
          message={successData.message}
          hideContinueButton={true}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scannerWrapper: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: 'column',
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  simpleEventHeader: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  eventNameSimple: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Event Selection Styles
  eventSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  eventSelectionContent: {
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  eventSelectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  eventSelectionMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    opacity: 0.8,
  },
  selectEventButton: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  selectEventButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});