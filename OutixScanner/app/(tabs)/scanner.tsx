import { router, useLocalSearchParams } from 'expo-router';
import { Check, LogIn, QrCode, Square, UserCheck } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    SafeAreaView,
    ScrollView,
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
    getGroupTickets,
    scanGroupTickets,
    scanQRCode,
    unscanGroupTickets,
    unscanQRCode,
    validateQRCode
} from '../../services/api';
import { feedback, initializeAudio } from '../../services/feedback';

const { width: screenWidth } = Dimensions.get('window');

type ScanMode = 'scan-in' | 'scan-out';

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
const DEBUG_MODE = true;

export default function ScannerScreen() {
  const { colors, selectedEventId, selectedEventName } = useTheme();
  const { triggerGuestListRefresh, triggerAttendanceRefresh, triggerAnalyticsRefresh } = useRefresh();
  const { eventId: paramEventId } = useLocalSearchParams();
  
  const [currentEventId, setCurrentEventId] = useState<string>('');
  const [currentEventName, setCurrentEventName] = useState<string>('');
  const [scanMode, setScanMode] = useState<ScanMode>('scan-in');
  const [showEventSelection, setShowEventSelection] = useState(false);
  const [isValidatingEvent, setIsValidatingEvent] = useState(true);
  const [isScanning, setIsScanning] = useState(true); // Add scanning control state
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false); // Add header expansion state
  const [showCamera, setShowCamera] = useState(false); // Control camera visibility
  
  // Group scan modal states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupScanData, setGroupScanData] = useState<GroupScanData | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [scannedTicketId, setScannedTicketId] = useState<string | null>(null);
  const [isProcessingGroup, setIsProcessingGroup] = useState(false);

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
    setScanMode(scanMode === 'scan-in' ? 'scan-out' : 'scan-in');
  };

  const handleClose = () => {
    feedback.buttonPress();
    
    // Check if we have a selected event (came from event detail page)
    // If so, navigate back to that specific event detail page
    if (selectedEventId && selectedEventId !== '') {
      router.push(`/(tabs)/${selectedEventId}`);
    } else {
      // Otherwise, just go back to previous screen
    router.back();
    }
  };

  const handleSelectEvent = () => {
    feedback.buttonPress();
    router.push('/(tabs)');
  };

  const handleRequestResume = () => {
    setIsScanning(true);
    setShowCamera(true);
  };

  const handleStartScanning = () => {
    setShowCamera(true);
    setIsScanning(true);
  };

  const handleScanResult = useCallback(async (data: string) => {
    // IMMEDIATE FAIL-SAFE: Resume scanning after 8 seconds no matter what
    const emergencyResumeTimeout = setTimeout(() => {
      console.log('🚨 EMERGENCY: Force resuming scanning after 8 seconds');
      setIsScanning(true);
    }, 8000);
    
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
          [{ text: 'OK', onPress: () => setIsScanning(true) }] // Resume scanning when OK is pressed
        );
        return;
      }
      
      // First validate the QR code with timeout
      console.log('📍 Starting QR validation...');
      let validationResult: QRValidationResponse | null;
      
      if (DEBUG_MODE) {
        console.log('🐛 DEBUG MODE: Bypassing validation');
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
          feedback.error();
          Alert.alert('Validation Error', 'Failed to validate QR code. Please try again.', [
            { text: 'OK', onPress: () => setIsScanning(true) }
          ]);
          return;
        }
      }
      
      if (!validationResult) {
        console.log('❌ No validation result received');
        feedback.error();
        Alert.alert('Validation Error', 'Failed to validate QR code. Please try again.', [
          { text: 'OK', onPress: () => setIsScanning(true) } // Resume scanning when OK is pressed
        ]);
        return;
      }
      
      console.log('✅ Validation complete:', JSON.stringify(validationResult, null, 2));

      // Check for group booking regardless of scan mode
      console.log('Checking for group booking...');
      
      try {
        const groupResult = await getGroupTickets(currentEventId, data);
        
        // If we found multiple tickets for the same purchaser, it's a group booking
        if (!groupResult.error && groupResult.tickets && groupResult.tickets.length > 1) {
          console.log('Group booking detected with', groupResult.tickets.length, 'tickets');
          
          // Filter tickets based on scan mode
          const relevantTickets = scanMode === 'scan-in' 
            ? groupResult.tickets.filter((ticket: GroupTicket) => !ticket.isCheckedIn)
            : groupResult.tickets.filter((ticket: GroupTicket) => ticket.isCheckedIn);
          
          console.log('Relevant tickets for', scanMode, ':', relevantTickets.length);
          
          if (relevantTickets.length > 1) {
            // Show group scan modal for multiple relevant tickets
            console.log('Setting up group scan data with tickets:', relevantTickets.map((t: GroupTicket) => ({ 
              id: t.id, 
              name: t.name,
              email: t.email 
            })));
            
            // Set which ticket was actually scanned
            setScannedTicketId(data);
            console.log('Setting scanned ticket ID:', data);
            
            setGroupScanData({
              tickets: relevantTickets,
              purchaser: groupResult.purchaser
            });
            setShowGroupModal(true);
            feedback.success();
            return;
          } else if (relevantTickets.length === 1) {
            // Only one relevant ticket, give user choice between individual or group scan
            const action = scanMode === 'scan-in' ? 'check in' : 'check out';
            const actionPastTense = scanMode === 'scan-in' ? 'checked in' : 'checked out';
            const otherTicketsCount = groupResult.tickets.length - relevantTickets.length;
            const otherTicketsText = otherTicketsCount > 0 
              ? `\n\n${otherTicketsCount} other ticket(s) in this group are already ${actionPastTense}.`
              : '';
            
            Alert.alert(
              'Group Booking Detected',
              `This ticket is part of a group booking with ${groupResult.tickets.length} tickets.\n\nWould you like to ${action} just this ticket or see all group tickets?${otherTicketsText}`,
              [
                { text: 'Cancel', style: 'cancel', onPress: () => setIsScanning(true) }, // Resume scanning when cancelled
                { 
                  text: `Just This Ticket`, 
                  onPress: () => {
                    // Process only the scanned individual ticket
                    console.log(`Processing individual ticket from group: ${data}`);
                    if (scanMode === 'scan-in') {
                      performScanIn(data, validationResult);
                    } else {
                      performScanOut(data, validationResult);
                    }
                  }
                },
                {
                  text: 'Show Group',
                  onPress: () => {
                    // Show group modal with all relevant tickets
                    setScannedTicketId(data);
                    console.log('Setting scanned ticket ID for Show Group:', data);
                    setGroupScanData({
                      tickets: relevantTickets,
                      purchaser: groupResult.purchaser
                    });
                    setShowGroupModal(true);
                  }
                }
              ]
            );
            return;
          } else {
            // No relevant tickets for current scan mode
            const message = scanMode === 'scan-in' 
              ? 'All tickets in this group are already checked in.'
              : 'No tickets in this group are checked in yet.';
            
            feedback.warning();
            Alert.alert('Group Booking', message, [
              { text: 'OK', onPress: () => setIsScanning(true) } // Resume scanning when OK is pressed
            ]);
            return;
          }
        }
      } catch (groupError) {
        console.log('No group booking detected or error:', groupError);
        // Continue with individual scan
      }
      
      // Handle as individual ticket - scan in mode
      if (scanMode === 'scan-in') {
        console.log('Scan in mode - checking validation result:', validationResult);
        
        // For scan-in, some validation errors might still allow scan attempts
        if (validationResult.error) {
          let errorMessage = 'This QR code is not valid for this event.';
          if (typeof validationResult.msg === 'string') {
            errorMessage = validationResult.msg;
          } else if (validationResult.msg && typeof validationResult.msg === 'object' && 'message' in validationResult.msg) {
            errorMessage = validationResult.msg.message;
          }
          
          // Check if this is a blocking error that prevents scan-in
          const isBlockingError = errorMessage.toLowerCase().includes('invalid') ||
                                 errorMessage.toLowerCase().includes('not found') ||
                                 errorMessage.toLowerCase().includes('expired') ||
                                 errorMessage.toLowerCase().includes('wrong event') ||
                                 validationResult.status === 404;
          
          if (isBlockingError) {
            // This is a real error that prevents scan-in
            feedback.qrScanError();
            Alert.alert('Invalid QR Code', errorMessage, [
              { text: 'OK', onPress: () => setIsScanning(true) } // Resume scanning when OK is pressed
            ]);
            return;
          }
          
          console.log('Validation error but proceeding with scan in attempt:', errorMessage);
        } else {
          console.log('Validation successful - proceeding with scan in');
        }
        
        feedback.success();
        console.log('Performing individual scan in...');
        await performScanIn(data, validationResult);
        return;
      }
      
      // Handle as individual ticket - scan out mode
      if (scanMode === 'scan-out') {
        console.log('Scan out mode - checking validation result:', validationResult);
        
        // For scan-out, we expect the ticket to be already checked in
        // So if validation returns an error saying "already checked in" or similar,
        // we should proceed with the unscan operation
      if (validationResult.error) {
        let errorMessage = 'This QR code is not valid for this event.';
        if (typeof validationResult.msg === 'string') {
          errorMessage = validationResult.msg;
        } else if (validationResult.msg && typeof validationResult.msg === 'object' && 'message' in validationResult.msg) {
          errorMessage = validationResult.msg.message;
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
            feedback.qrScanError();
            Alert.alert('Invalid QR Code', errorMessage, [
              { text: 'OK', onPress: () => setIsScanning(true) } // Resume scanning when OK is pressed
            ]);
        return;
          }
          
          console.log('Ticket is already checked in - proceeding with scan out');
        } else {
          // If validation succeeded, the ticket is valid but may not be checked in yet
          console.log('Ticket is valid - proceeding with scan out attempt');
      }
      
      feedback.success();
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
      feedback.qrScanError();
      Alert.alert('Error', 'Unknown scan mode or validation issue.', [
        { text: 'OK', onPress: () => setIsScanning(true) } // Resume scanning when OK is pressed
      ]);
      
    } catch (error) {
      console.error('QR scan error:', error);
      feedback.error();
      Alert.alert('Error', 'An unexpected error occurred while processing the QR code.', [
        { text: 'OK', onPress: () => setIsScanning(true) } // Resume scanning when OK is pressed
      ]);
    } finally {
      // Clear the emergency timeout since we're done
      clearTimeout(emergencyResumeTimeout);
      // Close camera after scanning
      console.log('🔄 handleScanResult finally: Closing camera');
      setShowCamera(false);
      setIsScanning(false);
    }
  }, [currentEventId, scanMode]);

  const performScanIn = async (scanCode: string, validationResult: QRValidationResponse) => {
    let shouldResumeScanning = false;
    
    try {
      // Provide immediate feedback
      feedback.success();
      
      console.log('Scanning QR code for event', currentEventId, ', scancode:', scanCode);
      
      // Add timeout to prevent hanging (35 seconds - longer than API timeout)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Check-in operation timed out')), 35000)
      );
      
      const scanPromise = scanQRCode(currentEventId, scanCode);
      const scanResult: any = await Promise.race([scanPromise, timeoutPromise]);
      
      if (!scanResult || scanResult.error) {
        let errorMessage = 'This guest cannot be checked in.';
        if (scanResult?.msg && typeof scanResult.msg === 'string') {
          errorMessage = scanResult.msg;
        } else if (scanResult?.msg && typeof scanResult.msg === 'object' && 'message' in scanResult.msg) {
          errorMessage = scanResult.msg.message;
        }
        
        feedback.error();
        shouldResumeScanning = true;
        Alert.alert('Check-in Failed', errorMessage, [
          { text: 'OK', onPress: () => setIsScanning(true) } // Resume scanning when OK is pressed
        ]);
        return;
      }
      
      // Quick success feedback
      feedback.checkIn();
      shouldResumeScanning = true;
      
      const ticketInfo = validationResult.msg && typeof validationResult.msg === 'object' ? validationResult.msg.info : undefined;
      const guestName = ticketInfo?.fullname || 'Guest';
      
      // Simplified success message
      Alert.alert(
        '✅ Checked In',
        `${guestName} successfully checked in!`,
        [{ text: 'OK', onPress: () => setIsScanning(true) }], // Resume scanning when OK is pressed
        { cancelable: true }
      );
      
      // Trigger refresh for all related components
      triggerGuestListRefresh(currentEventId);
      triggerAttendanceRefresh(currentEventId);
      triggerAnalyticsRefresh();
      
    } catch (error) {
      console.error('Scan in error:', error);
      feedback.error();
      
      // Handle timeout specifically
      if (error instanceof Error && error.message.includes('timed out')) {
        shouldResumeScanning = true;
        Alert.alert(
          'Timeout Error', 
          'The check-in operation took too long. Please check your internet connection and try again.',
          [{ text: 'OK', onPress: () => setIsScanning(true) }]
        );
      } else {
        shouldResumeScanning = true;
        Alert.alert('Check-in Error', 'Failed to check in guest. Please try again.', [
          { text: 'OK', onPress: () => setIsScanning(true) } // Resume scanning when OK is pressed
        ]);
      }
    } finally {
      // Fail-safe: if for some reason scanning isn't resumed, force resume after 3 seconds
      if (shouldResumeScanning) {
        setTimeout(() => {
          setIsScanning(true);
        }, 3000);
      }
    }
  };

  const performScanOut = async (scanCode: string, validationResult: QRValidationResponse) => {
    let shouldResumeScanning = true; // Default to true to ensure scanning resumes
    
    // Set up immediate fail-safe right at the start
    const failSafeTimeout = setTimeout(() => {
      console.log('⏰ FAIL-SAFE: Force resuming scanning after 5 seconds');
      setIsScanning(true);
    }, 5000);
    
    try {
      // Provide immediate feedback
      feedback.success();
      
      console.log('🔄 Starting checkout process for event', currentEventId, ', scancode:', scanCode);
      console.log('🔄 Current scanning state:', !isScanning ? 'PAUSED' : 'ACTIVE');
      console.log('🔄 Validation result:', JSON.stringify(validationResult, null, 2));
      
      // Add timeout to prevent hanging (10 seconds for faster feedback)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Checkout operation timed out')), 10000)
      );
      
      // Test bypass - uncomment to skip API call for testing
      // const unscanResult: any = { error: false, msg: { message: 'Test checkout successful' }, status: 200 };
      // console.log('🔄 BYPASSING API CALL FOR TESTING');
      
      let unscanResult: any;
      
      // Check if we're in debug mode or testing with mock QR codes
      if (DEBUG_MODE || scanCode.startsWith('MOCK_QR_')) {
        console.log('🐛 DEBUG MODE or Mock QR: Bypassing API call');
        unscanResult = { error: false, msg: { message: 'Debug/Mock checkout successful' }, status: 200 };
        console.log('✅ Debug/Mock checkout response:', unscanResult);
      } else {
        // Normal API call
        const unscanPromise = unscanQRCode(currentEventId, scanCode);
        console.log('🔄 Calling unscanQRCode API for real ticket...');
        
        try {
          unscanResult = await Promise.race([unscanPromise, timeoutPromise]);
          console.log('✅ Checkout API response received:', JSON.stringify(unscanResult, null, 2));
        } catch (apiError) {
          console.error('❌ API call failed:', apiError);
          // Don't throw, handle gracefully
          unscanResult = {
            error: true,
            msg: apiError instanceof Error ? apiError.message : 'API call failed',
            status: 500
          };
        }
      }
      
      if (!unscanResult || unscanResult.error) {
        // For scan out, some specific errors are actually okay
        let errorMessage = 'Failed to check out guest.';
        if (unscanResult?.msg && typeof unscanResult.msg === 'string') {
          errorMessage = unscanResult.msg;
        } else if (unscanResult?.msg && typeof unscanResult.msg === 'object' && 'message' in unscanResult.msg) {
          errorMessage = unscanResult.msg.message;
        }
        
        // Check if this is a "not checked in" error, which means the ticket is already checked out
        const isNotCheckedInError = errorMessage.toLowerCase().includes('not been used') ||
                                   errorMessage.toLowerCase().includes('not checked in') ||
                                   errorMessage.includes('has not been scanned') ||
                                   unscanResult?.status === 404;
        
        if (isNotCheckedInError) {
          console.log('⚠️ Guest already checked out');
          feedback.warning();
          shouldResumeScanning = true;
          Alert.alert('Already Checked Out', 'This guest is already checked out.', [
            { text: 'OK', onPress: () => setIsScanning(true) } // Resume scanning when OK is pressed
          ]);
        return;
      }
      
        // Any other error is a real failure
        console.log('❌ Checkout failed with error:', errorMessage);
        feedback.error();
        shouldResumeScanning = true;
        Alert.alert('Check-out Failed', errorMessage, [
          { text: 'OK', onPress: () => setIsScanning(true) } // Resume scanning when OK is pressed
        ]);
        return;
      }
      
      // Quick success feedback
      console.log('✅ Checkout successful!');
      feedback.success();
      
      const ticketInfo = validationResult.msg && typeof validationResult.msg === 'object' ? validationResult.msg.info : undefined;
      const guestName = ticketInfo?.fullname || 'Guest';
      
      console.log(`✅ Showing success alert for guest: ${guestName}`);
      shouldResumeScanning = true;
      
      // Simplified success message
      Alert.alert(
        '✅ Checked Out',
        `${guestName} successfully checked out!`,
        [{ text: 'OK', onPress: () => setIsScanning(true) }], // Resume scanning when OK is pressed
        { cancelable: true }
      );
      
      // Trigger refresh for all related components
      triggerGuestListRefresh(currentEventId);
      triggerAttendanceRefresh(currentEventId);
      triggerAnalyticsRefresh();
      
    } catch (error) {
      console.error('❌ Scan out error:', error);
      feedback.error();
      
      // Handle timeout specifically
      if (error instanceof Error && error.message.includes('timed out')) {
        console.log('⏰ Checkout operation timed out');
        shouldResumeScanning = true;
        Alert.alert(
          'Timeout Error', 
          'The checkout operation took too long. Please check your internet connection and try again.',
          [{ text: 'OK', onPress: () => setIsScanning(true) }]
        );
      } else {
        console.log('❌ Checkout operation failed with error:', error);
        shouldResumeScanning = true;
        Alert.alert('Check-out Error', 'Failed to check out guest. Please try again.', [
          { text: 'OK', onPress: () => setIsScanning(true) } // Resume scanning when OK is pressed
        ]);
      }
    } finally {
      // Clear the initial fail-safe timeout since we're handling it here
      clearTimeout(failSafeTimeout);
      
      // Always resume scanning
      console.log('🔄 Finally block: Ensuring scanning is resumed');
      setIsScanning(true);
      
      // Additional fail-safe
      if (shouldResumeScanning) {
        console.log('🔄 Setting up additional fail-safe to resume scanning in 2 seconds...');
        setTimeout(() => {
          console.log('🔄 Additional fail-safe: Resuming scanning');
          setIsScanning(true);
        }, 2000);
      }
    }
  };

  const handleGroupScanConfirm = async () => {
    if (!groupScanData) return;
    
    setIsProcessingGroup(true);
    
    try {
      // Use selected tickets instead of all tickets
      const ticketsToProcess = selectedTickets.size > 0 
        ? groupScanData.tickets.filter(ticket => selectedTickets.has(ticket.id))
        : groupScanData.tickets;
      
      const ticketIds = ticketsToProcess.map(ticket => ticket.qrCode);
      
      // Add timeout to prevent hanging in group operations (35 seconds - longer than API timeout)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Group operation timed out')), 35000)
      );
      
      let result;
      if (scanMode === 'scan-in') {
        const groupPromise = scanGroupTickets(currentEventId, ticketIds);
        result = await Promise.race([groupPromise, timeoutPromise]);
      } else {
        const groupPromise = unscanGroupTickets(currentEventId, ticketIds);
        result = await Promise.race([groupPromise, timeoutPromise]);
      }
      
      setShowGroupModal(false);
      setGroupScanData(null);
      setSelectedTickets(new Set()); // Clear selection
      setScannedTicketId(null); // Clear the scanned ticket ID
      
      if (result.error) {
        feedback.error();
        Alert.alert('Group Scan Failed', result.msg || 'Failed to process group tickets', [
          { text: 'OK', onPress: () => setIsScanning(true) } // Resume scanning when OK is pressed
        ]);
        return;
      }
      
      feedback.checkIn();
      const action = scanMode === 'scan-in' ? 'checked in' : 'checked out';
      const successCount = result.successful || result.total;
      const failedCount = result.failed || 0;
      
      let message = `${successCount} guests ${action} successfully!`;
      if (failedCount > 0) {
        message += ` (${failedCount} failed)`;
      }
      
      Alert.alert(
        `✅ Group ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        message,
        [{ text: 'OK', onPress: () => setIsScanning(true) }], // Resume scanning when OK is pressed
        { cancelable: true }
      );
      
      // Trigger refresh for all related components
      triggerGuestListRefresh(currentEventId);
      triggerAttendanceRefresh(currentEventId);
      triggerAnalyticsRefresh();
      
    } catch (error) {
      console.error('Group scan error:', error);
      feedback.error();
      
      // Handle timeout specifically
      if (error instanceof Error && error.message.includes('timed out')) {
        Alert.alert(
          'Timeout Error', 
          'The group operation took too long. Please check your internet connection and try again.',
          [{ text: 'OK', onPress: () => setIsScanning(true) }]
        );
      } else {
        Alert.alert('Group Scan Error', 'Failed to process group tickets', [
          { text: 'OK', onPress: () => setIsScanning(true) } // Resume scanning when OK is pressed
        ]);
      }
    } finally {
      setIsProcessingGroup(false);
    }
  };

  const handleGroupScanCancel = () => {
    setShowGroupModal(false);
    setGroupScanData(null);
    setSelectedTickets(new Set());
    setScannedTicketId(null);
    setIsScanning(true); // Resume scanning when group modal is cancelled
    feedback.buttonPress();
  };

  // Helper functions for ticket selection
  const toggleTicketSelection = (ticketId: string) => {
    console.log(`Toggling ticket selection for ID: ${ticketId}`);
    console.log(`Current selection before toggle:`, Array.from(selectedTickets));
    
    const newSelection = new Set(selectedTickets);
    if (newSelection.has(ticketId)) {
      console.log(`Removing ticket ${ticketId} from selection`);
      newSelection.delete(ticketId);
    } else {
      console.log(`Adding ticket ${ticketId} to selection`);
      newSelection.add(ticketId);
    }
    
    console.log(`New selection after toggle:`, Array.from(newSelection));
    setSelectedTickets(newSelection);
    feedback.buttonPress();
  };

  const selectAllTickets = () => {
    if (!groupScanData) return;
    const allTicketIds = new Set(groupScanData.tickets.map(ticket => ticket.id));
    setSelectedTickets(allTicketIds);
    feedback.buttonPress();
  };

  const clearAllSelection = () => {
    setSelectedTickets(new Set());
    feedback.buttonPress();
  };

  // Add useEffect to debug selection state changes
  useEffect(() => {
    console.log('Selected tickets state changed:', {
      size: selectedTickets.size,
      ids: Array.from(selectedTickets),
      modalVisible: showGroupModal,
      groupDataExists: !!groupScanData
    });
  }, [selectedTickets, showGroupModal, groupScanData]);

  // Auto-select only the scanned ticket when group data is set
  useEffect(() => {
    if (groupScanData && showGroupModal) {
      console.log('Group scan data changed, auto-selecting scanned ticket');
      
      if (scannedTicketId) {
        // Find the ticket that matches the scanned QR code
        const scannedTicket = groupScanData.tickets.find(ticket => 
          ticket.qrCode === scannedTicketId || ticket.id === scannedTicketId
        );
        
        if (scannedTicket) {
          console.log('Auto-selecting only the scanned ticket:', scannedTicket.id);
          setSelectedTickets(new Set([scannedTicket.id]));
        } else {
          console.log('Could not find scanned ticket in group, selecting none');
          setSelectedTickets(new Set());
        }
      } else {
        console.log('No scanned ticket ID available, selecting all tickets (fallback)');
        const allTicketIds = new Set<string>(groupScanData.tickets.map((ticket: GroupTicket) => ticket.id));
        setSelectedTickets(allTicketIds);
      }
    }
  }, [groupScanData, showGroupModal, scannedTicketId]);

  // Group scan modal component
  const renderGroupScanModal = () => {
    console.log('Rendering group scan modal - Selection debugging:', {
      selectedTicketsSize: selectedTickets.size,
      selectedTicketIds: Array.from(selectedTickets),
      totalTickets: groupScanData?.tickets.length || 0,
      ticketData: groupScanData?.tickets.map(t => ({ id: t.id, name: t.name, email: t.email })) || []
    });
    
    return (
    <Modal
      visible={showGroupModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleGroupScanCancel}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Group {scanMode === 'scan-in' ? 'Check-in' : 'Check-out'}
        </Text>
          <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>
            {groupScanData?.tickets.length} tickets found for {groupScanData?.purchaser.name}
          </Text>
      
          {/* Select All / Clear All Controls */}
          <View style={styles.selectionControls}>
          <TouchableOpacity 
              style={[styles.selectionButton, { backgroundColor: colors.primary }]}
              onPress={selectedTickets.size === groupScanData?.tickets.length ? clearAllSelection : selectAllTickets}
            activeOpacity={0.8}
          >
              <Text style={styles.selectionButtonText}>
                {selectedTickets.size === groupScanData?.tickets.length ? 'Clear All' : 'Select All'}
            </Text>
          </TouchableOpacity>
          
            <Text style={[styles.selectionCount, { color: colors.secondary }]}>
              {selectedTickets.size} of {groupScanData?.tickets.length} selected
            </Text>
          </View>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {groupScanData?.tickets.map((ticket, index) => {
            const isSelected = selectedTickets.has(ticket.id);
            console.log(`Ticket ${ticket.id} (${ticket.name}) - isSelected: ${isSelected}, hasInSet: ${selectedTickets.has(ticket.id)}`);
            return (
          <TouchableOpacity 
                key={ticket.id}
            style={[
                  styles.ticketItem, 
                  { 
                    backgroundColor: isSelected ? `${colors.primary}15` : colors.card, 
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 2 : 1
                  }
                ]}
                onPress={() => toggleTicketSelection(ticket.id)}
            activeOpacity={0.8}
          >
                <TouchableOpacity
                  style={[styles.checkboxContainer]}
                  onPress={() => toggleTicketSelection(ticket.id)}
                  activeOpacity={0.8}
                >
                  {isSelected ? (
                    <View style={[styles.checkbox, styles.checkboxSelected, { backgroundColor: colors.primary }]}>
                      <Check size={16} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : (
                    <View style={[styles.checkbox, { borderColor: colors.border }]}>
                      <Square size={16} color="transparent" />
                    </View>
                  )}
          </TouchableOpacity>
                
                <View style={[styles.ticketIcon, { backgroundColor: scanMode === 'scan-in' ? '#06D6A0' : '#F72585' }]}>
                  <Text style={styles.ticketNumber}>{index + 1}</Text>
        </View>
        
                <View style={styles.ticketDetails}>
                  <Text style={[styles.ticketName, { color: colors.text }]}>{ticket.name}</Text>
                  <Text style={[styles.ticketEmail, { color: colors.secondary }]}>{ticket.email}</Text>
                  <Text style={[styles.ticketType, { color: colors.secondary }]}>{ticket.ticketType}</Text>
                  <Text style={[styles.ticketIdentifier, {opacity: 5}, { color: colors.secondary }]}>ID: {ticket.ticketIdentifier}</Text>
                </View>
                
                <UserCheck 
                  size={20} 
                  color={isSelected ? colors.primary : (scanMode === 'scan-in' ? '#06D6A0' : '#F72585')} 
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        
        <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.card }]}
            onPress={handleGroupScanCancel}
            disabled={isProcessingGroup}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.confirmButton, { 
              backgroundColor: selectedTickets.size > 0 
                ? (scanMode === 'scan-in' ? '#06D6A0' : '#F72585')
                : colors.border,
              opacity: isProcessingGroup ? 0.6 : 1
            }]}
            onPress={handleGroupScanConfirm}
            disabled={isProcessingGroup || selectedTickets.size === 0}
          >
            {isProcessingGroup ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={[styles.confirmButtonText, { color: selectedTickets.size > 0 ? '#FFFFFF' : colors.secondary }]}>
                {scanMode === 'scan-in' ? 'Check In' : 'Check Out'} Selected ({selectedTickets.size})
        </Text>
            )}
          </TouchableOpacity>
      </View>
      </SafeAreaView>
    </Modal>
    );
  };

  const customHeader = (
    <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
      {/* Simple Event Name Only */}
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
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        <View style={styles.eventSelectionContainer}>
          <View style={styles.eventSelectionContent}>
            <View style={styles.iconContainer}>
              <LogIn size={60} color={colors.primary} strokeWidth={1.5} />
            </View>
            
            <Text style={[styles.eventSelectionTitle, { color: colors.text }]}>
              Select an Event
            </Text>
            
            <Text style={[styles.eventSelectionMessage, { color: colors.secondary }]}>
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
              <Text style={[styles.backButtonText, { color: colors.secondary }]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {showCamera ? (
        <QRScanner
          onScan={handleScanResult}
          onClose={() => setShowCamera(false)} 
          customHeader={customHeader}
          showCloseButton={true}
          headerTitle={scanMode === 'scan-in' ? 'Smart Check In' : 'Smart Check Out'}
          pauseScanning={!isScanning}
          onRequestResume={handleRequestResume}
          scanMode={scanMode}
          onScanModeChange={(mode) => setScanMode(mode)}
        />
      ) : (
        <View style={[styles.scannerControlContainer, { backgroundColor: colors.background }]}>
          {customHeader}
          
          <View style={styles.scannerControlContent}>
            <View style={[styles.scanIconContainer, { backgroundColor: colors.primary + '20' }]}>
              <QrCode size={80} color={colors.primary} />
            </View>
            
            <Text style={[styles.scannerTitle, { color: colors.text }]}>
              {scanMode === 'scan-in' ? 'Ready to Check In' : 'Ready to Check Out'}
            </Text>
            
            <Text style={[styles.scannerDescription, { color: colors.text }]}>
              Tap the button below to open the camera and scan QR codes
            </Text>
            
            <TouchableOpacity 
              style={[styles.startScanButton, { backgroundColor: colors.primary }]}
              onPress={handleStartScanning}
              activeOpacity={0.8}
            >
              <QrCode size={24} color="#FFFFFF" />
              <Text style={styles.startScanButtonText}>
                Start Scanning
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {renderGroupScanModal()}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
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
  // Group Scan Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  ticketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  ticketIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    fontSize: 14,
    marginBottom: 2,
  },
  ticketType: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  ticketIdentifier: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.8,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Selection Controls
  selectionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  selectionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  selectionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxContainer: {
    marginRight: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: 'transparent',
  },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  startScanButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
});