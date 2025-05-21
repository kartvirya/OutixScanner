import React, { useState, useEffect, useRef } from 'react';
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
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as ImagePicker from 'expo-image-picker';
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
  // Base state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('dashboard');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [filteredAttendees, setFilteredAttendees] = useState(mockAttendees);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Scan modes
  const [scanMode, setScanMode] = useState('individual'); // 'individual', 'bulk', 'group'
  const [scanDirection, setScanDirection] = useState('in'); // 'in', 'out'
  const [groupCount, setGroupCount] = useState(1);
  const [currentScanGroup, setCurrentScanGroup] = useState<Attendee[]>([]);
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);
  
  // Verification and registration
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [currentAttendee, setCurrentAttendee] = useState<Attendee | null>(null);
  const [wristbandNumber, setWristbandNumber] = useState('');
  const [signature, setSignature] = useState(false);
  const [witnessSignature, setWitnessSignature] = useState(false);
  
  // ID verification
  const [showIdVerificationModal, setShowIdVerificationModal] = useState(false);
  const [idVerified, setIdVerified] = useState(false);
  const [verificationReason, setVerificationReason] = useState('');
  const [ageVerified, setAgeVerified] = useState(false);
  const [photoIdMatches, setPhotoIdMatches] = useState(false);
  const [nameMatches, setNameMatches] = useState(false);
  const [selectedDenialReason, setSelectedDenialReason] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  // Logs and filters
  const [scanLogs, setScanLogs] = useState(mockScanLogs);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('2023-06-15');
  const [showFilters, setShowFilters] = useState(false);
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterOperator, setFilterOperator] = useState('all');
  
  // Stats
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [gateLocations] = useState(['Main Gate', 'VIP Entrance', 'East Gate', 'West Gate']);
  const [currentOperator, setCurrentOperator] = useState('Mike');

  // Confirmation modals
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [confirmationAction, setConfirmationAction] = useState<() => void>(() => {});
  
  // Override
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overridePassword, setOverridePassword] = useState('');
  const [supervisorName, setSupervisorName] = useState('');

  // Permission request for camera
  useEffect(() => {
    (async () => {
      try {
        // In a real app, you would use:
        // const { status } = await BarCodeScanner.requestPermissionsAsync();
        // setHasPermission(status === 'granted');
        
        // For now, simulate successful permission
        setTimeout(() => {
          setHasPermission(true);
        }, 1000);
      } catch (err) {
        console.error('Failed to get camera permission:', err);
        setHasPermission(false);
      }
    })();
  }, []);

  // Fetch attendees
  useEffect(() => {
    const fetchAttendees = async () => {
      setLoading(true);
      setError(null);
      try {
        // Attempt to fetch attendees from API
        const response = await axios.get('https://your-api-domain.com/api/attendees');
        if (Array.isArray(response.data) && response.data.length > 0) {
          setFilteredAttendees(response.data);
        } else {
          setFilteredAttendees(mockAttendees);
        }
      } catch (err) {
        console.error('Error fetching attendees:', err);
        setFilteredAttendees(mockAttendees);
        setError('Failed to fetch attendees from API. Using mock data.');
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

  // Scan ticket function - verify with API
  const verifyTicket = async (ticketNumber: string): Promise<{valid: boolean; attendee: Attendee | null; message: string}> => {
    try {
      // Replace with actual API call
      const response = await axios.get(`https://your-api-domain.com/api/tickets/verify/${ticketNumber}`);
      return response.data;
    } catch (err) {
      console.error('Error verifying ticket:', err);
      
      // Fallback to mock data
      const attendee = mockAttendees.find(a => a.ticketNumber === ticketNumber);
      
      if (!attendee) {
        return { valid: false, attendee: null, message: 'Invalid Ticket' };
      }
      
      if (attendee.scanned) {
        return { valid: false, attendee, message: 'Already Scanned' };
      }
      
      return { valid: true, attendee, message: 'Valid Ticket' };
    }
  };

  // Function to log scan
  const logScan = async (
    attendee: Attendee, 
    status: string, 
    scanType: string = 'Entry',
    notes: string = '',
    denialReason: string = ''
  ) => {
    try {
      // In real app, you would POST to API
      // const response = await axios.post('https://your-api-domain.com/api/scans', {
      //   attendeeId: attendee.id,
      //   attendeeName: attendee.name,
      //   ticketNumber: attendee.ticketNumber,
      //   ticketType: attendee.ticketType,
      //   scanType,
      //   status,
      //   scannerOperator: currentOperator,
      //   location: filterLocation !== 'all' ? filterLocation : 'Main Gate',
      //   notes,
      //   denialReason
      // });
      
      // For mock, we'll add to local state
      const newLog = {
        id: `log${scanLogs.length + 1}`,
        attendeeId: attendee.id,
        attendeeName: attendee.name,
        ticketNumber: attendee.ticketNumber,
        ticketType: attendee.ticketType,
        scanType,
        scanTime: new Date().toLocaleString(),
        exitTime: null,
        status,
        scannerOperator: currentOperator,
        location: filterLocation !== 'all' ? filterLocation : 'Main Gate',
        notes,
        denialReason
      };
      
      setScanLogs([newLog, ...scanLogs]);
      
      return true;
    } catch (err) {
      console.error('Error logging scan:', err);
      return false;
    }
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    
    // Verify the ticket (API call with mock fallback)
    const verification = await verifyTicket(data);
    
    if (!verification.valid && !verification.attendee) {
      // Invalid ticket that doesn't exist
      setVerificationReason('Invalid Ticket');
      setShowIdVerificationModal(true);
      return;
    }
    
    if (!verification.valid && verification.attendee) {
      // Valid ticket but with issues (already scanned, wrong event, etc.)
      setCurrentAttendee(verification.attendee);
      setVerificationReason(verification.message);
      setShowIdVerificationModal(true);
      return;
    }
    
    // Valid ticket
    const attendee = verification.attendee!;
    setCurrentAttendee(attendee);
    
    // Handle based on scan mode
    if (scanMode === 'individual') {
      // Individual scan mode
      if (!attendee.waiverSigned) {
        // Need to sign waiver
        setShowWaiverModal(true);
      } 
      // VIP tickets require age verification
      else if (attendee.ticketType === 'VIP') {
        setVerificationReason('Age Verification Required');
        setShowIdVerificationModal(true);
      } 
      else {
        // Standard approval
        Alert.alert('Verified', `${attendee.name} has been verified and checked in.`);
        await logScan(attendee, 'Approved');
      }
    } 
    else if (scanMode === 'bulk') {
      // Bulk scanning mode
      if (attendee.isGroup) {
        // It's a group ticket
        if (attendee.groupSize && attendee.groupSize > 0) {
          setConfirmationMessage(`Scan ${attendee.groupSize} people ${scanDirection === 'in' ? 'in' : 'out'}?`);
          setConfirmationAction(() => async () => {
            await logScan(attendee, 'Approved', scanDirection === 'in' ? 'Entry' : 'Exit');
            Alert.alert('Success', `Group of ${attendee.groupSize} has been scanned ${scanDirection === 'in' ? 'in' : 'out'}.`);
          });
          setShowConfirmationModal(true);
        }
      } else {
        // Single ticket in bulk mode
        await logScan(attendee, 'Approved', scanDirection === 'in' ? 'Entry' : 'Exit');
        Alert.alert('Success', `${attendee.name} has been scanned ${scanDirection === 'in' ? 'in' : 'out'}.`);
      }
    } 
    else if (scanMode === 'group') {
      // Group management mode - working with manual groupCount
      if (groupCount <= 0) {
        Alert.alert('Error', 'Group count must be at least 1');
        return;
      }
      
      // Add to current group or create new group
      if (currentScanGroup.length === 0) {
        setCurrentScanGroup([attendee]);
      } else {
        setCurrentScanGroup([...currentScanGroup, attendee]);
      }
      
      // If we've reached the group count, show confirmation
      if (currentScanGroup.length >= groupCount - 1) {
        setConfirmationMessage(`Scan group of ${groupCount} ${scanDirection === 'in' ? 'in' : 'out'}?`);
        setConfirmationAction(() => async () => {
          // Log scan for each member of the group
          for (let member of [...currentScanGroup, attendee]) {
            await logScan(member, 'Approved', scanDirection === 'in' ? 'Entry' : 'Exit');
          }
          setCurrentScanGroup([]);
          Alert.alert('Success', `Group of ${groupCount} has been scanned ${scanDirection === 'in' ? 'in' : 'out'}.`);
        });
        setShowConfirmationModal(true);
      } else {
        // Still need more group members
        Alert.alert(
          'Group Scan',
          `Added ${attendee.name} to group. Scan ${groupCount - currentScanGroup.length - 1} more tickets.`
        );
      }
    }
  };

  const handleSubmitWaiver = async () => {
    if (!signature || !witnessSignature || !wristbandNumber.trim()) {
      Alert.alert('Missing Information', 'Please ensure the waiver is signed, witnessed, and a wristband number is entered.');
      return;
    }
    
    // Check if wristband is already assigned
    const existingWristband = mockAttendees.find(a => a.wristbandNumber === wristbandNumber);
    if (existingWristband && currentAttendee && existingWristband.id !== currentAttendee.id) {
      // Wristband already assigned to another attendee
      setVerificationReason('Wristband Already Assigned');
      setShowWaiverModal(false);
      setShowIdVerificationModal(true);
      return;
    }
    
    // Update attendee record (in a real app, you would call an API)
    if (currentAttendee) {
      // Simulate API update
      const updatedAttendee = {
        ...currentAttendee,
        waiverSigned: true,
        wristbandNumber
      };
      
      // Update local state to reflect changes
      setFilteredAttendees(prev => 
        prev.map(a => a.id === updatedAttendee.id ? updatedAttendee : a)
      );
      
      await logScan(updatedAttendee, 'Approved', 'Registration', 'Waiver signed and wristband assigned');
      
      Alert.alert('Success', 'Waiver signed and wristband assigned.');
      setShowWaiverModal(false);
      setSignature(false);
      setWitnessSignature(false);
      setWristbandNumber('');
    }
  };

  // Function to handle ID verification approval
  const handleVerificationApproval = async () => {
    if (!nameMatches || !photoIdMatches || !ageVerified) {
      Alert.alert('Incomplete Verification', 'Please complete all verification checks.');
      return;
    }
    
    if (currentAttendee) {
      setShowIdVerificationModal(false);
      setNameMatches(false);
      setPhotoIdMatches(false);
      setAgeVerified(false);
      setIdVerified(true);
      
      await logScan(
        currentAttendee, 
        'Approved', 
        'Entry', 
        verificationNotes.trim() ? verificationNotes : 'ID verified'
      );
      
      Alert.alert('Verified', 'ID has been verified. Entry approved.');
      setVerificationNotes('');
      setSelectedDenialReason(null);
    }
  };

  // Function to handle ID verification denial
  const handleVerificationDenial = async () => {
    if (currentAttendee) {
      setShowIdVerificationModal(false);
      setNameMatches(false);
      setPhotoIdMatches(false);
      setAgeVerified(false);
      
      const denialReason = selectedDenialReason 
        ? denialReasons.find(r => r.id === selectedDenialReason)?.reason 
        : 'Verification Failed';
      
      await logScan(
        currentAttendee,
        'Denied',
        'Entry',
        verificationNotes.trim() ? verificationNotes : 'Verification failed',
        denialReason
      );
      
      Alert.alert('Denied', `Entry has been denied. Reason: ${denialReason}`);
      setVerificationNotes('');
      setSelectedDenialReason(null);
    }
  };

  // Function to request override
  const handleOverrideRequest = () => {
    setShowOverrideModal(true);
  };

  // Function to submit override
  const handleOverrideSubmit = async () => {
    if (!supervisorName.trim() || !overridePassword.trim() || !overrideReason.trim()) {
      Alert.alert('Incomplete Override', 'Please fill in all fields for the override request.');
      return;
    }
    
    // In a real app, you would verify override credentials with an API
    // For demo, accept any password
    if (currentAttendee) {
      setShowOverrideModal(false);
      setShowIdVerificationModal(false);
      
      await logScan(
        currentAttendee,
        'Approved (Override)',
        'Entry',
        `Override by ${supervisorName}: ${overrideReason}`
      );
      
      Alert.alert('Override Accepted', `${currentAttendee.name} has been checked in with an override.`);
      
      // Reset override fields
      setSupervisorName('');
      setOverridePassword('');
      setOverrideReason('');
    }
  };

  // Add utility function for chart colors
  const getChartColor = (index: number) => {
    const chartColors = ['#FF9500', '#4CAF50', '#2196F3', '#9C27B0', '#FF3B30'];
    return chartColors[index % chartColors.length];
  };

  const renderDashboard = () => (
    <View style={styles.dashboardContainer}>
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Search size={18} color={colors.secondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name, ticket, phone, or email"
          placeholderTextColor={colors.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: colors.card }]}
          onPress={() => setShowStatsModal(true)}
        >
          <Text style={[styles.statNumber, { color: colors.primary }]}>{mockAttendees.length}</Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Total Attendees</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.statCard, { backgroundColor: colors.card }]}
          onPress={() => setShowStatsModal(true)}
        >
          <Text style={[styles.statNumber, { color: colors.primary }]}>{mockAttendees.filter(a => a.scanned).length}</Text>
          <Text style={[styles.statLabel, { color: colors.text }]}>Scanned Attendees</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => setActiveView('scan')}
        >
          <QrCode size={24} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Scan</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => setActiveView('search')}
        >
          <Search size={24} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Search</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => setActiveView('log')}
        >
          <List size={24} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Data Log</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => setActiveView('registration')}
        >
          <UserPlus size={24} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Registration</Text>
        </TouchableOpacity>
      </View>
      
      <View style={[styles.sectionContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Scans</Text>
        {mockAttendees.filter(a => a.scanned).slice(0, 5).map(attendee => (
          <View key={attendee.id} style={[styles.scanItem, { borderBottomColor: colors.border }]}>
            <Text style={[styles.attendeeName, { color: colors.text }]}>{attendee.name}</Text>
            <View style={styles.scanDetails}>
              <Text style={[styles.scanTime, { color: colors.secondary }]}>{attendee.scanTime}</Text>
              <Text style={[styles.scanStatus, { color: '#4CAF50' }]}>{attendee.status}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderScanScreen = () => {
    if (hasPermission === null) {
      return <Text style={{ color: colors.text }}>Camera access permissions needed for scanning</Text>;
    }
    if (hasPermission === false) {
      return <Text style={{ color: colors.text }}>No access to camera</Text>;
    }

    return (
      <View style={styles.scanContainer}>
        <View style={styles.scannerModeSelector}>
          <TouchableOpacity 
            style={[
              styles.scanModeButton, 
              scanMode === 'individual' && { backgroundColor: colors.primary }
            ]}
            onPress={() => setScanMode('individual')}
          >
            <Text style={scanMode === 'individual' ? styles.activeModeText : [styles.modeText, { color: colors.text }]}>
              Individual
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.scanModeButton, 
              scanMode === 'bulk' && { backgroundColor: colors.primary }
            ]}
            onPress={() => setScanMode('bulk')}
          >
            <Text style={scanMode === 'bulk' ? styles.activeModeText : [styles.modeText, { color: colors.text }]}>
              Bulk
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.scanModeButton, 
              scanMode === 'group' && { backgroundColor: colors.primary }
            ]}
            onPress={() => setScanMode('group')}
          >
            <Text style={scanMode === 'group' ? styles.activeModeText : [styles.modeText, { color: colors.text }]}>
              Group
            </Text>
          </TouchableOpacity>
        </View>
        
        {scanMode === 'group' && (
          <View style={styles.groupControls}>
            <Text style={[styles.groupCountLabel, { color: colors.text }]}>Group Size:</Text>
            <View style={styles.countControls}>
              <TouchableOpacity 
                style={[styles.countButton, { borderColor: colors.primary }]}
                onPress={() => setGroupCount(prev => Math.max(1, prev - 1))}
              >
                <Text style={[styles.countButtonText, { color: colors.primary }]}>-</Text>
              </TouchableOpacity>
              
              <TextInput
                style={[styles.countInput, { color: colors.text, borderColor: colors.border }]}
                value={groupCount.toString()}
                onChangeText={(text) => {
                  const count = parseInt(text) || 1;
                  setGroupCount(count);
                }}
                keyboardType="number-pad"
              />
              
              <TouchableOpacity 
                style={[styles.countButton, { borderColor: colors.primary }]}
                onPress={() => setGroupCount(prev => prev + 1)}
              >
                <Text style={[styles.countButtonText, { color: colors.primary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <View style={styles.scanner}>
          {!scanned ? (
            <View style={{...StyleSheet.absoluteFillObject, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center'}}>
              <QrCode size={100} color="rgba(255,255,255,0.5)" />
              <Text style={{color: '#fff', marginTop: 20, fontSize: 16}}>Camera would appear here</Text>
              <TouchableOpacity
                style={{marginTop: 30, backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8}}
                onPress={() => handleBarCodeScanned({type: 'qr', data: 'T001'})}
              >
                <Text style={{color: '#fff', fontWeight: '500'}}>Simulate Scan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.scanResultContainer}>
              <CheckCircle size={60} color="#4CAF50" />
              <Text style={[styles.scanResultText, { color: colors.text }]}>
                Scan Complete
              </Text>
              <TouchableOpacity 
                style={[styles.scanAgainButton, { backgroundColor: colors.primary }]}
                onPress={() => setScanned(false)}
              >
                <Text style={styles.scanAgainButtonText}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => setActiveView('dashboard')}
        >
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSearchScreen = () => (
    <View style={styles.searchContainer}>
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Search size={18} color={colors.secondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name, ticket, phone, or email"
          placeholderTextColor={colors.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
      </View>
      
      <FlatList
        data={filteredAttendees}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.attendeeCard, { backgroundColor: colors.card }]}>
            <View style={styles.attendeeInfo}>
              <Text style={[styles.attendeeName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.attendeeDetails, { color: colors.secondary }]}>
                {item.ticketNumber} • {item.ticketType}
              </Text>
              <Text style={[styles.attendeeContact, { color: colors.secondary }]}>
                {item.email} • {item.phone}
              </Text>
            </View>
            <View style={styles.statusContainer}>
              <Text 
                style={[
                  styles.statusBadge,
                  { 
                    backgroundColor: item.scanned ? '#4CAF50' : colors.secondary,
                    color: '#FFFFFF'
                  }
                ]}
              >
                {item.status}
              </Text>
              {item.wristbandNumber && (
                <Text style={[styles.wristbandNumber, { color: colors.primary }]}>
                  #{item.wristbandNumber}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyListText, { color: colors.secondary }]}>
            No attendees found matching your search.
          </Text>
        }
      />
      
      <TouchableOpacity 
        style={[styles.backButton, { backgroundColor: colors.card }]}
        onPress={() => setActiveView('dashboard')}
      >
        <Text style={[styles.backButtonText, { color: colors.primary }]}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDataLogScreen = () => {
    // Filter logs based on active filter
    const filteredLogs = mockScanLogs.filter(log => {
      if (activeFilter === 'approved') return log.status === 'Approved';
      if (activeFilter === 'denied') return log.status === 'Denied';
      return true;
    }).filter(log => {
      // Apply additional filters
      if (filterLocation !== 'all' && log.location !== filterLocation) return false;
      if (filterOperator !== 'all' && log.scannerOperator !== filterOperator) return false;
      return true;
    });

    return (
      <View style={styles.logContainer}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Scan History</Text>
        
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity 
              style={[
                styles.filterButton, 
                { backgroundColor: colors.card },
                activeFilter === 'all' && { borderColor: colors.primary, borderWidth: 2 }
              ]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[styles.filterButtonText, { color: colors.primary }]}>All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterButton, 
                { backgroundColor: colors.card },
                activeFilter === 'approved' && { borderColor: colors.primary, borderWidth: 2 }
              ]}
              onPress={() => setActiveFilter('approved')}
            >
              <Text style={[styles.filterButtonText, { color: colors.primary }]}>Approved</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterButton, 
                { backgroundColor: colors.card },
                activeFilter === 'denied' && { borderColor: colors.primary, borderWidth: 2 }
              ]}
              onPress={() => setActiveFilter('denied')}
            >
              <Text style={[styles.filterButtonText, { color: colors.primary }]}>Denied</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, { backgroundColor: colors.card }]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Text style={[styles.filterButtonText, { color: colors.primary }]}>
                {showFilters ? 'Hide Filters' : 'More Filters'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        
        {showFilters && (
          <View style={[styles.advancedFilters, { backgroundColor: colors.card }]}>
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Date:</Text>
              <View style={styles.datePickerContainer}>
                <Text style={[styles.dateText, { color: colors.secondary }]}>{selectedDate}</Text>
                <Calendar size={16} color={colors.primary} />
              </View>
            </View>
            
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Location:</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={[styles.pickerButton, filterLocation === 'all' && { backgroundColor: colors.primary + '20' }]}
                  onPress={() => setFilterLocation('all')}
                >
                  <Text style={[styles.pickerText, { color: filterLocation === 'all' ? colors.primary : colors.text }]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.pickerButton, filterLocation === 'Main Gate' && { backgroundColor: colors.primary + '20' }]}
                  onPress={() => setFilterLocation('Main Gate')}
                >
                  <Text style={[styles.pickerText, { color: filterLocation === 'Main Gate' ? colors.primary : colors.text }]}>Main Gate</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.pickerButton, filterLocation === 'VIP Entrance' && { backgroundColor: colors.primary + '20' }]}
                  onPress={() => setFilterLocation('VIP Entrance')}
                >
                  <Text style={[styles.pickerText, { color: filterLocation === 'VIP Entrance' ? colors.primary : colors.text }]}>VIP</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Operator:</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={[styles.pickerButton, filterOperator === 'all' && { backgroundColor: colors.primary + '20' }]}
                  onPress={() => setFilterOperator('all')}
                >
                  <Text style={[styles.pickerText, { color: filterOperator === 'all' ? colors.primary : colors.text }]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.pickerButton, filterOperator === 'Mike' && { backgroundColor: colors.primary + '20' }]}
                  onPress={() => setFilterOperator('Mike')}
                >
                  <Text style={[styles.pickerText, { color: filterOperator === 'Mike' ? colors.primary : colors.text }]}>Mike</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.pickerButton, filterOperator === 'Lisa' && { backgroundColor: colors.primary + '20' }]}
                  onPress={() => setFilterOperator('Lisa')}
                >
                  <Text style={[styles.pickerText, { color: filterOperator === 'Lisa' ? colors.primary : colors.text }]}>Lisa</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.logItem, { backgroundColor: colors.card }]}
              onPress={() => {
                Alert.alert(
                  'Scan Details',
                  `Attendee: ${item.attendeeName}\nTicket: ${item.ticketNumber}\nScanned: ${item.scanTime}\n${item.exitTime ? `Exit: ${item.exitTime}` : ''}\nLocation: ${item.location}\nOperator: ${item.scannerOperator}\n${item.notes ? `Notes: ${item.notes}` : ''}`
                );
              }}
            >
              <View style={styles.logInfo}>
                <Text style={[styles.logName, { color: colors.text }]}>{item.attendeeName}</Text>
                <Text style={[styles.logDetails, { color: colors.secondary }]}>
                  {item.ticketNumber} • {item.ticketType}
                </Text>
                <View style={styles.logTimeContainer}>
                  <Clock size={14} color={colors.secondary} style={styles.logIcon} />
                  <Text style={[styles.logTime, { color: colors.secondary }]}>{item.scanTime}</Text>
                </View>
                
                <View style={styles.logMetaInfo}>
                  <View style={styles.logMeta}>
                    <MapPin size={12} color={colors.secondary} style={styles.logIcon} />
                    <Text style={[styles.logMetaText, { color: colors.secondary }]}>{item.location}</Text>
                  </View>
                  <View style={styles.logMeta}>
                    <User size={12} color={colors.secondary} style={styles.logIcon} />
                    <Text style={[styles.logMetaText, { color: colors.secondary }]}>{item.scannerOperator}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.logStatus}>
                <Text 
                  style={[
                    styles.statusBadge,
                    { 
                      backgroundColor: item.status === 'Approved' ? '#4CAF50' : '#FF3B30',
                      color: '#FFFFFF'
                    }
                  ]}
                >
                  {item.status}
                </Text>
                {item.status === 'Denied' && item.denialReason && (
                  <Text style={[styles.denialReason, { color: '#FF3B30' }]}>
                    {item.denialReason}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyListText, { color: colors.secondary }]}>
              No scan records match your filters
            </Text>
          }
        />
        
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => setActiveView('dashboard')}
        >
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRegistrationScreen = () => (
    <View style={styles.registrationContainer}>
      <Text style={[styles.screenTitle, { color: colors.text }]}>Registration</Text>
      
      <View style={styles.registrationActions}>
        <TouchableOpacity 
          style={[styles.registrationAction, { backgroundColor: colors.primary }]}
          onPress={() => setActiveView('search')}
        >
          <Search size={24} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Search by Name</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.registrationAction, { backgroundColor: colors.primary }]}
          onPress={() => setActiveView('scan')}
        >
          <QrCode size={24} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Scan Ticket</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.registrationTitle, { color: colors.secondary }]}>
        Pending Registrations
      </Text>
      
      <FlatList
        data={mockAttendees.filter(a => !a.waiverSigned)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.attendeeCard, { backgroundColor: colors.card }]}>
            <View style={styles.attendeeInfo}>
              <Text style={[styles.attendeeName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.attendeeDetails, { color: colors.secondary }]}>
                {item.ticketNumber} • {item.ticketType}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.registerButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setCurrentAttendee(item);
                setShowWaiverModal(true);
              }}
            >
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyListText, { color: colors.secondary }]}>
            No pending registrations.
          </Text>
        }
      />
      
      <TouchableOpacity 
        style={[styles.backButton, { backgroundColor: colors.card }]}
        onPress={() => setActiveView('dashboard')}
      >
        <Text style={[styles.backButtonText, { color: colors.primary }]}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );

  const renderWaiverModal = () => (
    <Modal
      visible={showWaiverModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Registration Required</Text>
          
          {currentAttendee && (
            <Text style={[styles.attendeeName, { color: colors.text }]}>{currentAttendee.name}</Text>
          )}
          
          <View style={[styles.waiverBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.waiverTitle, { color: colors.text }]}>Event Waiver</Text>
            <ScrollView style={styles.waiverText}>
              <Text style={{ color: colors.secondary }}>
                I hereby agree to participate in the event at my own risk and responsibility...
                [Full waiver text would go here]
              </Text>
            </ScrollView>
            
            <TouchableOpacity
              style={[
                styles.signatureBox, 
                { borderColor: colors.border },
                signature && { backgroundColor: colors.primary + '20' }
              ]}
              onPress={() => setSignature(!signature)}
            >
              {signature ? (
                <Check size={24} color={colors.primary} />
              ) : (
                <Text style={[styles.signatureText, { color: colors.secondary }]}>
                  Tap to sign
                </Text>
              )}
            </TouchableOpacity>
            
            <Text style={[styles.witnessLabel, { color: colors.text }]}>Witness Signature:</Text>
            
            <TouchableOpacity
              style={[
                styles.signatureBox, 
                { borderColor: colors.border },
                witnessSignature && { backgroundColor: colors.primary + '20' }
              ]}
              onPress={() => setWitnessSignature(!witnessSignature)}
            >
              {witnessSignature ? (
                <Check size={24} color={colors.primary} />
              ) : (
                <Text style={[styles.signatureText, { color: colors.secondary }]}>
                  Tap for witness to sign
                </Text>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.wristbandContainer}>
            <Text style={[styles.wristbandLabel, { color: colors.text }]}>Wristband Number:</Text>
            <TextInput
              style={[styles.wristbandInput, { color: colors.text, borderColor: colors.border }]}
              value={wristbandNumber}
              onChangeText={setWristbandNumber}
              placeholder="Enter wristband #"
              placeholderTextColor={colors.secondary}
              keyboardType="default"
            />
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: '#F44336' }]}
              onPress={() => {
                setShowWaiverModal(false);
                setSignature(false);
                setWitnessSignature(false);
                setWristbandNumber('');
              }}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.modalButton, 
                { backgroundColor: colors.primary },
                (!signature || !witnessSignature || !wristbandNumber.trim()) && { opacity: 0.5 }
              ]}
              onPress={handleSubmitWaiver}
              disabled={!signature || !witnessSignature || !wristbandNumber.trim()}
            >
              <Text style={styles.modalButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderIdVerificationModal = () => (
    <Modal
      visible={showIdVerificationModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, borderWidth: 2, borderColor: '#FF3B30' }]}>
          <View style={styles.redBanner}>
            <Text style={styles.redBannerText}>VERIFICATION REQUIRED</Text>
          </View>
          
          <Text style={[styles.verificationReason, { color: '#FF3B30' }]}>
            {verificationReason}
          </Text>
          
          {currentAttendee && (
            <View style={styles.idVerificationContainer}>
              <Text style={[styles.attendeeName, { color: colors.text }]}>{currentAttendee.name}</Text>
              <Text style={[styles.attendeeDetails, { color: colors.secondary }]}>
                {currentAttendee.ticketNumber} • {currentAttendee.ticketType}
              </Text>
              
              <View style={styles.photoPlaceholder}>
                <User size={60} color={colors.secondary} />
                <Text style={[styles.photoText, { color: colors.secondary }]}>ID Photo</Text>
              </View>
              
              <Text style={[styles.verificationLabel, { color: colors.text }]}>
                Verification Checklist:
              </Text>
              
              <View style={styles.checklistContainer}>
                <TouchableOpacity 
                  style={styles.checklistItem}
                  onPress={() => setNameMatches(!nameMatches)}
                >
                  <View style={[
                    styles.checkbox, 
                    nameMatches && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}>
                    {nameMatches && <Check size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.checklistText, { color: colors.text }]}>Name matches ID</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.checklistItem}
                  onPress={() => setPhotoIdMatches(!photoIdMatches)}
                >
                  <View style={[
                    styles.checkbox, 
                    photoIdMatches && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}>
                    {photoIdMatches && <Check size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.checklistText, { color: colors.text }]}>Photo ID matches</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.checklistItem}
                  onPress={() => setAgeVerified(!ageVerified)}
                >
                  <View style={[
                    styles.checkbox, 
                    ageVerified && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}>
                    {ageVerified && <Check size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.checklistText, { color: colors.text }]}>Age requirement met</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.notesContainer}>
                <Text style={[styles.notesLabel, { color: colors.text }]}>Additional Notes:</Text>
                <TextInput
                  style={[styles.notesInput, { color: colors.text, borderColor: colors.border }]}
                  multiline
                  numberOfLines={2}
                  placeholder="Add any notes about this verification..."
                  placeholderTextColor={colors.secondary}
                />
              </View>
              
              {/* Add specific denial reason selector */}
              <View style={styles.denialReasonsContainer}>
                <Text style={[styles.denialReasonsLabel, { color: colors.text }]}>
                  Select Denial Reason (if needed):
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.denialReasonsList}>
                  {denialReasons.map((reason) => (
                    <TouchableOpacity
                      key={reason.id}
                      style={[
                        styles.denialReasonButton,
                        { backgroundColor: reason.color + '20', borderColor: reason.color },
                        selectedDenialReason === reason.id && { backgroundColor: reason.color + '40' }
                      ]}
                      onPress={() => setSelectedDenialReason(
                        selectedDenialReason === reason.id ? null : reason.id
                      )}
                    >
                      <Text style={[styles.denialReasonText, { color: reason.color }]}>
                        {reason.reason}
                      </Text>
                      {reason.requiresOverride && (
                        <Lock size={12} color={reason.color} style={styles.lockIcon} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: '#FF3B30' }]}
              onPress={handleVerificationDenial}
            >
              <Text style={styles.modalButtonText}>Deny Entry</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.modalButton, 
                { backgroundColor: colors.primary },
                (!nameMatches || !photoIdMatches || !ageVerified) && { opacity: 0.5 }
              ]}
              onPress={handleVerificationApproval}
              disabled={!nameMatches || !photoIdMatches || !ageVerified}
            >
              <Text style={styles.modalButtonText}>Approve Entry</Text>
            </TouchableOpacity>
          </View>
          
          {verificationReason === 'Already Scanned' && (
            <TouchableOpacity 
              style={[styles.overrideButton, { borderColor: colors.primary }]}
              onPress={handleOverrideRequest}
            >
              <Text style={[styles.overrideButtonText, { color: colors.primary }]}>Request Override</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );

  // Add stats modal render function
  const renderStatsModal = () => (
    <Modal
      visible={showStatsModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Ticket Statistics</Text>
          
          <View style={styles.chartContainer}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Tickets by Type</Text>
            
            {mockAttendees.map((type, index) => (
              <View key={index} style={styles.chartRow}>
                <View style={styles.chartLabelContainer}>
                  <View style={[styles.chartColorDot, { backgroundColor: getChartColor(index) }]} />
                  <Text style={[styles.chartLabel, { color: colors.text }]}>{type.ticketType}</Text>
                </View>
                <View style={styles.chartBarContainer}>
                  <View 
                    style={[
                      styles.chartBar, 
                      { 
                        backgroundColor: getChartColor(index),
                        width: `${(type.scanned / Math.max(...mockAttendees.map(t => t.scanned))) * 100}%`
                      }
                    ]} 
                  />
                  <Text style={[styles.chartValue, { color: colors.secondary }]}>{type.scanned}</Text>
                </View>
              </View>
            ))}
          </View>
          
          <View style={styles.chartContainer}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Scan Status</Text>
            
            <View style={styles.scanStatusChart}>
              {mockAttendees.map((type, index) => {
                const scanPercentage = type.scanned / type.sold * 100;
                return (
                  <View key={index} style={styles.scanStatusRow}>
                    <Text style={[styles.scanStatusLabel, { color: colors.text }]}>{type.ticketType}</Text>
                    <View style={styles.scanStatusBarContainer}>
                      <View style={[styles.scanStatusBar, { backgroundColor: '#CCCCCC' }]}>
                        <View 
                          style={[
                            styles.scanStatusProgress, 
                            { 
                              backgroundColor: getChartColor(index),
                              width: `${scanPercentage}%`
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.scanStatusValue, { color: colors.secondary }]}>
                        {type.scanned}/{type.sold} ({Math.round(scanPercentage)}%)
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.closeModalButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowStatsModal(false)}
          >
            <Text style={styles.closeModalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Render confirmation modal for group/bulk scanning
  const renderConfirmationModal = () => (
    <Modal
      visible={showConfirmationModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowConfirmationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Action</Text>
          <Text style={[styles.confirmationText, { color: colors.text }]}>{confirmationMessage}</Text>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.error }]}
              onPress={() => setShowConfirmationModal(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setShowConfirmationModal(false);
                confirmationAction();
              }}
            >
              <Text style={styles.modalButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render override request modal
  const renderOverrideModal = () => (
    <Modal
      visible={showOverrideModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowOverrideModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Override Request</Text>
          
          <Text style={[styles.inputLabel, { color: colors.text }]}>Supervisor Name:</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={supervisorName}
            onChangeText={setSupervisorName}
            placeholder="Enter supervisor name"
            placeholderTextColor={colors.secondary}
          />
          
          <Text style={[styles.inputLabel, { color: colors.text }]}>Override Password:</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={overridePassword}
            onChangeText={setOverridePassword}
            placeholder="Enter override password"
            placeholderTextColor={colors.secondary}
            secureTextEntry
          />
          
          <Text style={[styles.inputLabel, { color: colors.text }]}>Reason for Override:</Text>
          <TextInput
            style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
            value={overrideReason}
            onChangeText={setOverrideReason}
            placeholder="Enter reason for override"
            placeholderTextColor={colors.secondary}
            multiline
            numberOfLines={3}
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.error }]}
              onPress={() => setShowOverrideModal(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.modalButton, 
                { backgroundColor: colors.primary },
                (!supervisorName.trim() || !overridePassword.trim() || !overrideReason.trim()) && { opacity: 0.5 }
              ]}
              onPress={handleOverrideSubmit}
              disabled={!supervisorName.trim() || !overridePassword.trim() || !overrideReason.trim()}
            >
              <Text style={styles.modalButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'scan' && renderScanScreen()}
      {activeView === 'search' && renderSearchScreen()}
      {activeView === 'log' && renderDataLogScreen()}
      {activeView === 'registration' && renderRegistrationScreen()}
      {renderWaiverModal()}
      {renderIdVerificationModal()}
      {renderStatsModal()}
      {renderConfirmationModal()}
      {renderOverrideModal()}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    width: '48%',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginTop: 8,
  },
  sectionContainer: {
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  scanItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  scanDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scanTime: {
    fontSize: 14,
  },
  scanStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  scanContainer: {
    flex: 1,
    padding: 16,
  },
  scannerModeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  scanModeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  modeText: {
    fontWeight: '500',
  },
  activeModeText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  groupControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupCountLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 16,
  },
  countControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  countInput: {
    width: 60,
    height: 40,
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  scanner: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanResultContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanResultText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 24,
  },
  scanAgainButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  scanAgainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  backButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  searchContainer: {
    flex: 1,
    padding: 16,
  },
  attendeeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  attendeeContact: {
    fontSize: 14,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: '500',
    fontSize: 12,
    marginBottom: 4,
  },
  wristbandNumber: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  logContainer: {
    flex: 1,
    padding: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  filterButtonText: {
    fontWeight: '500',
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  logInfo: {
    flex: 1,
  },
  logName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  logDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  logTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logIcon: {
    marginRight: 6,
  },
  logTime: {
    fontSize: 14,
  },
  logStatus: {
    marginLeft: 8,
  },
  registrationContainer: {
    flex: 1,
    padding: 16,
  },
  registrationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  registrationAction: {
    width: '48%',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  registrationTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
  },
  registerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  waiverBox: {
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
  },
  waiverTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  waiverText: {
    maxHeight: 150,
    marginBottom: 16,
  },
  signatureBox: {
    height: 60,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  signatureText: {
    fontStyle: 'italic',
  },
  witnessLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  wristbandContainer: {
    marginBottom: 24,
  },
  wristbandLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  wristbandInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  redBanner: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  redBannerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  verificationReason: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  idVerificationContainer: {
    marginBottom: 24,
  },
  photoPlaceholder: {
    alignItems: 'center',
    marginVertical: 16,
  },
  photoText: {
    fontSize: 14,
    marginTop: 8,
  },
  verificationLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  checklistContainer: {
    marginBottom: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checklistText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesContainer: {
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
  },
  denialReasonsContainer: {
    marginBottom: 16,
  },
  denialReasonsLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  denialReasonsList: {
    flexDirection: 'row',
  },
  denialReasonButton: {
    padding: 12,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    marginRight: 8,
  },
  denialReasonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  lockIcon: {
    marginLeft: 8,
  },
  chartContainer: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  chartColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  chartBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartBar: {
    height: 20,
    borderRadius: 4,
    marginRight: 8,
  },
  chartValue: {
    fontWeight: 'bold',
  },
  scanStatusChart: {
    marginBottom: 16,
  },
  scanStatusRow: {
    marginBottom: 8,
  },
  scanStatusLabel: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  scanStatusBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanStatusBar: {
    height: 20,
    borderRadius: 4,
    marginRight: 8,
  },
  scanStatusProgress: {
    height: 20,
    borderRadius: 4,
  },
  scanStatusValue: {
    fontWeight: 'bold',
  },
  closeModalButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    height: 50,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    height: 120,
    textAlignVertical: 'top',
  },
  overrideButton: {
    padding: 12,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    marginTop: 16,
  },
  overrideButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmationText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  advancedFilters: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 12,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    marginRight: 12,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  pickerButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  pickerText: {
    fontSize: 14,
  },
  logMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  logMetaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  denialReason: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  denialReasonsContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  denialReasonsLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  denialReasonsList: {
    marginBottom: 8,
  },
  denialReasonButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 16,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  denialReasonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  lockIcon: {
    marginLeft: 4,
  },
  chartLabel: {
    fontSize: 14,
    marginLeft: 8,
  },
}); 