import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LogIn } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import ErrorModal from '../../components/ErrorModal';
import QRScanner from '../../components/QRScanner';
import { useRefresh } from '../../context/RefreshContext';
import { useTheme } from '../../context/ThemeContext';
import {
    QRValidationResponse,
    getEvents,
    getGroupTickets,
    validateQRCode
} from '../../services/api';
import { feedback, initializeAudio } from '../../services/feedback';

const { width: screenWidth } = Dimensions.get('window');

type ScanMode = 'scan-in' | 'scan-out';
type QRScannerMode = 'scan-in' | 'passout';

interface GroupTicket {
  id: string;
  name: string;
  email: string;
  ticketType: string;
  ticketIdentifier: string;
  isCheckedIn: boolean;
  qrCode: string;
}

interface GroupScanData {
  tickets: GroupTicket[];
  purchaser: {
    email: string;
    name: string;
    bookingId: string;
  };
}

// DEBUG MODE - Set to true to bypass API calls
const DEBUG_MODE = false;

export default function ScannerScreen() {
  const { colors, isDark, selectedEventId, selectedEventName } = useTheme();
  const { triggerGuestListRefresh, triggerAttendanceRefresh, triggerAnalyticsRefresh } = useRefresh();
  const { eventId: paramEventId, returnTo } = useLocalSearchParams();
  
  const [currentEventId, setCurrentEventId] = useState<string>('');
  const [currentEventName, setCurrentEventName] = useState<string>('');
  const [scanMode, setScanMode] = useState<ScanMode>('scan-in');
  const [showEventSelection, setShowEventSelection] = useState(false);
  const [isValidatingEvent, setIsValidatingEvent] = useState(true);
  const [isScanning, setIsScanning] = useState(true); // Add scanning control state
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false); // Add header expansion state
  const [showCamera, setShowCamera] = useState(true); // Control camera visibility - start immediately
  const [isNavigatingAway, setIsNavigatingAway] = useState(false); // Track when navigating away from scanner
  const [showErrorModalState, setShowErrorModalState] = useState(false);
  const [errorData, setErrorData] = useState<{
    type: 'already-scanned' | 'not-checked-in' | 'invalid-ticket' | 'general';
    title?: string;
    message?: string;
    guestName?: string;
    ticketType?: string;
    checkedInDate?: string;
  } | null>(null);
  
  // Scanner states
  const [isProcessingGroup, setIsProcessingGroup] = useState(false);

  // Ensure camera is always available
  useEffect(() => {
    console.log('🔄 Scanner component mounted - ensuring camera is ready');
    setShowCamera(true);
    setIsScanning(true);
  }, []);

  // Removed auto-resume effect to prevent duplicate scans; resume is now explicit

  // Ensure camera is ready when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Scanner screen focused - ensuring camera is ready');
      
      // Reset navigation flag when coming back to scanner
      if (isNavigatingAway) {
        console.log('🔄 Resetting navigation flag - back to scanner');
        setIsNavigatingAway(false);
      }
      
      // Force camera restart by briefly closing and reopening
      setShowCamera(false);
      setTimeout(() => {
        setShowCamera(true);
        setIsScanning(true);
      }, 50);
    }, [isNavigatingAway])
  );

  useEffect(() => {
    initializeAudio();
    
    const checkEventSelection = async () => {
      setIsValidatingEvent(true);
      
      try {
        // Priority order: selectedEventId from context (most recent selection) > paramEventId > fallback
        const eventId = selectedEventId || (Array.isArray(paramEventId) ? paramEventId[0] : paramEventId) || '';
        
        console.log('Scanner - Event Selection Debug:', { 
          selectedEventId, 
          selectedEventName,
          paramEventId,
          chosenEventId: eventId,
          'selectedEventId exists': !!selectedEventId,
          'selectedEventName exists': !!selectedEventName,
          'paramEventId exists': !!paramEventId
        });
      
      // If no event ID at all, show selection screen
      if (!eventId || eventId === '') {
          console.log('❌ No event ID found, showing event selection screen');
        setShowEventSelection(true);
        setIsValidatingEvent(false);
        return;
      }
      
        // Update currentEventId immediately
        console.log(`✅ Setting currentEventId to: ${eventId}`);
        setCurrentEventId(eventId);
        
        // If we have a selectedEventName from context and it matches the event ID, use it directly
        if (selectedEventName && selectedEventName !== '' && selectedEventId === eventId) {
          console.log(`🎯 Using event from context: "${selectedEventName}" (ID: ${eventId})`);
          setCurrentEventName(selectedEventName);
          setShowEventSelection(false);
          setIsValidatingEvent(false);
          return;
        }
        
        // Otherwise, fetch the event name from API
        console.log(`🔍 Fetching event name from API for ID: ${eventId}`);
      try {
        const events = await getEvents();
          console.log(`📋 Found ${Array.isArray(events) ? events.length : 0} events from API`);
        
          const eventExists = Array.isArray(events) && events.find((event: any) => {
            // Try multiple ID comparison methods
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

  // Simplified event selection logic:
  // 1. Always prioritize selectedEventId and selectedEventName from context (set when user taps an event)
  // 2. Fall back to paramEventId from URL parameters
  // 3. If context has both eventId and eventName matching, use them directly (fastest)
  // 4. Otherwise fetch event name from API
  // This eliminates conflicts between multiple useEffect hooks

  const toggleScanMode = () => {
    feedback.buttonPress();
    // Flip mode, ensure camera/scanner are immediately ready
    setScanMode(scanMode === 'scan-in' ? 'scan-out' : 'scan-in');
    setShowCamera(true);
    setIsScanning(true);
  };

  const handleClose = () => {
    feedback.buttonPress();
    
    // If we have a returnTo parameter, use it
    if (returnTo) {
      router.push(returnTo as string);
    } else if (router.canGoBack()) {
      // Otherwise, use back navigation
      router.back();
    } else {
      // Fallback: Navigate to event details if we have an event ID, otherwise to events list
      const eventId = selectedEventId || paramEventId || currentEventId;
      if (eventId) {
        router.replace(`/(tabs)/${eventId}`);
      } else {
        router.replace('/(tabs)');
      }
    }
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
  }, []);

  const handleErrorModalClose = useCallback(() => {
    setShowErrorModalState(false);
    setErrorData(null);
    // Resume scanning
    setIsScanning(true);
    setShowCamera(true);
  }, []);

  // Prevent duplicate processing of the same code within a short window
  const lastProcessedRef = useRef<{ data: string; time: number }>({ data: '', time: 0 });

  // When the scan mode changes (check-in ↔︎ passout), allow immediate re-scan
  // of the same QR code by clearing the duplicate suppression state.
  useEffect(() => {
    console.log('🔁 Scan mode changed to', scanMode, '- clearing last processed guard');
    lastProcessedRef.current = { data: '', time: 0 };
  }, [scanMode]);

  const handleScanResult = useCallback(async (data: string) => {
    const now = Date.now();
    if (lastProcessedRef.current.data === data && now - lastProcessedRef.current.time < 3000) {
      console.log('⚠️ Ignoring duplicate scan of the same code within 3s');
      return;
    }
    lastProcessedRef.current = { data, time: now };
    // IMMEDIATE FAIL-SAFE: Resume scanning after 8 seconds no matter what
    const emergencyResumeTimeout = setTimeout(() => {
      console.log('🚨 EMERGENCY: Force resuming scanning after 8 seconds');
      setIsScanning(true);
      setShowCamera(true);
    }, 8000);
    
    // Store timeout reference for cleanup
    const timeoutRef = emergencyResumeTimeout;
    
    try {
      console.log('QR Code scanned:', data);
      console.log('Current scan mode:', scanMode);
      console.log('Validating against event ID:', currentEventId);
      
      // Pause scanning immediately to prevent multiple scans
      setIsScanning(false);
      
      // Guard: Ensure we have a valid currentEventId before proceeding
      if (!currentEventId || currentEventId === '' || isValidatingEvent) {
        console.log('Scanner not ready - currentEventId:', currentEventId, 'isValidatingEvent:', isValidatingEvent);
        feedback.warning();
        Alert.alert(
          'Scanner Not Ready', 
          'Please wait for event validation to complete before scanning.',
          [{ text: 'OK', onPress: () => {
            console.log('🔄 Resuming scanning after scanner not ready');
            setIsScanning(true);
            setShowCamera(true);
          }}] // Resume scanning when OK is pressed
        );
        return;
      }
      
      // First validate the QR code with timeout
      console.log('📍 Starting QR validation...');
      let validationResult: QRValidationResponse | null;
      
      if (DEBUG_MODE) {
        // Debug mode bypassing validation
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
          const validationPromise = validateQRCode(currentEventId, data);
          validationResult = await Promise.race([validationPromise, validationTimeout]);
        } catch (validationError) {
          console.error('❌ Validation error:', validationError);
          feedback.checkInError();
          
          // Show error modal instead of alert
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
        Alert.alert('Validation Error', 'Failed to validate QR code. Please try again.', [
          { text: 'OK', onPress: () => {
            console.log('🔄 Resuming scanning after no validation result');
            setIsScanning(true);
            setShowCamera(true);
          }} // Resume scanning when OK is pressed
        ]);
        return;
      }
      
      console.log('✅ Validation complete:', JSON.stringify(validationResult, null, 2));

      // Check for group booking regardless of scan mode
      console.log('Checking for group booking...');
      
      try {
        console.log('🔍 Fetching group tickets for QR:', data);
        const groupResult = await getGroupTickets(currentEventId, data, validationResult);
        console.log('📋 Group result:', groupResult);
        
        // If we found multiple tickets for the same purchaser, it's a group booking
        if (!groupResult.error && groupResult.tickets && groupResult.tickets.length > 1) {
          console.log('Group booking detected with', groupResult.tickets.length, 'tickets');
          
          // Show all tickets that can be processed in this scan mode (including the scanned ticket)
          const scannedTicket = groupResult.tickets.find((ticket: GroupTicket) => 
            ticket.qrCode === data || ticket.ticketIdentifier === data || ticket.id === data
          );
          
          const relevantTickets = scanMode === 'scan-in' 
            ? groupResult.tickets.filter((ticket: GroupTicket) => {
                const canCheckIn = !ticket.isCheckedIn;
                console.log(`Ticket ${ticket.id}: canCheckIn=${canCheckIn}, isCheckedIn=${ticket.isCheckedIn}, qrCode=${ticket.qrCode}, ticketId=${ticket.ticketIdentifier}`);
                return canCheckIn;
              })
            : groupResult.tickets.filter((ticket: GroupTicket) => {
                const canCheckOut = ticket.isCheckedIn;
                console.log(`Ticket ${ticket.id}: canCheckOut=${canCheckOut}, isCheckedIn=${ticket.isCheckedIn}, qrCode=${ticket.qrCode}, ticketId=${ticket.ticketIdentifier}`);
                return canCheckOut;
              });
          
          console.log('Relevant tickets for', scanMode, ':', relevantTickets.length);
          console.log('Scanned ticket found:', scannedTicket ? 'Yes' : 'No');
          console.log('Scanned QR code:', data);
          console.log('All tickets:', groupResult.tickets.map((t: GroupTicket) => ({
            id: t.id,
            qrCode: t.qrCode,
            ticketIdentifier: t.ticketIdentifier,
            isCheckedIn: t.isCheckedIn,
            matchesScanned: t.qrCode === data || t.ticketIdentifier === data || t.id === data
          })));
          console.log('Filtered relevant tickets:', relevantTickets.map((t: GroupTicket) => ({
            id: t.id,
            qrCode: t.qrCode,
            ticketIdentifier: t.ticketIdentifier,
            isCheckedIn: t.isCheckedIn,
            matchesScanned: t.qrCode === data || t.ticketIdentifier === data || t.id === data
          })));
          console.log('Filter criteria - Scanned QR:', data, 'Scan mode:', scanMode);
          
          if (relevantTickets.length > 0) {
            // Show all relevant group tickets (including scanned one)
            console.log('Showing group tickets for selection:', relevantTickets.map((t: GroupTicket) => ({ 
              id: t.id, 
              name: t.name,
              email: t.email 
            })));
            
            console.log('Setting up group redirect with scanned ticket pre-selected');
            
            // Navigate to ticket action screen for group tickets
            // Remove sound here - will play after successful completion in ticket-action
            setShowCamera(false); // Turn off camera
            setIsScanning(false);
            setIsNavigatingAway(true); // Mark that we're navigating away
            router.push({
              pathname: '/(tabs)/ticket-action',
              params: {
                eventId: currentEventId,
                scanMode: scanMode,
                tickets: JSON.stringify(relevantTickets),
                purchaser: JSON.stringify(groupResult.purchaser),
                scannedTicketId: data, // Pass the scanned ticket ID for pre-selection
                returnToScanner: returnTo || '' // Pass the return path for proper back navigation
              }
            });
            return;
          } else {
            // No remaining tickets to process in the group
            console.log('No additional tickets to process in group');

            // Construct a clearer message depending on scan mode
            const purchaserName = groupResult?.purchaser?.name || scannedTicket?.name || 'Group';
            const message = scanMode === 'scan-in'
              ? 'All tickets in this group are already checked in.'
              : 'No tickets in this group are currently checked in.';

            // Haptic/error feedback and a visible log/modal
            feedback.alreadyScanned();
            showErrorModal({
              type: 'already-scanned',
              title: scanMode === 'scan-in' ? 'Already Checked In' : 'Nothing To Check Out',
              message,
              guestName: purchaserName,
              ticketType: 'Group Booking',
              checkedInDate: undefined
            });

            // Also trigger refreshes
            triggerGuestListRefresh(currentEventId);
            triggerAttendanceRefresh(currentEventId);
            triggerAnalyticsRefresh();

            // Fail-safe: auto-resume scanning if user doesn't interact
            setTimeout(() => {
              if (!isScanning) {
                console.log('⏳ Auto-resuming scanning after group with no remaining tickets');
                setIsScanning(true);
                setShowCamera(true);
              }
            }, 3000);
            return;
          }
        }
      } catch (groupError) {
        console.error('❌ Group scan error:', groupError);
        console.log('🔄 Continuing with individual scan due to group scan error');
        // Continue with individual scan
      }
      
      // Handle as individual ticket - scan in mode
      if (scanMode === 'scan-in') {
        console.log('Scan in mode - checking validation result:', validationResult);
        
        // For scan-in, check if ticket is already scanned
        if (validationResult.error) {
          let errorMessage = 'This QR code is not valid for this event.';
          if (typeof validationResult.msg === 'string') {
            errorMessage = validationResult.msg;
          } else if (validationResult.msg && typeof validationResult.msg === 'object' && 'message' in validationResult.msg) {
            errorMessage = validationResult.msg.message;
          }
          
          // Check if this is an "already scanned" error
          const isAlreadyScannedError = errorMessage.toLowerCase().includes('already') || 
                                       errorMessage.toLowerCase().includes('scanned') ||
                                       errorMessage.toLowerCase().includes('checked in') ||
                                       errorMessage.toLowerCase().includes('cannot check in') ||
                                       validationResult.status === 409 ||
                                       validationResult.status === 400;
          
          if (isAlreadyScannedError) {
            // Extract guest information for better error message
            let guestName = 'Guest';
            let ticketType = 'Ticket';
            let checkedInDate = 'Unknown time';
            
            if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
              const info = (validationResult.msg as any).info;
              guestName = info?.fullname || 'Guest';
              ticketType = info?.ticket_title || 'Ticket';
              checkedInDate = info?.checkedin_date ? new Date(info.checkedin_date).toLocaleString() : 'Unknown time';
            }
            
            // Show immediate status for already scanned ticket
            feedback.alreadyScanned();
            showErrorModal({
              type: 'already-scanned',
              title: 'Already Scanned Ticket',
              message: 'Ticket is already checked in.',
              guestName,
              ticketType,
              checkedInDate
            });
            console.log('ℹ️ Ticket is already checked in');
            // Fail-safe: if the modal isn't dismissed, auto-resume scanning after 3s
            setTimeout(() => {
              if (!isScanning) {
                console.log('⏳ Auto-resuming scanning after already-scanned notice');
                setIsScanning(true);
                setShowCamera(true);
              }
            }, 3000);
            return;
          }
          
          // Check if this is a blocking error that prevents scan-in
          const isBlockingError = errorMessage.toLowerCase().includes('invalid') ||
                                 errorMessage.toLowerCase().includes('not found') ||
                                 errorMessage.toLowerCase().includes('expired') ||
                                 errorMessage.toLowerCase().includes('wrong event') ||
                                 validationResult.status === 404;
          
          if (isBlockingError) {
            // This is a real error that prevents scan-in
            feedback.checkInError();
            Alert.alert('Invalid QR Code', errorMessage, [
              { text: 'OK', onPress: () => {
                console.log('🔄 Resuming scanning after invalid QR code (scan-in)');
                setIsScanning(true);
                setShowCamera(true);
              }} // Resume scanning when OK is pressed
            ]);
            return;
          }
          
          console.log('Validation error but proceeding with scan in attempt:', errorMessage);
        } else {
          console.log('Validation successful - proceeding with scan in');
        }
        
        // Remove sound here - will play after successful completion in ticket-action
        console.log('Performing individual scan in...');
        await performScanIn(data, validationResult);
        return;
      }
      
      // Handle as individual ticket - scan out mode
      if (scanMode === 'scan-out') {
        console.log('Scan out mode - checking validation result:', validationResult);
        
        // For scan-out, we expect the ticket to be already checked in
        if (validationResult.error) {
          let errorMessage = 'This QR code is not valid for this event.';
          if (typeof validationResult.msg === 'string') {
            errorMessage = validationResult.msg;
          } else if (validationResult.msg && typeof validationResult.msg === 'object' && 'message' in validationResult.msg) {
            errorMessage = validationResult.msg.message;
          }
          
          // Check if this is a "not checked in" error (ticket exists but not checked in)
          const isNotCheckedInError = errorMessage.toLowerCase().includes('not checked in') ||
                                     errorMessage.toLowerCase().includes('not scanned') ||
                                     errorMessage.toLowerCase().includes('not admitted') ||
                                     errorMessage.toLowerCase().includes('cannot check out');
          
          if (isNotCheckedInError) {
            // Extract guest information for better error message
            let guestName = 'Guest';
            let ticketType = 'Ticket';
            
            if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
              const info = (validationResult.msg as any).info;
              guestName = info?.fullname || 'Guest';
              ticketType = info?.ticket_title || 'Ticket';
            }
            
            // Show immediate status for not-checked-in ticket
            feedback.checkInError();
            showErrorModal({
              type: 'not-checked-in',
              title: 'Not Checked In',
              message: 'Ticket is not checked in.',
              guestName,
              ticketType
            });
            console.log('ℹ️ Ticket is not checked in');
            return;
          }
          
          // Check if this is a "already checked in" error, which is expected for scan out
          const isAlreadyCheckedInError = errorMessage.toLowerCase().includes('already') || 
                                         errorMessage.toLowerCase().includes('scanned') ||
                                         errorMessage.toLowerCase().includes('checked in') ||
                                         errorMessage.toLowerCase().includes('cannot check in') ||
                                         validationResult.status === 409 ||
                                         validationResult.status === 400;
          
          if (!isAlreadyCheckedInError) {
            // This is a real error (ticket not valid, wrong event, etc.)
            feedback.checkInError();
            Alert.alert('Invalid QR Code', errorMessage, [
              { text: 'OK', onPress: () => {
                console.log('🔄 Resuming scanning after invalid QR code (scan-out)');
                setIsScanning(true);
                setShowCamera(true);
              }} // Resume scanning when OK is pressed
            ]);
            return;
          }
          
          console.log('Ticket is already checked in - proceeding with scan out');
        } else {
          // If validation succeeded, check if ticket is actually checked in
          const info = (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg)
            ? (validationResult.msg as any).info
            : {};
          
          const isCheckedIn = info?.checkedin === 1 || info?.checkedin === '1' || info?.checkedin === true;
          
          if (!isCheckedIn) {
            // Ticket is valid but not checked in - show error
            let guestName = info?.fullname || 'Guest';
            let ticketType = info?.ticket_title || 'Ticket';
            
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
          
          console.log('Ticket is valid and checked in - proceeding with scan out');
        }
        
        // Remove sound here - will play after successful completion in ticket-action
        console.log('Performing individual scan out...');
        
        // Ensure scanning is resumed even if performScanOut throws
        try {
          await performScanOut(data, validationResult);
        } catch (scanOutError) {
          console.error('Error in performScanOut:', scanOutError);
          setIsScanning(true); // Force resume on error
          throw scanOutError;
        }
        return;
      }
      
      // This shouldn't be reached, but just in case
      feedback.checkInError();
      Alert.alert('Error', 'Unknown scan mode or validation issue.', [
        { text: 'OK', onPress: () => {
          console.log('🔄 Resuming scanning after unknown error');
          setIsScanning(true);
          setShowCamera(true);
        }} // Resume scanning when OK is pressed
      ]);
      
    } catch (error) {
      console.error('QR scan error:', error);
      feedback.error();
      Alert.alert('Error', 'An unexpected error occurred while processing the QR code.', [
        { text: 'OK', onPress: () => {
          console.log('🔄 Resuming scanning after unexpected error');
          setIsScanning(true);
          setShowCamera(true);
        }} // Resume scanning when OK is pressed
      ]);
    } finally {
      // Clear the emergency timeout since we're done
      clearTimeout(emergencyResumeTimeout);
      // Don't close camera here - let the individual scan functions handle it
      console.log('🔄 handleScanResult finally: Not closing camera - letting individual functions handle it');
    }
  }, [currentEventId, scanMode]);

  const performScanIn = async (scanCode: string, validationResult: QRValidationResponse) => {
    try {
      // Turn off camera and navigate to ticket action screen for a single ticket
      setShowCamera(false);
      setIsScanning(false);
      setIsNavigatingAway(true); // Mark that we're navigating away

      const info = (validationResult && typeof validationResult.msg === 'object' && 'info' in validationResult.msg)
        ? (validationResult.msg as any).info
        : {};

      const ticket = {
        id: scanCode,
        name: info?.fullname || 'Guest',
        email: info?.email || '',
        ticketType: info?.ticket_title || 'Ticket',
        ticketIdentifier: scanCode,
        isCheckedIn: false,
        qrCode: scanCode
      };

      router.push({
        pathname: '/(tabs)/ticket-action',
        params: {
          eventId: currentEventId,
          scanMode: 'scan-in',
          tickets: JSON.stringify([ticket]),
          singleTicketId: scanCode,
          returnToScanner: returnTo || '' // Pass the return path for proper back navigation
        }
      });
    } catch (err) {
      console.error('Scan in redirect error:', err);
      setIsNavigatingAway(false); // Reset flag on error
      feedback.error();
      Alert.alert('Error', 'Failed to open ticket action screen.');
    }
  };

  const performScanOut = async (scanCode: string, validationResult: QRValidationResponse) => {
    try {
      // Navigate to ticket action screen for single ticket
      setShowCamera(false); // Turn off camera
      setIsScanning(false);
      setIsNavigatingAway(true); // Mark that we're navigating away
      
      const info = (validationResult && typeof validationResult.msg === 'object' && 'info' in validationResult.msg)
        ? (validationResult.msg as any).info
        : {};
      
      const ticket = {
        id: scanCode,
        name: info?.fullname || 'Guest',
        email: info?.email || '',
        ticketType: info?.ticket_title || 'Ticket',
        ticketIdentifier: scanCode,
        isCheckedIn: true,
        qrCode: scanCode
      };
      
      router.push({
        pathname: '/(tabs)/ticket-action',
        params: {
          eventId: currentEventId,
          scanMode: 'scan-out',
          tickets: JSON.stringify([ticket]),
          singleTicketId: scanCode,
          returnToScanner: returnTo || '' // Pass the return path for proper back navigation
        }
      });
      
    } catch (err) {
      console.error('Scan out redirect error:', err);
      setIsNavigatingAway(false); // Reset flag on error
      feedback.error();
      Alert.alert('Error', 'Failed to open ticket action screen.');
    }
  };

  // Removed group modal functionality - now handled in ticket-action page

  // Removed group modal functionality - now handled in ticket-action page

  // Removed ticket selection functions - now handled in ticket-action page

  // Removed group selection useEffect hooks - now handled in ticket-action page

  // Removed group scan modal - now handled in ticket-action page

  const customHeader = (
    <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={handleClose}
        activeOpacity={0.8}
      >
        <Text style={[styles.backButtonText, { color: colors.text }]}>← Back</Text>
      </TouchableOpacity>
      
      {/* Event Name */}
      <TouchableOpacity 
        style={styles.simpleEventHeader}
        onPress={() => setIsHeaderExpanded(!isHeaderExpanded)}
        activeOpacity={0.8}
      >
        <Text style={[styles.eventNameSimple, { color: colors.text }]} 
              numberOfLines={isHeaderExpanded ? 0 : 1}
              ellipsizeMode="tail">
          {isValidatingEvent ? 'Loading event...' : 
           (currentEventName && currentEventName !== '' ? currentEventName : 
            (currentEventId ? `Event #${currentEventId}` : 'Select Event'))}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Show event selection prompt if no event is selected
  if (showEventSelection) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor="transparent" 
          translucent 
        />
        
        <View style={styles.eventSelectionContainer}>
          <View style={styles.eventSelectionContent}>
            <View style={styles.iconContainer}>
              <LogIn size={60} color={colors.primary} strokeWidth={1.5} />
            </View>
            
            <Text style={[styles.eventSelectionTitle, { color: colors.text }]}>
              Select an Event
            </Text>
            
            <Text style={[styles.eventSelectionMessage, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
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
              style={styles.backButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.backButtonText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
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
      
      {showCamera && (
        <QRScanner
          key={`scanner-${currentEventId}-${scanMode}`}
          onScan={handleScanResult}
          onClose={handleClose}
          customHeader={customHeader}
          showCloseButton={true}
          headerTitle={scanMode === 'scan-in' ? 'Smart Check In' : 'Smart Check Out'}
          pauseScanning={!isScanning}
          onRequestResume={handleRequestResume}
          // Map internal 'scan-out' to QRScanner's 'passout'
          scanMode={scanMode === 'scan-out' ? 'passout' : 'scan-in' as QRScannerMode}
          onScanModeChange={(mode: QRScannerMode) => setScanMode(mode === 'passout' ? 'scan-out' : 'scan-in')}
        />
      )}

      {/* Error Modal */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  // Clean Event Header
  eventHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  eventNameClean: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Main Action Section
  mainActionSection: {
    marginBottom: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  checkInToggle: {
    marginRight: 2,
  },
  checkOutToggle: {
    marginLeft: 2,
  },
  activeToggle: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  instructionText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.7,
  },
  // Smart Scan Info
  smartScanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  smartScanText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
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
    maxWidth: 300,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  eventSelectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  eventSelectionMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  selectEventButton: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectEventButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Removed group modal styles - now handled in ticket-action page
  // Compact Event Header Styles
  simpleEventHeader: {
    alignItems: 'center',
    marginBottom: 0,
  },
  eventNameSimple: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  expandHint: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.5,
    textAlign: 'center',
    marginTop: 4,
  },
  // Scanner Control Styles
  scannerControlContainer: {
    flex: 1,
  },
  scannerControlContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scanIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  scannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  scannerDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    opacity: 0.8,
  },
  startScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  startScanButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
});