import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  QrCode, 
  Users, 
  BarChart, 
  Settings,
  Ticket, 
  DollarSign,
  CheckCircle,
  UserCheck,
  User,
  Plus,
  RefreshCw
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { 
  getGuestList, 
  getEvents, 
  validateQRCode, 
  scanQRCode, 
  unscanQRCode,
  testProxyConnectivity,
  setManualProxyIP,
  getCurrentProxyURL,
  clearManualProxyIP,
  getCurrentProxyIP,
  QRScanResponse,
  getCheckedInGuestList
} from '../../services/api';
import QRScanner from '../../components/QRScanner';
import { feedback, initializeAudio } from '../../services/feedback';

// Mock data types
interface Ticket {
  id: string;
  type: string;
  price: number;
  sold: number;
  available: number;
}

interface Attendee {
  id: string;
  name: string;
  email: string;
  ticketType: string;
  scannedIn: boolean;
  scanInTime?: string;
  scanCode?: string; // Add scan code for QR functionality
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  totalTickets: number;
  ticketsSold: number;
  revenue: number;
  tickets: Ticket[];
  attendees: Attendee[];
}

// Mock data
const mockEvents: { [key: string]: Event } = {
  '1': {
    id: '1',
    title: 'Team Meeting',
    date: '2023-10-15',
    time: '09:00 AM',
    location: 'Conference Room A',
    description: 'Monthly team meeting to discuss project progress and upcoming goals.',
    totalTickets: 50,
    ticketsSold: 32,
    revenue: 1600,
    tickets: [
      { id: 't1', type: 'General', price: 50, sold: 20, available: 10 },
      { id: 't2', type: 'VIP', price: 100, sold: 8, available: 2 },
      { id: 't3', type: 'Early Bird', price: 40, sold: 4, available: 6 },
    ],
    attendees: [
      { id: 'a1', name: 'John Smith', email: 'john@example.com', ticketType: 'General', scannedIn: true, scanInTime: '08:45 AM' },
      { id: 'a2', name: 'Sarah Johnson', email: 'sarah@example.com', ticketType: 'VIP', scannedIn: true, scanInTime: '08:30 AM' },
      { id: 'a3', name: 'Michael Brown', email: 'michael@example.com', ticketType: 'General', scannedIn: false },
      { id: 'a4', name: 'Emily Davis', email: 'emily@example.com', ticketType: 'General', scannedIn: true, scanInTime: '08:55 AM' },
      { id: 'a5', name: 'David Wilson', email: 'david@example.com', ticketType: 'Early Bird', scannedIn: false },
    ],
  },
  '2': {
    id: '2',
    title: 'Project Deadline',
    date: '2023-10-20',
    time: '05:00 PM',
    location: 'Office',
    description: 'Final review of project deliverables before submission to the client.',
    totalTickets: 25,
    ticketsSold: 15,
    revenue: 750,
    tickets: [
      { id: 't1', type: 'Team Member', price: 0, sold: 10, available: 5 },
      { id: 't2', type: 'Stakeholder', price: 150, sold: 5, available: 5 },
    ],
    attendees: [
      { id: 'a1', name: 'Alex Johnson', email: 'alex@example.com', ticketType: 'Team Member', scannedIn: false },
      { id: 'a2', name: 'Taylor Williams', email: 'taylor@example.com', ticketType: 'Stakeholder', scannedIn: false },
      { id: 'a3', name: 'Jamie Rodriguez', email: 'jamie@example.com', ticketType: 'Team Member', scannedIn: false },
    ],
  },
  '3': {
    id: '3',
    title: 'Client Presentation',
    date: '2023-10-25',
    time: '02:00 PM',
    location: 'Meeting Room B',
    description: 'Presentation of completed project to client stakeholders.',
    totalTickets: 30,
    ticketsSold: 22,
    revenue: 1100,
    tickets: [
      { id: 't1', type: 'Presenter', price: 0, sold: 5, available: 0 },
      { id: 't2', type: 'Client', price: 0, sold: 7, available: 3 },
      { id: 't3', type: 'Observer', price: 50, sold: 10, available: 5 },
    ],
    attendees: [
      { id: 'a1', name: 'Pat Smith', email: 'pat@example.com', ticketType: 'Presenter', scannedIn: false },
      { id: 'a2', name: 'Jordan Lee', email: 'jordan@example.com', ticketType: 'Client', scannedIn: false },
    ],
  },
  '4': {
    id: '4',
    title: 'Lunch with Colleagues',
    date: '2023-10-18',
    time: '12:30 PM',
    location: 'Cafe Downtown',
    description: 'Team lunch to celebrate project milestone achievement.',
    totalTickets: 15,
    ticketsSold: 12,
    revenue: 0,
    tickets: [
      { id: 't1', type: 'Team Member', price: 0, sold: 12, available: 3 },
    ],
    attendees: [
      { id: 'a1', name: 'Chris Morgan', email: 'chris@example.com', ticketType: 'Team Member', scannedIn: false },
      { id: 'a2', name: 'Leslie Harper', email: 'leslie@example.com', ticketType: 'Team Member', scannedIn: false },
    ],
  },
};

