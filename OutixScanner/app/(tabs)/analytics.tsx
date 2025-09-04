import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, DollarSign, TrendingUp, UserCheck, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRefresh } from '../../context/RefreshContext';
import { useTheme } from '../../context/ThemeContext';
import { getCheckedInGuestList, getEvents, getGuestList } from '../../services/api';

interface AnalyticsData {
  totalEvents: number;
  totalTickets: number;
  totalCheckedIn: number;
  totalRevenue: number;
  averageAttendanceRate: number;
  recentEvents: any[];
}

export default function Analytics() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { onAnalyticsRefresh, triggerAnalyticsRefresh } = useRefresh();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalyticsData = async () => {
    try {
      console.log('Fetching analytics data...');
      
      // Get all events
      const events = await getEvents();
      console.log('Events fetched:', events.length);
      
      let totalTickets = 0;
      let totalCheckedIn = 0;
      let totalRevenue = 0;
      let attendanceRates: number[] = [];
      
      // Process each event to get guest statistics
      for (const event of events.slice(0, 5)) { // Limit to first 5 events for performance
        try {
          const eventId = event.id || event.EventId;
          console.log(`Processing event ${eventId}...`);
          
          const guestList = await getGuestList(eventId);
          const checkedInGuests = await getCheckedInGuestList(eventId);
          
          totalTickets += guestList.length;
          totalCheckedIn += checkedInGuests.length;
          
          // Calculate attendance rate for this event
          if (guestList.length > 0) {
            const attendanceRate = (checkedInGuests.length / guestList.length) * 100;
            attendanceRates.push(attendanceRate);
          }
          
          // Calculate revenue (estimate based on ticket prices if available)
          const eventRevenue = guestList.reduce((sum, guest) => {
            const price = parseFloat(guest.price || guest.ticket_price || '0');
            return sum + price;
          }, 0);
          totalRevenue += eventRevenue;
          
          console.log(`Event ${eventId}: ${guestList.length} tickets, ${checkedInGuests.length} checked in`);
        } catch (eventError) {
          console.warn(`Error processing event ${event.id}:`, eventError);
        }
      }
      
      // Calculate average attendance rate
      const averageAttendanceRate = attendanceRates.length > 0 
        ? attendanceRates.reduce((sum, rate) => sum + rate, 0) / attendanceRates.length 
        : 0;
      
      const analytics: AnalyticsData = {
        totalEvents: events.length,
        totalTickets,
        totalCheckedIn,
        totalRevenue,
        averageAttendanceRate,
        recentEvents: events.slice(0, 3) // Get 3 most recent events
      };
      
      console.log('Analytics data computed:', analytics);
      setAnalyticsData(analytics);
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      
      // Fallback to partial mock data if API fails
      setAnalyticsData({
        totalEvents: 0,
        totalTickets: 0,
        totalCheckedIn: 0,
        totalRevenue: 0,
        averageAttendanceRate: 0,
        recentEvents: []
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
    
    // Register for auto-refresh
    const unsubscribe = onAnalyticsRefresh(() => {
      console.log('Analytics auto-refresh triggered');
      fetchAnalyticsData();
    });
    
    return unsubscribe;
  }, [onAnalyticsRefresh]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    // Also trigger refresh for other components
    triggerAnalyticsRefresh();
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 4 }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 4 }]}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={[styles.header, { color: colors.text }]}>Analytics</Text>
        <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
          Track your event performance
        </Text>
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
            <View style={styles.statItem}>
              <LinearGradient
                colors={[`${colors.primary}20`, `${colors.primary}10`]}
                style={styles.statIconGradient}
              >
                <Calendar size={22} color={colors.primary} />
              </LinearGradient>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {analyticsData?.totalEvents || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.secondary }]}>Events</Text>
            </View>

            <View style={styles.statItem}>
              <LinearGradient
                colors={[`${colors.primary}20`, `${colors.primary}10`]}
                style={styles.statIconGradient}
              >
                <Users size={22} color={colors.primary} />
              </LinearGradient>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {analyticsData?.totalTickets.toLocaleString() || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.secondary }]}>Tickets</Text>
            </View>

            <View style={styles.statItem}>
              <LinearGradient
                colors={['#34C75920', '#34C75910']}
                style={styles.statIconGradient}
              >
                <UserCheck size={22} color="#34C759" />
              </LinearGradient>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {analyticsData?.totalCheckedIn.toLocaleString() || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.secondary }]}>Checked In</Text>
            </View>

            <View style={styles.statItem}>
              <LinearGradient
                colors={['#FF950020', '#FF950010']}
                style={styles.statIconGradient}
              >
                <TrendingUp size={22} color="#FF9500" />
              </LinearGradient>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatPercentage(analyticsData?.averageAttendanceRate || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.secondary }]}>Attendance</Text>
            </View>
          </View>
        </View>

        {/* Financial Stats */}
        <View style={[styles.financialCard, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Financial</Text>
            <View style={[styles.titleAccent, { backgroundColor: '#34C759' }]} />
          </View>
          
          <View style={styles.financialContent}>
            <LinearGradient
              colors={['#34C75925', '#34C75915']}
              style={styles.financialIconContainer}
            >
              <DollarSign size={28} color="#34C759" />
            </LinearGradient>
            <View style={styles.financialInfo}>
              <Text style={[styles.financialValue, { color: colors.text }]}>
                {formatCurrency(analyticsData?.totalRevenue || 0)}
              </Text>
              <Text style={[styles.financialLabel, { color: colors.secondary }]}>Total Revenue</Text>
              <View style={styles.financialBadge}>
                <Text style={styles.financialBadgeText}>All Events</Text>
              </View>
            </View>
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
                {((analyticsData?.totalTickets || 0) - (analyticsData?.totalCheckedIn || 0)).toLocaleString()}
              </Text>
              <Text style={[styles.pendingLabel, { color: colors.secondary }]}>Awaiting Check-in</Text>
              <View style={styles.pendingProgress}>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        backgroundColor: '#FF9500',
                        width: `${Math.min(((analyticsData?.totalCheckedIn || 0) / Math.max(analyticsData?.totalTickets || 1, 1)) * 100, 100)}%`
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
              <View key={event.id || index} style={[styles.eventItem, { borderBottomColor: colors.border }, index === analyticsData.recentEvents.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[styles.eventDot, { backgroundColor: colors.primary }]} />
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventName, { color: colors.text }]} numberOfLines={1}>
                    {event.EventName || event.title || event.name || 'Unnamed Event'}
                  </Text>
                  <Text style={[styles.eventDate, { color: colors.secondary }]}>
                    {event.showStart ? require('../../utils/date').formatAppDateTime(event.showStart) : 'No date'}
                  </Text>
                  <Text style={[styles.eventVenue, { color: colors.secondary }]} numberOfLines={1}>
                    {event.VenueName || event.venue || 'No venue'}
                  </Text>
                </View>
              </View>
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
  financialCard: {
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
  financialContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  financialIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  financialInfo: {
    flex: 1,
  },
  financialValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  financialLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  financialBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#34C75915',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  financialBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
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
}); 