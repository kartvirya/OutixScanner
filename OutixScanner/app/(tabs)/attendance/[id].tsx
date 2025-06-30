import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    Clock,
    Search,
    UserCheck,
    Users
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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
    getCheckedInGuestList,
    getEvents,
    getGuestList,
    scanQRCode,
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
}

export default function AttendancePage() {
  const { colors, isDarkMode } = useTheme();
  const { onAttendanceRefresh, triggerAttendanceRefresh, triggerGuestListRefresh, triggerAnalyticsRefresh } = useRefresh();
  const { id } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id || '1';
  
  const [checkedInGuests, setCheckedInGuests] = useState<Attendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [totalGuestsFromAPI, setTotalGuestsFromAPI] = useState<number>(0);
  const [scanMode, setScanMode] = useState<'scanIn' | 'scanOut'>('scanIn');

  useEffect(() => {
    initializeAudio();
    fetchEventAndAttendanceData();
    
    // Register for auto-refresh
    const unsubscribe = onAttendanceRefresh(eventId, () => {
      console.log('Attendance auto-refresh triggered for event', eventId);
      fetchEventAndAttendanceData();
    });
    
    return unsubscribe;
  }, [eventId, onAttendanceRefresh]);

  useEffect(() => {
    filterAttendees();
  }, [checkedInGuests, searchQuery]);

  const fetchEventAndAttendanceData = async () => {
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
      
      // Fetch total guest count
      await fetchTotalGuestCount();
      
      // Fetch checked-in guests
      await fetchCheckedInGuests();
      
    } catch (err) {
      console.error("Failed to load attendance data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalGuestCount = async () => {
    try {
      const guestListData = await getGuestList(eventId);
      if (guestListData && Array.isArray(guestListData)) {
        setTotalGuestsFromAPI(guestListData.length);
      }
    } catch (err) {
      console.error("Failed to fetch total guest count:", err);
    }
  };

  const fetchCheckedInGuests = async () => {
    try {
      console.log('Fetching checked-in guests for attendance...');
      const checkedInData = await getCheckedInGuestList(eventId);
      
      if (checkedInData && Array.isArray(checkedInData)) {
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
    }
  };

  const filterAttendees = () => {
    let filtered = [...checkedInGuests];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(attendee => 
        attendee.name.toLowerCase().includes(query) ||
        attendee.email.toLowerCase().includes(query) ||
        attendee.ticketType.toLowerCase().includes(query)
      );
    }
    
    setFilteredAttendees(filtered);
  };

  const handleOpenScanner = (mode: 'scanIn' | 'scanOut' = 'scanIn') => {
    feedback.buttonPress();
    setScanMode(mode);
    setShowScanner(true);
  };

  const handleCloseScanner = () => {
    feedback.buttonPress();
    setShowScanner(false);
    setScanMode('scanIn');
  };

  const handleScanResult = async (data: string) => {
    setShowScanner(false);
    
    try {
      console.log('QR Code scanned:', data, 'Mode:', scanMode);
      
      const validationResult = await validateQRCode(eventId, data);
      
      if (!validationResult) {
        feedback.error();
        Alert.alert('Validation Error', 'Failed to validate QR code. Please try again.');
        setScanMode('scanIn');
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
        setScanMode('scanIn');
        return;
      }
      
      feedback.success();
      
      let ticketInfo = null;
      if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
        ticketInfo = validationResult.msg.info;
      }
      
      if (scanMode === 'scanIn') {
        Alert.alert(
          'Valid Ticket Found',
          `${ticketInfo?.fullname || 'Guest'}\n${ticketInfo?.ticket_title || 'Unknown ticket'}\nAvailable admits: ${ticketInfo?.available || 0}/${ticketInfo?.admits || 0}\nPrice: $${ticketInfo?.price || '0.00'}`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                feedback.buttonPress();
                setScanMode('scanIn');
              }
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
      } else {
        // Scan Out mode
        const existingAttendee = checkedInGuests.find(attendee => 
          attendee.scanCode === data || 
          attendee.email.toLowerCase() === ticketInfo?.email?.toLowerCase()
        );
        
        if (!existingAttendee) {
          feedback.error();
          Alert.alert('Not Found', 'This guest is not currently checked in.');
          setScanMode('scanIn');
          return;
        }
        
        Alert.alert(
          'Check Out Guest',
          `${existingAttendee.name}\nAre you sure you want to check out this guest?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                feedback.buttonPress();
                setScanMode('scanIn');
              }
            },
            {
              text: 'Check Out',
              style: 'destructive',
              onPress: async () => {
                feedback.buttonPressHeavy();
                await performScanOut(data, validationResult);
              }
            }
          ]
        );
      }
      
    } catch (error) {
      console.error('QR scan error:', error);
      feedback.error();
      Alert.alert('Error', 'An unexpected error occurred while processing the QR code.');
      setScanMode('scanIn');
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
        Alert.alert('Scan In Failed', errorMessage + '\n\nLocal attendance has been updated.');
        setScanMode('scanIn');
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
        'Guest Checked In Successfully',
        `${ticketInfo?.fullname || 'Guest'} has been checked in.\n\n${successMessage}`
      );
      
    } catch (error) {
      console.error('Scan in error:', error);
      await updateLocalScanIn(scanCode, validationResult);
      feedback.error();
      Alert.alert('Scan In Error', 'Failed to scan in guest via API. Local attendance has been updated.');
    } finally {
      setScanMode('scanIn');
    }
  };

  const performScanOut = async (scanCode: string, validationResult: any) => {
    try {
      await updateLocalScanOut(scanCode, validationResult);
      
      const scanResult = await unscanQRCode(eventId, scanCode);
      
      if (!scanResult || scanResult.error) {
        let errorMessage = 'Failed to scan out guest';
        if (scanResult?.msg) {
          errorMessage = typeof scanResult.msg === 'string' ? scanResult.msg : scanResult.msg.message;
        }
        
        feedback.error();
        Alert.alert('Scan Out Failed', errorMessage + '\n\nLocal attendance has been updated.');
        setScanMode('scanIn');
        return;
      }
      
      feedback.success();
      
      let successMessage = 'Guest checked out successfully';
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
        'Guest Checked Out Successfully',
        `${ticketInfo?.fullname || 'Guest'} has been checked out.\n\n${successMessage}`
      );
      
    } catch (error) {
      console.error('Scan out error:', error);
      await updateLocalScanOut(scanCode, validationResult);
      feedback.error();
      Alert.alert('Scan Out Error', 'Failed to scan out guest via API. Local attendance has been updated.');
    } finally {
      setScanMode('scanIn');
    }
  };

  const updateLocalScanIn = async (scanCode: string, validationResult: any) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const ticketInfo = validationResult.msg.info;
    const newAttendee: Attendee = {
      id: `attendee_${Date.now()}`,
      name: ticketInfo.fullname,
      email: ticketInfo.email,
      ticketType: ticketInfo.ticket_title,
      scannedIn: true,
      scanInTime: timeString,
      scanCode: scanCode
    };
    
    setCheckedInGuests(prev => [...prev, newAttendee]);
    
    console.log(`Checked in ${ticketInfo.fullname} at ${timeString}`);
    feedback.checkIn();
    
    // Trigger refresh for other components
    triggerGuestListRefresh(eventId);
    triggerAnalyticsRefresh();
  };

  const updateLocalScanOut = async (scanCode: string, validationResult: any) => {
    const ticketInfo = validationResult.msg.info;
    
    setCheckedInGuests(prev => 
      prev.filter(attendee => 
        attendee.scanCode !== scanCode && 
        attendee.email.toLowerCase() !== ticketInfo?.email?.toLowerCase()
      )
    );
    
    console.log(`Checked out ${ticketInfo.fullname}`);
    feedback.success();
    
    // Trigger refresh for other components
    triggerGuestListRefresh(eventId);
    triggerAnalyticsRefresh();
  };

  const testNetworkConnectivity = async () => {
    try {
      console.log('Testing direct API connectivity...');
      
      // Test direct connection to the backend API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.outix.co/apis/events', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      Alert.alert(
        'Network Test Result',
        response.ok 
          ? `Direct API connection successful ✅\nAPI URL: https://www.outix.co/apis\nStatus: ${response.status}\nCORS fixed, proxy no longer needed!`
          : `API connection failed ❌\nStatus: ${response.status}\nPlease check your internet connection.`,
        [{ text: 'OK', onPress: () => feedback.buttonPress() }]
      );
    } catch (error: any) {
      Alert.alert(
        'Network Test Failed', 
        `Unable to connect to backend API.\nError: ${error.message}\nPlease check your internet connection.`,
        [{ text: 'OK', onPress: () => feedback.buttonPress() }]
      );
    }
  };

  const refreshAttendance = async () => {
    try {
      console.log('Manually refreshing attendance...');
      await fetchCheckedInGuests();
      await fetchTotalGuestCount();
      feedback.success();
    } catch (error) {
      console.error('Error refreshing attendance:', error);
      feedback.error();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchEventAndAttendanceData();
      // Also trigger refresh for other components
      triggerAttendanceRefresh(eventId);
      triggerGuestListRefresh(eventId);
      triggerAnalyticsRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const checkedInCount = checkedInGuests.length;
  const attendancePercentage = totalGuestsFromAPI ? Math.round((checkedInCount / totalGuestsFromAPI) * 100) : 0;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Attendance", headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading attendance...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: "Attendance",
          headerShown: true,
        }}
      />
      
      {/* Minimal Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              feedback.buttonPress();
              router.back();
            }}
          >
            <ArrowLeft size={20} color="#FF6B00" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Live Attendance</Text>
            <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>{eventTitle}</Text>
          </View>
        </View>
      </View>

      {/* Clean Stats Row */}
      <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
              <UserCheck size={20} color="#22C55E" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{checkedInCount}</Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>Present</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Users size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{totalGuestsFromAPI}</Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>Total</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 107, 0, 0.1)' }]}>
              <Clock size={20} color="#FF6B00" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{attendancePercentage}%</Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>Rate</Text>
          </View>
        </View>
      </View>

      {/* Simple Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
          <Search size={16} color={colors.secondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search for guests..."
            placeholderTextColor={colors.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
      {/* Clean Attendee List */}
      {filteredAttendees.length > 0 ? (
        <FlatList
          data={filteredAttendees}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={[styles.attendeeCard, { backgroundColor: colors.card }]}>
              <View style={styles.attendeeRow}>
                <View style={styles.attendeeAvatar}>
                  <UserCheck size={20} color="#22C55E" />
                </View>
                <View style={styles.attendeeInfo}>
                  <Text style={[styles.attendeeName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.attendeeEmail, { color: colors.secondary }]}>{item.email}</Text>
                </View>
                <View style={styles.attendeeRight}>
                  <View style={[styles.ticketBadge, { backgroundColor: '#FF6B00' }]}>
                    <Text style={styles.ticketText}>{item.ticketType}</Text>
                  </View>
                  {item.scanInTime && (
                    <Text style={[styles.timeText, { color: '#22C55E' }]}>
                      {item.scanInTime}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}
          style={styles.attendeeList}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <UserCheck size={48} color={colors.secondary} opacity={0.3} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {searchQuery ? 'No attendees match your search' : 'No one checked in yet'}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.secondary }]}>
            {searchQuery 
              ? 'Try adjusting your search criteria.' 
              : 'Guests will appear here once they check in.'
            }
          </Text>
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
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Header
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Stats
  statsCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  
  // Search
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Actions
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Attendee List
  attendeeList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContainer: {
    paddingBottom: 120,
  },
  attendeeCard: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  attendeeEmail: {
    fontSize: 14,
    fontWeight: '500',
  },
  attendeeRight: {
    alignItems: 'flex-end',
  },
  ticketBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  ticketText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
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
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
}); 