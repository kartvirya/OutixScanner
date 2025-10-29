import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
    BarChart,
    Calendar,
    ChevronDown,
    Clock,
    MapPin,
    RefreshCw,
    UserCheck,
    Users
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRScanner from '../../components/QRScanner';
import { useRefresh } from '../../context/RefreshContext';
import { useTheme } from '../../context/ThemeContext';
import {
    getCheckedInGuestList,
    getCurrentProxyIP,
    getCurrentProxyURL,
    getEvents,
    getGuestList,
    scanQRCode,
    testProxyConnectivity,
    unscanQRCode,
    validateQRCode
} from '../../services/api';
import { feedback, initializeAudio } from '../../services/feedback';
import { formatAppDateTime, formatAppTime } from '../../utils/date';

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ANIMATION_DURATION = 300;
const REFRESH_DEBOUNCE = 1000;

// Types
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
  scanCode?: string;
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

// Cache management
const eventCache = new Map<string, { data: Event; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Memoized components
const StatItem = React.memo(({ 
  icon, 
  iconColor, 
  iconBg, 
  value, 
  label, 
  textColor, 
  secondaryColor 
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  value: number | string;
  label: string;
  textColor: string;
  secondaryColor: string;
}) => (
  <View style={styles.statItem}>
    <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
      {icon}
    </View>
    <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: secondaryColor }]}>{label}</Text>
  </View>
));

const ActionButton = React.memo(({ 
  icon, 
  label, 
  color, 
  bgColor, 
  onPress,
  textColor 
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
  textColor?: string;
}) => (
  <Pressable 
    style={({ pressed }) => [
      styles.actionItem,
      { 
        backgroundColor: bgColor,
        borderColor: color + '30',
      },
      pressed && styles.actionPressed
    ]}
    onPress={onPress}
    android_ripple={{ color: color + '20' }}
  >
    <View style={[styles.actionIconContainer, { backgroundColor: color }]}>
      {icon}
    </View>
    <Text style={[styles.actionText, { color: textColor || color }]}>{label}</Text>
  </Pressable>
));

