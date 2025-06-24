import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Calendar, CalendarX, ChevronRight, Clock, MapPin } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRefresh } from "../../context/RefreshContext";
import { useTheme } from "../../context/ThemeContext";
import { getEvents, login } from "../../services/api";

// Define event type
interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  imageUrl: string;
}

// Mock data for events as fallback
const mockEvents: Event[] = [
  { 
    id: '1', 
    title: 'Team Meeting', 
    date: '2023-10-15', 
    time: '09:00 AM', 
    location: 'Conference Room A',
    imageUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
  },
  { 
    id: '2', 
    title: 'Project Deadline', 
    date: '2023-10-20', 
    time: '05:00 PM', 
    location: 'Office',
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
  },
  { 
    id: '3', 
    title: 'Client Presentation', 
    date: '2023-10-25', 
    time: '02:00 PM', 
    location: 'Meeting Room B',
    imageUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
  },
  { 
    id: '4', 
    title: 'Lunch with Colleagues', 
    date: '2023-10-18', 
    time: '12:30 PM', 
    location: 'Cafe Downtown',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
  },
];

export default function Index() {
  const { colors, setSelectedEventId, setSelectedEventName } = useTheme();
  const { setAutoRefreshInterval } = useRefresh();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    setError(null);
    
    try {
      let token = null;
      // Try to get token from storage
      try {
        const tokenResult = await login();
        if (tokenResult) {
          token = tokenResult;
        }
      } catch (loginErr) {
        console.error("Authentication error:", loginErr);
        setError("Authentication failed. Using cached data.");
      }

      // Fetch events from API
      let eventsData;
      try {
        eventsData = await getEvents();
        
        // Clear error if we successfully got data
        if (Array.isArray(eventsData) && eventsData.length > 0) {
          setError(null);
        }
      } catch (eventsErr) {
        console.error("Error fetching events:", eventsErr);
        setError("Error loading events. Using cached data.");
      }
      
      if (Array.isArray(eventsData) && eventsData.length > 0) {
        // Map the API response to our Event interface
        const formattedEvents = eventsData.map(event => ({
          id: event.id || event.eventId || event.EventId || String(event._id || '0'),
          title: event.title || event.name || event.EventName || event.event_name || 'Unnamed Event',
          date: formatDateFromAPI(event.date || event.showStart || event.event_date || 'TBD'),
          time: formatTimeFromAPI(event.time || event.showStart || event.event_time || 'TBD'),
          location: event.location || event.venue || event.VenueName || 'TBD',
          imageUrl: event.imageUrl || event.image || event.EventImage || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
        }));
        setEvents(formattedEvents);
      } else {
        // If for some reason eventsData is empty, use mock data
        console.log("No events found in response, using default data");
        setEvents(mockEvents);
        if (!error) {
          setError("No events found. Showing sample data.");
        }
      }
    } catch (err: any) {
      console.error("Unexpected error:", err);
      setEvents(mockEvents);
      setError("An unexpected error occurred. Showing sample data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    
    // Enable auto-refresh with 60-second interval for events list
    setAutoRefreshInterval(true, 60000);
    
    return () => {
      // Disable auto-refresh when component unmounts
      setAutoRefreshInterval(false);
    };
  }, [setAutoRefreshInterval]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents(true);
  };

  // Helper function to format date from API 
  const formatDateFromAPI = (dateString: string): string => {
    if (dateString === 'TBD') return 'TBD';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
    } catch (e) {
      return dateString;
    }
  };

  // Helper function to format time from API
  const formatTimeFromAPI = (timeString: string): string => {
    if (timeString === 'TBD') return 'TBD';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return timeString;
    }
  };

  const renderEventItem = ({ item }: { item: Event }) => (
    <TouchableOpacity 
      style={[styles.eventCard, { backgroundColor: colors.card }]}
      onPress={() => {
        // Set selected event in context
        setSelectedEventId(item.id);
        setSelectedEventName(item.title);
        // Navigate to event detail
        router.push(`/(tabs)/${item.id}`);
      }}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: item.imageUrl }} 
        style={styles.eventImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
        style={styles.gradientOverlay}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      
      <View style={styles.eventOverlay}>
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text style={[styles.eventTitle, { color: '#FFFFFF' }]} numberOfLines={2} ellipsizeMode="tail">
              {item.title}
            </Text>
          </View>
          
          <View style={styles.eventDetails}>
            <View style={styles.detailRow}>
              <View style={styles.iconWrapper}>
                <Calendar size={14} color="#FFFFFF" />
              </View>
              <Text style={[styles.detailText, { color: '#FFFFFF' }]} numberOfLines={1} ellipsizeMode="tail">
                {item.date}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.iconWrapper}>
                <Clock size={14} color="#FFFFFF" />
              </View>
              <Text style={[styles.detailText, { color: '#FFFFFF' }]} numberOfLines={1} ellipsizeMode="tail">
                {item.time}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.iconWrapper}>
                <MapPin size={14} color="#FFFFFF" />
              </View>
              <Text style={[styles.detailText, { color: '#FFFFFF', flex: 1 }]}>
                {item.location}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.viewDetailsContainer}>
          <View style={styles.viewDetails}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <ChevronRight size={12} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.header, { color: colors.text }]}>Upcoming Events</Text>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading events...</Text>
        </View>
      ) : (
        <>
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: colors.card }]}>
              <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
            </View>
          )}
          <FlatList
            data={events}
            renderItem={renderEventItem}
            keyExtractor={(item) => item.id}
            style={styles.eventList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.centerContainer}>
                <CalendarX size={60} color={colors.secondary} opacity={0.5} />
                <Text style={[styles.emptyText, { color: colors.text }]}>No events found</Text>
                <Text style={[styles.emptySubText, { color: colors.secondary }]}>
                  Pull to refresh or check your internet connection
                </Text>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#000000",
  },
  listContainer: {
    paddingBottom: 120, // Space for navigation bar + extra padding
  },
  eventCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    height: 200,
    position: 'relative',
    flexDirection: 'column',
  },
  eventImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.8,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  eventOverlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  eventContent: {
    flex: 1,
    paddingRight: 130, // Add padding to prevent overlap with button
    paddingBottom: 50, // Add bottom padding for button space
  },
  eventHeader: {
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: "800",
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    lineHeight: 26,
  },
  eventDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 20,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailText: {
    fontSize: 15,
    fontWeight: "600",
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#3C3C43",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
  },
  viewDetailsContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  viewDetailsText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginRight: 6,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF3B30',
  },
  eventList: {
    paddingBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#3C3C43',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
}); 