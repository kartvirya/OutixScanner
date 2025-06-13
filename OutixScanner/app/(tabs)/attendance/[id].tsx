import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { 
  QrCode, 
  UserCheck, 
  Settings,
  CheckCircle,
  User,
  Search,
  ArrowLeft,
  RefreshCw,
  Clock,
  Users
} from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useRefresh } from '../../../context/RefreshContext';
import { 
  getCheckedInGuestList,
  getGuestList, 
  getEvents, 
  validateQRCode, 
  scanQRCode,
  unscanQRCode,
  testProxyConnectivity,
  getCurrentProxyURL,
  getCurrentProxyIP
} from '../../../services/api';
import QRScanner from '../../../components/QRScanner';
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
          `${ticketInfo?.fullname || 'Guest'}\n${ticketInfo?.ticket_title || 'Unknown ticket'}\nAvailable admits: ${ticketInfo?.available || 0}/${ticketInfo?.admits || 0}`,
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
                await performScanIn(data, validationResult);
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Check Out Guest',
          `${ticketInfo?.fullname || 'Guest'}\n${ticketInfo?.ticket_title || 'Unknown ticket'}\n\nAre you sure you want to check out this guest?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => feedback.buttonPress()
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
    } finally {
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
        `${ticketInfo?.fullname || 'Guest'} has been checked in.\n\n${successMessage}\n\nAttendance updated locally.`
      );
      
    } catch (error) {
      console.error('Scan in error:', error);
      await updateLocalScanIn(scanCode, validationResult);
      feedback.error();
      Alert.alert('Scan In Error', 'Failed to scan in guest via API. Local attendance has been updated.');
    }
  };

  const performScanOut = async (scanCode: string, validationResult: any) => {
    try {
      await updateLocalScanOut(scanCode, validationResult);
      
      const unscanResult = await unscanQRCode(eventId, scanCode);
      
      if (!unscanResult || unscanResult.error) {
        let errorMessage = 'Failed to scan out guest';
        if (unscanResult?.msg) {
          errorMessage = typeof unscanResult.msg === 'string' ? unscanResult.msg : unscanResult.msg.message;
        }
        
        feedback.error();
        Alert.alert('Scan Out Failed', errorMessage + '\n\nLocal attendance has been updated.');
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
        'Guest Checked Out Successfully',
        `${ticketInfo?.fullname || 'Guest'} has been checked out.\n\n${successMessage}\n\nAttendance updated locally.`
      );
      
    } catch (error) {
      console.error('Scan out error:', error);
      await updateLocalScanOut(scanCode, validationResult);
      feedback.error();
      Alert.alert('Scan Out Error', 'Failed to scan out guest via API. Local attendance has been updated.');
    }
  };

  const updateLocalScanIn = async (scanCode: string, validationResult: any) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const ticketInfo = validationResult.msg.info;
    let guestIndex = checkedInGuests.findIndex(a => 
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
        scanCode: scanCode
      };
      
      setCheckedInGuests(prev => [...prev, newAttendee]);
    } else {
      const updatedGuestList = [...checkedInGuests];
      updatedGuestList[guestIndex] = {
        ...updatedGuestList[guestIndex],
        scannedIn: true,
        scanInTime: timeString,
        scanCode: scanCode
      };
      setCheckedInGuests(updatedGuestList);
    }
    
    console.log(`Updated scan-in status for ${ticketInfo.fullname} at ${timeString}`);
    feedback.checkIn();
    
    // Trigger refresh for other components
    triggerGuestListRefresh(eventId);
    triggerAnalyticsRefresh();
  };

  const updateLocalScanOut = async (scanCode: string, validationResult: any) => {
    const ticketInfo = validationResult.msg.info;
    let guestIndex = checkedInGuests.findIndex(a => 
      a.scanCode === scanCode ||
      a.name.toLowerCase() === ticketInfo.fullname.toLowerCase() ||
      a.email.toLowerCase() === ticketInfo.email.toLowerCase()
    );
    
    if (guestIndex >= 0) {
      // Remove from checked-in list
      const updatedGuestList = [...checkedInGuests];
      updatedGuestList.splice(guestIndex, 1);
      setCheckedInGuests(updatedGuestList);
    }
    
    console.log(`Updated scan-out status for ${ticketInfo.fullname}`);
    feedback.success();
    
    // Trigger refresh for other components
    triggerGuestListRefresh(eventId);
    triggerAnalyticsRefresh();
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
          `Connection to proxy server successful.\n\nUsing: ${currentURL}\nDevice IP: ${currentIP}\nServer IP: ${result.ip}`,
          [{ text: 'OK', onPress: () => feedback.success() }]
        );
      } else {
        Alert.alert(
          'Network Test Failed ❌',
          `Cannot connect to proxy server.\n\nTrying: ${currentURL}\nUsing IP: ${currentIP}\nError: ${result.error}`,
          [{ text: 'OK', style: 'cancel' }]
        );
      }
    } catch (error) {
      Alert.alert('Network Test Error', 'Failed to test network connectivity');
    }
  };

  const refreshAttendance = async () => {
    try {
      console.log('Refreshing attendance...');
      await fetchCheckedInGuests();
      await fetchTotalGuestCount();
      feedback.success();
    } catch (error) {
      console.error('Error refreshing attendance:', error);
      feedback.error();
    }
  };

  const checkedInCount = checkedInGuests.length;
  const attendancePercentage = totalGuestsFromAPI ? Math.round((checkedInCount / totalGuestsFromAPI) * 100) : 0;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Attendance", headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              feedback.buttonPress();
              router.back();
            }}
          >
            <ArrowLeft size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Live Attendance</Text>
            <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>{eventTitle}</Text>
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(52, 199, 89, 0.2)' }]}>
              <UserCheck size={20} color="#34C759" />
            </View>
            <Text style={[styles.statNumber, { color: '#34C759' }]}>{checkedInCount}</Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>Present</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(0, 122, 255, 0.2)' }]}>
              <Users size={20} color="#007AFF" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>{totalGuestsFromAPI}</Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.2)' }]}>
              <Clock size={20} color="#FF9500" />
            </View>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{attendancePercentage}%</Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>Rate</Text>
          </View>
        </View>
      </View>

      {/* Search and Actions */}
      <View style={[styles.controlsContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
          <Search size={20} color={colors.secondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search attendees..."
            placeholderTextColor={colors.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={[styles.primaryActionButton, { backgroundColor: colors.primary }]}
            onPress={() => handleOpenScanner('scanIn')}
          >
            <View style={styles.actionIconContainer}>
              <QrCode size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.primaryActionText}>Check In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.primaryActionButton, { backgroundColor: '#FF3B30' }]}
            onPress={() => handleOpenScanner('scanOut')}
          >
            <View style={styles.actionIconContainer}>
              <User size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.primaryActionText}>Check Out</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.secondaryActions}>
          <TouchableOpacity 
            style={[styles.secondaryActionButton, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}
            onPress={() => {
              feedback.buttonPress();
              refreshAttendance();
            }}
          >
            <RefreshCw size={16} color="#34C759" />
            <Text style={[styles.secondaryActionText, { color: '#34C759' }]}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Attendance List */}
      {filteredAttendees.length > 0 ? (
        <FlatList
          data={filteredAttendees}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.attendeeCard, { backgroundColor: colors.card }]}>
              <View style={styles.attendeeHeader}>
                <View style={styles.attendeeAvatar}>
                  <UserCheck size={24} color="#34C759" />
                </View>
                <View style={styles.attendeeInfo}>
                  <Text style={[styles.attendeeName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.attendeeEmail, { color: colors.secondary }]}>{item.email}</Text>
                </View>
                <View style={[styles.statusIndicator, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                  <CheckCircle size={16} color="#34C759" />
                </View>
              </View>
              
              <View style={styles.attendeeFooter}>
                <View style={[styles.ticketTypeBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.ticketTypeText}>{item.ticketType}</Text>
                </View>
                {item.scanInTime && (
                  <View style={styles.timeContainer}>
                    <Clock size={14} color="#34C759" />
                    <Text style={[styles.checkInTime, { color: '#34C759' }]}>
                      {item.scanInTime}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
          style={styles.attendeeList}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <UserCheck size={60} color={colors.secondary} opacity={0.5} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {searchQuery ? 'No attendees match your search' : 'No one checked in yet'}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.secondary }]}>
            {searchQuery 
              ? 'Try adjusting your search criteria.' 
              : 'Guests will appear here once they check in.'
            }
          </Text>
          {!searchQuery && (
            <TouchableOpacity 
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={() => handleOpenScanner('scanIn')}
            >
              <QrCode size={16} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Start Checking In</Text>
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
    padding: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.8,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  controlsContainer: {
    padding: 20,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  actionIconContainer: {
    marginRight: 8,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    minWidth: 100,
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  attendeeList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  attendeeCard: {
    padding: 20,
    borderRadius: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  attendeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  attendeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  attendeeInfo: {
    flex: 1,
    paddingRight: 12,
  },
  attendeeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  attendeeEmail: {
    fontSize: 14,
    marginBottom: 0,
    fontWeight: '500',
  },
  attendeeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketTypeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ticketTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  checkInTime: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  statusIndicator: {
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
}); 