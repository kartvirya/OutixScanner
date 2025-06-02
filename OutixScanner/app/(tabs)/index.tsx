import React, { useState, useEffect } from "react";
import { Text, View, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import { Calendar, Clock, MapPin, ChevronRight, CalendarX } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { router } from "expo-router";
import { login, getEvents } from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

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
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
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
      }
    };
    
    fetchEvents();
  }, []);

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
      style={styles.eventCard}
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
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradientOverlay}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={styles.eventOverlay} pointerEvents="box-none">
        <View style={styles.eventHeader}>
          <Text style={[styles.eventTitle, { color: '#FFFFFF' }]}>{item.title}</Text>
        </View>
        <View style={styles.eventDetails}>
          <View style={styles.detailRow}>
            <Calendar size={14} color="#FFFFFF" style={styles.icon} />
            <Text style={[styles.detailText, { color: '#FFFFFF' }]}>{item.date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Clock size={14} color="#FFFFFF" style={styles.icon} />
            <Text style={[styles.detailText, { color: '#FFFFFF' }]}>{item.time}</Text>
          </View>
          <View style={styles.detailRow}>
            <MapPin size={14} color="#FFFFFF" style={styles.icon} />
            <Text style={[styles.detailText, { color: '#FFFFFF' }]}>{item.location}</Text>
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
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {error && (
            <Text style={{ 
              color: colors.error, 
              textAlign: 'center', 
              marginVertical: 8, 
              fontSize: 14,
              paddingHorizontal: 16
            }}>
              {error}
            </Text>
          )}
          {events.length > 0 ? (
            <FlatList
              data={events}
              renderItem={renderEventItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <View style={styles.emptyState}>
              <CalendarX size={50} color={colors.secondary} />
              <Text style={[styles.emptyStateText, { color: colors.text }]}>No events found</Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.secondary }]}>Please check your internet connection</Text>
            </View>
          )}
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
    paddingBottom: 20,
  },
  eventCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
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
    opacity: 0.75,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  eventOverlay: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: "700",
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flex: 1,
    marginBottom: 12,
  },
  eventDetails: {
    gap: 10,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
  detailText: {
    fontSize: 14,
    fontWeight: "500",
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
    position: 'absolute',
    bottom: 18,
    right: 18,
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  viewDetailsText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: 4,
    fontSize: 13,
  }
}); 