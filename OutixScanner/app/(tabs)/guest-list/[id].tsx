import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    ChevronDown,
    Search,
    User,
    UserCheck,
    Users
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import QRScanner from '../../../components/QRScanner';
import { useRefresh } from '../../../context/RefreshContext';
import { useTheme } from '../../../context/ThemeContext';
import {
    generateSampleQRData,
    getCheckedInGuestList,
    getEvents,
    getGuestListPaginated,
    scanQRCode,
    searchGuestList,
    unscanQRCode,
    validateQRCode
} from '../../../services/api';
import { feedback, initializeAudio } from '../../../services/feedback';

interface Attendee {
  id: string;
  name: string;
  email: string;
  ticketType: string;
  scannedIn: boolean;
  scanInTime?: string;
  scanCode?: string;
  // Additional fields from API
  purchased_date?: string;
  reference_num?: string;
  booking_id?: string;
  ticket_identifier?: string;
  price?: string;
  mobile?: string;
  address?: string;
  notes?: string;
  // Raw guest data for details page
  rawData?: any;
}

export default function GuestListPage() {
  const { colors, isDarkMode } = useTheme();
  const { onGuestListRefresh, triggerGuestListRefresh, triggerAttendanceRefresh, triggerAnalyticsRefresh } = useRefresh();
  const { id } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id || '1';
  
  // Updated state for pagination
  const [displayedGuests, setDisplayedGuests] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked-in' | 'not-arrived'>('all');
  const [eventTitle, setEventTitle] = useState('');
  const [totalGuestsFromAPI, setTotalGuestsFromAPI] = useState<number>(0);
  const [checkedInGuests, setCheckedInGuests] = useState<Attendee[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState<Attendee[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Debounce search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track which guests we've already marked as checked in to prevent duplicates
  const markedAsCheckedInRef = useRef(new Set<string>());

  // Debug function to log current state
  const logCurrentState = (action: string, guest: Attendee) => {
    console.log(`🔍 ${action} Debug State for ${guest.name}:`);
    console.log(`  - Guest scannedIn: ${guest.scannedIn}`);
    console.log(`  - Current filter: ${filterStatus}`);
    console.log(`  - Displayed guests count: ${displayedGuests.length}`);
    console.log(`  - Checked-in guests count: ${checkedInGuests.length}`);
    console.log(`  - Is search mode: ${isSearchMode}`);
  };

  // Define functions with useCallback to avoid dependency issues
  const fetchPaginatedGuests = useCallback(async (page: number, reset: boolean = false) => {
    try {
      if (!reset && page === 1) {
        setLoading(true);
      } else if (!reset) {
        setLoadingMore(true);
      }

      const result = await getGuestListPaginated(eventId, page, 10);
      
      const processedGuests = result.guests.map(guest => ({
          id: guest.id || guest.guestId || String(Math.random()),
          name: guest.purchased_by || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest',
          email: guest.email || 'N/A',
          ticketType: guest.ticket_title || guest.ticketType || guest.ticket_type || 'General',
          scannedIn: guest.checkedIn || guest.checked_in || guest.scannedIn || guest.admitted || guest.is_admitted || false,
          scanInTime: guest.checkInTime || guest.check_in_time || guest.admitted_time || undefined,
          scanCode: guest.scanCode || undefined,
          purchased_date: guest.purchased_date || undefined,
          reference_num: guest.booking_reference || guest.reference_num || undefined,
          booking_id: guest.booking_id || undefined,
          ticket_identifier: guest.ticket_identifier || undefined,
          price: guest.price || undefined,
          mobile: guest.mobile || undefined,
          address: guest.address || undefined,
          notes: guest.notes || undefined,
          rawData: guest
        }));
        
      if (reset || page === 1) {
        setDisplayedGuests(processedGuests);
      } else {
        setDisplayedGuests(prev => [...prev, ...processedGuests]);
      }
      
      setCurrentPage(page);
      setHasMore(result.hasMore);
      setTotalGuestsFromAPI(result.totalCount);
      
      console.log(`Loaded page ${page}, total guests: ${result.totalCount}, has more: ${result.hasMore}`);
      
      // Sync check-in status with already fetched checked-in guests
      if (checkedInGuests.length > 0) {
        console.log('🔄 Syncing check-in status after loading paginated guests...');
        setTimeout(() => syncCheckInStatus(checkedInGuests), 100);
      }
      
    } catch (error) {
      console.error('Failed to fetch paginated guests:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [eventId]);

  const fetchCheckedInGuests = useCallback(async () => {
    try {
      console.log('Fetching checked-in guests for guest list...');
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
          scanCode: guest.scanCode || undefined,
          purchased_date: guest.purchased_date || undefined,
          reference_num: guest.booking_reference || guest.reference_num || undefined,
          booking_id: guest.booking_id || undefined,
          ticket_identifier: guest.ticket_identifier || undefined,
          price: guest.price || undefined,
          mobile: guest.mobile || undefined,
          address: guest.address || undefined,
          notes: guest.notes || undefined,
          rawData: guest
        }));
        
        setCheckedInGuests(attendees);
        
        // Sync the check-in status with displayed guests
        syncCheckInStatus(attendees);
      } else {
        setCheckedInGuests([]);
      }
    } catch (error) {
      console.error('Failed to fetch checked-in guests:', error);
      setCheckedInGuests([]);
    }
  }, [eventId]);

  // Function to sync check-in status between checked-in guests and displayed guests
  const syncCheckInStatus = useCallback((checkedInList: Attendee[]) => {
    setDisplayedGuests(prevGuests => {
      let syncedInCount = 0;
      let syncedOutCount = 0;
      const updated = prevGuests.map(guest => {
        // Check if this guest is in the checked-in list
        // Priority: ticket_identifier > id > name+email combination
        const checkedInGuest = checkedInList.find(checkedInGuest => {
          // First, try to match by ticket_identifier (most specific)
          if (checkedInGuest.ticket_identifier && guest.ticket_identifier) {
            return checkedInGuest.ticket_identifier === guest.ticket_identifier;
          }
          
          // Second, try to match by unique ID
          if (checkedInGuest.id === guest.id && guest.id !== 'N/A' && guest.id) {
            return true;
          }
          
          // Last resort: match by name AND email combination (both must match)
          return checkedInGuest.name.toLowerCase() === guest.name.toLowerCase() &&
                 checkedInGuest.email.toLowerCase() === guest.email.toLowerCase();
        });
        
        if (checkedInGuest && !guest.scannedIn) {
          // Guest is checked-in on API but not locally - sync to checked-in
          syncedInCount++;
          console.log(`✅ Synced check-in status for: ${guest.name}`);
          return {
            ...guest,
            scannedIn: true,
            scanInTime: checkedInGuest.scanInTime || guest.scanInTime,
            scanCode: checkedInGuest.scanCode || guest.scanCode
          };
        } else if (!checkedInGuest && guest.scannedIn) {
          // Guest is checked-in locally but not on API - sync to checked-out
          syncedOutCount++;
          console.log(`✅ Synced check-out status for: ${guest.name}`);
          return {
            ...guest,
            scannedIn: false,
            scanInTime: undefined,
            scanCode: undefined
          };
        }
        
        return guest;
      });
      
      if (syncedInCount > 0 || syncedOutCount > 0) {
        console.log(`✅ Successfully synced ${syncedInCount} guests to checked-in and ${syncedOutCount} guests to checked-out`);
      } else {
        console.log('ℹ️ No guests needed sync (all status up to date)');
      }
      
      return updated;
    });
  }, []);

  const refreshGuestList = useCallback(async () => {
    // Reset pagination and reload
    setCurrentPage(1);
    setDisplayedGuests([]);
    setSearchQuery('');
    setIsSearchMode(false);
    setSearchResults([]);
    await fetchPaginatedGuests(1, true);
    await fetchCheckedInGuests();
  }, [fetchPaginatedGuests, fetchCheckedInGuests]);

  const fetchEventAndInitialData = useCallback(async () => {
    setLoading(true);
    console.log(`🚀 Starting fetchEventAndInitialData for event: ${eventId}`);
    
    try {
      // Fetch event details for title
      console.log('📋 Fetching event details...');
      const eventsData = await getEvents();
      if (Array.isArray(eventsData) && eventsData.length > 0) {
        const apiEvent = eventsData.find(e => 
          e.id === eventId || 
          e.eventId === eventId || 
          e.EventId === eventId || 
          String(e._id) === eventId
        );
        
        if (apiEvent) {
          setEventTitle(apiEvent.title || apiEvent.name || apiEvent.EventName || 'Event');
          console.log(`✅ Event title set: ${apiEvent.title || apiEvent.name || apiEvent.EventName}`);
        }
      }
      
      // Fetch initial paginated guest list
      console.log('📋 Fetching paginated guests...');
      await fetchPaginatedGuests(1, true);
      
      // Fetch checked-in guests for stats
      console.log('📋 Fetching checked-in guests...');
      await fetchCheckedInGuests();
      
      console.log('✅ Initial data fetch completed');
      
    } catch (err) {
      console.error("❌ Failed to load guest data:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId, fetchPaginatedGuests, fetchCheckedInGuests]);

  useEffect(() => {
    initializeAudio();
    fetchEventAndInitialData();
    
    // Register for auto-refresh
    const unsubscribe = onGuestListRefresh(eventId, () => {
      console.log('Guest list auto-refresh triggered for event', eventId);
      refreshGuestList();
    });
    
    return unsubscribe;
  }, [eventId, onGuestListRefresh, fetchEventAndInitialData, refreshGuestList]);

  // Sync check-in status whenever checked-in guests are updated and we have displayed guests
  useEffect(() => {
    if (checkedInGuests.length > 0 && displayedGuests.length > 0) {
      console.log(`🔄 Syncing check-in status: ${checkedInGuests.length} checked-in guests with ${displayedGuests.length} displayed guests...`);
      syncCheckInStatus(checkedInGuests);
    }
  }, [checkedInGuests, displayedGuests.length, syncCheckInStatus]);

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim() === '') {
      setIsSearchMode(false);
      setSearchResults([]);
      return;
    }

    setIsSearchMode(true);
    setSearchLoading(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('Performing search for:', searchQuery);
        const results = await searchGuestList(eventId, searchQuery);
        const processedResults = results.map(guest => ({
          id: guest.id || guest.guestId || String(Math.random()),
          name: guest.purchased_by || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest',
          email: guest.email || 'N/A',
          ticketType: guest.ticket_title || guest.ticketType || guest.ticket_type || 'General',
          scannedIn: guest.checkedIn || guest.checked_in || guest.scannedIn || guest.admitted || guest.is_admitted || false,
          scanInTime: guest.checkInTime || guest.check_in_time || guest.admitted_time || undefined,
          scanCode: guest.scanCode || undefined,
          purchased_date: guest.purchased_date || undefined,
          reference_num: guest.booking_reference || guest.reference_num || undefined,
          booking_id: guest.booking_id || undefined,
          ticket_identifier: guest.ticket_identifier || undefined,
          price: guest.price || undefined,
          mobile: guest.mobile || undefined,
          address: guest.address || undefined,
          notes: guest.notes || undefined,
          rawData: guest
        }));
        
        setSearchResults(processedResults);
        
        // Sync check-in status for search results if we have checked-in guests
        if (checkedInGuests.length > 0) {
          setTimeout(() => {
            setSearchResults(prevResults => 
              prevResults.map(guest => {
                const checkedInGuest = checkedInGuests.find(checkedInGuest => {
                  // First, try to match by ticket_identifier (most specific)
                  if (checkedInGuest.ticket_identifier && guest.ticket_identifier) {
                    return checkedInGuest.ticket_identifier === guest.ticket_identifier;
                  }
                  
                  // Second, try to match by unique ID
                  if (checkedInGuest.id === guest.id && guest.id !== 'N/A' && guest.id) {
                    return true;
                  }
                  
                  // Last resort: match by name AND email combination (both must match)
                  return checkedInGuest.name.toLowerCase() === guest.name.toLowerCase() &&
                         checkedInGuest.email.toLowerCase() === guest.email.toLowerCase();
                });
                
                if (checkedInGuest) {
                  return {
                    ...guest,
                    scannedIn: true,
                    scanInTime: checkedInGuest.scanInTime || guest.scanInTime,
                    scanCode: checkedInGuest.scanCode || guest.scanCode
                  };
                }
                
                return guest;
              })
            );
          }, 50);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, eventId]);

  // Get filtered guests for display
  const getFilteredGuests = (guests: Attendee[]) => {
    switch (filterStatus) {
      case 'checked-in':
        // Use dedicated checked-in guests list for Present tab
        return checkedInGuests;
      case 'not-arrived':
        return guests.filter(guest => !guest.scannedIn);
      default:
        return guests;
    }
  };

  // Handle filtering logic based on search mode and filter status
  const filteredGuestList = (() => {
    if (filterStatus === 'checked-in') {
      // For Present tab, always use checked-in guests list
      if (isSearchMode && searchQuery.trim()) {
        // Filter checked-in guests by search query
        return checkedInGuests.filter(guest => 
          guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          guest.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          guest.ticketType.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      return checkedInGuests;
    } else {
      // For All and Absent tabs, use regular filtering
      return isSearchMode 
        ? getFilteredGuests(searchResults)
        : getFilteredGuests(displayedGuests);
    }
  })();

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || isSearchMode) return;
    
    await fetchPaginatedGuests(currentPage + 1, false);
  }, [hasMore, loadingMore, isSearchMode, fetchPaginatedGuests, currentPage]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Reset pagination and fetch fresh data
      await Promise.all([
        fetchPaginatedGuests(1, true),
        fetchCheckedInGuests()
      ]);
      // Also trigger refresh for other components
      triggerGuestListRefresh(eventId);
      triggerAttendanceRefresh(eventId);
      triggerAnalyticsRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenScanner = () => {
    feedback.buttonPress();
    setShowScanner(true);
  };

  const handleCloseScanner = () => {
    feedback.buttonPress();
    setShowScanner(false);
  };

  const handleScanResult = async (data: string) => {
    setShowScanner(false);
    
    try {
      console.log('QR Code scanned:', data);
      
      const validationResult = await validateQRCode(eventId, data);
      
      if (!validationResult) {
        feedback.error();
        Alert.alert('Validation Error', 'Failed to validate QR code. Please try again.');
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
      
    } catch (error) {
      console.error('QR scan error:', error);
      feedback.error();
      Alert.alert('Error', 'An unexpected error occurred while processing the QR code.');
    }
  };

  const performScanIn = async (scanCode: string, validationResult: any) => {
    try {
      await updateLocalScanIn(scanCode, validationResult);
      
      const scanResult = await scanQRCode(eventId, scanCode);
      
      if (!scanResult || scanResult.error) {
        let errorMessage = 'Failed to scan in guest';
        if (scanResult?.msg) {
          errorMessage = typeof scanResult.msg === 'string' ? scanResult.msg : scanResult.msg.message;
        }
        
        feedback.error();
        Alert.alert('Scan In Failed', errorMessage + '\n\nLocal guest list has been updated.');
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
        'Guest Admitted Successfully',
        `${ticketInfo?.fullname || 'Guest'} has been admitted.\n\n${successMessage}\n\nGuest list updated locally.`
      );
      
    } catch (error) {
      console.error('Scan in error:', error);
      await updateLocalScanIn(scanCode, validationResult);
      feedback.error();
      Alert.alert('Scan In Error', 'Failed to scan in guest via API. Local guest list has been updated.');
    }
  };

  const updateLocalScanIn = async (scanCode: string, validationResult: any) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const ticketInfo = validationResult.msg.info;
    let guestIndex = displayedGuests.findIndex(a => {
      // First, try to match by ticket_identifier (most specific)
      if (ticketInfo.ticket_identifier && a.ticket_identifier) {
        return a.ticket_identifier === ticketInfo.ticket_identifier;
      }
      
      // Second, try to match by unique ID
      if (ticketInfo.id && a.id && a.id !== 'N/A') {
        return a.id === ticketInfo.id;
      }
      
      // Last resort: match by name AND email combination (both must match)
      return a.name.toLowerCase() === ticketInfo.fullname.toLowerCase() &&
             a.email.toLowerCase() === ticketInfo.email.toLowerCase();
    });
    
    if (guestIndex < 0) {
      const newAttendee: Attendee = {
        id: `guest_${Date.now()}`,
        name: ticketInfo.fullname,
        email: ticketInfo.email,
        ticketType: ticketInfo.ticket_title,
        scannedIn: true,
        scanInTime: timeString,
        scanCode: scanCode,
        // Additional fields from API
        purchased_date: ticketInfo.purchased_date || undefined,
        reference_num: ticketInfo.booking_reference || ticketInfo.reference_num || undefined,
        booking_id: ticketInfo.booking_id || undefined,
        ticket_identifier: ticketInfo.ticket_identifier || undefined,
        price: ticketInfo.price || undefined,
        mobile: ticketInfo.mobile || undefined,
        address: ticketInfo.address || undefined,
        notes: ticketInfo.notes || undefined,
        // Raw guest data for details page
        rawData: ticketInfo
      };
      
      setDisplayedGuests(prev => [...prev, newAttendee]);
      setTotalGuestsFromAPI(prev => prev + 1);
    } else {
      const updatedGuestList = [...displayedGuests];
      updatedGuestList[guestIndex] = {
        ...updatedGuestList[guestIndex],
        scannedIn: true,
        scanInTime: timeString,
        scanCode: scanCode,
        // Additional fields from API
        purchased_date: ticketInfo.purchased_date || undefined,
        reference_num: ticketInfo.booking_reference || ticketInfo.reference_num || undefined,
        booking_id: ticketInfo.booking_id || undefined,
        ticket_identifier: ticketInfo.ticket_identifier || undefined,
        price: ticketInfo.price || undefined,
        mobile: ticketInfo.mobile || undefined,
        address: ticketInfo.address || undefined,
        notes: ticketInfo.notes || undefined,
        // Raw guest data for details page
        rawData: ticketInfo
      };
      setDisplayedGuests(updatedGuestList);
    }
    
    console.log(`Updated scan-in status for ${ticketInfo.fullname} at ${timeString}`);
    feedback.checkIn();
    
    // Also update the checked-in guests list to keep counts in sync
    await fetchCheckedInGuests();
    
    // Trigger refresh for other components
    triggerAttendanceRefresh(eventId);
    triggerAnalyticsRefresh();
  };

  const handleManualScanIn = async (guest: Attendee) => {
    try {
      feedback.buttonPress();
      console.log(`🔄 Manual check-in requested for: ${guest.name}`);
      logCurrentState('BEFORE CHECK-IN', guest);
      
      Alert.alert(
        'Manual Check-In',
        `Check in ${guest.name}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => feedback.buttonPress()
          },
          {
            text: 'Check In',
            onPress: async () => {
              feedback.buttonPressHeavy();
              console.log(`✅ User confirmed check-in for: ${guest.name}`);
              await performManualScanIn(guest);
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Manual scan in error:', error);
      feedback.error();
      Alert.alert('Error', 'Failed to check in guest manually.');
    }
  };

    const handleManualScanOut = async (guest: Attendee) => {
    try {
      feedback.buttonPress();
      console.log(`🔄 Manual check-out requested for: ${guest.name}`);
      logCurrentState('BEFORE CHECK-OUT', guest);
      
      console.log(`🚨 BYPASSING ALERT - Directly performing checkout for ${guest.name}`);
      
      // Skip the alert for now and directly perform checkout
      try {
        feedback.buttonPressHeavy();
        console.log(`✅ Directly performing check-out for: ${guest.name}`);
        console.log(`🚀 Starting performManualScanOut...`);
        await performManualScanOut(guest);
        console.log(`🎉 performManualScanOut completed for: ${guest.name}`);
      } catch (error) {
        console.error(`💥 Error in performManualScanOut:`, error);
        console.log(`Failed to check out ${guest.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
      
    } catch (error) {
      console.error('❌ Manual scan out error:', error);
      feedback.error();
      console.log(`Failed to check out guest manually: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const performManualScanIn = async (guest: Attendee) => {
    try {
      console.log(`🔧 Starting performManualScanIn for: ${guest.name}`);
      
      // Generate a mock scan code for manual check-in
      const mockScanCode = generateSampleQRData(guest.id);
      console.log(`📱 Generated scan code: ${mockScanCode}`);
      
      // Update local state first
      console.log(`💾 Updating local state...`);
      await updateLocalManualScanIn(guest);
      
      // Try to call the API with the mock scan code
      const scanResult = await scanQRCode(eventId, mockScanCode);
      
      if (!scanResult || scanResult.error) {
        let errorMessage = 'Failed to check in guest via API';
        if (scanResult?.msg) {
          errorMessage = typeof scanResult.msg === 'string' ? scanResult.msg : scanResult.msg.message;
        }
        
        feedback.success(); // Still show success since local update worked
        Alert.alert(
          'Guest Checked In Locally',
          `${guest.name} has been checked in locally.\n\nAPI sync: ${errorMessage}`
        );
        return;
      }
      
      feedback.checkIn();
      
      let successMessage = 'Manual check-in successful';
      if (typeof scanResult.msg === 'string') {
        successMessage = scanResult.msg;
      } else if (scanResult.msg && typeof scanResult.msg === 'object' && 'message' in scanResult.msg) {
        successMessage = scanResult.msg.message;
      }
      
      Alert.alert(
        'Guest Checked In Successfully',
        `${guest.name} has been checked in manually.\n\n${successMessage}`
      );
      
      // Refresh checked-in guests list after successful API call
      await fetchCheckedInGuests();
      
    } catch (error) {
      console.error('Manual scan in error:', error);
      // Still update locally even if API fails
      await updateLocalManualScanIn(guest);
      feedback.success();
      Alert.alert(
        'Guest Checked In Locally',
        `${guest.name} has been checked in locally.\n\nAPI sync failed but local update successful.`
      );
    }
  };

  const updateLocalManualScanIn = async (guest: Attendee) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Update in displayed guests list (for All/Absent tabs)
    const guestIndex = displayedGuests.findIndex(g => g.id === guest.id);
    if (guestIndex >= 0) {
      const updatedGuestList = [...displayedGuests];
      updatedGuestList[guestIndex] = {
        ...updatedGuestList[guestIndex],
        scannedIn: true,
        scanInTime: timeString,
        scanCode: `MANUAL_${Date.now()}`
      };
      setDisplayedGuests(updatedGuestList);
    }
    
    // Also update in search results if it exists there
    const searchIndex = searchResults.findIndex(g => g.id === guest.id);
    if (searchIndex >= 0) {
      const updatedSearchResults = [...searchResults];
      updatedSearchResults[searchIndex] = {
        ...updatedSearchResults[searchIndex],
        scannedIn: true,
        scanInTime: timeString,
        scanCode: `MANUAL_${Date.now()}`
      };
      setSearchResults(updatedSearchResults);
    }
    
    console.log(`✅ Manual check-in for ${guest.name} at ${timeString}`);
    feedback.checkIn();
    
    console.log(`✅ Check-in process completed for ${guest.name}`);
    
    // Trigger refresh for other components
    triggerAttendanceRefresh(eventId);
    triggerAnalyticsRefresh();
  };

  const performManualScanOut = async (guest: Attendee) => {
    try {
      console.log(`🔧 Starting performManualScanOut for: ${guest.name}`);
      
      // Update local state first for immediate UI feedback
      console.log(`💾 Updating local state...`);
      await updateLocalManualScanOut(guest);
      
      // Try to call the API to actually check out the guest
      if (guest.scanCode || guest.ticket_identifier) {
        const scanCode = guest.scanCode || guest.ticket_identifier || generateSampleQRData(guest.id);
        console.log(`📱 Attempting API checkout with scan code: ${scanCode}`);
        
        const unscanResult = await unscanQRCode(eventId, scanCode);
        
        if (unscanResult && !unscanResult.error) {
          console.log('✅ API checkout successful');
          feedback.success();
          
          let successMessage = 'Manual check-out successful';
          if (typeof unscanResult.msg === 'string') {
            successMessage = unscanResult.msg;
          } else if (unscanResult.msg && typeof unscanResult.msg === 'object' && 'message' in unscanResult.msg) {
            successMessage = unscanResult.msg.message;
          }
          
          Alert.alert(
            'Guest Checked Out Successfully',
            `${guest.name} has been checked out.\n\n${successMessage}`
          );
          
          // Refresh checked-in guests list after successful API call
          await fetchCheckedInGuests();
        } else {
          // API failed but local update succeeded
          console.log('⚠️ API checkout failed, but local update succeeded');
          feedback.success();
          
          let errorMessage = 'API sync failed';
          if (unscanResult?.msg) {
            errorMessage = typeof unscanResult.msg === 'string' ? unscanResult.msg : unscanResult.msg.message;
          }
          
          Alert.alert(
            'Guest Checked Out Locally',
            `${guest.name} has been checked out locally.\n\nAPI sync: ${errorMessage}`
          );
        }
      } else {
        // No scan code available, just local update
        console.log('⚠️ No scan code available for API checkout, local update only');
        feedback.success();
        Alert.alert(
          'Guest Checked Out Locally',
          `${guest.name} has been checked out locally.\n\nNo scan code available for API sync.`
        );
      }
      
    } catch (error) {
      console.error('❌ Manual scan out error:', error);
      // Still show success since local update worked
      feedback.success();
      Alert.alert(
        'Guest Checked Out Locally',
        `${guest.name} has been checked out locally.\n\nAPI sync failed but local update successful.`
      );
    }
  };

  const updateLocalManualScanOut = async (guest: Attendee) => {
    console.log(`🔧 updateLocalManualScanOut starting for: ${guest.name}`);
    console.log(`🔍 Looking for guest with ID: ${guest.id}, Email: ${guest.email}, Name: ${guest.name}`);
    
    // Update in displayed guests list (for All tab)
    const guestIndex = displayedGuests.findIndex(g => 
      g.id === guest.id || 
      g.email === guest.email ||
      g.name === guest.name
    );
    
    console.log(`🔍 Guest index in displayedGuests: ${guestIndex} (out of ${displayedGuests.length} guests)`);
    
    if (guestIndex >= 0) {
      const updatedGuestList = [...displayedGuests];
      const originalGuest = updatedGuestList[guestIndex];
      console.log(`🔍 Original guest scannedIn status: ${originalGuest.scannedIn}`);
      
      updatedGuestList[guestIndex] = {
        ...updatedGuestList[guestIndex],
        scannedIn: false,
        scanInTime: undefined,
        scanCode: undefined
      };
      
      setDisplayedGuests(updatedGuestList);
      console.log(`✅ Updated guest in displayedGuests: ${guest.name} (scannedIn changed from ${originalGuest.scannedIn} to false)`);
    } else {
      console.log(`❌ Guest NOT FOUND in displayedGuests: ${guest.name}`);
      console.log(`🔍 Available guests in displayedGuests:`, displayedGuests.map(g => ({name: g.name, id: g.id, email: g.email})));
    }
    
    // Also update in search results if it exists there
    const searchIndex = searchResults.findIndex(g => 
      g.id === guest.id || 
      g.email === guest.email ||
      g.name === guest.name
    );
    
    if (searchIndex >= 0) {
      const updatedSearchResults = [...searchResults];
      updatedSearchResults[searchIndex] = {
        ...updatedSearchResults[searchIndex],
        scannedIn: false,
        scanInTime: undefined,
        scanCode: undefined
      };
      setSearchResults(updatedSearchResults);
      console.log(`✅ Updated guest in searchResults: ${guest.name}`);
    }
    
    // Remove from checked-in guests list (for Present tab)
    setCheckedInGuests(prevCheckedIn => {
      const filtered = prevCheckedIn.filter(g => 
        g.id !== guest.id && 
        g.email !== guest.email &&
        g.name !== guest.name
      );
      console.log(`✅ Removed guest from checkedInGuests: ${guest.name}`);
      return filtered;
    });
    
    console.log(`✅ Manual check-out for ${guest.name}`);
    feedback.checkIn();
    
    console.log(`✅ Check-out process completed for ${guest.name}`);
    
    // Trigger refresh for other components
    triggerAttendanceRefresh(eventId);
    triggerAnalyticsRefresh();
  };

  // Use the dedicated checked-in guests list for accurate count (same as event details page)
  const checkedInCount = checkedInGuests.length;
  const attendancePercentage = totalGuestsFromAPI ? Math.round((checkedInCount / totalGuestsFromAPI) * 100) : 0;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Guest List", headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading guest list...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: "Guest List",
          headerShown: true,
        }}
      />
      
      {/* Simple Header */}
      <View style={[styles.simpleHeader, { backgroundColor: colors.card }]}>
        <View style={styles.simpleHeaderRow}>
          <TouchableOpacity 
            style={styles.simpleBackButton}
            onPress={() => {
              feedback.buttonPress();
              router.back();
            }}
          >
            <ArrowLeft size={20} color="#FF6B00" />
          </TouchableOpacity>
          <View style={styles.simpleHeaderContent}>
            <Text style={[styles.simpleTitle, { color: colors.text }]}>Guest List</Text>
            <Text style={[styles.simpleSubtitle, { color: colors.secondary }]}>{eventTitle}</Text>
          </View>
        </View>
        
        {/* Simple Stats */}
        <View style={styles.simpleStatsRow}>
          <View style={styles.simpleStatItem}>
            <Text style={[styles.simpleStatNumber, { color: colors.text }]}>{totalGuestsFromAPI}</Text>
            <Text style={[styles.simpleStatLabel, { color: colors.secondary }]}>Total</Text>
          </View>
          <View style={styles.simpleStatItem}>
            <Text style={[styles.simpleStatNumber, { color: '#22C55E' }]}>{checkedInCount}</Text>
            <Text style={[styles.simpleStatLabel, { color: colors.secondary }]}>Present</Text>
          </View>
          <View style={styles.simpleStatItem}>
            <Text style={[styles.simpleStatNumber, { color: '#FF6B00' }]}>{attendancePercentage}%</Text>
            <Text style={[styles.simpleStatLabel, { color: colors.secondary }]}>Rate</Text>
          </View>
        </View>
      </View>

      {/* Simple Search and Filter */}
      <View style={[styles.simpleSearchContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.simpleSearchBar, { backgroundColor: colors.card }]}>
          <Search size={16} color={colors.secondary} />
          <TextInput
            style={[styles.simpleSearchInput, { color: colors.text }]}
            placeholder="Search guests..."
            placeholderTextColor={colors.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.simpleFilterButtons}>
          <TouchableOpacity
            style={[
              styles.simpleFilterButton,
              { backgroundColor: filterStatus === 'all' ? '#FF6B00' : colors.card }
            ]}
            onPress={() => {
              feedback.buttonPress();
              setFilterStatus('all');
            }}
          >
            <Text style={[
              styles.simpleFilterText,
              { color: filterStatus === 'all' ? '#FFFFFF' : colors.text }
            ]}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.simpleFilterButton,
              { backgroundColor: filterStatus === 'checked-in' ? '#22C55E' : colors.card }
            ]}
            onPress={() => {
              feedback.buttonPress();
              setFilterStatus('checked-in');
            }}
          >
            <Text style={[
              styles.simpleFilterText,
              { color: filterStatus === 'checked-in' ? '#FFFFFF' : colors.text }
            ]}>
              Checked In
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.simpleFilterButton,
              { backgroundColor: filterStatus === 'not-arrived' ? '#FF6B35' : colors.card }
            ]}
            onPress={() => {
              feedback.buttonPress();
              setFilterStatus('not-arrived');
            }}
          >
            <Text style={[
              styles.simpleFilterText,
              { color: filterStatus === 'not-arrived' ? '#FFFFFF' : colors.text }
            ]}>
              Pending...
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Guest List */}
      {filteredGuestList.length > 0 ? (
        <>
        <FlatList
          data={filteredGuestList}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
            renderItem={({ item }) => {
              console.log(`📋 Rendering guest: ${item.name}, scannedIn: ${item.scannedIn}`);
              return (
            <View style={[styles.modernGuestItem, { backgroundColor: colors.card }]}>
              <TouchableOpacity 
                style={styles.modernGuestInfo}
                onPress={() => {
                  feedback.buttonPress();
                  router.push({
                    pathname: '/guest-list/guest-details',
                    params: {
                      guestData: JSON.stringify(item),
                      eventTitle: eventTitle
                    }
                  });
                }}
              >
                <Text style={[styles.modernGuestName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.modernGuestEmail, { color: colors.secondary }]}>{item.email}</Text>
                <Text style={[styles.modernGuestTicket, { color: '#FF6B00' }]}>{item.ticketType}</Text>
              </TouchableOpacity>
              <View style={styles.modernGuestActions}>
                {item.scannedIn ? (
                    <View style={styles.modernActionGroup}>
                      <TouchableOpacity
                        style={styles.modernCheckOutButton}
                        onPress={() => {
                          console.log(`🔘 Check Out button pressed for: ${item.name} (scannedIn: ${item.scannedIn})`);
                          handleManualScanOut(item);
                        }}
                        activeOpacity={0.7}
                      >
                        <User size={12} color="#FFFFFF" />
                        <Text style={styles.modernCheckOutText}>Check Out</Text>
                      </TouchableOpacity>
                  <View style={styles.modernStatusPresent}>
                      </View>
                  </View>
                ) : (
                  <View style={styles.modernActionGroup}>
                    <TouchableOpacity
                      style={styles.modernCheckInButton}
                        onPress={() => {
                          console.log(`🔘 Check In button pressed for: ${item.name} (scannedIn: ${item.scannedIn})`);
                          handleManualScanIn(item);
                        }}
                    >
                      <UserCheck size={12} color="#FFFFFF" />
                      <Text style={styles.modernCheckInText}>Check In</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            );
            }}
          style={styles.guestList}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            ListFooterComponent={() => {
              if (isSearchMode) {
                return searchLoading ? (
                  <View style={styles.searchLoadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.searchLoadingText, { color: colors.secondary }]}>
                      Searching...
                    </Text>
                  </View>
                ) : null;
              }

              if (loadingMore) {
                return (
                  <View style={styles.loadMoreContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.loadMoreText, { color: colors.secondary }]}>
                      Loading more guests...
                    </Text>
                  </View>
                );
              }

              if (hasMore && !isSearchMode) {
                return (
                  <TouchableOpacity 
                    style={[styles.showMoreButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={handleLoadMore}
                  >
                    <Text style={[styles.showMoreText, { color: colors.primary }]}>
                      Show More Guests
                    </Text>
                    <ChevronDown size={16} color={colors.primary} />
                  </TouchableOpacity>
                );
              }

              if (!hasMore && !isSearchMode && displayedGuests.length > 0) {
                return (
                  <View style={styles.endOfListContainer}>
                    <Text style={[styles.endOfListText, { color: colors.secondary }]}>
                      All guests loaded ({totalGuestsFromAPI} total)
                    </Text>
                  </View>
                );
              }

              return null;
            }}
          />
          
          {/* Search/Filter Info */}
          {(isSearchMode || filterStatus !== 'all') && (
            <View style={[styles.searchInfoContainer, { backgroundColor: colors.card }]}>
              <Text style={[styles.searchInfoText, { color: colors.secondary }]}>
                {isSearchMode 
                  ? `Found ${filteredGuestList.length} guests matching "${searchQuery}"`
                  : `Showing ${filteredGuestList.length} guests (${filterStatus})`
                }
              </Text>
              {isSearchMode && (
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery('');
                    setIsSearchMode(false);
                    setSearchResults([]);
                  }}
                  style={styles.clearSearchButton}
                >
                  <Text style={[styles.clearSearchText, { color: colors.primary }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Users size={60} color={colors.secondary} opacity={0.5} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {isSearchMode 
              ? `No guests found for "${searchQuery}"`
              : searchQuery || filterStatus !== 'all' 
                ? 'No guests match your filters' 
                : 'No guests registered'
            }
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.secondary }]}>
            {isSearchMode 
              ? 'Try a different search term or check spelling.'
              : searchQuery || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.' 
              : 'No one has registered for this event yet.'
            }
          </Text>
          {isSearchMode && (
            <TouchableOpacity 
              style={[styles.clearSearchButtonLarge, { backgroundColor: colors.primary }]}
              onPress={() => {
                setSearchQuery('');
                setIsSearchMode(false);
                setSearchResults([]);
              }}
            >
              <Text style={styles.clearSearchButtonText}>Clear Search</Text>
            </TouchableOpacity>
          )}
          {(!searchQuery && filterStatus === 'all' && !isSearchMode) && (
            <TouchableOpacity 
              style={[styles.emptyActionButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                feedback.buttonPress();
                refreshGuestList();
              }}
            >
              <Text style={styles.emptyActionText}>Refresh List</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  guestList: {
    flex: 1,
  },
  guestItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginVertical: 2,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  guestInfo: {
    flex: 1,
    paddingRight: 8,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  guestEmail: {
    fontSize: 13,
    marginBottom: 2,
  },
  guestTicketType: {
    fontSize: 12,
    fontWeight: '500',
  },
  guestActions: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 120,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  checkedInBadge: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
  },
  notArrivedBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
  },
  actionContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginBottom: 8,
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '80%',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  scanButton: {
    padding: 8,
    marginLeft: 12,
  },
  clearButton: {
    padding: 8,
  },
  // Modern Compact Design Styles
  modernHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButtonCompact: {
    padding: 6,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  modernHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  modernHeaderSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  scanButtonCompact: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  compactStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  compactStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  compactStatLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 8,
  },
  modernSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  compactSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  compactSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
  },
  compactClearButton: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 4,
  },
  compactFilterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  compactFilterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  compactFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modernGuestItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginVertical: 3,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  modernGuestInfo: {
    flex: 1,
    paddingRight: 8,
  },
  modernGuestName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  modernGuestEmail: {
    fontSize: 12,
    marginBottom: 3,
  },
  modernGuestTicket: {
    fontSize: 11,
    fontWeight: '500',
  },
  modernGuestActions: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 100,
  },
  modernStatusPresent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  modernStatusTextPresent: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22C55E',
    marginLeft: 4,
  },
  modernActionGroup: {
    alignItems: 'flex-end',
  },
  modernCheckInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#FF6B00',
    marginBottom: 6,
  },
  modernCheckInText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
    marginLeft: 3,
  },
  modernStatusAbsent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
  },
  modernStatusTextAbsent: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FF6B35',
    marginLeft: 3,
  },
  modernCheckOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F72585',
    marginBottom: 6,
  },
  modernCheckOutText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
    marginLeft: 3,
  },
  // Simple Design Styles
  simpleHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  simpleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  simpleBackButton: {
    padding: 8,
    marginRight: 12,
  },
  simpleHeaderContent: {
    flex: 1,
  },
  simpleTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  simpleSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    opacity: 0.7,
  },
  simpleScanButton: {
    backgroundColor: '#FF6B00',
    padding: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  simpleStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  simpleStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  simpleStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  simpleStatLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  simpleSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  simpleSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  simpleSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  simpleFilterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  simpleFilterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  simpleFilterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchLoadingContainer: {
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  searchLoadingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  loadMoreContainer: {
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    marginLeft: 8,
  },
  showMoreButton: {
    margin: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  endOfListContainer: {
    padding: 12,
    alignItems: 'center',
  },
  endOfListText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  searchInfoContainer: {
    margin: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchInfoText: {
    fontSize: 14,
    flex: 1,
  },
  clearSearchButton: {
    padding: 8,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearSearchButtonLarge: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  clearSearchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyActionButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 