// Tab names - removing Guest List and Attendance
type TabName = 'Overview' | 'Analytics' | 'Tickets';
const tabs: TabName[] = ['Overview', 'Analytics', 'Tickets'];

export default function EventDetail() {
  const { colors, isDarkMode } = useTheme();
  const { id } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id || '1';
  
  const [event, setEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>('Overview');
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState<'validate' | 'scanIn' | 'scanOut'>('validate'); // Track scan mode
  const [guestList, setGuestList] = useState<Attendee[]>([]); // Separate guest list state
  const [totalGuestsFromAPI, setTotalGuestsFromAPI] = useState<number>(0); // Total guests from API
  const [checkedInGuests, setCheckedInGuests] = useState<Attendee[]>([]); // Separate state for checked-in guests

  useEffect(() => {
    // Initialize audio when component mounts
    initializeAudio();
    
    const fetchEventDetails = async () => {
      setLoading(true);
      
      try {
        // First try to get the event from the API
        const eventsData = await getEvents();
        
        // Find the event with matching ID from the API response
        let apiEvent = null;
        if (Array.isArray(eventsData) && eventsData.length > 0) {
          apiEvent = eventsData.find(e => 
            e.id === eventId || 
            e.eventId === eventId || 
            e.EventId === eventId || 
            String(e._id) === eventId
          );
        }
        
        if (apiEvent) {
          // If found in API response, format it properly
          const formattedEvent: Event = {
            id: apiEvent.id || apiEvent.eventId || apiEvent.EventId || String(apiEvent._id || '0'),
            title: apiEvent.title || apiEvent.name || apiEvent.EventName || 'Unnamed Event',
            date: formatDateFromAPI(apiEvent.date || apiEvent.showStart || 'TBD'),
            time: formatTimeFromAPI(apiEvent.time || apiEvent.showStart || 'TBD'),
            location: apiEvent.location || apiEvent.venue || apiEvent.VenueName || 'TBD',
            description: apiEvent.description || apiEvent.desc || 'No description available.',
            // Set defaults for properties not in API
            totalTickets: apiEvent.capacity || apiEvent.totalTickets || 100,
            ticketsSold: 0, // Will be updated from guest list API
            revenue: apiEvent.revenue || 0,
            tickets: [],
            attendees: []
          };
          
          setEvent(formattedEvent);
        } else {
          // If not found in API, try mock data as fallback
          const mockEvent = mockEvents[eventId];
          
          if (!mockEvent) {
            console.error("Event not found");
            setLoading(false);
            return;
          }
          
          // Use mock event data
          setEvent(mockEvent);
        }
        
        // Fetch guest list from API
        await fetchGuestList();
        
        // Fetch checked-in guests for attendance tab
        await fetchCheckedInGuests();
        
      } catch (err) {
        console.error("Failed to load event details:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEventDetails();
  }, [eventId]);

  // Separate function to fetch guest list
  const fetchGuestList = async () => {
    try {
          const guestListData = await getGuestList(eventId);
          
      if (guestListData && Array.isArray(guestListData)) {
            // Map API guest data to our format
            const attendees = guestListData.map(guest => ({
              id: guest.id || guest.guestId || String(Math.random()),
              name: guest.purchased_by || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest',
              email: guest.email || 'N/A',
              ticketType: guest.ticketType || guest.ticket_type || 'General',
              scannedIn: guest.checkedIn || guest.checked_in || false,
              scanInTime: guest.checkInTime || guest.check_in_time || undefined,
              scanCode: guest.scanCode || undefined
            }));
            
        // Set guest list and total count from API
        setGuestList(attendees);
        setTotalGuestsFromAPI(attendees.length);
        
        // Update event with real guest list data and ticket count
            setEvent(prev => {
              if (!prev) return null;
              return {
                ...prev,
            attendees: attendees,
            ticketsSold: attendees.length // Use actual guest count from API
              };
            });
      } else {
        // No guests found
        setGuestList([]);
        setTotalGuestsFromAPI(0);
        setEvent(prev => prev ? { ...prev, ticketsSold: 0, attendees: [] } : null);
          }
        } catch (err) {
          console.error("Failed to fetch guest list:", err);
      // Keep existing data on error
      }
    };

  // Function to fetch guest list while preserving local scan-in changes
  const fetchGuestListWithLocalPreservation = async () => {
    try {
      // Store current local scan states before fetching from API
      const localScanStates = new Map();
      guestList.forEach(guest => {
        if (guest.scannedIn && guest.scanInTime) {
          localScanStates.set(guest.email.toLowerCase(), {
            scannedIn: guest.scannedIn,
            scanInTime: guest.scanInTime,
            scanCode: guest.scanCode
          });
        }
      });

      const guestListData = await getGuestList(eventId);
      
      if (guestListData && Array.isArray(guestListData)) {
        // Map API guest data to our format, preserving local scan states
        const attendees = guestListData.map(guest => {
          const baseAttendee = {
            id: guest.id || guest.guestId || String(Math.random()),
            name: guest.purchased_by || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest',
            email: guest.email || 'N/A',
            ticketType: guest.ticketType || guest.ticket_type || 'General',
            scannedIn: guest.checkedIn || guest.checked_in || false,
            scanInTime: guest.checkInTime || guest.check_in_time || undefined,
            scanCode: guest.scanCode || undefined
          };

          // Check if we have local scan state for this guest
          const localState = localScanStates.get(baseAttendee.email.toLowerCase());
          if (localState) {
            // Preserve local scan state
            return {
              ...baseAttendee,
              scannedIn: localState.scannedIn,
              scanInTime: localState.scanInTime,
              scanCode: localState.scanCode
            };
          }

          return baseAttendee;
        });
        
        // Set guest list and total count from API
        setGuestList(attendees);
        setTotalGuestsFromAPI(attendees.length);
        
        // Update event with real guest list data and ticket count
        setEvent(prev => {
          if (!prev) return null;
          return {
            ...prev,
            attendees: attendees,
            ticketsSold: attendees.length
          };
        });
      } else {
        // No guests found - keep existing local data
        console.log('No guests found from API, keeping local data');
      }
    } catch (err) {
      console.error("Failed to fetch guest list with preservation:", err);
      // Keep existing data on error
    }
  };

  // Function to fetch checked-in guests for attendance tab
  const fetchCheckedInGuests = async () => {
    try {
      console.log('Fetching checked-in guests for attendance...');
      const checkedInData = await getCheckedInGuestList(eventId);
      
      if (checkedInData && Array.isArray(checkedInData)) {
        // Map API checked-in guest data to our format
        const attendees = checkedInData.map(guest => ({
          id: guest.id || guest.guestId || String(Math.random()),
          name: guest.purchased_by || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest',
          email: guest.email || 'N/A',
          ticketType: guest.ticketType || guest.ticket_type || 'General',
          scannedIn: true, // All guests from this endpoint are checked in
          scanInTime: guest.checkInTime || guest.check_in_time || guest.checkedin_date || 'Unknown time',
          scanCode: guest.scanCode || guest.qrCode || undefined
        }));
        
        console.log(`Found ${attendees.length} checked-in guests`);
        setCheckedInGuests(attendees);
      } else {
        console.log('No checked-in guests found');
        setCheckedInGuests([]);
      }
    } catch (err) {
      console.error("Failed to fetch checked-in guests:", err);
      // Keep existing data on error
    }
  };

  // Helper function to format date from API 
  const formatDateFromAPI = (dateString: string): string => {
    if (dateString === 'TBD') return 'TBD';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
    } catch (e) {
      return dateString;
    }
  };

  // Helper function to format time from API
  const formatTimeFromAPI = (timeString: string): string => {
    if (timeString === 'TBD') return 'TBD';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return timeString;
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleOpenScanner = (mode: 'validate' | 'scanIn' | 'scanOut' = 'validate', attendee?: Attendee) => {
    feedback.buttonPress();
    setScanMode(mode);
    setShowScanner(true);
  };

  const handleCloseScanner = () => {
    feedback.buttonPress();
    setShowScanner(false);
    setScanMode('validate');
  };

  const handleScanResult = async (data: string) => {
    // Close scanner
    setShowScanner(false);
    
    try {
      console.log('QR Code scanned:', data, 'Mode:', scanMode);
      
      // First, validate the QR code
      const validationResult = await validateQRCode(eventId, data);
      
      if (!validationResult) {
        feedback.error();
        Alert.alert('Validation Error', 'Failed to validate QR code. Please try again.');
        setScanMode('validate');
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
        setScanMode('validate');
        return;
      }
      
      // QR code is valid - provide success feedback
      feedback.success();
      
      // Handle different scan modes
      if (scanMode === 'scanIn') {
        // Direct scan in operation
        await performScanIn(data, validationResult);
      } else if (scanMode === 'scanOut') {
        // Direct scan out operation
        await performScanOut(data, validationResult);
      } else {
        // Default validation mode - show options
        let ticketInfo = null;
        if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
          ticketInfo = validationResult.msg.info;
        }
        
        Alert.alert(
          'Valid Ticket Found',
          `${ticketInfo?.fullname || 'Guest'}\n${ticketInfo?.ticket_title || 'Unknown ticket'}\nAvailable admits: ${ticketInfo?.available || 0}/${ticketInfo?.admits || 0}\nPrice: $${ticketInfo?.price || '0.00'}`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => feedback.buttonPress()
            },
            {
              text: 'Admit Guest',
              onPress: async () => {
                feedback.buttonPressHeavy();
                await performScanIn(data, validationResult);
              }
            }
          ]
        );
      }
      
    } catch (error) {
      console.error('QR scan error:', error);
      feedback.error();
      Alert.alert(
        'Error',
        'An unexpected error occurred while processing the QR code.'
      );
    } finally {
      // Reset scan mode
      setScanMode('validate');
    }
  };

  const performScanIn = async (scanCode: string, validationResult: any) => {
    try {
      // Always update local state first for immediate UI feedback
      await updateLocalScanIn(scanCode, validationResult);
      
      // Call API to scan in the guest using QR scanning endpoint
      const scanResult = await scanQRCode(eventId, scanCode);
      
      if (!scanResult || scanResult.error) {
        // Show the actual error message from API
        let errorMessage = 'Failed to scan in guest';
        if (scanResult?.msg) {
          errorMessage = typeof scanResult.msg === 'string' ? scanResult.msg : scanResult.msg.message;
        }
        
        feedback.error();
        Alert.alert('Scan In Failed', errorMessage + '\n\nLocal attendance has been updated.');
        return;
      }
      
      // Success - show confirmation with feedback
      feedback.checkIn();
      
      // Get message from response
      let successMessage = 'Scan successful';
      if (typeof scanResult.msg === 'string') {
        successMessage = scanResult.msg;
      } else if (scanResult.msg && typeof scanResult.msg === 'object' && 'message' in scanResult.msg) {
        successMessage = scanResult.msg.message;
      }
      
      // Use ticket info from validation result for display
      let ticketInfo = null;
      if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
        ticketInfo = validationResult.msg.info;
      }
      
      Alert.alert(
        'Guest Admitted Successfully',
        `${ticketInfo?.fullname || 'Guest'} has been admitted.\n\n${successMessage}\n\nAttendance count updated locally.`
      );
      
      // Refresh checked-in guests list for attendance tab
      setTimeout(async () => {
        await fetchCheckedInGuests();
      }, 1000);
      
    } catch (error) {
      console.error('Scan in error:', error);
      
      // Still update local state for demo purposes
      await updateLocalScanIn(scanCode, validationResult);
      
      feedback.error();
      Alert.alert('Scan In Error', 'Failed to scan in guest via API. Local attendance has been updated.');
    }
  };

  const performScanOut = async (scanCode: string, validationResult: any) => {
    try {
      // Always update local state first for immediate UI feedback
      await updateLocalScanOut(scanCode, validationResult);
      
      // Call API to scan out the guest using QR unscanning endpoint
      const unscanResult = await unscanQRCode(eventId, scanCode);
      
      if (!unscanResult || unscanResult.error) {
        // Show the actual error message from API
        let errorMessage = 'Failed to scan out guest';
        if (unscanResult?.msg) {
          errorMessage = typeof unscanResult.msg === 'string' ? unscanResult.msg : unscanResult.msg.message;
        }
        
        feedback.error();
        Alert.alert('Scan Out Failed', errorMessage + '\n\nLocal attendance has been updated.');
        return;
      }
      
      // Success - show confirmation with feedback
      feedback.success();
      
      // Get message from response
      let successMessage = 'Unscan successful';
      if (typeof unscanResult.msg === 'string') {
        successMessage = unscanResult.msg;
      } else if (unscanResult.msg && typeof unscanResult.msg === 'object' && 'message' in unscanResult.msg) {
        successMessage = unscanResult.msg.message;
      }
      
      // Use ticket info from validation result for display
      let ticketInfo = null;
      if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
        ticketInfo = validationResult.msg.info;
      }
      
      Alert.alert(
        'Guest Scanned Out Successfully',
        `${ticketInfo?.fullname || 'Guest'} has been scanned out.\n\n${successMessage}\n\nAttendance count updated locally.`
      );
      
    } catch (error) {
      console.error('Scan out error:', error);
      
      // Still update local state for demo purposes
      await updateLocalScanOut(scanCode, validationResult);
      
      feedback.error();
      Alert.alert('Scan Out Error', 'Failed to scan out guest via API. Local attendance has been updated.');
    }
  };

  const updateLocalScanIn = async (scanCode: string, validationResult: any) => {
    if (!event) return;
    
    // Create timestamp for scan-in
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Try to find attendee by name or email from validation result
    const ticketInfo = validationResult.msg.info;
    let attendeeIndex = event.attendees.findIndex(a => 
      a.name.toLowerCase() === ticketInfo.fullname.toLowerCase() ||
      a.email.toLowerCase() === ticketInfo.email.toLowerCase()
    );
    
    // Also find in guest list
    let guestIndex = guestList.findIndex(a => 
      a.name.toLowerCase() === ticketInfo.fullname.toLowerCase() ||
      a.email.toLowerCase() === ticketInfo.email.toLowerCase()
    );
    
    if (attendeeIndex < 0) {
      // If attendee not found, add them to the list
      const newAttendee: Attendee = {
        id: `guest_${Date.now()}`,
        name: ticketInfo.fullname,
        email: ticketInfo.email,
        ticketType: ticketInfo.ticket_title,
        scannedIn: true,
        scanInTime: timeString,
        scanCode: scanCode
      };
      
      setEvent(prev => {
        if (!prev) return null;
        return {
          ...prev,
          attendees: [...prev.attendees, newAttendee]
        };
      });
      
      // Also add to guest list if not found there
      if (guestIndex < 0) {
        setGuestList(prev => [...prev, newAttendee]);
        setTotalGuestsFromAPI(prev => prev + 1);
      }
    } else {
      // Update existing attendee
      const updatedAttendees = [...event.attendees];
      updatedAttendees[attendeeIndex] = {
        ...updatedAttendees[attendeeIndex],
        scannedIn: true,
        scanInTime: timeString,
        scanCode: scanCode
      };
      
      setEvent(prev => {
        if (!prev) return null;
        return {
          ...prev,
          attendees: updatedAttendees
        };
      });
    }
    
    // Update guest list if attendee exists there
    if (guestIndex >= 0) {
      const updatedGuestList = [...guestList];
      updatedGuestList[guestIndex] = {
        ...updatedGuestList[guestIndex],
        scannedIn: true,
        scanInTime: timeString,
        scanCode: scanCode
      };
      setGuestList(updatedGuestList);
    }
    
    console.log(`Updated scan-in status for ${ticketInfo.fullname} at ${timeString}`);
    feedback.checkIn();
  };

  const updateLocalScanOut = async (scanCode: string, validationResult: any) => {
    if (!event) return;
    
    // Try to find attendee by scan code or by name/email from validation result
    const ticketInfo = validationResult.msg.info;
    let attendeeIndex = event.attendees.findIndex(a => 
      a.scanCode === scanCode ||
      a.name.toLowerCase() === ticketInfo.fullname.toLowerCase() ||
      a.email.toLowerCase() === ticketInfo.email.toLowerCase()
    );
    
    // Also find in guest list
    let guestIndex = guestList.findIndex(a => 
      a.scanCode === scanCode ||
      a.name.toLowerCase() === ticketInfo.fullname.toLowerCase() ||
      a.email.toLowerCase() === ticketInfo.email.toLowerCase()
    );
    
    if (attendeeIndex < 0 && guestIndex < 0) {
      Alert.alert('Error', 'Cannot scan out: Attendee not found in the system');
      return;
    }
    
    // Update attendee scan-out status locally
    if (attendeeIndex >= 0) {
      const updatedAttendees = [...event.attendees];
      updatedAttendees[attendeeIndex] = {
        ...updatedAttendees[attendeeIndex],
        scannedIn: false,
        scanInTime: undefined,
        scanCode: undefined
      };
      
      setEvent(prev => {
        if (!prev) return null;
        return {
          ...prev,
          attendees: updatedAttendees
        };
      });
    }
    
    // Update guest list if attendee exists there
    if (guestIndex >= 0) {
      const updatedGuestList = [...guestList];
      updatedGuestList[guestIndex] = {
        ...updatedGuestList[guestIndex],
        scannedIn: false,
        scanInTime: undefined,
        scanCode: undefined
      };
      setGuestList(updatedGuestList);
    }
    
    console.log(`Updated scan-out status for ${ticketInfo.fullname}`);
    feedback.success();
  };

  const refreshGuestList = async () => {
    try {
      console.log('Refreshing guest list...');
      await fetchGuestList();
    } catch (error) {
      console.error('Error refreshing guest list:', error);
    }
  };

  const handleScanIn = async (attendeeId: string, attendeeName: string) => {
    if (!event) return;
    
    // Open QR scanner in scan-in mode
    const attendee = event.attendees.find(a => a.id === attendeeId);
    handleOpenScanner('scanIn', attendee);
  };

  const handleScanOut = async (attendeeId: string, attendeeName: string) => {
    if (!event) return;
    
    // Open QR scanner in scan-out mode
    const attendee = event.attendees.find(a => a.id === attendeeId);
    if (!attendee || !attendee.scannedIn) {
      Alert.alert('Error', 'Cannot scan out: Guest is not currently scanned in');
      return;
    }
    
    handleOpenScanner('scanOut', attendee);
  };

  // Computed values using the guest list state
  const checkedInCount = checkedInGuests.length; // Use the dedicated checked-in guests list
  const totalGuestsCount = totalGuestsFromAPI || 0;
  const attendancePercentage = totalGuestsCount ? Math.round((checkedInCount / totalGuestsCount) * 100) : 0;

  const renderTabBar = () => (
    <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab,
            activeTab === tab && [styles.activeTab, { backgroundColor: colors.primary }]
          ]}
          onPress={() => {
            feedback.buttonPress();
            setActiveTab(tab);
          }}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === tab ? '#FFFFFF' : colors.text }
          ]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Overview':
        return (
          <View style={styles.tabContent}>
            <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Event Overview</Text>
              
              <View style={styles.statsContainer}>
                <View style={[styles.statCard, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                  <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.2)' }]}>
                    <Users size={24} color="#FF9500" />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>{totalGuestsCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Total Guests</Text>
                </View>
                
                <View style={[styles.statCard, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                  <View style={[styles.statIconContainer, { backgroundColor: 'rgba(52, 199, 89, 0.2)' }]}>
                    <UserCheck size={24} color="#34C759" />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>{checkedInCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Checked In</Text>
                </View>
                
                <View style={[styles.statCard, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                  <View style={[styles.statIconContainer, { backgroundColor: 'rgba(0, 122, 255, 0.2)' }]}>
                    <BarChart size={24} color="#007AFF" />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>{attendancePercentage}%</Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Attendance</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={[styles.actionsCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
              
              <View style={styles.actionGrid}>
                <TouchableOpacity 
                  style={[styles.actionCard, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    feedback.buttonPress();
                    handleOpenScanner('validate');
                  }}
                >
                  <View style={styles.actionIconContainer}>
                    <QrCode size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.actionCardText}>Scan Ticket</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionCard, { backgroundColor: '#34C759' }]}
                  onPress={() => {
                    feedback.buttonPress();
                    router.push(`/(tabs)/guest-list/${eventId}`);
                  }}
                >
                  <View style={styles.actionIconContainer}>
                    <Users size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.actionCardText}>Guest List</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.actionGrid}>
                <TouchableOpacity 
                  style={[styles.actionCard, { backgroundColor: '#FF6B35' }]}
                  onPress={() => {
                    feedback.buttonPress();
                    router.push(`/(tabs)/attendance/${eventId}`);
                  }}
                >
                  <View style={styles.actionIconContainer}>
                    <UserCheck size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.actionCardText}>Attendance</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionCard, { backgroundColor: '#9C27B0' }]}
                  onPress={() => {
                    feedback.buttonPress();
                    setActiveTab('Analytics');
                  }}
                >
                  <View style={styles.actionIconContainer}>
                    <BarChart size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.actionCardText}>Analytics</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
        
      case 'Analytics':
        return (
          <View style={styles.tabContent}>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Event Analytics</Text>
              
              <View style={[styles.statsContainer, { padding: 16 }]}>
                <View style={styles.statCard}>
                  <Users size={24} color={colors.primary} />
                  <Text style={[styles.statValue, { color: colors.text }]}>{totalGuestsCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Total Registered</Text>
                </View>
                
                <View style={styles.statCard}>
                  <UserCheck size={24} color="#34C759" />
                  <Text style={[styles.statValue, { color: colors.text }]}>{checkedInCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Checked In</Text>
                </View>
                
                <View style={styles.statCard}>
                  <DollarSign size={24} color={colors.primary} />
                  <Text style={[styles.statValue, { color: colors.text }]}>${event?.revenue || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Revenue</Text>
                </View>
              </View>
            </View>
            
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Attendance Overview</Text>
              
              <View style={[styles.attendanceContainer, { padding: 16 }]}>
                <View style={styles.attendanceItem}>
                  <View style={[styles.attendanceCircle, { borderColor: colors.primary }]}>
                    <Text style={[styles.attendancePercentage, { color: colors.primary }]}>
                      {attendancePercentage}%
                    </Text>
                  </View>
                  <Text style={[styles.attendanceLabel, { color: colors.text }]}>Check-in Rate</Text>
                </View>
                
                <View style={styles.attendanceStats}>
                  <View style={styles.attendanceStatItem}>
                    <UserCheck color="#34C759" size={20} />
                    <View style={styles.attendanceStatText}>
                      <Text style={[styles.attendanceStatValue, { color: colors.text }]}>
                        {checkedInCount}
                      </Text>
                      <Text style={[styles.attendanceStatLabel, { color: colors.secondary }]}>
                        Present
                      </Text>
                    </View>
                  </View>
                  <View style={styles.attendanceStatItem}>
                    <User color="#FF6B35" size={20} />
                    <View style={styles.attendanceStatText}>
                      <Text style={[styles.attendanceStatValue, { color: colors.text }]}>
                        {totalGuestsCount - checkedInCount}
                      </Text>
                      <Text style={[styles.attendanceStatLabel, { color: colors.secondary }]}>
                        Not Arrived
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        );
        
      case 'Tickets':
        return (
          <View style={styles.tabContent}>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Ticket Types</Text>
                <TouchableOpacity style={styles.addButton}>
                  <Plus size={16} color={colors.primary} />
                  <Text style={[styles.addButtonText, { color: colors.primary }]}>Add</Text>
                </TouchableOpacity>
              </View>
              
              {event?.tickets && event.tickets.length > 0 ? (
                <FlatList
                  data={event.tickets}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={[styles.ticketItem, { backgroundColor: colors.primary }]}>
                      <View style={styles.ticketHeader}>
                        <Text style={[styles.ticketType, { color: colors.card }]}>{item.type}</Text>
                        <Text style={[styles.ticketPrice, { color: colors.card }]}>${item.price}</Text>
                      </View>
                      <View style={styles.ticketStats}>
                        <View style={styles.ticketStatItem}>
                          <Text style={[styles.ticketStatValue, { color: colors.card }]}>{item.sold}</Text>
                          <Text style={[styles.ticketStatLabel, { color: colors.card }]}>Sold</Text>
                        </View>
                        <View style={styles.ticketStatItem}>
                          <Text style={[styles.ticketStatValue, { color: colors.card }]}>{item.available}</Text>
                          <Text style={[styles.ticketStatLabel, { color: colors.card }]}>Available</Text>
                        </View>
                      </View>
                    </View>
                  )}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.ticketList}
                />
              ) : (
                <View style={[styles.emptyState, { padding: 30 }]}>
                  <Ticket size={40} color={colors.secondary} opacity={0.5} />
                  <Text style={[styles.emptyStateText, { color: colors.text }]}>No ticket types configured</Text>
                  <Text style={[styles.emptyStateSubtext, { color: colors.secondary }]}>
                    Configure ticket types to better manage your event.
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
        
      default:
        return null;
    }
  };

  // Content for each tab is now rendered separately
  const renderEventHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.card }]}>
      <View style={styles.eventMeta}>
        <View style={styles.metaItem}>
          <View style={[styles.metaIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
            <Calendar size={16} color="#FF9500" />
          </View>
          <Text style={[styles.metaText, { color: colors.text }]}>{event!.date}</Text>
        </View>
        <View style={styles.metaItem}>
          <View style={[styles.metaIconContainer, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
            <Clock size={16} color="#007AFF" />
          </View>
          <Text style={[styles.metaText, { color: colors.text }]}>{event!.time}</Text>
        </View>
        <View style={styles.metaItem}>
          <View style={[styles.metaIconContainer, { backgroundColor: 'rgba(255, 45, 85, 0.1)' }]}>
            <MapPin size={16} color="#FF2D55" />
          </View>
          <Text style={[styles.metaText, { color: colors.text, flex: 1 }]}>
            {event!.location}
          </Text>
        </View>
      </View>
    </View>
  );

  const generateTestQRCode = () => {
    const testQRCodes = [
      'MOCK_QR_TEST_001',
      'MOCK_QR_TEST_002', 
      'MOCK_QR_TEST_003',
      'MOCK_QR_TEST_004',
      'MOCK_QR_TEST_005'
    ];
    
    const randomQR = testQRCodes[Math.floor(Math.random() * testQRCodes.length)];
    
    Alert.alert(
      'Test QR Code Generated',
      `Use this QR code for testing:\n\n${randomQR}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Test Scan In', 
          onPress: () => {
            // Simulate scanning this QR code
            handleScanResult(randomQR);
          }
        }
      ]
    );
  };

  const testNetworkConnectivity = async () => {
    feedback.buttonPress();
    
    try {
      const result = await testProxyConnectivity();
      const currentURL = await getCurrentProxyURL();
      const currentIP = await getCurrentProxyIP();
      
      if (result.success) {
        Alert.alert(
          'Network Test Successful! ✅',
          `Connection to proxy server successful.\n\nUsing: ${currentURL}\nDevice IP: ${currentIP}\nServer IP: ${result.ip}\n\nYour device can access the proxy server.`,
          [
            {
              text: 'Change IP',
              onPress: () => showManualIPOptions()
            },
            {
              text: 'OK',
              onPress: () => feedback.success()
            }
          ]
        );
      } else {
        Alert.alert(
          'Network Test Failed ❌',
          `Cannot connect to proxy server.\n\nTrying: ${currentURL}\nUsing IP: ${currentIP}\nError: ${result.error}\n\nPlease check if:\n1. Proxy server is running\n2. Device is on same network\n3. Firewall allows port 3000`,
          [
            {
              text: 'Set Manual IP',
              onPress: () => showManualIPOptions()
            },
            {
              text: 'Use Default IP',
              onPress: async () => {
                await setManualProxyIP('192.168.18.102');
                feedback.success();
                Alert.alert('IP Set', 'Using default IP: 192.168.18.102\n\nTest connectivity again to verify.');
              }
            },
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Network Test Error', 'Failed to test network connectivity');
    }
  };

  const showManualIPOptions = () => {
    Alert.alert(
      'Network Configuration',
      'Choose how to configure the proxy server IP:',
      [
        {
          text: 'Use 192.168.18.102',
          onPress: async () => {
            await setManualProxyIP('192.168.18.102');
            feedback.success();
            Alert.alert('IP Set', 'Proxy IP set to: 192.168.18.102\n\nTest connectivity to verify it works.');
          }
        },
        {
          text: 'Enter Different IP',
          onPress: () => showCustomIPInput()
        },
        {
          text: 'Auto-Detect',
          onPress: async () => {
            await clearManualProxyIP();
            feedback.buttonPress();
            Alert.alert('Auto-Detection Enabled', 'Will use automatic IP detection.\n\nTest connectivity to see the detected IP.');
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const showCustomIPInput = () => {
    // Since Alert.prompt doesn't work on all platforms, provide common IP options
    Alert.alert(
      'Select IP Address',
      'Choose a common IP range or cancel to keep current setting:',
      [
        {
          text: '192.168.1.x',
          onPress: () => showSpecificIPOptions('192.168.1')
        },
        {
          text: '192.168.0.x',
          onPress: () => showSpecificIPOptions('192.168.0')
        },
        {
          text: '192.168.18.x',
          onPress: () => showSpecificIPOptions('192.168.18')
        },
        {
          text: '10.0.0.x',
          onPress: () => showSpecificIPOptions('10.0.0')
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const showSpecificIPOptions = (baseIP: string) => {
    const commonEndings = ['100', '101', '102', '103', '105', '110'];
    
    Alert.alert(
      `Select ${baseIP}.x`,
      'Choose the last number for your IP address:',
      [
        ...commonEndings.map(ending => ({
          text: `${baseIP}.${ending}`,
          onPress: async () => {
            const fullIP = `${baseIP}.${ending}`;
            await setManualProxyIP(fullIP);
            feedback.success();
            Alert.alert('IP Set', `Proxy IP set to: ${fullIP}\n\nTest connectivity to verify it works.`);
          }
        })),
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const showManualIPDialog = () => {
    // This is now replaced by showManualIPOptions
    showManualIPOptions();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Event Details", headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading event details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Event Details", headerShown: true }} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Event not found</Text>
          <TouchableOpacity 
            onPress={handleBack} 
            style={[styles.backButton, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render the appropriate content based on the active tab
  const renderContent = () => {
    // All remaining tabs use ScrollView as they don't contain FlatLists
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderEventHeader()}
        {renderTabBar()}
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {renderTabContent()}
        </ScrollView>
      </View>
    );
  };

  // Main render function
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: event?.title || "Event Details",
          headerShown: true,
          headerRight: () => null,
        }}
      />
      
      {renderContent()}
      
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={handleCloseScanner}
        statusBarTranslucent
        style={{ backgroundColor: colors.background }}
      >
        <QRScanner onScan={handleScanResult} onClose={handleCloseScanner} />
      </Modal>
    </SafeAreaView>
  );
}

// Helper function to generate colors for different ticket types
const getTicketColor = (index: number) => {
  const colors = ['#FF9500', '#4CAF50', '#2196F3', '#9C27B0', '#FF3B30'];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    marginBottom: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  eventMeta: {
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  metaIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    borderRadius: 8,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  infoCard: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'column',
    marginBottom: 8,
  },
  headerButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  addButtonText: {
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 14,
  },
  ticketItem: {
    width: 160,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    marginBottom: 16,
  },
  ticketType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ticketPrice: {
    fontSize: 14,
  },
  ticketStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ticketStatItem: {
    alignItems: 'center',
  },
  ticketStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ticketStatLabel: {
    fontSize: 12,
  },
  ticketList: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
    paddingTop: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '80%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  guestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  guestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    marginRight: 12,
  },
  guestDetails: {
    flex: 1,
    paddingRight: 8,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  guestEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  guestTypeRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  guestTicketType: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  guestStatus: {
    justifyContent: 'center',
    minWidth: 100,
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  statusTime: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
    textAlign: 'right',
  },
  guestList: {
    marginTop: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200, 200, 200, 0.2)',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  emptyGuestContainer: {
    alignItems: 'center',
    padding: 30,
    paddingTop: 40,
  },
  emptyGuestText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyGuestSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '80%',
  },
  emptyGuestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyGuestButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  scannerActionsCard: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scannerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  scannerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    minWidth: '30%',
    justifyContent: 'center',
  },
  scannerActionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  emptyAttendanceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAttendanceText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyAttendanceSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  emptyAttendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyAttendanceButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 8,
    fontSize: 16,
  },
  attendeeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    marginRight: 12,
  },
  attendeeDetails: {
    flex: 1,
    paddingRight: 8,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  attendeeEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  attendeeTypeRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  checkInTime: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  attendeeStatus: {
    justifyContent: 'center',
    minWidth: 100,
    alignItems: 'flex-end',
  },
  networkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  attendeeTicketType: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  attendeeList: {
    marginTop: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    minWidth: '45%',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  statsCard: {
    borderRadius: 16,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  attendanceContainer: {
    marginBottom: 24,
  },
  attendanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  attendanceCircle: {
    width: 60,
    height: 60,
    borderWidth: 3,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  attendancePercentage: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  attendanceLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  attendanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  attendanceStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  attendanceStatText: {
    alignItems: 'center',
  },
  attendanceStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  attendanceStatLabel: {
    fontSize: 14,
  },
  actionsCard: {
    borderRadius: 16,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  actionCard: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionCardText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
}); 