import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  QrCode, 
  Users, 
  BarChart, 
  Settings,
  Ticket, 
  Tags, 
  DollarSign,
  CheckCircle,
  UserCheck,
  User,
  Plus,
  ChevronRight
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { getGuestList, checkInGuest, getEvents, validateQRCode, scanQRCode, unscanQRCode } from '../services/api';
import QRScanner from '../components/QRScanner';

// Mock data types
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
  checkedIn: boolean;
  checkInTime?: string;
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

// Mock data
const mockEvents: { [key: string]: Event } = {
  '1': {
    id: '1',
    title: 'Team Meeting',
    date: '2023-10-15',
    time: '09:00 AM',
    location: 'Conference Room A',
    description: 'Monthly team meeting to discuss project progress and upcoming goals.',
    totalTickets: 50,
    ticketsSold: 32,
    revenue: 1600,
    tickets: [
      { id: 't1', type: 'General', price: 50, sold: 20, available: 10 },
      { id: 't2', type: 'VIP', price: 100, sold: 8, available: 2 },
      { id: 't3', type: 'Early Bird', price: 40, sold: 4, available: 6 },
    ],
    attendees: [
      { id: 'a1', name: 'John Smith', email: 'john@example.com', ticketType: 'General', checkedIn: true, checkInTime: '08:45 AM' },
      { id: 'a2', name: 'Sarah Johnson', email: 'sarah@example.com', ticketType: 'VIP', checkedIn: true, checkInTime: '08:30 AM' },
      { id: 'a3', name: 'Michael Brown', email: 'michael@example.com', ticketType: 'General', checkedIn: false },
      { id: 'a4', name: 'Emily Davis', email: 'emily@example.com', ticketType: 'General', checkedIn: true, checkInTime: '08:55 AM' },
      { id: 'a5', name: 'David Wilson', email: 'david@example.com', ticketType: 'Early Bird', checkedIn: false },
    ],
  },
  '2': {
    id: '2',
    title: 'Project Deadline',
    date: '2023-10-20',
    time: '05:00 PM',
    location: 'Office',
    description: 'Final review of project deliverables before submission to the client.',
    totalTickets: 25,
    ticketsSold: 15,
    revenue: 750,
    tickets: [
      { id: 't1', type: 'Team Member', price: 0, sold: 10, available: 5 },
      { id: 't2', type: 'Stakeholder', price: 150, sold: 5, available: 5 },
    ],
    attendees: [
      { id: 'a1', name: 'Alex Johnson', email: 'alex@example.com', ticketType: 'Team Member', checkedIn: false },
      { id: 'a2', name: 'Taylor Williams', email: 'taylor@example.com', ticketType: 'Stakeholder', checkedIn: false },
      { id: 'a3', name: 'Jamie Rodriguez', email: 'jamie@example.com', ticketType: 'Team Member', checkedIn: false },
    ],
  },
  '3': {
    id: '3',
    title: 'Client Presentation',
    date: '2023-10-25',
    time: '02:00 PM',
    location: 'Meeting Room B',
    description: 'Presentation of completed project to client stakeholders.',
    totalTickets: 30,
    ticketsSold: 22,
    revenue: 1100,
    tickets: [
      { id: 't1', type: 'Presenter', price: 0, sold: 5, available: 0 },
      { id: 't2', type: 'Client', price: 0, sold: 7, available: 3 },
      { id: 't3', type: 'Observer', price: 50, sold: 10, available: 5 },
    ],
    attendees: [
      { id: 'a1', name: 'Pat Smith', email: 'pat@example.com', ticketType: 'Presenter', checkedIn: false },
      { id: 'a2', name: 'Jordan Lee', email: 'jordan@example.com', ticketType: 'Client', checkedIn: false },
    ],
  },
  '4': {
    id: '4',
    title: 'Lunch with Colleagues',
    date: '2023-10-18',
    time: '12:30 PM',
    location: 'Cafe Downtown',
    description: 'Team lunch to celebrate project milestone achievement.',
    totalTickets: 15,
    ticketsSold: 12,
    revenue: 0,
    tickets: [
      { id: 't1', type: 'Team Member', price: 0, sold: 12, available: 3 },
    ],
    attendees: [
      { id: 'a1', name: 'Chris Morgan', email: 'chris@example.com', ticketType: 'Team Member', checkedIn: false },
      { id: 'a2', name: 'Leslie Harper', email: 'leslie@example.com', ticketType: 'Team Member', checkedIn: false },
    ],
  },
};

