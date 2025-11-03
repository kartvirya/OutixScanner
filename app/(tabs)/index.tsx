import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Calendar, CalendarX, ChevronRight, Clock, MapPin } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Modal, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EventImagePlaceholder } from "../../components/EventImagePlaceholder";
import { useTheme } from "../../context/ThemeContext";
import { clearEventsCache, getEvents, isAuthenticated } from "../../services/api";
import { formatAppDate, formatAppTime } from "../../utils/date";

// Define event type
interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  imageUrl?: string;
  [key: string]: unknown;
}

// Define grouped event type
interface GroupedEvent {
  title: string;
  location: string;
  imageUrl?: string;
  dates: {
    id: string;
    date: string;
    time: string;
  }[];
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

// Event Item Component with proper image error handling
interface EventItemProps {
  item: Event;
  colors: {
    text: string;
    background: string;
    card: string;
    border: string;
    primary: string;
    secondary?: string;
  };
  onPress: () => void;
}

const EventItem: React.FC<EventItemProps> = ({ item, colors, onPress }) => {
  const [imageError, setImageError] = useState(false);
  
  // Reset image error when item changes
  useEffect(() => {
    setImageError(false);
  }, [item.imageUrl]);
  
  // Check if we have a valid image URL from Outix
  const hasImageUrl = Boolean(item.imageUrl);
  const isOutixUrl = hasImageUrl && item.imageUrl?.startsWith('https://www.outix.co');
  const isNotUnsplash = hasImageUrl && !item.imageUrl?.includes('images.unsplash.com');
  const hasValidImage = hasImageUrl && isOutixUrl && isNotUnsplash && !imageError;
  
  console.log(`Event: ${item.title}`);
  console.log(`- Has imageUrl: ${hasImageUrl}`);
  console.log(`- ImageUrl: ${item.imageUrl}`);
  console.log(`- Is Outix URL: ${isOutixUrl}`);
  console.log(`- Is not Unsplash: ${isNotUnsplash}`);
  console.log(`- Image error: ${imageError}`);
  console.log(`- Final hasValidImage: ${hasValidImage}`);
  
  return (
    <TouchableOpacity 
      style={[styles.eventCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {hasValidImage ? (
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.eventImage}
          resizeMode="cover"
          onError={() => {
            console.log(`Image failed to load: ${item.imageUrl}`);
            setImageError(true);
          }}
          onLoad={() => {
            console.log(`Image loaded successfully: ${item.imageUrl}`);
          }}
        />
      ) : (
        <EventImagePlaceholder style={styles.eventImage} />
      )}
      
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
                <Calendar size={12} color="#FFFFFF" />
              </View>
              <Text style={[styles.detailText, { color: '#FFFFFF' }]} numberOfLines={1} ellipsizeMode="tail">
                {item.date}
              </Text>
          </View>
            
          <View style={styles.detailRow}>
              <View style={styles.iconWrapper}>
                <Clock size={12} color="#FFFFFF" />
              </View>
              <Text style={[styles.detailText, { color: '#FFFFFF' }]} numberOfLines={1} ellipsizeMode="tail">
                {item.time}
              </Text>
          </View>
            
          <View style={styles.detailRow}>
              <View style={styles.iconWrapper}>
                <MapPin size={12} color="#FFFFFF" />
              </View>
              <Text style={[styles.detailText, { color: '#FFFFFF', flex: 1 }]}>
                {item.location}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.viewDetailsContainer}> 
          <View style={[
            styles.viewDetails, 
            { 
              backgroundColor: `${colors.primary}E6`,
              shadowColor: colors.primary
            }
          ]}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <ChevronRight size={12} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Grouped Event Item Component
interface GroupedEventItemProps {
  item: GroupedEvent;
  colors: {
    text: string;
    background: string;
    card: string;
    border: string;
    primary: string;
    secondary?: string;
  };
  onPress: () => void;
}

const GroupedEventItem: React.FC<GroupedEventItemProps> = ({ item, colors, onPress }) => {
  const [imageError, setImageError] = useState(false);
  
  // Reset image error when item changes
  useEffect(() => {
    setImageError(false);
  }, [item.imageUrl]);
  
  // Check if we have a valid image URL from Outix
  const hasImageUrl = Boolean(item.imageUrl);
  const isOutixUrl = hasImageUrl && item.imageUrl?.startsWith('https://www.outix.co');
  const isNotUnsplash = hasImageUrl && !item.imageUrl?.includes('images.unsplash.com');
  const hasValidImage = hasImageUrl && isOutixUrl && isNotUnsplash && !imageError;
  
  const hasMultipleDates = item.dates.length > 1;
  const nextDate = item.dates[0]; // First date (sorted chronologically)
  
  return (
    <TouchableOpacity 
      style={[styles.eventCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {hasValidImage ? (
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.eventImage}
          resizeMode="cover"
          onError={() => {
            console.log(`Image failed to load: ${item.imageUrl}`);
            setImageError(true);
          }}
          onLoad={() => {
            console.log(`Image loaded successfully: ${item.imageUrl}`);
          }}
        />
      ) : (
        <EventImagePlaceholder style={styles.eventImage} />
      )}
      
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
            {hasMultipleDates && (
              <View style={styles.multipleDatesIndicator}>
                <Text style={styles.multipleDatesText}>
                  {item.dates.length} dates
                </Text>
              </View>
            )}
        </View>
          
        <View style={styles.eventDetails}>
          <View style={styles.detailRow}>
              <View style={styles.iconWrapper}>
                <Calendar size={12} color="#FFFFFF" />
              </View>
              <Text style={[styles.detailText, { color: '#FFFFFF' }]} numberOfLines={1} ellipsizeMode="tail">
                {hasMultipleDates ? `${nextDate.date} + ${item.dates.length - 1} more` : nextDate.date}
              </Text>
          </View>
            
          <View style={styles.detailRow}>
              <View style={styles.iconWrapper}>
                <Clock size={12} color="#FFFFFF" />
              </View>
              <Text style={[styles.detailText, { color: '#FFFFFF' }]} numberOfLines={1} ellipsizeMode="tail">
                {nextDate.time}
              </Text>
          </View>
            
          <View style={styles.detailRow}>
              <View style={styles.iconWrapper}>
                <MapPin size={12} color="#FFFFFF" />
              </View>
              <Text style={[styles.detailText, { color: '#FFFFFF' }]} numberOfLines={1} ellipsizeMode="tail">
                {item.location}
              </Text>
          </View>
        </View>
        </View>
        
        <View style={styles.eventAction}>
          <View style={styles.actionButton}>
            <Text style={styles.actionText}>
              {hasMultipleDates ? 'Select Date' : 'View Details'}
            </Text>
            <ChevronRight size={16} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function Index() {
  const { colors, isDarkMode, setSelectedEventId, setSelectedEventName } = useTheme();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [groupedEvents, setGroupedEvents] = useState<GroupedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedEventForDates, setSelectedEventForDates] = useState<GroupedEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    setError(null);
    
    try {
      // Check if user is authenticated before making API calls
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        console.log("User not authenticated - cannot fetch events");
        setError("Please login to view events");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Clear cache to force fresh data fetch
      console.log("Clearing events cache to fetch fresh data...");
      clearEventsCache();

      // Fetch events from API
      let eventsData;
      try {
        console.log("Fetching events from API...");
        eventsData = await getEvents();
        console.log("Events data received:", eventsData?.length || 0, "events");
        
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
        const formattedEvents = eventsData.map((event: any) => {
          console.log("Event mapping - original event:", JSON.stringify(event, null, 2));
          let imageUrl = event.imageUrl || event.image || event.EventImage || null;
          
          // Ensure the image URL is absolute and not relative
          if (imageUrl && typeof imageUrl === 'string' && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
            // If it's a relative URL, prepend the correct base URL
            const cleanImageUrl = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
            imageUrl = `https://www.outix.co/uploads/images/events/${cleanImageUrl}`;
          }
          
          console.log("Event mapping - final imageUrl:", imageUrl);
          
          return {
          id: String(event.id || event.eventId || event.EventId || event._id || '0'),
          title: String(event.title || event.name || event.EventName || event.event_name || 'Unnamed Event'),
          date: formatDateFromAPI(String(event.date || event.showStart || event.event_date || 'TBD')),
          time: formatTimeFromAPI(String(event.time || event.showStart || event.event_time || 'TBD')),
          location: String(event.location || event.venue || event.VenueName || 'TBD'),
            imageUrl: imageUrl
          };
        });
        setEvents(formattedEvents);
        
        // Group events by title
        const groupedEventsMap = new Map<string, GroupedEvent>();
        
        formattedEvents.forEach(event => {
          // Normalize title by removing date suffixes and ordinals
          let normalizedTitle = event.title.toLowerCase().trim()
            .replace(/\s+(27th|28th|29th|30th|31st|\d+th|\d+st|\d+nd|\d+rd).*$/i, '')
            .replace(/\s+\d{1,2}(st|nd|rd|th).*$/i, '')
            .replace(/\s+\d{4}.*$/i, '') // Remove year suffixes
            .replace(/\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec).*$/i, ''); // Remove month suffixes
          
          console.log(`Original title: "${event.title}" -> Normalized: "${normalizedTitle}"`);
          
          if (groupedEventsMap.has(normalizedTitle)) {
            // Add this date to existing group
            const existingGroup = groupedEventsMap.get(normalizedTitle)!;
            existingGroup.dates.push({
              id: event.id,
              date: event.date,
              time: event.time
            });
            // Sort dates chronologically
            existingGroup.dates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          } else {
            // Create new group - use the shortest/cleanest title
            const cleanTitle = event.title.replace(/\s+(27th|28th|29th|30th|31st|\d+th|\d+st|\d+nd|\d+rd).*$/i, '').trim();
            groupedEventsMap.set(normalizedTitle, {
              title: cleanTitle || event.title, // Use cleaned title or fallback to original
              location: event.location,
              imageUrl: event.imageUrl,
              dates: [{
                id: event.id,
                date: event.date,
                time: event.time
              }]
            });
          }
        });
        
        setGroupedEvents(Array.from(groupedEventsMap.values()));
      } else {
        // If for some reason eventsData is empty, use mock data
        console.log("No events found in response, using default data");
        setEvents(mockEvents);
        
        // Group mock events as well
        const groupedMockEventsMap = new Map<string, GroupedEvent>();
        mockEvents.forEach(event => {
          // Normalize title by removing date suffixes and ordinals
          let normalizedTitle = event.title.toLowerCase().trim()
            .replace(/\s+(27th|28th|29th|30th|31st|\d+th|\d+st|\d+nd|\d+rd).*$/i, '')
            .replace(/\s+\d{1,2}(st|nd|rd|th).*$/i, '')
            .replace(/\s+\d{4}.*$/i, '')
            .replace(/\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec).*$/i, '');
          
          if (groupedMockEventsMap.has(normalizedTitle)) {
            const existingGroup = groupedMockEventsMap.get(normalizedTitle)!;
            existingGroup.dates.push({
              id: event.id,
              date: event.date,
              time: event.time
            });
            existingGroup.dates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          } else {
            const cleanTitle = event.title.replace(/\s+(27th|28th|29th|30th|31st|\d+th|\d+st|\d+nd|\d+rd).*$/i, '').trim();
            groupedMockEventsMap.set(normalizedTitle, {
              title: cleanTitle || event.title,
              location: event.location,
              imageUrl: event.imageUrl || undefined,
              dates: [{
                id: event.id,
                date: event.date,
                time: event.time
              }]
            });
          }
        });
        
        setGroupedEvents(Array.from(groupedMockEventsMap.values()));
        
        if (!error) {
          setError("No events found. Showing sample data.");
        }
      }
    } catch (err: any) {
      console.error("Unexpected error:", err);
      setEvents(mockEvents);
      
      // Group mock events in error case as well
      const groupedMockEventsMap = new Map<string, GroupedEvent>();
      mockEvents.forEach(event => {
        // Normalize title by removing date suffixes and ordinals
        let normalizedTitle = event.title.toLowerCase().trim()
          .replace(/\s+(27th|28th|29th|30th|31st|\d+th|\d+st|\d+nd|\d+rd).*$/i, '')
          .replace(/\s+\d{1,2}(st|nd|rd|th).*$/i, '')
          .replace(/\s+\d{4}.*$/i, '')
          .replace(/\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec).*$/i, '');
        
        if (groupedMockEventsMap.has(normalizedTitle)) {
          const existingGroup = groupedMockEventsMap.get(normalizedTitle)!;
          existingGroup.dates.push({
            id: event.id,
            date: event.date,
            time: event.time
          });
          existingGroup.dates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        } else {
          const cleanTitle = event.title.replace(/\s+(27th|28th|29th|30th|31st|\d+th|\d+st|\d+nd|\d+rd).*$/i, '').trim();
          groupedMockEventsMap.set(normalizedTitle, {
            title: cleanTitle || event.title,
            location: event.location,
            imageUrl: event.imageUrl || undefined,
            dates: [{
              id: event.id,
              date: event.date,
              time: event.time
            }]
          });
        }
      });
      
      setGroupedEvents(Array.from(groupedMockEventsMap.values()));
      setError("An unexpected error occurred. Showing sample data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Always clear cache and fetch fresh data on mount
    // This ensures we get real data after login, not cached/stale data
    console.log("Index screen mounted, fetching events...");
    fetchEvents();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents(true);
  };

  // Helper functions to format date and time separately from API values
  const formatDateFromAPI = (dateString: string): string => formatAppDate(dateString);

  const formatTimeFromAPI = (timeString: string): string => formatAppTime(timeString);

  const renderGroupedEventItem = ({ item }: { item: GroupedEvent }) => (
    <GroupedEventItem 
      item={item}
      colors={colors}
      onPress={() => {
        if (item.dates.length === 1) {
          // Single date - navigate directly
          const eventDate = item.dates[0];
          setSelectedEventId(eventDate.id);
          setSelectedEventName(item.title);
          router.push(`/(tabs)/${eventDate.id}`);
        } else {
          // Multiple dates - show selection modal
          setSelectedEventForDates(item);
          setShowDateModal(true);
        }
      }}
    />
  );
  
  const handleDateSelection = (selectedDate: { id: string; date: string; time: string }) => {
    setSelectedEventId(selectedDate.id);
    setSelectedEventName(selectedEventForDates?.title || 'Event');
    setShowDateModal(false);
    setSelectedEventForDates(null);
    router.push(`/(tabs)/${selectedDate.id}`);
  };

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
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
            data={groupedEvents}
            renderItem={renderGroupedEventItem}
            keyExtractor={(item) => item.title}
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
                <CalendarX size={60} color={colors.text} opacity={0.5} />
                <Text style={[styles.emptyText, { color: colors.text }]}>No events found</Text>
                <Text style={[styles.emptySubText, { color: colors.text, opacity: 0.7 }]}> 
                  Pull to refresh or check your internet connection
                </Text>
              </View>
            )}
          />
        </>
        )}
      </View>
      
      {/* Date Selection Modal */}
      <Modal
        visible={showDateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowDateModal(false);
          setSelectedEventForDates(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedEventForDates?.title}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.text }]}>
                Select a date to attend
              </Text>
            </View>
            
            <ScrollView style={styles.datesList}>
              {selectedEventForDates?.dates.map((dateOption, index) => (
                <TouchableOpacity
                  key={dateOption.id}
                  style={[
                    styles.dateOption,
                    { 
                      backgroundColor: colors.card,
                      borderColor: colors.border 
                    }
                  ]}
                  onPress={() => handleDateSelection(dateOption)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dateInfo}>
                    <View style={styles.dateRow}>
                      <Calendar size={16} color={colors.primary} />
                      <Text style={[styles.dateText, { color: colors.text }]}>
                        {dateOption.date}
                      </Text>
                    </View>
                    <View style={styles.dateRow}>
                      <Clock size={16} color={colors.primary} />
                      <Text style={[styles.timeText, { color: colors.text }]}>
                        {dateOption.time}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.card }]}
              onPress={() => {
                setShowDateModal(false);
                setSelectedEventForDates(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCloseText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    marginTop: 16,
  },
  listContainer: {
    paddingBottom: 120, // Space for navigation bar + extra padding
  },
  eventCard: {
    borderRadius: 16,
    marginBottom: 16,
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
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  detailText: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 16,
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
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
  // New styles for grouped events
  multipleDatesIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  multipleDatesText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '50%',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  datesList: {
    flex: 1,
    padding: 16,
  },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  dateInfo: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  timeText: {
    fontSize: 14,
    marginLeft: 8,
  },
  modalCloseButton: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventAction: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
}); 