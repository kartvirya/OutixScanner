import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, TrendingUp, UserCheck, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRefresh } from '../../context/RefreshContext';
import { useTheme } from '../../context/ThemeContext';
import { getCheckedInGuestList, getEvents, getGuestList } from '../../services/api';
import { DataCache, usePerformanceMonitor } from '../../utils/performanceUtils';

interface EventSummary {
  id: string;
  title: string;
  date: string;
  totalTickets: number;
  checkedIn: number;
  attendanceRate: number;
}

interface AnalyticsData {
  totalEvents: number;
  totalTickets: number;
  totalCheckedIn: number;
  averageAttendanceRate: number;
  recentEvents: EventSummary[];
}

interface EventStats {
  eventId: string;
  guestCount: number;
  checkedInCount: number;
}

// Initialize cache for analytics data with longer duration
const analyticsCache = new DataCache<AnalyticsData>('analytics_cache', {
  duration: 15 * 60 * 1000, // 15 minutes (increased for better performance)
  persistent: true
});

const eventStatsCache = new DataCache<EventStats>('event_stats_cache', {
  duration: 30 * 60 * 1000, // 30 minutes (increased for better performance)
  persistent: true,
  maxSize: 100  // Increased cache size
});

// Memoized stat item component for better performance
const StatItem = React.memo<{
  icon: React.ReactNode;
  value: string | number;
  label: string;
  colors: any;
  gradientColors?: string[];
}>(({ icon, value, label, colors, gradientColors }) => {
  // No hooks in memoized components to avoid Rules of Hooks violations
  return (
    <View style={styles.statItem}>
      <LinearGradient
        colors={gradientColors || [`${colors.primary}20`, `${colors.primary}10`]}
        style={styles.statIconGradient}
      >
        {icon}
      </LinearGradient>
      <Text style={[styles.statValue, { color: colors.text }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.secondary }]}>{label}</Text>
    </View>
  );
});

// Memoized event item component
const EventItem = React.memo<{
  event: any;
  colors: any;
  isLast: boolean;
}>(({ event, colors, isLast }) => {
  // No hooks in memoized components to avoid Rules of Hooks violations
  const formatAppDateTime = require('../../utils/date').formatAppDateTime;
  
  return (
    <View style={[styles.eventItem, { borderBottomColor: colors.border }, isLast && { borderBottomWidth: 0 }]}>
      <View style={[styles.eventDot, { backgroundColor: colors.primary }]} />
      <View style={styles.eventInfo}>
        <Text style={[styles.eventName, { color: colors.text }]} numberOfLines={1}>
          {event.EventName || event.title || event.name || 'Unnamed Event'}
        </Text>
        <Text style={[styles.eventDate, { color: colors.secondary }]}>
          {event.showStart ? formatAppDateTime(event.showStart) : 'No date'}
        </Text>
        <Text style={[styles.eventVenue, { color: colors.secondary }]} numberOfLines={1}>
          {event.VenueName || event.venue || 'No venue'}
        </Text>
      </View>
    </View>
  );
});