export default function OptimizedEventDetail() {
  const { colors, isDarkMode } = useTheme();
  // Add secondary color fallback
  const theme = {
    ...colors,
    secondary: colors.secondary || (isDarkMode ? '#9CA3AF' : '#6B7280')
  };
  const { 
    triggerEventRefresh, 
    triggerGuestListRefresh, 
    triggerAttendanceRefresh, 
    triggerAnalyticsRefresh 
  } = useRefresh();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id || '1';
  
  // State management with optimized initial values
  const [event, setEvent] = useState<Event | null>(() => {
    const cached = eventCache.get(eventId);
    return cached && Date.now() - cached.timestamp < CACHE_DURATION ? cached.data : null;
  });
  const [loading, setLoading] = useState(!event);
  const [refreshing, setRefreshing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState<'validate' | 'scanIn' | 'scanOut'>('validate');
  const [guestList, setGuestList] = useState<Attendee[]>([]);
  const [totalGuestsFromAPI, setTotalGuestsFromAPI] = useState(0);
  const [checkedInGuests, setCheckedInGuests] = useState<Attendee[]>([]);
  const [isEventDetailsExpanded, setIsEventDetailsExpanded] = useState(true);

  // Animation values
  const headerAnimation = useRef(new Animated.Value(0)).current;
  const statsAnimation = useRef(new Animated.Value(0)).current;
  const actionsAnimation = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;

  // Refs for optimization
  const lastRefreshTime = useRef(0);
  const isMounted = useRef(true);

  // Initialize audio once
  useEffect(() => {
    initializeAudio();
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Optimized data loading with caching
  const loadEventData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;

    // Check cache first
    if (!forceRefresh && eventCache.has(eventId)) {
      const cached = eventCache.get(eventId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setEvent(cached.data);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    
    try {
      // Parallel data fetching for better performance
      const [eventsData, guestListData, checkedInData] = await Promise.all([
        getEvents().catch(() => null),
        getGuestList(eventId).catch(() => null),
        getCheckedInGuestList(eventId).catch(() => null)
      ]);
      
      if (!isMounted.current) return;

      // Process event data
      let apiEvent = null;
      if (Array.isArray(eventsData)) {
        apiEvent = eventsData.find(e => 
          e.id === eventId || 
          e.eventId === eventId || 
          String(e.id) === eventId
        );
      }

      if (apiEvent) {
        const eventData: Event = {
          id: eventId,
          title: apiEvent.name || apiEvent.title || apiEvent.EventName || 'Event',
          date: formatAppDateTime(apiEvent.date || apiEvent.datetime || apiEvent.showStart || new Date().toISOString()),
          time: formatAppTime(apiEvent.time || apiEvent.datetime || apiEvent.showStart || new Date().toISOString()),
          location: apiEvent.location || apiEvent.venue || apiEvent.VenueName || 'Location TBD',
          description: apiEvent.description || apiEvent.desc || '',
          totalTickets: apiEvent.total_tickets || apiEvent.capacity || 100,
          ticketsSold: 0,
          revenue: apiEvent.revenue || 0,
          tickets: [],
          attendees: []
        };

        // Process guest list
        if (guestListData && Array.isArray(guestListData)) {
          const attendees = guestListData.map(guest => ({
            id: guest.id || guest.guestId || String(Math.random()),
            name: extractGuestName(guest),
            email: guest.email || 'N/A',
            ticketType: guest.ticketType || guest.ticket_type || 'General',
            scannedIn: !!guest.checkedIn || !!guest.checked_in || false,
            scanInTime: guest.checkInTime || guest.check_in_time || undefined,
            scanCode: guest.scanCode || undefined
          }));
          
          eventData.attendees = attendees;
          eventData.ticketsSold = attendees.length;
          setGuestList(attendees);
          setTotalGuestsFromAPI(attendees.length);
        }

        // Process checked-in guests
        if (checkedInData && Array.isArray(checkedInData)) {
          const checkedIn = checkedInData.map(guest => ({
            id: guest.id || String(Math.random()),
            name: extractGuestName(guest),
            email: guest.email || 'N/A',
            ticketType: guest.ticketType || 'General',
            scannedIn: true,
            scanInTime: formatAppTime(guest.checkInTime || guest.check_in_time || new Date()),
            scanCode: guest.scanCode || undefined
          }));
          setCheckedInGuests(checkedIn);
        }

        // Cache the event data
        eventCache.set(eventId, { data: eventData, timestamp: Date.now() });
        setEvent(eventData);
      }
    } catch (err) {
      console.error("Failed to load event details:", err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        startAnimations();
      }
    }
  }, [eventId]);

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

  // Load data on mount
  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  // Animations
  const startAnimations = useCallback(() => {
    const animations = [
      Animated.timing(headerAnimation, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true
      }),
      Animated.timing(statsAnimation, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        delay: 100,
        useNativeDriver: true
      }),
      Animated.timing(actionsAnimation, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        delay: 200,
        useNativeDriver: true
      }),
      Animated.timing(progressAnimation, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        delay: 300,
        useNativeDriver: true
      })
    ];

    Animated.parallel(animations).start();
  }, [headerAnimation, statsAnimation, actionsAnimation, progressAnimation]);

  // Debounced refresh
  const onRefresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshTime.current < REFRESH_DEBOUNCE) return;
    
    lastRefreshTime.current = now;
    setRefreshing(true);
    
    try {
      await loadEventData(true);
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
      }
    }
  }, [loadEventData]);

  // Memoized calculations
  const stats = useMemo(() => {
    const checkedInCount = checkedInGuests.length;
    const totalCount = totalGuestsFromAPI || 0;
    const percentage = totalCount ? Math.round((checkedInCount / totalCount) * 100) : 0;
    
    return {
      total: totalCount,
      checkedIn: checkedInCount,
      pending: totalCount - checkedInCount,
      percentage
    };
  }, [checkedInGuests.length, totalGuestsFromAPI]);

  // Navigation handlers
  const handleNavigateToGuestList = useCallback(() => {
    feedback.buttonPress();
    // Use push to maintain navigation stack properly
    router.push(`/(tabs)/guest-list/${eventId}`);
  }, [eventId]);

  const handleNavigateToAttendance = useCallback(() => {
    feedback.buttonPress();
    router.push(`/(tabs)/attendance/${eventId}`);
  }, [eventId]);

  // Scanner handlers
  const handleOpenScanner = useCallback((mode: 'validate' | 'scanIn' | 'scanOut' = 'validate') => {
    feedback.buttonPress();
    setScanMode(mode);
    setShowScanner(true);
  }, []);

  const handleCloseScanner = useCallback(() => {
    setShowScanner(false);
  }, []);

  const handleScanResult = useCallback(async (scannedData: string) => {
    if (!scannedData) {
      Alert.alert('Invalid QR Code', 'The scanned code is empty or invalid.');
      return;
    }

    try {
      const validationResult = await validateQRCode(eventId, scannedData);
      
      if (!validationResult || validationResult.error) {
        feedback.checkInError();
        Alert.alert('Invalid Ticket', validationResult?.msg || 'This QR code is not valid for this event.');
        return;
      }

      if (scanMode === 'scanIn') {
        await handleScanIn(scannedData, validationResult);
      } else if (scanMode === 'scanOut') {
        await handleScanOut(scannedData, validationResult);
      } else {
        feedback.success();
        Alert.alert('Valid Ticket', 'This ticket is valid for the event.');
      }
    } catch (error) {
      console.error('Scan error:', error);
      feedback.checkInError();
      Alert.alert('Scan Error', 'Failed to process the QR code. Please try again.');
    } finally {
      handleCloseScanner();
    }
  }, [eventId, scanMode]);

  const handleScanIn = useCallback(async (scanCode: string, validationResult: any) => {
    try {
      const scanResult = await scanQRCode(eventId, scanCode);
      
      if (scanResult?.success) {
        feedback.checkIn();
        Alert.alert('Check-in Successful', `${validationResult.msg?.info?.fullname || 'Guest'} has been checked in.`);
        
        // Trigger refreshes
        triggerGuestListRefresh(eventId);
        triggerAttendanceRefresh(eventId);
        triggerAnalyticsRefresh();
        
        // Reload data
        await loadEventData(true);
      } else {
        feedback.checkInError();
        Alert.alert('Check-in Failed', scanResult?.msg || 'Failed to check in guest.');
      }
    } catch (error) {
      console.error('Scan-in error:', error);
      feedback.checkInError();
      Alert.alert('Check-in Error', 'Failed to check in guest. Please try again.');
    }
  }, [eventId, loadEventData, triggerGuestListRefresh, triggerAttendanceRefresh, triggerAnalyticsRefresh]);

  const handleScanOut = useCallback(async (scanCode: string, validationResult: any) => {
    try {
      const unscanResult = await unscanQRCode(eventId, scanCode);
      
      if (unscanResult && !unscanResult.error) {
        feedback.checkOut();
        Alert.alert('Scan-out Successful', `${validationResult.msg?.info?.fullname || 'Guest'} has been scanned out.`);
        
        // Trigger refreshes
        triggerGuestListRefresh(eventId);
        triggerAttendanceRefresh(eventId);
        triggerAnalyticsRefresh();
        
        // Reload data
        await loadEventData(true);
      } else {
        feedback.checkInError();
        Alert.alert('Scan-out Failed', unscanResult?.msg || 'Failed to scan out guest.');
      }
    } catch (error) {
      console.error('Scan-out error:', error);
      feedback.checkInError();
      Alert.alert('Scan-out Error', 'Failed to scan out guest. Please try again.');
    }
  }, [eventId, loadEventData, triggerGuestListRefresh, triggerAttendanceRefresh, triggerAnalyticsRefresh]);

  // Test network connectivity
  const testNetworkConnectivity = useCallback(async () => {
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
  }, []);

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary || '#FF6B00'} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading event details...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Event not found</Text>
          <TouchableOpacity 
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={[styles.backButton, { backgroundColor: colors.primary || '#FF6B00' }]}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Animated Header */}
        <Animated.View 
          style={[
            styles.header,
            { 
              backgroundColor: colors.card,
              opacity: headerAnimation,
              transform: [{
                translateY: headerAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0]
                })
              }]
            }
          ]}
        >
          <Pressable
            onPress={() => setIsEventDetailsExpanded(!isEventDetailsExpanded)}
            style={styles.headerPressable}
          >
            <View style={styles.headerContent}>
              <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={isEventDetailsExpanded ? undefined : 2}>
                {event.title}
              </Text>
              <Animated.View
                style={{
                  transform: [{
                    rotate: isEventDetailsExpanded ? '180deg' : '0deg'
                  }]
                }}
              >
                <ChevronDown size={20} color={colors.primary} />
              </Animated.View>
            </View>
            
            {isEventDetailsExpanded && (
              <Animated.View style={styles.eventDetails}>
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Calendar size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.detailText, { color: colors.text }]}>{event.date}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Clock size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.detailText, { color: colors.text }]}>{event.time}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: colors.primary + '20' }]}>
                    <MapPin size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={2}>
                    {event.location}
                  </Text>
                </View>
              </Animated.View>
            )}
          </Pressable>
        </Animated.View>

        {/* Animated Stats Card */}
        <Animated.View 
          style={[
            styles.statsCard,
            { 
              backgroundColor: colors.card,
              opacity: statsAnimation,
              transform: [{
                translateY: statsAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }]
            }
          ]}
        >
          <View style={styles.statsRow}>
            <StatItem
              icon={<Users size={20} color="#FF6B00" />}
              iconColor="#FF6B00"
              iconBg="rgba(255, 107, 0, 0.1)"
              value={stats.total}
              label="Total"
              textColor={colors.text}
              secondaryColor={theme.secondary}
            />
            
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            
            <StatItem
              icon={<UserCheck size={20} color="#22C55E" />}
              iconColor="#22C55E"
              iconBg="rgba(34, 197, 94, 0.1)"
              value={stats.checkedIn}
              label="Present"
              textColor={colors.text}
              secondaryColor={theme.secondary}
            />
            
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            
            <StatItem
              icon={<BarChart size={20} color="#3B82F6" />}
              iconColor="#3B82F6"
              iconBg="rgba(59, 130, 246, 0.1)"
              value={`${stats.percentage}%`}
              label="Rate"
              textColor={colors.text}
              secondaryColor={theme.secondary}
            />
          </View>
        </Animated.View>

        {/* Animated Action Buttons */}
        <Animated.View 
          style={[
            styles.actionsGrid,
            { 
              backgroundColor: colors.card,
              opacity: actionsAnimation,
              transform: [{
                scale: actionsAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1]
                })
              }],
              borderWidth: 1,
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
            }
          ]}
        >
          <ActionButton
            icon={<Users size={22} color="#FFFFFF" />}
            label="Guest List"
            color="#3B82F6"
            bgColor={isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)'}
            onPress={handleNavigateToGuestList}
            textColor={isDarkMode ? '#3B82F6' : '#2563EB'}
          />
          
          <ActionButton
            icon={<UserCheck size={22} color="#FFFFFF" />}
            label="Attendance"
            color="#22C55E"
            bgColor={isDarkMode ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.08)'}
            onPress={handleNavigateToAttendance}
            textColor={isDarkMode ? '#22C55E' : '#16A34A'}
          />
        </Animated.View>

        {/* Animated Progress Card */}
        <Animated.View 
          style={[
            styles.progressCard,
            { 
              backgroundColor: colors.card,
              opacity: progressAnimation,
              transform: [{
                translateY: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }]
            }
          ]}
        >
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>Check-in Progress</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <RefreshCw size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.progressContent}>
            <View style={styles.progressCircle}>
              <Text style={[styles.progressPercentage, { color: colors.primary }]}>
                {stats.percentage}%
              </Text>
            </View>
            
            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <Text style={[styles.progressStatValue, { color: '#22C55E' }]}>{stats.checkedIn}</Text>
                <Text style={[styles.progressStatLabel, { color: theme.secondary }]}>Checked In</Text>
              </View>
              
              <View style={styles.progressStat}>
                <Text style={[styles.progressStatValue, { color: theme.secondary }]}>{stats.pending}</Text>
                <Text style={[styles.progressStatLabel, { color: theme.secondary }]}>Pending</Text>
              </View>
            </View>
          </View>
          
          {/* Progress Bar */}
          <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
            <Animated.View 
              style={[
                styles.progressBar,
                { 
                  backgroundColor: colors.primary,
                  width: `${stats.percentage}%`
                }
              ]}
            />
          </View>
        </Animated.View>

        {/* Quick Actions - Removed per request */}
      </ScrollView>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={handleCloseScanner}
        statusBarTranslucent
      >
        <QRScanner onScan={handleScanResult} onClose={handleCloseScanner} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Header
  header: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerPressable: {
    flex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
    lineHeight: 24,
  },
  eventDetails: {
    marginTop: 14,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  
  // Stats Card
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
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
    marginHorizontal: 12,
  },
  
  // Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  
  // Progress Card
  progressCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 4,
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: '700',
  },
  progressStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  progressStatLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
