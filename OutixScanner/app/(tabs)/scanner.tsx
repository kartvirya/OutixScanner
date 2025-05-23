import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  SafeAreaView,
  Alert,
  Modal,
  Dimensions,
  Animated,
  Platform,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { Search, QrCode, List, UserPlus, CheckCircle, Calendar, Clock, MapPin, User, Check, Lock } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import QRScanner from '../../components/QRScanner';
import { router } from 'expo-router';
import axios from 'axios';

// Define types
interface Attendee {
  id: string;
  name: string;
  ticketNumber: string;
  email: string;
  phone: string;
  ticketType: string;
  scanned: boolean;
  scanTime?: string;
  status: string;
  wristbandNumber?: string;
  waiverSigned: boolean;
  isGroup?: boolean;
  groupSize?: number;
}

interface ScanLog {
  id: string;
  attendeeId: string;
  attendeeName: string;
  ticketNumber: string;
  ticketType: string;
  scanType: string;
  scanTime: string;
  exitTime: string | null;
  status: string;
  scannerOperator: string;
  location: string;
  notes: string;
  denialReason?: string;
}

interface DenialReason {
  id: string;
  reason: string;
  color: string;
  requiresOverride: boolean;
}

// Mock data for attendees
const mockAttendees: Attendee[] = [
  { id: '1', name: 'John Smith', ticketNumber: 'T001', email: 'john@example.com', phone: '555-1234', ticketType: 'VIP', scanned: true, scanTime: '10:30 AM', status: 'Approved', wristbandNumber: 'A1234', waiverSigned: true },
  { id: '2', name: 'Sarah Johnson', ticketNumber: 'T002', email: 'sarah@example.com', phone: '555-2345', ticketType: 'General', scanned: false, status: 'Not Scanned', waiverSigned: false },
  { id: '3', name: 'Michael Brown', ticketNumber: 'T003', email: 'michael@example.com', phone: '555-3456', ticketType: 'VIP', scanned: true, scanTime: '11:15 AM', status: 'Approved', wristbandNumber: 'A1235', waiverSigned: true },
  { id: '4', name: 'Emily Davis', ticketNumber: 'T004', email: 'emily@example.com', phone: '555-4567', ticketType: 'General', scanned: false, status: 'Not Scanned', waiverSigned: false },
  { id: '5', name: 'David Wilson', ticketNumber: 'T005', email: 'david@example.com', phone: '555-5678', ticketType: 'Early Bird', scanned: true, scanTime: '09:45 AM', status: 'Approved', wristbandNumber: 'A1236', waiverSigned: true },
  { id: '6', name: 'Family Package', ticketNumber: 'G001', email: 'family@example.com', phone: '555-9876', ticketType: 'Group', scanned: false, status: 'Not Scanned', waiverSigned: true, isGroup: true, groupSize: 4 },
];

// Mock scan logs data with more detailed information
const mockScanLogs = [
  { 
    id: 'log1', 
    attendeeId: '1', 
    attendeeName: 'John Smith',
    ticketNumber: 'T001',
    ticketType: 'VIP',
    scanType: 'Entry',
    scanTime: '2023-06-15 10:30 AM',
    exitTime: '2023-06-15 05:45 PM', 
    status: 'Approved',
    scannerOperator: 'Mike',
    location: 'Main Gate',
    notes: 'Checked ID - all good'
  },
  { 
    id: 'log2', 
    attendeeId: '3', 
    attendeeName: 'Michael Brown',
    ticketNumber: 'T003',
    ticketType: 'VIP',
    scanType: 'Entry',
    scanTime: '2023-06-15 11:15 AM', 
    exitTime: null,
    status: 'Approved',
    scannerOperator: 'Lisa',
    location: 'VIP Entrance',
    notes: ''
  },
  { 
    id: 'log3', 
    attendeeId: '5', 
    attendeeName: 'David Wilson',
    ticketNumber: 'T005',
    ticketType: 'Early Bird',
    scanType: 'Entry',
    scanTime: '2023-06-15 09:45 AM', 
    exitTime: '2023-06-15 03:30 PM',
    status: 'Approved',
    scannerOperator: 'Mike',
    location: 'East Gate',
    notes: ''
  },
  { 
    id: 'log4', 
    attendeeId: null, 
    attendeeName: 'Unknown',
    ticketNumber: 'T999',
    ticketType: 'Unknown',
    scanType: 'Entry',
    scanTime: '2023-06-15 12:20 PM', 
    exitTime: null,
    status: 'Denied',
    scannerOperator: 'Lisa',
    location: 'Main Gate',
    denialReason: 'Invalid Ticket',
    notes: 'Attempted to use counterfeit ticket'
  },
  { 
    id: 'log5', 
    attendeeId: '2', 
    attendeeName: 'Sarah Johnson',
    ticketNumber: 'T002',
    ticketType: 'General',
    scanType: 'Entry',
    scanTime: '2023-06-15 02:10 PM', 
    exitTime: null,
    status: 'Denied',
    scannerOperator: 'John',
    location: 'West Gate',
    denialReason: 'Failed Age Verification',
    notes: 'Underage for VIP section'
  },
];