export default function Analytics() {
  // All hooks must be called unconditionally at the top level, in the same order every render
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { onAnalyticsRefresh, triggerAnalyticsRefresh } = useRefresh();
  
  // State hooks - must be before usePerformanceMonitor to maintain consistent order
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isStaleData, setIsStaleData] = useState(false);
  
  // Performance monitor after state hooks to ensure consistent hook order
  const { metrics, measureApiCall } = usePerformanceMonitor('Analytics');

  // Fetch stats for a single event with caching and timeout
  const fetchEventStats = useCallback(async (eventId: string): Promise<EventStats> => {
    // Check cache first
    const cacheKey = `event_stats_${eventId}`;
    const cached = eventStatsCache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for event ${eventId}`);
      return cached;
    }

    // Create a timeout wrapper for API calls
    const fetchWithTimeout = async (promise: Promise<any>, timeoutMs: number = 3000) => {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      );
      return Promise.race([promise, timeout]);
    };

    try {
      // Fetch from API with timeout
      const [guestList, checkedInGuests] = await Promise.all([
        fetchWithTimeout(getGuestList(eventId)),
        fetchWithTimeout(getCheckedInGuestList(eventId))
      ]);

      const stats: EventStats = {
        eventId,
        guestCount: guestList.length,
        checkedInCount: checkedInGuests.length
      };

      // Cache the result
      await eventStatsCache.set(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error(`Failed to fetch stats for event ${eventId}:`, error);
      // Return default stats on error
      return {
        eventId,
        guestCount: 0,
        checkedInCount: 0
      };
    }
  }, []);

  const fetchAnalyticsData = useCallback(async (forceRefresh = false) => {
    try {
      console.log('Fetching analytics data...', { forceRefresh });
      
      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cached = analyticsCache.get('main');
        if (cached) {
          console.log('Using cached analytics data');
          setAnalyticsData(cached);
          setIsStaleData(true);
          setLoading(false);
          // Return early - don't fetch in background to save time
          return;
        }
      }

      // Fetch events with performance monitoring
      const events = await measureApiCall(
        () => getEvents(),
        'getEvents'
      );
      console.log('Events fetched:', events.length);
      
      // OPTIMIZATION: Only process first 3 events for overview stats
      // This reduces API calls from 20 to 6
      const eventsToProcess = events.slice(0, 3);
      
      // First, show basic data without detailed stats
      const basicAnalytics: AnalyticsData = {
        totalEvents: events.length,
        totalTickets: 0,
        totalCheckedIn: 0,
        averageAttendanceRate: 0,
        recentEvents: events.slice(0, 3)
      };
      
      // Show basic data immediately
      setAnalyticsData(basicAnalytics);
      setLoading(false);
      
      let totalTickets = 0;
      let totalCheckedIn = 0;
      const attendanceRates: number[] = [];
      
      // Process all events in parallel for speed
      const allStats = await Promise.all(
        eventsToProcess.map(async (event) => {
          try {
            const eventId = event.id || event.EventId;
            const stats = await fetchEventStats(eventId);
            
            // Calculate attendance rate for this event
            if (stats.guestCount > 0) {
              const attendanceRate = (stats.checkedInCount / stats.guestCount) * 100;
              attendanceRates.push(attendanceRate);
            }
            
            return stats;
          } catch (eventError) {
            console.warn(`Error processing event ${event.id}:`, eventError);
            return null;
          }
        })
      );
      
      // Aggregate all results at once
      allStats.forEach(stats => {
        if (stats) {
          totalTickets += stats.guestCount;
          totalCheckedIn += stats.checkedInCount;
        }
      })
      
      // Calculate average attendance rate
      const averageAttendanceRate = attendanceRates.length > 0 
        ? attendanceRates.reduce((sum, rate) => sum + rate, 0) / attendanceRates.length 
        : 0;
      
      const analytics: AnalyticsData = {
        totalEvents: events.length,
        totalTickets,
        totalCheckedIn,
        averageAttendanceRate,
        recentEvents: events.slice(0, 3) // Get 3 most recent events
      };
      
      console.log('Analytics data computed:', analytics);
      console.log('Cache stats:', eventStatsCache.getStats());
      
      // Cache the result
      await analyticsCache.set('main', analytics);
      
      setAnalyticsData(analytics);
      setIsStaleData(false);
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      
      // Try to use cached data on error
      const cached = analyticsCache.get('main');
      if (cached) {
        setAnalyticsData(cached);
        setIsStaleData(true);
      } else {
        // Fallback to empty data
        setAnalyticsData({
          totalEvents: 0,
          totalTickets: 0,
          totalCheckedIn: 0,
          averageAttendanceRate: 0,
          recentEvents: []
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [measureApiCall, fetchEventStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Clear caches on manual refresh
    await analyticsCache.clear();
    await eventStatsCache.clear();
    await fetchAnalyticsData(true); // Force refresh
  }, [fetchAnalyticsData]);
  
  // Callbacks and memos must be before any conditional returns
  const formatPercentage = useCallback((value: number) => {
    return `${value.toFixed(1)}%`;
  }, []);
  
  const pendingCheckIns = useMemo(() => {
    if (!analyticsData) return 0;
    return Math.max(0, analyticsData.totalTickets - analyticsData.totalCheckedIn);
  }, [analyticsData?.totalTickets, analyticsData?.totalCheckedIn]);

  const progressPercentage = useMemo(() => {
    if (!analyticsData || analyticsData.totalTickets === 0) return 0;
    return Math.min(100, (analyticsData.totalCheckedIn / analyticsData.totalTickets) * 100);
  }, [analyticsData?.totalTickets, analyticsData?.totalCheckedIn]);
  
  // useEffect must be after all other hooks to maintain consistent order
  useEffect(() => {
    // Start with cached data immediately
    const cached = analyticsCache.get('main');
    if (cached) {
      setAnalyticsData(cached);
      setIsStaleData(true);
      setLoading(false);
    }
    
    // Then fetch fresh data if cache is old or missing
    const cacheAge = cached ? Date.now() - (cached as any).timestamp : Infinity;
    if (!cached || cacheAge > 60000) { // Fetch if no cache or older than 1 minute
      fetchAnalyticsData(false);
    }
  }, [fetchAnalyticsData]);

  // Early return for loading state - must be after all hooks
  if (loading && !analyticsData) {
    // Show skeleton loader for better perceived performance
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 4 }]}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={[styles.header, { color: colors.text }]}>Analytics</Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
            Track your event performance
          </Text>
        </View>
        
        {/* Skeleton Stats */}
        <View style={[styles.overviewCard, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.skeletonTitle, { backgroundColor: colors.border }]} />
            <View style={[styles.titleAccent, { backgroundColor: colors.primary }]} />
          </View>
          <View style={styles.statsGrid}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.statItem}>
                <View style={[styles.skeletonIcon, { backgroundColor: colors.border }]} />
                <View style={[styles.skeletonValue, { backgroundColor: colors.border }]} />
                <View style={[styles.skeletonLabel, { backgroundColor: colors.border }]} />
              </View>
            ))}
          </View>
        </View>
        
        {/* Skeleton Pending Card */}
        <View style={[styles.pendingCard, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.skeletonTitle, { backgroundColor: colors.border }]} />
            <View style={[styles.titleAccent, { backgroundColor: '#FF9500' }]} />
          </View>
          <View style={styles.pendingContent}>
            <View style={[styles.skeletonIcon, { backgroundColor: colors.border, width: 60, height: 60, borderRadius: 30 }]} />
            <View style={{ flex: 1 }}>
              <View style={[styles.skeletonValue, { backgroundColor: colors.border, width: 100 }]} />
              <View style={[styles.skeletonLabel, { backgroundColor: colors.border, width: 150 }]} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 4 }]}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.header, { color: colors.text }]}>Analytics</Text>
            <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
              Track your event performance
            </Text>
          </View>
          {isStaleData && (
            <View style={[styles.staleBadge, { backgroundColor: colors.warning + '20' }]}>
              <Text style={[styles.staleText, { color: colors.warning }]}>Cached</Text>
            </View>
          )}
        </View>
        {__DEV__ && metrics.renderTime > 0 && (
          <Text style={[styles.perfText, { color: colors.secondary }]}>
            Render: {metrics.renderTime}ms | API: {metrics.apiCallTime}ms
          </Text>
        )}
      </View>
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
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
        {/* Overview Stats */}
        <View style={[styles.overviewCard, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
            <View style={[styles.titleAccent, { backgroundColor: colors.primary }]} />
          </View>
          
          <View style={styles.statsGrid}>
            <StatItem
              icon={<Calendar size={22} color={colors.primary} />}
              value={analyticsData?.totalEvents || 0}
              label="Events"
              colors={colors}
            />
            <StatItem
              icon={<Users size={22} color={colors.primary} />}
              value={analyticsData?.totalTickets.toLocaleString() || 0}
              label="Tickets"
              colors={colors}
            />
            <StatItem
              icon={<UserCheck size={22} color="#34C759" />}
              value={analyticsData?.totalCheckedIn.toLocaleString() || 0}
              label="Checked In"
              colors={colors}
              gradientColors={['#34C75920', '#34C75910']}
            />
            <StatItem
              icon={<TrendingUp size={22} color="#FF9500" />}
              value={formatPercentage(analyticsData?.averageAttendanceRate || 0)}
              label="Attendance"
              colors={colors}
              gradientColors={['#FF950020', '#FF950010']}
            />
          </View>
        </View>


        {/* Pending Check-ins */}
        <View style={[styles.pendingCard, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pending</Text>
            <View style={[styles.titleAccent, { backgroundColor: '#FF9500' }]} />
          </View>
          
          <View style={styles.pendingContent}>
            <LinearGradient
              colors={['#FF950025', '#FF950015']}
              style={styles.pendingIconContainer}
            >
              <Clock size={28} color="#FF9500" />
            </LinearGradient>
            <View style={styles.pendingInfo}>
              <Text style={[styles.pendingValue, { color: colors.text }]}>
                {pendingCheckIns.toLocaleString()}
              </Text>
              <Text style={[styles.pendingLabel, { color: colors.secondary }]}>Awaiting Check-in</Text>
              <View style={styles.pendingProgress}>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        backgroundColor: '#FF9500',
                        width: `${progressPercentage}%`
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Events */}
        {analyticsData?.recentEvents && analyticsData.recentEvents.length > 0 && (
          <View style={[styles.recentEventsCard, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Events</Text>
              <View style={[styles.titleAccent, { backgroundColor: colors.primary }]} />
            </View>
            
            {analyticsData.recentEvents.map((event, index) => (
              <EventItem
                key={event.id || index}
                event={event}
                colors={colors}
                isLast={index === analyticsData.recentEvents.length - 1}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerContainer: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  staleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  staleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  perfText: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: "500",
    opacity: 0.8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  overviewCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  pendingCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  recentEventsCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  cardHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  titleAccent: {
    width: 40,
    height: 3,
    borderRadius: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  statItem: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
  },
  statIconGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  pendingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  pendingLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  pendingProgress: {
    marginTop: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 16,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  eventDate: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  eventVenue: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.8,
  },
  // Skeleton loader styles
  skeletonTitle: {
    width: 120,
    height: 20,
    borderRadius: 10,
    marginBottom: 8,
  },
  skeletonIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 12,
  },
  skeletonValue: {
    width: 60,
    height: 24,
    borderRadius: 12,
    marginBottom: 6,
  },
  skeletonLabel: {
    width: 80,
    height: 14,
    borderRadius: 7,
  },
});
