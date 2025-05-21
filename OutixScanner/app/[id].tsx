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
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getGuestList, checkInGuest } from '../services/api';
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
  const { colors } = useTheme();
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
        // Start with mock event data as a base
        const mockEvent = mockEvents[eventId];
        
        if (!mockEvent) {
          setError("Event not found");
          setLoading(false);
          return;
        }
        
        // Initialize with mock data
        setEvent(mockEvent);
        
        try {
          // Try to get guest list from API
          const guestListData = await getGuestList(eventId);
          
          if (guestListData && Array.isArray(guestListData)) {
            // Map API guest data to our format
            const attendees = guestListData.map(guest => ({
              id: guest.id || guest.guestId || String(Math.random()),
              name: guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim(),
              email: guest.email || 'N/A',
              ticketType: guest.ticketType || guest.ticket_type || 'General',
              checkedIn: guest.checkedIn || guest.checked_in || false,
              checkInTime: guest.checkInTime || guest.check_in_time || undefined
            }));
            
            // Update event with real guest list data
            setEvent(prev => {
              if (!prev) return mockEvent;
              return {
                ...prev,
                attendees: attendees
              };
            });
          }
        } catch (err) {
          console.error("Failed to fetch guest list:", err);
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
      // Try to parse QR code data
      const scannedData = JSON.parse(data);
      const guestId = scannedData.id || scannedData.guestId || scannedData.attendeeId;
      
      if (!guestId) {
        Alert.alert('Invalid QR Code', 'Could not find attendee information in the QR code.');
        return;
      }
      
      // Find attendee by ID
      if (event && event.attendees) {
        const attendeeIndex = event.attendees.findIndex(a => a.id === guestId);
        
        if (attendeeIndex >= 0) {
          // Create timestamp for check-in
          const now = new Date();
          const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          try {
            // Call API to check in the guest
            await checkInGuest(eventId, guestId);
            
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
            Alert.alert(
              'Check-in Error',
              'The check-in was recorded locally but could not be synchronized with the server.'
            );
            
            // Still update locally even if the API fails
            const updatedAttendees = [...event.attendees];
            updatedAttendees[attendeeIndex] = {
              ...updatedAttendees[attendeeIndex],
              checkedIn: true,
              checkInTime: timeString
            };
            
            setEvent(prev => {
              if (!prev) return null;
              return {
                ...prev,
                attendees: updatedAttendees
              };
            });
          }
        } else {
          Alert.alert('Attendee Not Found', 'This ticket is not valid for this event.');
        }
      }
    } catch (err) {
      console.error('QR scan error:', err);
      Alert.alert(
        'Invalid QR Code',
        'The QR code scanned is not valid for attendee check-in.'
      );
    }
  };

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

  // Calculate attendance stats
  const checkedInCount = event.attendees.filter(a => a.checkedIn).length;
  const attendancePercentage = Math.round((checkedInCount / event.attendees.length) * 100) || 0;

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tabItem,
            activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab(tab)}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === tab ? colors.primary : colors.secondary }
            ]}
          >
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Overview':
        return (
          <View style={styles.tabContent}>
            <View style={[styles.eventCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Event Details</Text>
              <View style={styles.infoRow}>
                <FontAwesome5 name="calendar" size={16} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.text }]}>{event.date}</Text>
              </View>
              <View style={styles.infoRow}>
                <FontAwesome5 name="clock" size={16} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.text }]}>{event.time}</Text>
              </View>
              <View style={styles.infoRow}>
                <FontAwesome5 name="map-marker-alt" size={16} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.text }]}>{event.location}</Text>
              </View>
              <Text style={[styles.description, { color: colors.text }]}>{event.description}</Text>
            </View>

            <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Event Stats</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.primary }]}>{event.ticketsSold}</Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Tickets Sold</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.primary }]}>${event.revenue}</Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Revenue</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.primary }]}>{attendancePercentage}%</Text>
                  <Text style={[styles.statLabel, { color: colors.secondary }]}>Attendance</Text>
                </View>
              </View>
            </View>
          </View>
        );

      case 'Analytics':
        return (
          <View style={styles.tabContent}>
            <View style={[styles.eventCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Event Analytics</Text>
              
              {/* Ticket sales summary */}
              <View style={styles.analyticsSection}>
                <Text style={[styles.subSectionTitle, { color: colors.text }]}>Ticket Sales</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: colors.primary }]}>{event.ticketsSold}</Text>
                    <Text style={[styles.statLabel, { color: colors.secondary }]}>Sold</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: colors.primary }]}>{event.totalTickets - event.ticketsSold}</Text>
                    <Text style={[styles.statLabel, { color: colors.secondary }]}>Available</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: colors.primary }]}>
                      {event.totalTickets > 0 ? Math.round((event.ticketsSold / event.totalTickets) * 100) : 0}%
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.secondary }]}>Capacity</Text>
                  </View>
                </View>
              </View>
              
              {/* Sales progress bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressLabelContainer}>
                  <Text style={[styles.progressLabel, { color: colors.text }]}>Sales Progress</Text>
                  <Text style={[styles.progressValue, { color: colors.primary }]}>
                    {event.ticketsSold}/{event.totalTickets}
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        backgroundColor: colors.primary,
                        width: `${(event.ticketsSold / event.totalTickets) * 100}%` 
                      }
                    ]} 
                  />
                </View>
              </View>
              
              {/* Ticket breakdown by type */}
              <View style={styles.analyticsSection}>
                <Text style={[styles.subSectionTitle, { color: colors.text }]}>Ticket Breakdown</Text>
                {event.tickets.map((ticket, index) => (
                  <View key={ticket.id} style={styles.ticketBreakdownItem}>
                    <View style={styles.ticketBreakdownHeader}>
                      <Text style={[styles.ticketTypeName, { color: colors.text }]}>{ticket.type}</Text>
                      <Text style={[styles.ticketTypeCount, { color: colors.primary }]}>
                        {ticket.sold}/{ticket.sold + ticket.available}
                      </Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            backgroundColor: getTicketColor(index),
                            width: `${(ticket.sold / (ticket.sold + ticket.available)) * 100}%` 
                          }
                        ]} 
                      />
                    </View>
                  </View>
                ))}
              </View>
              
              {/* Revenue breakdown */}
              <View style={styles.analyticsSection}>
                <Text style={[styles.subSectionTitle, { color: colors.text }]}>Revenue</Text>
                <View style={styles.revenueContainer}>
                  <Text style={[styles.revenueAmount, { color: colors.primary }]}>${event.revenue}</Text>
                  <Text style={[styles.revenueLabel, { color: colors.secondary }]}>Total Revenue</Text>
                </View>
                
                <Text style={[styles.revenueBreakdownTitle, { color: colors.text }]}>Revenue by Ticket Type</Text>
                {event.tickets.map((ticket, index) => (
                  <View key={ticket.id} style={styles.revenueBreakdownItem}>
                    <View style={styles.ticketTypeInfo}>
                      <View style={[styles.colorDot, { backgroundColor: getTicketColor(index) }]} />
                      <Text style={[styles.ticketTypeName, { color: colors.text }]}>{ticket.type}</Text>
                    </View>
                    <Text style={[styles.revenueItemAmount, { color: colors.primary }]}>
                      ${ticket.price * ticket.sold}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        );

      case 'Tickets':
        return (
          <View style={styles.tabContent}>
            <View style={[styles.eventCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Ticket Sales</Text>
              <FlatList
                data={event.tickets}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={[styles.ticketItem, { borderBottomColor: colors.border }]}>
                    <View style={styles.ticketInfo}>
                      <Text style={[styles.ticketType, { color: colors.text }]}>{item.type}</Text>
                      <Text style={[styles.ticketPrice, { color: colors.secondary }]}>${item.price}</Text>
                    </View>
                    <View style={styles.ticketStats}>
                      <Text style={[styles.ticketSold, { color: colors.primary }]}>{item.sold} sold</Text>
                      <Text style={[styles.ticketAvailable, { color: colors.secondary }]}>{item.available} available</Text>
                    </View>
                  </View>
                )}
                ListFooterComponent={() => (
                  <View style={styles.totalContainer}>
                    <Text style={[styles.totalLabel, { color: colors.text }]}>Total Sold:</Text>
                    <Text style={[styles.totalValue, { color: colors.primary }]}>{event.ticketsSold} tickets</Text>
                  </View>
                )}
              />
            </View>
          </View>
        );

      case 'Attendance':
        return (
          <View style={styles.tabContent}>
            <View style={[styles.eventCard, { backgroundColor: colors.card }]}>
              <View style={styles.attendanceHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Attendance Tracking</Text>
                <TouchableOpacity 
                  style={[styles.scanButton, { backgroundColor: colors.primary }]}
                  onPress={handleOpenScanner}
                >
                  <FontAwesome5 name="qrcode" size={16} color="#FFFFFF" style={styles.scanButtonIcon} />
                  <Text style={styles.scanButtonText}>Scan QR</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.attendanceStats}>
                <View style={styles.attendanceGraph}>
                  <View
                    style={[
                      styles.attendanceBar,
                      { 
                        backgroundColor: colors.primary,
                        width: `${attendancePercentage}%`
                      }
                    ]}
                  />
                </View>
                <Text style={[styles.attendanceText, { color: colors.text }]}>
                  {checkedInCount} of {event.attendees.length} checked in ({attendancePercentage}%)
                </Text>
              </View>
              
              <View style={styles.checkInsContainer}>
                <Text style={[styles.subsectionTitle, { color: colors.text }]}>Attendee List</Text>
                {event.attendees.map(attendee => (
                  <View key={attendee.id} style={[styles.checkInItem, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.attendeeName, { color: colors.text }]}>{attendee.name}</Text>
                    <View style={styles.checkInInfo}>
                      <Text style={[styles.checkInType, { color: colors.secondary }]}>{attendee.ticketType}</Text>
                      <Text 
                        style={[
                          styles.checkInStatus, 
                          { color: attendee.checkedIn ? '#4CAF50' : colors.secondary }
                        ]}
                      >
                        {attendee.checkedIn 
                          ? `Checked in at ${attendee.checkInTime}` 
                          : 'Not checked in'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: event?.title || "Event Details",
          headerShown: true,
        }}
      />
      
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
          <View style={styles.eventMeta}>
            <View style={styles.metaItem}>
              <FontAwesome5 name="calendar" size={14} color={colors.secondary} />
              <Text style={[styles.metaText, { color: colors.secondary }]}>{event.date}</Text>
            </View>
            <View style={styles.metaItem}>
              <FontAwesome5 name="clock" size={14} color={colors.secondary} />
              <Text style={[styles.metaText, { color: colors.secondary }]}>{event.time}</Text>
            </View>
          </View>
        </View>
        
        {renderTabBar()}
        {renderTabContent()}
      </ScrollView>
      
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={handleCloseScanner}
        statusBarTranslucent
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
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    marginLeft: 6,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontWeight: '500',
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  eventCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 10,
  },
  description: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 20,
  },
  statsContainer: {
    padding: 16,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  ticketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketType: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  ticketPrice: {
    fontSize: 14,
  },
  ticketStats: {
    alignItems: 'flex-end',
  },
  ticketSold: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  ticketAvailable: {
    fontSize: 14,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  attendanceStats: {
    marginBottom: 24,
  },
  attendanceGraph: {
    height: 20,
    backgroundColor: '#EEEEEE',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  attendanceBar: {
    height: '100%',
  },
  attendanceText: {
    fontSize: 14,
    textAlign: 'center',
  },
  checkInsContainer: {
    marginTop: 8,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  checkInItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  checkInInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  checkInType: {
    fontSize: 14,
  },
  checkInStatus: {
    fontSize: 14,
  },
  analyticsSection: {
    marginTop: 24,
    marginBottom: 8,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  ticketBreakdownItem: {
    marginBottom: 16,
  },
  ticketBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ticketTypeName: {
    fontSize: 16,
    fontWeight: '500',
  },
  ticketTypeCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  revenueContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  revenueAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  revenueLabel: {
    fontSize: 16,
  },
  revenueBreakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  revenueBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  ticketTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  revenueItemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
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
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  scanButtonIcon: {
    marginRight: 6,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
}); 