// Define error types/denial reasons
const denialReasons: DenialReason[] = [
  { id: 'invalid', reason: 'Invalid Ticket', color: '#FF3B30', requiresOverride: true },
  { id: 'already_scanned', reason: 'Already Scanned', color: '#FF9500', requiresOverride: true },
  { id: 'wrong_event', reason: 'Wrong Event/Date', color: '#FF3B30', requiresOverride: false },
  { id: 'id_mismatch', reason: 'ID Mismatch', color: '#FF3B30', requiresOverride: false },
  { id: 'age_restriction', reason: 'Age Restriction', color: '#FF3B30', requiresOverride: false },
  { id: 'counterfeit', reason: 'Suspected Counterfeit', color: '#FF3B30', requiresOverride: true },
];

export default function ScannerScreen() {
  const { colors } = useTheme();
  const [activeView, setActiveView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch attendees
  useEffect(() => {
    const fetchAttendees = async () => {
      setLoading(true);
      setError(null);
      try {
          setFilteredAttendees(mockAttendees);
      } catch (err) {
        console.error('Error fetching attendees:', err);
        setFilteredAttendees([]);
        setError('Failed to load attendees.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAttendees();
  }, []);

  // Search filter logic
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredAttendees(mockAttendees);
    } else {
      const filtered = mockAttendees.filter(attendee => 
        attendee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attendee.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attendee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attendee.phone.includes(searchQuery)
      );
      setFilteredAttendees(filtered);
    }
  }, [searchQuery]);

  const handleScanSuccess = (data: any) => {
    const attendee = mockAttendees.find(a => a.ticketNumber === data.ticketNumber);
    if (attendee) {
      if (attendee.scanned) {
        Alert.alert(
          'Already Scanned',
          `This ticket was already scanned at ${attendee.scanTime}`,
          [{ text: 'OK' }]
        );
      } else {
        attendee.scanned = true;
        attendee.scanTime = new Date().toLocaleTimeString();
        Alert.alert(
          'Success',
          'Ticket validated successfully!',
          [{ text: 'OK', onPress: () => setActiveView('dashboard') }]
        );
      }
      } else {
        Alert.alert(
        'Invalid Ticket',
        'This ticket number was not found in the system.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderDashboard = () => (
    <View style={styles.dashboardContainer}>
      <Text style={[styles.screenTitle, { color: colors.text }]}>Scanner Dashboard</Text>
      
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statLabel, { color: colors.text }]}>Total Scanned</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {mockAttendees.filter(a => a.scanned).length}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statLabel, { color: colors.text }]}>Remaining</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {mockAttendees.filter(a => !a.scanned).length}
          </Text>
        </View>
      </View>
      
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => setActiveView('scan')}
        >
        <QrCode color="#FFFFFF" size={24} />
        <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
          Scan QR Code
        </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
        style={[styles.actionButton, { backgroundColor: colors.card }]}
          onPress={() => setActiveView('search')}
        >
        <Search color={colors.text} size={24} />
        <Text style={[styles.actionButtonText, { color: colors.text }]}>
          Search Attendees
        </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
        style={[styles.actionButton, { backgroundColor: colors.card }]}
          onPress={() => setActiveView('log')}
        >
        <List color={colors.text} size={24} />
        <Text style={[styles.actionButtonText, { color: colors.text }]}>
          View Scan Log
        </Text>
        </TouchableOpacity>
    </View>
  );

  const renderScanner = () => {
    return (
      <QRScanner
        onScan={(data) => {
          try {
            const parsedData = JSON.parse(data);
            handleScanSuccess(parsedData);
          } catch (error) {
            Alert.alert(
              'Invalid QR Code',
              'The scanned QR code is not in the correct format.',
              [{ text: 'OK' }]
            );
          }
        }}
        onClose={() => setActiveView('dashboard')}
      />
    );
  };

  const renderSearchScreen = () => (
    <View style={styles.searchContainer}>
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Search color={colors.text} size={24} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name, ticket number, or email"
          placeholderTextColor={colors.text}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <FlatList
        data={filteredAttendees}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.attendeeCard, { backgroundColor: colors.card }]}>
            <View style={styles.attendeeInfo}>
              <Text style={[styles.attendeeName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.attendeeDetails, { color: colors.text }]}>
                Ticket: {item.ticketNumber}
              </Text>
              <Text style={[styles.attendeeDetails, { color: colors.text }]}>
                Status: {item.scanned ? 'Scanned' : 'Not Scanned'}
              </Text>
            </View>
            </View>
        )}
      />
    </View>
  );

  const renderDataLogScreen = () => (
      <View style={styles.logContainer}>
      <Text style={[styles.screenTitle, { color: colors.text }]}>Scan Log</Text>
        <FlatList
        data={mockScanLogs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
          <View style={[styles.attendeeCard, { backgroundColor: colors.card }]}>
            <View style={styles.attendeeInfo}>
              <Text style={[styles.attendeeName, { color: colors.text }]}>{item.attendeeName}</Text>
              <Text style={[styles.attendeeDetails, { color: colors.text }]}>
                Ticket: {item.ticketNumber}
                </Text>
              <Text style={[styles.attendeeDetails, { color: colors.text }]}>
                Time: {item.scanTime}
                </Text>
              <Text style={[styles.attendeeDetails, { color: colors.text }]}>
                Status: {item.status}
                  </Text>
              </View>
      </View>
        )}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Loading...</Text>
          </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'scan' && renderScanner()}
      {activeView === 'search' && renderSearchScreen()}
      {activeView === 'log' && renderDataLogScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dashboardContainer: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flex: 1,
    padding: 16,
  },
  logContainer: {
    flex: 1,
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  attendeeCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  attendeeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  attendeeDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
}); 