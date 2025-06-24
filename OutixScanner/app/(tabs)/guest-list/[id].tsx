import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    CheckCircle,
    QrCode,
    Search,
    User,
    UserCheck,
    Users
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import QRScanner from '../../../components/QRScanner';
import { useRefresh } from '../../../context/RefreshContext';
import { useTheme } from '../../../context/ThemeContext';
import {
    generateSampleQRData,
    getCheckedInGuestList,
    getEvents,
    getGuestList,
    scanQRCode,
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
  
  const [guestList, setGuestList] = useState<Attendee[]>([]);
  const [filteredGuestList, setFilteredGuestList] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked-in' | 'not-arrived'>('all');
  const [eventTitle, setEventTitle] = useState('');
  const [totalGuestsFromAPI, setTotalGuestsFromAPI] = useState<number>(0);
  const [checkedInGuests, setCheckedInGuests] = useState<Attendee[]>([]);
  const [mergedGuestList, setMergedGuestList] = useState<Attendee[]>([]);
  
  // Track which guests we've already marked as checked in to prevent duplicates
  const markedAsCheckedInRef = useRef(new Set<string>());

  useEffect(() => {
    initializeAudio();
    fetchEventAndGuestData();
    
    // Register for auto-refresh
    const unsubscribe = onGuestListRefresh(eventId, () => {
      console.log('Guest list auto-refresh triggered for event', eventId);
      fetchEventAndGuestData();
    });
    
    return unsubscribe;
  }, [eventId, onGuestListRefresh]);

  useEffect(() => {
    mergeGuestLists();
  }, [guestList, checkedInGuests]);

  useEffect(() => {
    filterGuests();
  }, [mergedGuestList, searchQuery, filterStatus]);

  const fetchEventAndGuestData = async () => {
    setLoading(true);
    
    try {
      // Fetch event details for title
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
        }
      }
      
      // Fetch guest list
      await fetchGuestList();
      
      // Fetch checked-in guests
      await fetchCheckedInGuests();
      
    } catch (err) {
      console.error("Failed to load guest data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuestList = async () => {
    try {
      const guestListData = await getGuestList(eventId);
      
      if (guestListData && Array.isArray(guestListData)) {
        console.log('Guest data sample:', JSON.stringify(guestListData[0], null, 2));
        
        const attendees = guestListData.map(guest => ({
          id: guest.id || guest.guestId || String(Math.random()),
          name: guest.purchased_by || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest',
          email: guest.email || 'N/A',
          ticketType: guest.ticket_title || guest.ticketType || guest.ticket_type || 'General',
          scannedIn: guest.checkedIn || guest.checked_in || guest.scannedIn || guest.admitted || guest.is_admitted || false,
          scanInTime: guest.checkInTime || guest.check_in_time || guest.admitted_time || undefined,
          scanCode: guest.scanCode || undefined,
          // Additional fields from API
          purchased_date: guest.purchased_date || undefined,
          reference_num: guest.booking_reference || guest.reference_num || undefined,
          booking_id: guest.booking_id || undefined,
          ticket_identifier: guest.ticket_identifier || undefined,
          price: guest.price || undefined,
          mobile: guest.mobile || undefined,
          address: guest.address || undefined,
          notes: guest.notes || undefined,
          // Raw guest data for details page
          rawData: guest
        }));
        
        console.log('Processed attendees sample:', {
          total: attendees.length,
          checkedIn: attendees.filter(a => a.scannedIn).length,
          sampleGuest: attendees[0]
        });
        
        setGuestList(attendees);
        setTotalGuestsFromAPI(attendees.length);
      } else {
        setGuestList([]);
        setTotalGuestsFromAPI(0);
      }
    } catch (err) {
      console.error("Failed to fetch guest list:", err);
      
      // Handle timeout errors specifically
      if (err instanceof Error && err.message.includes('timeout')) {
        console.log("Guest list API timed out, using fallback");
        // Set empty list but don't show error to user since we already handle it in parent
        setGuestList([]);
        setTotalGuestsFromAPI(0);
      } else {
        // For other errors, still set empty list
        setGuestList([]);
        setTotalGuestsFromAPI(0);
      }
    }
  };

  const fetchCheckedInGuests = async () => {
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
          scanCode: guest.scanCode || guest.qrCode || undefined,
          // Additional fields from API
          purchased_date: guest.purchased_date || undefined,
          reference_num: guest.booking_reference || guest.reference_num || undefined,
          booking_id: guest.booking_id || undefined,
          ticket_identifier: guest.ticket_identifier || undefined,
          price: guest.price || undefined,
          mobile: guest.mobile || undefined,
          address: guest.address || undefined,
          notes: guest.notes || undefined,
          // Raw guest data for details page
          rawData: guest
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
      setCheckedInGuests([]);
    }
  };

  const mergeGuestLists = () => {
    // Don't try to merge - just use the original guest list
    // We'll determine check-in status dynamically when filtering
    setMergedGuestList([...guestList]);
  };

  // Helper function to check if a guest is checked in
  const isGuestCheckedIn = (guest: Attendee) => {
    // If we've already marked someone as checked in with the same name/email, return false
    const guestKey = `${guest.name?.toLowerCase()}-${guest.email?.toLowerCase()}`;
    
    if (markedAsCheckedInRef.current.has(guestKey)) {
      return false;
    }
    
    // Check if this guest appears in the checked-in guests list
    const isMatched = checkedInGuests.some(checkedGuest => {
      // Try to match by unique identifiers first
      if (guest.id && checkedGuest.id && guest.id === checkedGuest.id) {
        return true;
      }
      if (guest.ticket_identifier && checkedGuest.ticket_identifier && 
          guest.ticket_identifier === checkedGuest.ticket_identifier) {
        return true;
      }
      if (guest.booking_id && checkedGuest.booking_id && 
          guest.booking_id === checkedGuest.booking_id) {
        return true;
      }
      if (guest.reference_num && checkedGuest.reference_num && 
          guest.reference_num === checkedGuest.reference_num) {
        return true;
      }
      
      // Fallback to name/email match
      return guest.name?.toLowerCase() === checkedGuest.name?.toLowerCase() && 
             guest.email?.toLowerCase() === checkedGuest.email?.toLowerCase();
    });
    
    // If matched, mark this guest key as used to prevent other tickets from matching
    if (isMatched) {
      markedAsCheckedInRef.current.add(guestKey);
    }
    
    return isMatched;
  };

  const filterGuests = () => {
    // Clear the tracking set at the start of each filter operation
    markedAsCheckedInRef.current.clear();
    
    let filtered;
    
    // For "Present" filter, use the checked-in guests directly (source of truth)
    if (filterStatus === 'checked-in') {
      filtered = [...checkedInGuests];
    } else {
      // For "All" and "Absent", use the original guest list with dynamic check-in status
      filtered = mergedGuestList.map(guest => ({
        ...guest,
        scannedIn: isGuestCheckedIn(guest) // Dynamically determine check-in status
      }));
      
      if (filterStatus === 'not-arrived') {
        filtered = filtered.filter(guest => !guest.scannedIn);
      }
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(guest => 
        guest.name.toLowerCase().includes(query) ||
        guest.email.toLowerCase().includes(query) ||
        guest.ticketType.toLowerCase().includes(query)
      );
    }
    
    setFilteredGuestList(filtered);
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
    let guestIndex = guestList.findIndex(a => 
      a.name.toLowerCase() === ticketInfo.fullname.toLowerCase() ||
      a.email.toLowerCase() === ticketInfo.email.toLowerCase()
    );
    
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
      
      setGuestList(prev => [...prev, newAttendee]);
      setTotalGuestsFromAPI(prev => prev + 1);
    } else {
      const updatedGuestList = [...guestList];
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
      setGuestList(updatedGuestList);
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
              await performManualScanIn(guest);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Manual scan in error:', error);
      feedback.error();
      Alert.alert('Error', 'Failed to check in guest manually.');
    }
  };

  const performManualScanIn = async (guest: Attendee) => {
    try {
      // Generate a mock scan code for manual check-in
      const mockScanCode = generateSampleQRData(guest.id);
      
      // Update local state first
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
    
    const guestIndex = guestList.findIndex(g => g.id === guest.id);
    
    if (guestIndex >= 0) {
      const updatedGuestList = [...guestList];
      updatedGuestList[guestIndex] = {
        ...updatedGuestList[guestIndex],
        scannedIn: true,
        scanInTime: timeString,
        scanCode: `MANUAL_${Date.now()}`
      };
      setGuestList(updatedGuestList);
    }
    
    console.log(`Manual check-in for ${guest.name} at ${timeString}`);
    feedback.checkIn();
    
    // Also update the checked-in guests list to keep counts in sync
    await fetchCheckedInGuests();
    
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
          <TouchableOpacity 
            style={styles.simpleScanButton}
            onPress={handleOpenScanner}
          >
            <QrCode size={20} color="#FFFFFF" />
          </TouchableOpacity>
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
              Present
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
              Absent
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Guest List */}
      {filteredGuestList.length > 0 ? (
        <FlatList
          data={filteredGuestList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
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
                  <View style={styles.modernStatusPresent}>
                    <CheckCircle size={12} color="#22C55E" />
                    <Text style={styles.modernStatusTextPresent}>Present</Text>
                  </View>
                ) : (
                  <View style={styles.modernActionGroup}>
                    <TouchableOpacity
                      style={styles.modernCheckInButton}
                      onPress={() => handleManualScanIn(item)}
                    >
                      <UserCheck size={12} color="#FFFFFF" />
                      <Text style={styles.modernCheckInText}>Check In</Text>
                    </TouchableOpacity>
                    <View style={styles.modernStatusAbsent}>
                      <User size={12} color="#FF6B35" />
                      <Text style={styles.modernStatusTextAbsent}>Absent</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
          style={styles.guestList}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Users size={60} color={colors.secondary} opacity={0.5} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {searchQuery || filterStatus !== 'all' ? 'No guests match your filters' : 'No guests registered'}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.secondary }]}>
            {searchQuery || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.' 
              : 'No one has registered for this event yet.'
            }
          </Text>
          {(!searchQuery && filterStatus === 'all') && (
            <TouchableOpacity 
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                feedback.buttonPress();
                fetchGuestList();
              }}
            >
              <QrCode size={16} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Scan Guests</Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
}); 