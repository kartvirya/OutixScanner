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
import { Search, QrCode, List, UserPlus, CheckCircle, Calendar, Clock, MapPin, User, Check, Lock, UserCheck, LogIn, LogOut } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import QRScanner from '../../components/QRScanner';
import { router } from 'expo-router';
import axios from 'axios';
import { 
  validateQRCode, 
  scanQRCode, 
  unscanQRCode,
  QRValidationResponse,
  QRScanResponse,
  TicketInfo 
} from '../../services/api';

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
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState<'validate' | 'scanIn' | 'scanOut'>('validate');
  const [currentEventId, setCurrentEventId] = useState('77809'); // Default event ID

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
    // Handle successful scan
    console.log('Scan successful:', data);
    setActiveView('dashboard');
  };

  // New scanner functions for API integration
  const handleOpenScanner = (mode: 'validate' | 'scanIn' | 'scanOut') => {
    setScanMode(mode);
    setShowScanner(true);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
    setScanMode('validate');
  };

  const handleScanResult = async (data: string) => {
    // Close scanner
    setShowScanner(false);
    
    try {
      console.log('QR Code scanned:', data, 'Mode:', scanMode);
      
      // For scan out, we need different validation logic
      if (scanMode === 'scanOut') {
        // For scan out, try to validate first but allow already-checked-in tickets
        const validationResult = await validateQRCode(currentEventId, data);
        
        console.log('Scan Out - Validation Result:', JSON.stringify(validationResult, null, 2));
        
        if (!validationResult) {
          Alert.alert('Validation Error', 'Failed to validate QR code. Please try again.');
          return;
        }
        
        // For scan out, we accept both valid tickets and already-checked-in tickets (403)
        if (validationResult.error && validationResult.status !== 403) {
          // Only reject if it's not a 403 (already checked in) error
          let errorMessage = 'This QR code is not valid for this event.';
          if (typeof validationResult.msg === 'string') {
            errorMessage = validationResult.msg;
          } else if (validationResult.msg && typeof validationResult.msg === 'object' && 'message' in validationResult.msg) {
            errorMessage = validationResult.msg.message;
          }
          
          console.log('Scan Out - Rejecting ticket. Status:', validationResult.status, 'Error:', errorMessage);
          Alert.alert('Invalid QR Code', errorMessage);
          return;
        }
        
        console.log('Scan Out - Proceeding with scan out. Status:', validationResult.status);
        // Proceed with scan out (even for 403 status because that means ticket is checked in)
        await performScanOut(data, validationResult);
        return;
      }
      
      // For scan in and validate, use normal validation logic
      const validationResult = await validateQRCode(currentEventId, data);
      
      if (!validationResult) {
        Alert.alert('Validation Error', 'Failed to validate QR code. Please try again.');
        return;
      }
      
      if (validationResult.error) {
        let errorMessage = 'This QR code is not valid for this event.';
        if (typeof validationResult.msg === 'string') {
          errorMessage = validationResult.msg;
        } else if (validationResult.msg && typeof validationResult.msg === 'object' && 'message' in validationResult.msg) {
          errorMessage = validationResult.msg.message;
        }
        
        Alert.alert('Invalid QR Code', errorMessage);
        return;
      }
      
      // QR code is valid - handle scan in or validation
      if (scanMode === 'scanIn') {
        await performScanIn(data, validationResult);
      } else {
        // Default validation mode - show ticket info and options
        await showValidationResult(data, validationResult);
      }
      
    } catch (error) {
      console.error('QR scan error:', error);
      Alert.alert('Error', 'An unexpected error occurred while processing the QR code.');
    }
  };

  const performScanIn = async (scanCode: string, validationResult: QRValidationResponse) => {
    try {
      const scanResult = await scanQRCode(currentEventId, scanCode);
      
      if (!scanResult || scanResult.error) {
        let errorMessage = 'Failed to scan in guest';
        if (scanResult?.msg) {
          errorMessage = typeof scanResult.msg === 'string' ? scanResult.msg : scanResult.msg.message;
        }
        
        Alert.alert('Scan In Failed', errorMessage);
        return;
      }
      
      // Success - get ticket info for display
      let ticketInfo = null;
      if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
        ticketInfo = validationResult.msg.info;
      }
      
      let successMessage = 'Guest admitted successfully';
      if (typeof scanResult.msg === 'string') {
        successMessage = scanResult.msg;
      } else if (scanResult.msg && typeof scanResult.msg === 'object' && 'message' in scanResult.msg) {
        successMessage = scanResult.msg.message;
      }
      
        Alert.alert(
        'Scan In Successful ✅',
        `${ticketInfo?.fullname || 'Guest'} has been admitted.\n\n${successMessage}`,
        [{ text: 'OK', onPress: () => console.log('Scan in completed') }]
      );
      
    } catch (error) {
      console.error('Scan in error:', error);
      Alert.alert('Scan In Error', 'Failed to scan in guest. Please try again.');
    }
  };

  const performScanOut = async (scanCode: string, validationResult: QRValidationResponse) => {
    try {
      // Get ticket info from validation result (even if it's a 403 status)
      let ticketInfo = null;
      if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
        ticketInfo = validationResult.msg.info;
      }
      
      // Proceed with the unscan API call
      const unscanResult = await unscanQRCode(currentEventId, scanCode);
      
      if (!unscanResult || unscanResult.error) {
        let errorMessage = 'Failed to scan out guest';
        if (unscanResult?.msg) {
          errorMessage = typeof unscanResult.msg === 'string' ? unscanResult.msg : unscanResult.msg.message;
        }
        
        Alert.alert('Scan Out Failed', errorMessage);
        return;
      }
      
      // Success - get success message from unscan result
      let successMessage = 'Guest scanned out successfully';
      if (typeof unscanResult.msg === 'string') {
        successMessage = unscanResult.msg;
      } else if (unscanResult.msg && typeof unscanResult.msg === 'object' && 'message' in unscanResult.msg) {
        successMessage = unscanResult.msg.message;
      }
      
        Alert.alert(
        'Scan Out Successful ✅',
        `${ticketInfo?.fullname || 'Guest'} has been scanned out.\n\n${successMessage}`,
        [{ text: 'OK', onPress: () => console.log('Scan out completed') }]
      );
      
    } catch (error) {
      console.error('Scan out error:', error);
      Alert.alert('Scan Out Error', 'Failed to scan out guest. Please try again.');
    }
  };

  const showValidationResult = async (scanCode: string, validationResult: QRValidationResponse) => {
    let ticketInfo = null;
    if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
      ticketInfo = validationResult.msg.info;
    }
    
    const message = typeof validationResult.msg === 'string' ? validationResult.msg : validationResult.msg.message;
    
    Alert.alert(
      'Valid Ticket Found ✅',
      ticketInfo 
        ? `${ticketInfo.fullname}\n${ticketInfo.ticket_title}\nAvailable admits: ${ticketInfo.available}/${ticketInfo.admits}\nPrice: $${ticketInfo.price}\nStatus: ${ticketInfo.checkedin ? 'Already checked in' : 'Ready to check in'}`
        : message,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Admit Guest',
          onPress: async () => await performScanIn(scanCode, validationResult)
        }
      ]
    );
  };

  // Helper function to extract ticket information from QR code text
  const parseTicketQR = (qrData: string) => {
    const lines = qrData.split('\n').filter(line => line.trim());
    const ticketInfo: any = {
      rawData: qrData,
      eventTitle: '',
      date: '',
      transactionNumber: '',
      transactionDate: '',
      ticketId: '',
      ticketType: '',
      venue: ''
    };

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Extract event title (usually the first few lines in caps)
      if (trimmedLine.includes('CHAMPIONSHIP') || trimmedLine.includes('EVENT') || 
          (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 10 && !ticketInfo.eventTitle)) {
        if (!ticketInfo.eventTitle) {
          ticketInfo.eventTitle = trimmedLine;
        } else {
          ticketInfo.eventTitle += ' ' + trimmedLine;
        }
      }
      
      // Extract date information
      if (trimmedLine.includes('FRIDAY') || trimmedLine.includes('SATURDAY') || 
          trimmedLine.includes('SUNDAY') || trimmedLine.includes('MONDAY') ||
          trimmedLine.includes('TUESDAY') || trimmedLine.includes('WEDNESDAY') ||
          trimmedLine.includes('THURSDAY')) {
        ticketInfo.date = trimmedLine;
      }
      
      // Extract transaction number
      if (trimmedLine.startsWith('Tran. No:') || trimmedLine.startsWith('Transaction:')) {
        ticketInfo.transactionNumber = trimmedLine.split(':')[1]?.trim();
      }
      
      // Extract transaction date
      if (trimmedLine.startsWith('Tran. Date:') || trimmedLine.startsWith('Date:')) {
        ticketInfo.transactionDate = trimmedLine.split(':')[1]?.trim();
      }
      
      // Extract ticket ID
      if (trimmedLine.startsWith('TID:') || trimmedLine.includes('TID:')) {
        ticketInfo.ticketId = trimmedLine.split(':')[1]?.trim();
      }
      
      // Extract ticket type
      if (trimmedLine.includes('COMPLIMENTARY') || trimmedLine.includes('GA') || 
          trimmedLine.includes('GENERAL ADMISSION') || trimmedLine.includes('VIP')) {
        ticketInfo.ticketType = trimmedLine;
    }
    });

    return ticketInfo;
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
      
      {/* Main scan actions */}
      <View style={styles.mainActionsContainer}>
        <TouchableOpacity 
          style={[styles.primaryActionButton, { backgroundColor: '#34C759' }]}
          onPress={() => handleOpenScanner('scanIn')}
        >
          <LogIn color="#FFFFFF" size={24} />
          <Text style={[styles.primaryActionButtonText, { color: '#FFFFFF' }]}>
            Scan In Guest
          </Text>
          <Text style={[styles.primaryActionButtonSubtext, { color: 'rgba(255,255,255,0.8)' }]}>
            Admit attendees to the event
          </Text>
        </TouchableOpacity>
      
        <TouchableOpacity 
          style={[styles.primaryActionButton, { backgroundColor: '#FF6B35' }]}
          onPress={() => handleOpenScanner('scanOut')}
        >
          <LogOut color="#FFFFFF" size={24} />
          <Text style={[styles.primaryActionButtonText, { color: '#FFFFFF' }]}>
            Scan Out Guest
          </Text>
          <Text style={[styles.primaryActionButtonSubtext, { color: 'rgba(255,255,255,0.8)' }]}>
            Check out attendees from the event
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Secondary actions */}
      <TouchableOpacity 
        style={[styles.actionButton, { backgroundColor: colors.primary }]}
        onPress={() => handleOpenScanner('validate')}
        >
        <QrCode color="#FFFFFF" size={24} />
        <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
          Validate Ticket
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
    const getScannerTitle = () => {
      switch (scanMode) {
        case 'scanIn':
          return 'Scan In Guest';
        case 'scanOut':
          return 'Scan Out Guest';
        default:
          return 'Validate Ticket';
      }
    };

    const getScannerSubtitle = () => {
      switch (scanMode) {
        case 'scanIn':
          return 'Scan QR code to admit guest to the event';
        case 'scanOut':
          return 'Scan QR code to check out guest from the event';
        default:
          return 'Scan QR code to validate ticket';
      }
    };

    return (
      <View style={[styles.scannerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.scannerHeader, { backgroundColor: colors.card }]}>
          <Text style={[styles.scannerTitle, { color: colors.text }]}>{getScannerTitle()}</Text>
          <Text style={[styles.scannerSubtitle, { color: colors.secondary }]}>{getScannerSubtitle()}</Text>
        </View>
      <QRScanner
          onScan={handleScanResult}
          onClose={handleCloseScanner}
      />
      </View>
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
      {activeView === 'search' && renderSearchScreen()}
      {activeView === 'log' && renderDataLogScreen()}
      
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={handleCloseScanner}
        statusBarTranslucent
        style={{ backgroundColor: colors.background }}
      >
        {renderScanner()}
      </Modal>
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
  mainActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  primaryActionButtonSubtext: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  scannerContainer: {
    flex: 1,
  },
  scannerHeader: {
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scannerTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  scannerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
}); 