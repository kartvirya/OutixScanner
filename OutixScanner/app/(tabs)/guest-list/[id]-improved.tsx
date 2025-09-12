import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ChevronDown,
  Search,
  User,
  UserCheck,
  Users
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import SuccessModal from '../../../components/SuccessModal';
import { useRefresh } from '../../../context/RefreshContext';
import { useTheme } from '../../../context/ThemeContext';
import {
  getCheckedInGuestList,
  getEvents,
  getGuestListPaginated,
  scanQRCode,
  searchGuestList,
  unscanQRCode,
  validateQRCode
} from '../../../services/api';
import { feedback, initializeAudio } from '../../../services/feedback';
import { formatAppTime } from '../../../utils/date';

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
  rawData?: Record<string, unknown>;
}

interface GuestStats {
  total: number;
  checkedIn: number;
  notArrived: number;
}

export default function ImprovedGuestListPage() {
  const { colors, isDarkMode } = useTheme();
  const { onGuestListRefresh, triggerGuestListRefresh, triggerAttendanceRefresh, triggerAnalyticsRefresh } = useRefresh();
  const { id } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id || '1';
  
  // Core state - single source of truth for all guests
  const [allGuests, setAllGuests] = useState<Map<string, Attendee>>(new Map());
  const [guestOrder, setGuestOrder] = useState<string[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked-in' | 'not-arrived'>('all');
  const [eventTitle, setEventTitle] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalType, setSuccessModalType] = useState<'check-in' | 'check-out'>('check-in');
  const [successModalGuest, setSuccessModalGuest] = useState<{ name: string; ticketType: string } | null>(null);
  const [successModalMessage, setSuccessModalMessage] = useState<string>('');
  
  // Search debounce
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Compute stats from the single source of truth
  const stats = useMemo<GuestStats>(() => {
    let checkedIn = 0;
    let notArrived = 0;
    
    allGuests.forEach(guest => {
      if (guest.scannedIn) {
        checkedIn++;
      } else {
        notArrived++;
      }
    });
    
    return {
      total: allGuests.size,
      checkedIn,
      notArrived
    };
  }, [allGuests]);
  
  // Helper function to extract guest name
  const extractGuestName = useCallback((guest: any): string => {
    if (guest.purchased_by?.trim()) return guest.purchased_by.trim();
    if (guest.admit_name?.trim()) return guest.admit_name.trim();
    if (guest.name?.trim()) return guest.name.trim();
    if (guest.email?.trim()) return guest.email.trim();
    if (guest.firstName || guest.lastName) {
      return `${guest.firstName || ''} ${guest.lastName || ''}`.trim();
    }
    if (guest.ticket_identifier) {
      return `Ticket ${guest.ticket_identifier.slice(-6)}`;
    }
    return 'Guest';
  }, []);
  
  // Convert API guest to our Attendee format
  const processGuest = useCallback((guest: any): Attendee => {
    return {
      id: guest.id || guest.guestId || String(Math.random()),
      name: extractGuestName(guest),
      email: guest.email || 'N/A',
      ticketType: guest.ticket_title || guest.ticketType || guest.ticket_type || 'General',
      scannedIn: guest.checkedIn === "1" || guest.checkedIn === 1 || guest.checked_in || guest.scannedIn || guest.admitted || guest.is_admitted || false,
      scanInTime: guest.checkInTime || guest.check_in_time || guest.checkedin_date || guest.admitted_time || undefined,
      scanCode: guest.scanCode || undefined,
      purchased_date: guest.purchased_date || undefined,
      reference_num: guest.booking_reference || guest.reference_num || undefined,
      booking_id: guest.booking_id || undefined,
      ticket_identifier: guest.ticket_identifier || guest.qrCode || guest.qr_code || undefined,
      price: guest.price || undefined,
      mobile: guest.mobile || undefined,
      address: guest.address || undefined,
      notes: guest.notes || undefined,
      rawData: guest
    };
  }, [extractGuestName]);
  
  // Get unique key for a guest (for Map storage)
  const getGuestKey = useCallback((guest: Attendee): string => {
    // Priority: ticket_identifier > id > name+email
    if (guest.ticket_identifier) return `ticket_${guest.ticket_identifier}`;
    if (guest.id && guest.id !== 'N/A') return `id_${guest.id}`;
    return `name_${guest.name}_${guest.email}`;
  }, []);
  
  // Update a single guest's check-in status
  const updateGuestStatus = useCallback((guest: Attendee, isCheckedIn: boolean, scanTime?: string) => {
    const key = getGuestKey(guest);
    
    setAllGuests(prev => {
      const newMap = new Map(prev);
      const existingGuest = newMap.get(key);
      
      if (existingGuest) {
        newMap.set(key, {
          ...existingGuest,
          scannedIn: isCheckedIn,
          scanInTime: isCheckedIn ? (scanTime || formatAppTime(new Date().toISOString())) : undefined
        });
      } else {
        // Guest not found, add them
        newMap.set(key, {
          ...guest,
          scannedIn: isCheckedIn,
          scanInTime: isCheckedIn ? (scanTime || formatAppTime(new Date().toISOString())) : undefined
        });
        
        // Add to order if new
        setGuestOrder(prev => [...prev, key]);
      }
      
      return newMap;
    });
    
    // Trigger updates for other tabs
    triggerAttendanceRefresh(eventId);
    triggerAnalyticsRefresh();
  }, [getGuestKey, eventId, triggerAttendanceRefresh, triggerAnalyticsRefresh]);
  
  // Batch update guests (for API responses)
  const batchUpdateGuests = useCallback((guests: Attendee[], append: boolean = false) => {
    setAllGuests(prev => {
      const newMap = append ? new Map(prev) : new Map();
      const newOrder: string[] = append ? [...guestOrder] : [];
      
      guests.forEach(guest => {
        const key = getGuestKey(guest);
        
        // Preserve check-in status if guest already exists
        const existingGuest = prev.get(key);
        if (existingGuest && append) {
          // Keep existing check-in status unless we're resetting
          newMap.set(key, {
            ...guest,
            scannedIn: existingGuest.scannedIn,
            scanInTime: existingGuest.scanInTime
          });
        } else {
          newMap.set(key, guest);
        }
        
        if (!newOrder.includes(key)) {
          newOrder.push(key);
        }
      });
      
      setGuestOrder(newOrder);
      return newMap;
    });
  }, [getGuestKey, guestOrder]);
  
  // Fetch paginated guests
  const fetchPaginatedGuests = useCallback(async (page: number, reset: boolean = false) => {
    try {
      if (page === 1 && reset) {
        setLoading(true);
      } else if (page > 1) {
        setLoadingMore(true);
      }
      
      const result = await getGuestListPaginated(eventId, page, 20);
      const processedGuests = result.guests.map(processGuest);
      
      if (reset || page === 1) {
        batchUpdateGuests(processedGuests, false);
      } else {
        batchUpdateGuests(processedGuests, true);
      }
      
      setCurrentPage(page);
      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);
      
    } catch (error) {
      console.error('Failed to fetch paginated guests:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [eventId, processGuest, batchUpdateGuests]);
  
  // Sync with checked-in guests from API
  const syncCheckedInStatus = useCallback(async () => {
    try {
      const checkedInData = await getCheckedInGuestList(eventId);
      
      if (checkedInData && Array.isArray(checkedInData)) {
        // Update check-in status for matching guests
        checkedInData.forEach(apiGuest => {
          const guest = processGuest(apiGuest);
          const key = getGuestKey(guest);
          
          setAllGuests(prev => {
            const newMap = new Map(prev);
            const existingGuest = newMap.get(key);
            
            if (existingGuest) {
              // Update check-in status
              newMap.set(key, {
                ...existingGuest,
                scannedIn: true,
                scanInTime: guest.scanInTime || existingGuest.scanInTime
              });
            }
            
            return newMap;
          });
        });
      }
    } catch (error) {
      console.error('Failed to sync checked-in status:', error);
    }
  }, [eventId, processGuest, getGuestKey]);
  
  // Initialize data
  const initializeData = useCallback(async () => {
    setLoading(true);
    
    try {
      // Fetch event details
      const eventsData = await getEvents();
      if (Array.isArray(eventsData)) {
        const apiEvent = eventsData.find(e => 
          e.id === eventId || e.EventId === eventId
        );
        if (apiEvent) {
          setEventTitle(apiEvent.title || apiEvent.name || apiEvent.EventName || 'Event');
        }
      }
      
      // Fetch initial guests
      await fetchPaginatedGuests(1, true);
      
      // Sync check-in status
      await syncCheckedInStatus();
      
    } catch (error) {
      console.error('Failed to initialize data:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId, fetchPaginatedGuests, syncCheckedInStatus]);
  
  // Manual check-in
  const handleManualCheckIn = useCallback(async (guest: Attendee) => {
    // Update local state immediately
    updateGuestStatus(guest, true);
    
    // Show success modal
    setSuccessModalType('check-in');
    setSuccessModalGuest({ name: guest.name, ticketType: guest.ticketType });
    setSuccessModalMessage('Guest checked in successfully');
    setShowSuccessModal(true);
    
    feedback.checkIn();
    
    // Try API call in background
    try {
      const scanCode = guest.ticket_identifier || guest.reference_num || guest.id;
      if (scanCode) {
        await scanQRCode(eventId, scanCode);
      }
    } catch (error) {
      console.warn('API check-in failed, but local state updated:', error);
    }
  }, [eventId, updateGuestStatus]);
  
  // Manual check-out
  const handleManualCheckOut = useCallback(async (guest: Attendee) => {
    // Update local state immediately
    updateGuestStatus(guest, false);
    
    // Show success modal
    setSuccessModalType('check-out');
    setSuccessModalGuest({ name: guest.name, ticketType: guest.ticketType });
    setSuccessModalMessage('Guest checked out successfully');
    setShowSuccessModal(true);
    
    feedback.checkOut();
    
    // Try API call in background
    try {
      const scanCode = guest.ticket_identifier || guest.reference_num || guest.id;
      if (scanCode) {
        await unscanQRCode(eventId, scanCode);
      }
    } catch (error) {
      console.warn('API check-out failed, but local state updated:', error);
    }
  }, [eventId, updateGuestStatus]);
  
  // Get filtered guest list based on current filter and search
  const filteredGuests = useMemo(() => {
    let guests = Array.from(allGuests.values());
    
    // Apply filter
    switch (filterStatus) {
      case 'checked-in':
        guests = guests.filter(g => g.scannedIn);
        break;
      case 'not-arrived':
        guests = guests.filter(g => !g.scannedIn);
        break;
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      guests = guests.filter(g => 
        g.name.toLowerCase().includes(query) ||
        g.email.toLowerCase().includes(query) ||
        g.ticketType.toLowerCase().includes(query)
      );
    }
    
    // Maintain order
    const orderedGuests: Attendee[] = [];
    guestOrder.forEach(key => {
      const guest = guests.find(g => getGuestKey(g) === key);
      if (guest) orderedGuests.push(guest);
    });
    
    return orderedGuests;
  }, [allGuests, filterStatus, searchQuery, guestOrder, getGuestKey]);
  
  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    fetchPaginatedGuests(currentPage + 1, false);
  }, [hasMore, loadingMore, currentPage, fetchPaginatedGuests]);
  
  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    await fetchPaginatedGuests(1, true);
    await syncCheckedInStatus();
    setRefreshing(false);
  }, [fetchPaginatedGuests, syncCheckedInStatus]);
  
  // Initialize on mount
  useEffect(() => {
    initializeAudio();
    initializeData();
  }, [initializeData]);
  
  // Render guest item
  const renderGuestItem = useCallback(({ item }: { item: Attendee }) => (
    <TouchableOpacity
      style={[styles.attendeeItem, { backgroundColor: colors.card }]}
      onPress={() => {
        if (item.scannedIn) {
          handleManualCheckOut(item);
        } else {
          handleManualCheckIn(item);
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.attendeeInfo}>
        <View style={styles.attendeeHeader}>
          <Text style={[styles.attendeeName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.scannedIn && (
            <View style={[styles.checkedInBadge, { backgroundColor: colors.success + '20' }]}>
              <UserCheck size={12} color={colors.success} />
              <Text style={[styles.checkedInText, { color: colors.success }]}>
                Checked In
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.attendeeEmail, { color: colors.secondary }]} numberOfLines={1}>
          {item.email}
        </Text>
        <View style={styles.attendeeFooter}>
          <Text style={[styles.ticketType, { color: colors.primary }]}>
            {item.ticketType}
          </Text>
          {item.scanInTime && (
            <Text style={[styles.scanTime, { color: colors.secondary }]}>
              {item.scanInTime}
            </Text>
          )}
        </View>
      </View>
      <View style={[styles.actionButton, { 
        backgroundColor: item.scannedIn ? colors.error + '10' : colors.success + '10' 
      }]}>
        <UserCheck size={20} color={item.scannedIn ? colors.error : colors.success} />
      </View>
    </TouchableOpacity>
  ), [colors, handleManualCheckIn, handleManualCheckOut]);
  
  // Key extractor
  const keyExtractor = useCallback((item: Attendee) => getGuestKey(item), [getGuestKey]);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{eventTitle}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>Guest List</Text>
        </View>
      </View>
      
      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.card }]}>
        <View style={styles.statItem}>
          <Users size={18} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <UserCheck size={18} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.checkedIn}</Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Present</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <User size={18} color={colors.warning} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.notArrived}</Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Absent</Text>
        </View>
      </View>
      
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Search size={20} color={colors.secondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search guests..."
          placeholderTextColor={colors.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {/* Filter Tabs */}
      <View style={[styles.filterTabs, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterStatus === 'all' && styles.activeTab,
            filterStatus === 'all' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setFilterStatus('all')}
        >
          <Text style={[
            styles.filterTabText,
            { color: filterStatus === 'all' ? '#fff' : colors.text }
          ]}>
            All ({stats.total})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterStatus === 'checked-in' && styles.activeTab,
            filterStatus === 'checked-in' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setFilterStatus('checked-in')}
        >
          <Text style={[
            styles.filterTabText,
            { color: filterStatus === 'checked-in' ? '#fff' : colors.text }
          ]}>
            Present ({stats.checkedIn})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterStatus === 'not-arrived' && styles.activeTab,
            filterStatus === 'not-arrived' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setFilterStatus('not-arrived')}
        >
          <Text style={[
            styles.filterTabText,
            { color: filterStatus === 'not-arrived' ? '#fff' : colors.text }
          ]}>
            Absent ({stats.notArrived})
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Guest List */}
      <FlatList
        data={filteredGuests}
        renderItem={renderGuestItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Users size={48} color={colors.secondary} />
              <Text style={[styles.emptyText, { color: colors.secondary }]}>
                {searchQuery ? 'No guests found' : 'No guests yet'}
              </Text>
            </View>
          ) : null
        }
      />
      
      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        type={successModalType}
        guestName={successModalGuest?.name || ''}
        ticketType={successModalGuest?.ticketType || ''}
        customMessage={successModalMessage}
      />
      
      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  statsBar: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  statLabel: {
    fontSize: 14,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filterTabs: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  attendeeItem: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  checkedInText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  attendeeEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  attendeeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketType: {
    fontSize: 12,
    fontWeight: '600',
  },
  scanTime: {
    fontSize: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
