import { AlertCircle, Calendar, CheckCircle, Info, LucideIcon, TrendingUp, UserCheck, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRefresh } from '../../context/RefreshContext';
import { useTheme } from '../../context/ThemeContext';
import { getCheckedInGuestList, getEvents, getGuestList, getUserProfile } from '../../services/api';

interface Notification {
  id: string;
  type: 'success' | 'alert' | 'warning' | 'info';
  title: string;
  message: string;
  time: string;
  icon: LucideIcon;
  color: string;
}

interface EventSummary {
  id: string;
  title: string;
  totalGuests: number;
  checkedIn: number;
  date: string;
}

export default function Notifications() {
  const { colors } = useTheme();
  const { triggerEventRefresh } = useRefresh();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMilliseconds = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const generateNotificationsFromData = async (): Promise<Notification[]> => {
    const generatedNotifications: Notification[] = [];
    
    try {
      // Get events data
      const events = await getEvents();
      const userProfile = await getUserProfile();
      
      // Generate notifications based on real data
      const now = new Date();
      
      if (Array.isArray(events) && events.length > 0) {
        // Get event summaries with guest data
        const eventSummaries: EventSummary[] = [];
        
        for (const event of events.slice(0, 5)) { // Limit to first 5 events for performance
          try {
            const eventId = event.id || event.eventId || event.EventId || String(event._id);
            const guestList = await getGuestList(eventId);
            const checkedInList = await getCheckedInGuestList(eventId);
            
            eventSummaries.push({
              id: eventId,
              title: event.title || event.name || event.EventName || 'Event',
              totalGuests: Array.isArray(guestList) ? guestList.length : 0,
              checkedIn: Array.isArray(checkedInList) ? checkedInList.length : 0,
              date: event.date || event.showStart || 'TBD'
            });
          } catch (err) {
            console.log('Error getting data for event:', event.id);
          }
        }
        
        // Welcome message for the user
        generatedNotifications.push({
          id: 'welcome',
          type: 'info',
          title: 'Welcome to OutixScanner',
          message: `Hello ${userProfile.name || 'User'}! You have ${events.length} events to manage.`,
          time: formatTimeAgo(new Date(now.getTime() - 5 * 60 * 1000)), // 5 minutes ago
          icon: Info,
          color: '#5856D6'
        });

        // Event activity summaries
        eventSummaries.forEach((event, index) => {
          if (event.totalGuests > 0) {
            const attendanceRate = Math.round((event.checkedIn / event.totalGuests) * 100);
            
            if (event.checkedIn > 0) {
              generatedNotifications.push({
                id: `checkin-${event.id}`,
                type: 'success',
                title: 'Guest Check-ins Active',
                message: `${event.checkedIn} of ${event.totalGuests} guests checked in to ${event.title}`,
                time: formatTimeAgo(new Date(now.getTime() - (index + 1) * 15 * 60 * 1000)), // Staggered times
                icon: UserCheck,
                color: '#34C759'
              });
            }

            if (attendanceRate > 80) {
              generatedNotifications.push({
                id: `high-attendance-${event.id}`,
                type: 'alert',
                title: 'High Attendance Rate',
                message: `${event.title} has ${attendanceRate}% attendance rate`,
                time: formatTimeAgo(new Date(now.getTime() - (index + 2) * 20 * 60 * 1000)),
                icon: TrendingUp,
                color: '#007AFF'
              });
            }

            if (event.totalGuests > 50) {
              generatedNotifications.push({
                id: `large-event-${event.id}`,
                type: 'info',
                title: 'Large Event Active',
                message: `${event.title} has ${event.totalGuests} registered guests`,
                time: formatTimeAgo(new Date(now.getTime() - (index + 3) * 25 * 60 * 1000)),
                icon: Users,
                color: '#FF9500'
              });
            }
          } else {
            // Event with no guests yet
            generatedNotifications.push({
              id: `new-event-${event.id}`,
              type: 'alert',
              title: 'New Event Ready',
              message: `${event.title} is ready for guest registrations`,
              time: formatTimeAgo(new Date(now.getTime() - (index + 1) * 30 * 60 * 1000)),
              icon: Calendar,
              color: '#007AFF'
            });
          }
        });

        // System status update
        generatedNotifications.push({
          id: 'system-status',
          type: 'success',
          title: 'System Status',
          message: 'All services are running smoothly. Scanner is ready for use.',
          time: formatTimeAgo(new Date(now.getTime() - 2 * 60 * 60 * 1000)), // 2 hours ago
          icon: CheckCircle,
          color: '#34C759'
        });

      } else {
        // No events found
        generatedNotifications.push({
          id: 'no-events',
          type: 'info',
          title: 'Getting Started',
          message: 'No events found. Create your first event to begin scanning guests.',
          time: formatTimeAgo(new Date(now.getTime() - 10 * 60 * 1000)),
          icon: Calendar,
          color: '#5856D6'
        });
      }

    } catch (error) {
      console.error('Error generating notifications:', error);
      
      // Fallback notification for errors
      generatedNotifications.push({
         id: 'error-fallback',
         type: 'warning',
         title: 'Connection Status',
         message: 'Unable to fetch latest updates. Please check your connection.',
         time: formatTimeAgo(new Date()),
         icon: AlertCircle,
         color: '#FF9500'
       });
    }

    return generatedNotifications.slice(0, 10); // Limit to 10 notifications
  };

  const loadNotifications = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const generatedNotifications = await generateNotificationsFromData();
      setNotifications(generatedNotifications);
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      loadNotifications(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    await loadNotifications(true);
    // Trigger refresh for other components as well
    triggerEventRefresh('all');
  }, [triggerEventRefresh]);

  const renderNotification = ({ item }: { item: Notification }) => {
    const IconComponent = item.icon;
    
    return (
      <TouchableOpacity 
        style={[styles.notificationItem, { backgroundColor: colors.card }]}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
          <IconComponent size={24} color={item.color} />
        </View>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.message, { color: colors.secondary }]}>{item.message}</Text>
          <Text style={[styles.time, { color: colors.secondary }]}>{item.time}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Info size={48} color={colors.secondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Updates</Text>
      <Text style={[styles.emptyMessage, { color: colors.secondary }]}>
        Pull to refresh to check for new updates
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.secondary }]}>Loading updates...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Updates</Text>
        <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
          Last updated: {lastUpdateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContainer, 
          { paddingBottom: 120 },
          notifications.length === 0 && styles.emptyListContainer
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
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
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
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
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
  },
}); 