import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BarChart, TrendingUp, Users, DollarSign, Calendar, UserCheck, UserX, Clock } from 'lucide-react-native';
import { getEvents, getGuestList, getCheckedInGuestList } from '../../services/api';

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
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading analytics...</Text>
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
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
        <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
          Track your event performance
        </Text>
      </View>

      <View style={styles.statsContainer}>
        {/* Total Events Card */}
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
            <Calendar size={24} color="#007AFF" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {analyticsData?.totalEvents || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Total Events</Text>
        </View>

        {/* Total Tickets Card */}
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(88,86,214,0.1)' }]}>
            <Users size={24} color="#5856D6" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {analyticsData?.totalTickets.toLocaleString() || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Total Tickets</Text>
        </View>

        {/* Checked In Card */}
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(52,199,89,0.1)' }]}>
            <UserCheck size={24} color="#34C759" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {analyticsData?.totalCheckedIn.toLocaleString() || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Checked In</Text>
        </View>

        {/* Attendance Rate Card */}
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,149,0,0.1)' }]}>
            <TrendingUp size={24} color="#FF9500" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatPercentage(analyticsData?.averageAttendanceRate || 0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Attendance Rate</Text>
        </View>

        {/* Total Revenue Card */}
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(52,199,89,0.1)' }]}>
            <DollarSign size={24} color="#34C759" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatCurrency(analyticsData?.totalRevenue || 0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Total Revenue</Text>
        </View>

        {/* Pending Check-ins Card */}
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,59,48,0.1)' }]}>
            <Clock size={24} color="#FF3B30" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {((analyticsData?.totalTickets || 0) - (analyticsData?.totalCheckedIn || 0)).toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Pending Check-ins</Text>
        </View>
      </View>

      {/* Recent Events Section */}
      {analyticsData?.recentEvents && analyticsData.recentEvents.length > 0 && (
        <View style={styles.recentEventsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Events</Text>
          {analyticsData.recentEvents.map((event, index) => (
            <View key={event.id || index} style={[styles.eventCard, { backgroundColor: colors.card }]}>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventName, { color: colors.text }]} numberOfLines={1}>
                  {event.EventName || event.title || event.name || 'Unnamed Event'}
                </Text>
                <Text style={[styles.eventDate, { color: colors.secondary }]}>
                  {event.showStart ? new Date(event.showStart).toLocaleDateString() : 'No date'}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    padding: 20,
    paddingTop: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  statCard: {
    width: '46%',
    margin: '2%',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  recentEventsSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  eventCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    marginBottom: 2,
  },
  eventVenue: {
    fontSize: 14,
  },
}); 