// Tab names
type TabName = 'Overview' | 'Analytics' | 'Tickets' | 'Attendance';
const tabs: TabName[] = ['Overview', 'Analytics', 'Tickets', 'Attendance'];

export default function EventDetail() {
  const { colors, isDarkMode } = useTheme();
  const { id } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id || '1';
  
  const [event, setEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    const fetchEventDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // First try to get the event from the API
        const eventsData = await getEvents();
        
        // Find the event with matching ID from the API response
        let apiEvent = null;
        if (Array.isArray(eventsData) && eventsData.length > 0) {
          apiEvent = eventsData.find(e => 
            e.id === eventId || 
            e.eventId === eventId || 
            e.EventId === eventId || 
            String(e._id) === eventId
          );
        }
        
        if (apiEvent) {
          // If found in API response, format it properly
          const formattedEvent: Event = {
            id: apiEvent.id || apiEvent.eventId || apiEvent.EventId || String(apiEvent._id || '0'),
            title: apiEvent.title || apiEvent.name || apiEvent.EventName || 'Unnamed Event',
            date: formatDateFromAPI(apiEvent.date || apiEvent.showStart || 'TBD'),
            time: formatTimeFromAPI(apiEvent.time || apiEvent.showStart || 'TBD'),
            location: apiEvent.location || apiEvent.venue || apiEvent.VenueName || 'TBD',
            description: apiEvent.description || apiEvent.desc || 'No description available.',
            // Set defaults for properties not in API
            totalTickets: apiEvent.capacity || apiEvent.totalTickets || 100,
            ticketsSold: apiEvent.attendees || apiEvent.ticketsSold || 0,
            revenue: apiEvent.revenue || 0,
            tickets: [],
            attendees: []
          };
          
          setEvent(formattedEvent);
        } else {
          // If not found in API, try mock data as fallback
          const mockEvent = mockEvents[eventId];
          
          if (!mockEvent) {
            setError("Event not found");
            setLoading(false);
            return;
          }
          
          // Use mock event data
          setEvent(mockEvent);
        }
        
        try {
          // Try to get guest list from API
          const guestListData = await getGuestList(eventId);
          
          if (guestListData && Array.isArray(guestListData) && guestListData.length > 0) {
            // Map API guest data to our format
            const attendees = guestListData.map(guest => ({
              id: guest.id || guest.guestId || String(Math.random()),
              name: guest.purchased_by || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest',
              email: guest.email || 'N/A',
              ticketType: guest.ticketType || guest.ticket_type || 'General',
              checkedIn: guest.checkedIn || guest.checked_in || false,
              checkInTime: guest.checkInTime || guest.check_in_time || undefined
            }));
            
            // Update event with real guest list data
            setEvent(prev => {
              if (!prev) return null;
              return {
                ...prev,
                attendees: attendees
              };
            });
          }
        } catch (err) {
          console.error("Failed to fetch guest list:", err);
          // Continue with existing attendee data or empty array
        }
      } catch (err) {
        console.error("Failed to load event details:", err);
        setError("Failed to load event details. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchEventDetails();
  }, [eventId]);

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

  const handleBack = () => {
    router.back();
  };

  const handleOpenScanner = () => {
    setShowScanner(true);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
  };

  const handleScanResult = async (data: string) => {
    // Close scanner
    setShowScanner(false);
    
    try {
      console.log('QR Code scanned:', data);
      
      // First, validate the QR code
      const validationResult = await validateQRCode(eventId, data);
      
      if (!validationResult) {
        Alert.alert('Validation Error', 'Failed to validate QR code. Please try again.');
        return;
      }
      
      if (validationResult.error) {
        Alert.alert('Invalid QR Code', validationResult.msg?.message || 'This QR code is not valid for this event.');
        return;
      }
      
      // QR code is valid, show validation details and ask if user wants to scan/admit
      const ticketInfo = validationResult.msg.info;
      
      Alert.alert(
        'Valid Ticket Found',
        `${ticketInfo.fullname}\n${ticketInfo.ticket_title}\nAvailable admits: ${ticketInfo.available}/${ticketInfo.admits}\nPrice: $${ticketInfo.price}`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Admit Guest',
            onPress: async () => {
              try {
                // Scan the QR code to admit the guest
                const scanResult = await scanQRCode(eventId, data);
                
                if (!scanResult) {
                  Alert.alert('Scan Error', 'Failed to scan QR code. Please try again.');
                  return;
                }
                
                if (scanResult.error) {
                  Alert.alert('Scan Error', scanResult.msg?.message || 'Failed to admit guest.');
                  return;
                }
                
                // Success - show confirmation
                Alert.alert(
                  'Guest Admitted Successfully',
                  `${scanResult.msg.info.fullname} has been admitted.\n\nDetails:\n${scanResult.msg.message}`
                );
                
                // Refresh guest list to show updated status
                try {
                  const updatedGuestList = await getGuestList(eventId);
                  if (updatedGuestList && event) {
                    const updatedAttendees = updatedGuestList.map(guest => ({
                      id: guest.id || guest.guestId || String(Math.random()),
                      name: guest.purchased_by || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest',
                      email: guest.email || 'N/A',
                      ticketType: guest.ticket_type || guest.ticketType || 'General',
                      checkedIn: guest.checkedIn || guest.checked_in || false,
                      checkInTime: guest.checkInTime || guest.checked_in_time || undefined
                    }));
                    
                    setEvent(prev => prev ? { ...prev, attendees: updatedAttendees } : null);
                  }
                } catch (refreshError) {
                  console.error('Error refreshing guest list:', refreshError);
                }
                
              } catch (error) {
                console.error('Scan error:', error);
                Alert.alert('Error', 'An unexpected error occurred during scanning.');
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('QR scan error:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred while processing the QR code.'
      );
    }
  };

  const handleCheckIn = async (attendeeId: string) => {
    if (!event) return;
    
    try {
      // Create timestamp for check-in
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Find attendee by ID
      const attendeeIndex = event.attendees.findIndex(a => a.id === attendeeId);
      if (attendeeIndex < 0) {
        Alert.alert('Error', 'Attendee not found');
        return;
      }
      
      // Call API to check in the guest
      await checkInGuest(eventId, attendeeId);
      
      // Update attendee check-in status locally
      const updatedAttendees = [...event.attendees];
      updatedAttendees[attendeeIndex] = {
        ...updatedAttendees[attendeeIndex],
        checkedIn: true,
        checkInTime: timeString
      };
      
      // Update event state with checked-in attendee
      setEvent(prev => {
        if (!prev) return null;
        return {
          ...prev,
          attendees: updatedAttendees
        };
      });
      
      Alert.alert(
        'Check-in Successful',
        `${updatedAttendees[attendeeIndex].name} has been checked in at ${timeString}.`
      );
    } catch (error) {
      console.error('API check-in error:', error);
      Alert.alert('Check-in Error', 'Failed to check in attendee. Please try again.');
    }
  };

  // Calculate attendance stats
  const checkedInCount = event?.attendees?.filter(a => a.checkedIn).length || 0;
  const attendancePercentage = event?.attendees?.length ? Math.round((checkedInCount / event.attendees.length) * 100) : 0;

  const renderTabBar = () => (
    <View style={[styles.tabBar, { 
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab,
            activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab(tab)}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === tab ? colors.primary : colors.secondary },
            ]}
          >
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Overview':
        return (
          <View style={styles.tabContent}>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Event Details</Text>
              
              <View style={{ padding: 16 }}>
                <View style={styles.detailRow}>
                  <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(255,149,0,0.2)' : 'rgba(255,149,0,0.1)' }]}>
                    <Calendar size={18} color="#FF9500" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.secondary }]}>Date</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{event?.date}</Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(0,122,255,0.2)' : 'rgba(0,122,255,0.1)' }]}>
                    <Clock size={18} color="#007AFF" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.secondary }]}>Time</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{event?.time}</Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(88,86,214,0.2)' : 'rgba(88,86,214,0.1)' }]}>
                    <MapPin size={18} color="#5856D6" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: colors.secondary }]}>Location</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{event?.location}</Text>
                  </View>
                </View>
              </View>
              
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              
              <View style={{ padding: 16 }}>
                <Text style={[styles.subSectionTitle, { color: colors.text }]}>Description</Text>
                <Text style={[styles.description, { color: colors.text }]}>
                  {event?.description || 'No description available.'}
                </Text>
              </View>
            </View>
            
            <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Ticket Stats</Text>
              
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(255,149,0,0.2)' : 'rgba(255,149,0,0.1)' }]}>
                    <Ticket size={20} color="#FF9500" />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>{event?.totalTickets || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Total</Text>
                </View>
                
                <View style={styles.statItem}>
                  <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(0,122,255,0.2)' : 'rgba(0,122,255,0.1)' }]}>
                    <Tags size={20} color="#007AFF" />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>{event?.ticketsSold || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Sold</Text>
                </View>
                
                <View style={styles.statItem}>
                  <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(52,199,89,0.2)' : 'rgba(52,199,89,0.1)' }]}>
                    <UserCheck size={20} color="#34C759" />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {event?.attendees ? event.attendees.filter(a => a.checkedIn).length : 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Checked In</Text>
                </View>
              </View>
            </View>
          </View>
        );
        
      case 'Analytics':
        return (
          <View style={styles.tabContent}>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Tickets Overview</Text>
              
              <View style={[styles.statRow, { padding: 16 }]}>
                <View style={styles.statItem}>
                  <Ticket size={24} color={colors.primary} />
                  <Text style={[styles.statValue, { color: colors.text }]}>{event?.totalTickets || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Total Tickets</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Tags size={24} color={colors.primary} />
                  <Text style={[styles.statValue, { color: colors.text }]}>{event?.ticketsSold || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Tickets Sold</Text>
                </View>
                
                <View style={styles.statItem}>
                  <DollarSign size={24} color={colors.primary} />
                  <Text style={[styles.statValue, { color: colors.text }]}>${event?.revenue || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Revenue</Text>
                </View>
              </View>
            </View>
            
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Attendance</Text>
              
              <View style={[styles.attendanceContainer, { padding: 16 }]}>
                <View style={styles.attendanceItem}>
                  <View style={[styles.attendanceCircle, { borderColor: colors.primary }]}>
                    <Text style={[styles.attendancePercentage, { color: colors.primary }]}>
                      {attendancePercentage}%
                    </Text>
                  </View>
                  <Text style={[styles.attendanceLabel, { color: colors.text }]}>Check-in Rate</Text>
                </View>
                
                <View style={styles.attendanceStats}>
                  <View style={styles.attendanceStat}>
                    <UserCheck size={18} color={colors.primary} />
                    <Text style={[styles.attendanceValue, { color: colors.text }]}>
                      {checkedInCount}
                    </Text>
                    <Text style={[styles.attendanceStatLabel, { color: colors.secondary }]}>Checked In</Text>
                  </View>
                  
                  <View style={styles.attendanceStat}>
                    <User size={18} color={colors.primary} />
                    <Text style={[styles.attendanceValue, { color: colors.text }]}>
                      {event?.attendees ? event.attendees.filter(a => !a.checkedIn).length : 0}
                    </Text>
                    <Text style={[styles.attendanceStatLabel, { color: colors.secondary }]}>Not Arrived</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        );
        
      case 'Tickets':
        return (
          <View style={styles.tabContent}>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Ticket Types</Text>
                <TouchableOpacity style={styles.addButton}>
                  <Plus size={16} color={colors.primary} />
                  <Text style={[styles.addButtonText, { color: colors.primary }]}>Add</Text>
                </TouchableOpacity>
              </View>
              
              {event?.tickets && event.tickets.length > 0 ? (
                <FlatList
                  data={event.tickets}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={[styles.ticketItem, { backgroundColor: colors.primary }]}>
                      <View style={styles.ticketHeader}>
                        <Text style={[styles.ticketType, { color: colors.card }]}>{item.type}</Text>
                        <Text style={[styles.ticketPrice, { color: colors.card }]}>${item.price}</Text>
                      </View>
                      <View style={styles.ticketStats}>
                        <View style={styles.ticketStatItem}>
                          <Text style={[styles.ticketStatValue, { color: colors.card }]}>{item.sold}</Text>
                          <Text style={[styles.ticketStatLabel, { color: colors.card }]}>Sold</Text>
                        </View>
                        <View style={styles.ticketStatItem}>
                          <Text style={[styles.ticketStatValue, { color: colors.card }]}>{item.available}</Text>
                          <Text style={[styles.ticketStatLabel, { color: colors.card }]}>Available</Text>
                        </View>
                      </View>
                    </View>
                  )}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.ticketList}
                />
              ) : (
                <Text style={[styles.emptyText, { color: colors.secondary }]}>No ticket types defined</Text>
              )}
            </View>
          </View>
        );
        
      default:
        return null;
    }
  };

  // Content for each tab is now rendered separately
  const renderEventHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.card }]}>
      <Text style={[styles.eventTitle, { color: colors.text }]}>{event!.title}</Text>
      <View style={styles.eventMeta}>
        <View style={styles.metaItem}>
          <Calendar size={14} color={colors.primary} />
          <Text style={[styles.metaText, { color: colors.text }]}>{event!.date}</Text>
        </View>
        <View style={styles.metaItem}>
          <Clock size={14} color={colors.primary} />
          <Text style={[styles.metaText, { color: colors.text }]}>{event!.time}</Text>
        </View>
        <View style={styles.metaItem}>
          <MapPin size={14} color={colors.primary} />
          <Text style={[styles.metaText, { color: colors.text, flex: 1 }]}>
            {event!.location}
          </Text>
        </View>
      </View>
      
      <View style={styles.headerButtons}>
        <TouchableOpacity 
          style={[styles.headerButton, { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('Attendance')}
        >
          <Users size={16} color="#FFFFFF" />
          <Text style={styles.headerButtonText}>Guest List</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.headerButton, { backgroundColor: colors.primary }]}
          onPress={handleOpenScanner}
        >
          <QrCode size={16} color="#FFFFFF" />
          <Text style={styles.headerButtonText}>Scan Ticket</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Event Details", headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading event details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Event Details", headerShown: true }} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Event not found</Text>
          <TouchableOpacity 
            onPress={handleBack} 
            style={[styles.backButton, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render the appropriate content based on the active tab
  const renderContent = () => {
    if (activeTab === 'Attendance') {
      // For Attendance tab, we return a FlatList directly to avoid nesting
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {renderEventHeader()}
          {renderTabBar()}
          
          <View style={[styles.infoCard, { backgroundColor: colors.card, flex: 1 }]}>
            <View style={[styles.cardHeader, { padding: 16, paddingBottom: 12 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Guest List</Text>
              <TouchableOpacity 
                style={[styles.scanButton, { backgroundColor: colors.primary }]}
                onPress={handleOpenScanner}
              >
                <QrCode size={16} color="#FFFFFF" />
                <Text style={styles.scanButtonText}>Scan Ticket</Text>
              </TouchableOpacity>
            </View>
            
            {event?.attendees && event.attendees.length > 0 ? (
              <FlatList
                data={event.attendees}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={[styles.attendeeItem, { backgroundColor: colors.card, marginHorizontal: 16 }]}>
                    <View style={styles.attendeeDetails}>
                      <Text style={[styles.attendeeName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.attendeeEmail, { color: colors.secondary }]}>{item.email}</Text>
                      <View style={styles.attendeeTypeRow}>
                        <Text style={[styles.attendeeTicketType, { backgroundColor: colors.primary, color: '#FFFFFF' }]}>{item.ticketType}</Text>
                      </View>
                    </View>
                    <View style={styles.attendeeStatus}>
                      {item.checkedIn ? (
                        <View style={[styles.checkedInBadge, { backgroundColor: 'rgba(46, 204, 113, 0.2)' }]}>
                          <CheckCircle size={14} color="#2ecc71" />
                          <Text style={[styles.checkedInText, { color: '#2ecc71' }]}>Checked In</Text>
                          {item.checkInTime && (
                            <Text style={styles.checkInTime}>{item.checkInTime}</Text>
                          )}
                        </View>
                      ) : (
                        <TouchableOpacity 
                          style={[styles.checkInButton, { backgroundColor: colors.primary }]}
                          onPress={() => handleCheckIn(item.id)}
                        >
                          <UserCheck size={14} color="#FFFFFF" />
                          <Text style={styles.checkInButtonText}>Check In</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
                style={[styles.attendeeList, { backgroundColor: colors.background }]}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            ) : (
              <View style={[styles.emptyGuestContainer, { padding: 30 }]}>
                <Users size={40} color={colors.secondary} opacity={0.5} />
                <Text style={[styles.emptyGuestText, { color: colors.text }]}>No guests found</Text>
                <Text style={[styles.emptyGuestSubtext, { color: colors.secondary }]}>
                  There are no registered guests for this event yet.
                </Text>
                <TouchableOpacity 
                  style={[styles.emptyGuestButton, { backgroundColor: colors.primary }]}
                  onPress={handleOpenScanner}
                >
                  <QrCode size={16} color="#FFFFFF" />
                  <Text style={styles.emptyGuestButtonText}>Scan Ticket</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      );
    }
    
    // For other tabs, we use ScrollView as they don't contain FlatLists
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderEventHeader()}
        {renderTabBar()}
        <ScrollView style={styles.scrollContainer}>
          {renderTabContent()}
        </ScrollView>
      </View>
    );
  };

  // Main render function
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: event?.title || "Event Details",
          headerShown: true,
        }}
      />
      
      {renderContent()}
      
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

// Helper function to generate colors for different ticket types
const getTicketColor = (index: number) => {
  const colors = ['#FF9500', '#4CAF50', '#2196F3', '#9C27B0', '#FF3B30'];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 16,
    marginBottom: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  eventMeta: {
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaText: {
    marginLeft: 8,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontWeight: '600',
    fontSize: 15,
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  infoCard: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  statsCard: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
  },
  attendanceContainer: {
    marginBottom: 24,
  },
  attendanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  attendanceCircle: {
    width: 60,
    height: 60,
    borderWidth: 3,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  attendancePercentage: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  attendanceLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  attendanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  attendanceStat: {
    alignItems: 'center',
    flex: 1,
  },
  attendanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  attendanceStatLabel: {
    fontSize: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  addButtonText: {
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 14,
  },
  ticketItem: {
    width: 160,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    marginBottom: 16,
  },
  ticketType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ticketPrice: {
    fontSize: 14,
  },
  ticketStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ticketStatItem: {
    alignItems: 'center',
  },
  ticketStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ticketStatLabel: {
    fontSize: 12,
  },
  ticketList: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200, 200, 200, 0.2)',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  emptyGuestContainer: {
    alignItems: 'center',
    padding: 30,
    paddingTop: 40,
  },
  emptyGuestText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyGuestSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '80%',
  },
  emptyGuestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyGuestButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 8,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  attendeeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  attendeeDetails: {
    flex: 1,
    paddingRight: 8,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  attendeeEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  attendeeTypeRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  attendeeTicketType: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '500',
  },
  attendeeStatus: {
    justifyContent: 'center',
    minWidth: 100,
    alignItems: 'flex-end',
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  checkedInText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  checkInTime: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
    textAlign: 'right',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  attendeeList: {
    marginTop: 8,
  },
}); 