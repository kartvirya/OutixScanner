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
  Users, 
  CheckCircle,
  User,
  Search,
  ArrowLeft
} from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { 
  getGuestList, 
  getEvents, 
  validateQRCode, 
  scanQRCode
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

export default function GuestListPage() {
  const { colors, isDarkMode } = useTheme();
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

  useEffect(() => {
    initializeAudio();
    fetchEventAndGuestData();
  }, [eventId]);

  useEffect(() => {
    filterGuests();
  }, [guestList, searchQuery, filterStatus]);

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
        const attendees = guestListData.map(guest => ({
          id: guest.id || guest.guestId || String(Math.random()),
          name: guest.purchased_by || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest',
          email: guest.email || 'N/A',
          ticketType: guest.ticketType || guest.ticket_type || 'General',
          scannedIn: guest.checkedIn || guest.checked_in || false,
          scanInTime: guest.checkInTime || guest.check_in_time || undefined,
          scanCode: guest.scanCode || undefined
        }));
        
        setGuestList(attendees);
        setTotalGuestsFromAPI(attendees.length);
      } else {
        setGuestList([]);
        setTotalGuestsFromAPI(0);
      }
    } catch (err) {
      console.error("Failed to fetch guest list:", err);
    }
  };

  const filterGuests = () => {
    let filtered = [...guestList];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(guest => 
        guest.name.toLowerCase().includes(query) ||
        guest.email.toLowerCase().includes(query) ||
        guest.ticketType.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (filterStatus === 'checked-in') {
      filtered = filtered.filter(guest => guest.scannedIn);
    } else if (filterStatus === 'not-arrived') {
      filtered = filtered.filter(guest => !guest.scannedIn);
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
        scanCode: scanCode
      };
      
      setGuestList(prev => [...prev, newAttendee]);
      setTotalGuestsFromAPI(prev => prev + 1);
    } else {
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

  const checkedInCount = guestList.filter(guest => guest.scannedIn).length;
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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Guest List</Text>
            <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>{eventTitle}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.scanButton, { backgroundColor: colors.primary }]}
            onPress={handleOpenScanner}
          >
            <QrCode size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{totalGuestsFromAPI}</Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#34C759' }]}>{checkedInCount}</Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>Checked In</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{attendancePercentage}%</Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>Rate</Text>
          </View>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
          <Search size={18} color={colors.secondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search guests..."
            placeholderTextColor={colors.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={[styles.clearButton, { color: colors.secondary }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: filterStatus === 'all' ? colors.primary : 'transparent' }
            ]}
            onPress={() => {
              feedback.buttonPress();
              setFilterStatus('all');
            }}
          >
            <Text style={[
              styles.filterButtonText,
              { color: filterStatus === 'all' ? '#FFFFFF' : colors.text }
            ]}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: filterStatus === 'checked-in' ? '#34C759' : 'transparent' }
            ]}
            onPress={() => {
              feedback.buttonPress();
              setFilterStatus('checked-in');
            }}
          >
            <Text style={[
              styles.filterButtonText,
              { color: filterStatus === 'checked-in' ? '#FFFFFF' : colors.text }
            ]}>
              Present
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: filterStatus === 'not-arrived' ? '#FF6B35' : 'transparent' }
            ]}
            onPress={() => {
              feedback.buttonPress();
              setFilterStatus('not-arrived');
            }}
          >
            <Text style={[
              styles.filterButtonText,
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
            <View style={[styles.guestItem, { backgroundColor: colors.card }]}>
              <View style={styles.guestInfo}>
                <Text style={[styles.guestName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.guestEmail, { color: colors.secondary }]}>{item.email}</Text>
                <Text style={[styles.guestTicketType, { color: colors.primary }]}>{item.ticketType}</Text>
              </View>
              <View style={styles.guestStatus}>
                {item.scannedIn ? (
                  <View style={[styles.statusBadge, styles.checkedInBadge]}>
                    <CheckCircle size={14} color="#34C759" />
                    <Text style={[styles.statusText, { color: '#34C759' }]}>Present</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, styles.notArrivedBadge]}>
                    <User size={14} color="#FF6B35" />
                    <Text style={[styles.statusText, { color: '#FF6B35' }]}>Absent</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          style={styles.guestList}
          contentContainerStyle={{ paddingVertical: 8 }}
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
  guestStatus: {
    justifyContent: 'center',
    alignItems: 'flex-end',
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
}); 