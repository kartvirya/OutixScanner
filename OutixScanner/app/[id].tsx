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
              
              <View style={styles.detailRow}>
                <Calendar size={16} color={colors.primary} style={styles.detailIcon} />
                <View>
                  <Text style={[styles.detailLabel, { color: colors.secondary }]}>Date</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{event?.date}</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <Clock size={16} color={colors.primary} style={styles.detailIcon} />
                <View>
                  <Text style={[styles.detailLabel, { color: colors.secondary }]}>Time</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{event?.time}</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <MapPin size={16} color={colors.primary} style={styles.detailIcon} />
                <View>
                  <Text style={[styles.detailLabel, { color: colors.secondary }]}>Location</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{event?.location}</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              
              <Text style={[styles.subSectionTitle, { color: colors.text }]}>Description</Text>
              <Text style={[styles.description, { color: colors.secondary }]}>
                {event?.description || 'No description available.'}
              </Text>
            </View>
            
            <View style={[styles.actionsCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
              
              <View style={styles.actionsGrid}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={handleOpenScanner}
                >
                  <QrCode size={24} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Scan Ticket</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]}>
                  <Users size={24} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>View Guests</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]}>
                  <BarChart size={24} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Analytics</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]}>
                  <Settings size={24} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Settings</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
        
      case 'Analytics':
        return (
          <View style={styles.tabContent}>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Tickets Overview</Text>
              
              <View style={styles.statRow}>
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
              
              <View style={styles.attendanceContainer}>
                <View style={styles.attendanceItem}>
                  <View style={[styles.attendanceCircle, { borderColor: colors.primary }]}>
                    <Text style={[styles.attendancePercentage, { color: colors.primary }]}>
                      {event?.attendees ? 
                        Math.round((event.attendees.filter(a => a.checkedIn).length / event.attendees.length) * 100) : 0}%
                    </Text>
                  </View>
                  <Text style={[styles.attendanceLabel, { color: colors.secondary }]}>Check-in Rate</Text>
                </View>
                
                <View style={styles.attendanceStats}>
                  <View style={styles.attendanceStat}>
                    <UserCheck size={16} color={colors.primary} />
                    <Text style={[styles.attendanceValue, { color: colors.text }]}>
                      {event?.attendees ? event.attendees.filter(a => a.checkedIn).length : 0}
                    </Text>
                    <Text style={[styles.attendanceStatLabel, { color: colors.secondary }]}>Checked In</Text>
                  </View>
                  
                  <View style={styles.attendanceStat}>
                    <User size={16} color={colors.primary} />
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
                  renderItem={({ item, index }) => (
                    <View style={[styles.ticketItem, { backgroundColor: getTicketColor(index) }]}>
                      <View style={styles.ticketHeader}>
                        <Text style={styles.ticketType}>{item.type}</Text>
                        <Text style={styles.ticketPrice}>${item.price}</Text>
                      </View>
                      <View style={styles.ticketStats}>
                        <View style={styles.ticketStatItem}>
                          <Text style={styles.ticketStatValue}>{item.sold}</Text>
                          <Text style={styles.ticketStatLabel}>Sold</Text>
                        </View>
                        <View style={styles.ticketStatItem}>
                          <Text style={styles.ticketStatValue}>{item.available}</Text>
                          <Text style={styles.ticketStatLabel}>Available</Text>
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
        
      case 'Attendance':
        return (
          <View style={styles.tabContent}>
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Guest List</Text>
                <TouchableOpacity 
                  style={[styles.scanButton, { backgroundColor: colors.primary }]}
                  onPress={handleOpenScanner}
                >
                  <QrCode size={16} color="#FFFFFF" />
                  <Text style={styles.scanButtonText}>Scan</Text>
                </TouchableOpacity>
              </View>
              
              {event?.attendees && event.attendees.length > 0 ? (
                <FlatList
                  data={event.attendees}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={[styles.attendeeItem, { backgroundColor: colors.background }]}>
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
                  style={styles.attendeeList}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              ) : (
                <Text style={[styles.emptyText, { color: colors.secondary }]}>No guests registered</Text>
              )}
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
              <Calendar size={14} color={colors.secondary} />
              <Text style={[styles.metaText, { color: colors.secondary }]}>{event.date}</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={14} color={colors.secondary} />
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
  tab: {
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
  infoCard: {
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 10,
  },
  detailLabel: {
    fontSize: 16,
  },
  detailValue: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  description: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 20,
  },
  actionsCard: {
    padding: 16,
    borderRadius: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
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
    marginBottom: 12,
  },
  attendanceCircle: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendancePercentage: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  attendanceLabel: {
    fontSize: 14,
    marginLeft: 12,
  },
  attendanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  attendanceStat: {
    alignItems: 'center',
  },
  attendanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
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
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    marginLeft: 4,
    fontWeight: '600',
  },
  ticketItem: {
    width: 160,
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  ticketHeader: {
    marginBottom: 12,
  },
  ticketType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  ticketPrice: {
    fontSize: 14,
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    marginBottom: 4,
  },
  ticketStatLabel: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  ticketList: {
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    padding: 20,
  },
  attendeeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  attendeeDetails: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  attendeeEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  attendeeTypeRow: {
    flexDirection: 'row',
  },
  attendeeTicketType: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 12,
  },
  attendeeStatus: {
    justifyContent: 'center',
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  checkedInText: {
    fontSize: 14,
    marginLeft: 6,
  },
  checkInTime: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
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
}); 