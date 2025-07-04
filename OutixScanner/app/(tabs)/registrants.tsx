import { Calendar, ChevronDown, ClipboardList, FileCheck, Mail, MapPin, Phone, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WaiverSigningModal from '../../components/WaiverSigningModal';
import { useTheme } from '../../context/ThemeContext';
import { getRegistrations, isAuthenticated, login, Registration } from '../../services/api';

export default function Registrants() {
  const { colors } = useTheme();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);

  // Check authentication and auto-login if needed
  const checkAuthAndLogin = async () => {
    try {
      console.log('Checking authentication status...');
      const authenticated = await isAuthenticated();
      
      if (!authenticated) {
        console.log('Not authenticated, attempting auto-login...');
        // Try to login with the credentials we know work
        const token = await login('outix@thebend.co', 'Scan$9841');
        if (!token) {
          throw new Error('Failed to authenticate. Please check your credentials.');
        }
        console.log('Auto-login successful');
      } else {
        console.log('Already authenticated');
      }
      
      setAuthChecked(true);
      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      setError(error instanceof Error ? error.message : 'Authentication failed');
      setAuthChecked(true);
      return false;
    }
  };

  const loadRegistrations = async () => {
    try {
      console.log('Starting to load registrations...');
      setLoading(true);
      setError(null);
      
      // Ensure we're authenticated first
      const authenticated = await checkAuthAndLogin();
      if (!authenticated) {
        return;
      }
      
      const data = await getRegistrations();
      console.log('Registrations loaded:', data.length, 'items');
      setRegistrations(data);
    } catch (error) {
      console.error('Error loading registrations:', error);
      // Show some user feedback
      setError(error instanceof Error ? error.message : 'Failed to load registrations');
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    
    try {
        await loadRegistrations();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleSignWaiver = (registration: Registration) => {
    setSelectedRegistration(registration);
    setShowWaiverModal(true);
  };

  const closeWaiverModal = () => {
    setShowWaiverModal(false);
    setSelectedRegistration(null);
    // Refresh registrations to get updated status
    loadRegistrations();
  };



  const renderRegistrationItem = ({ item }: { item: Registration }) => (
    <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleContainer}>
          <Calendar size={24} color={colors.primary} />
          <View style={styles.participantInfo}>
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
              {item.EventName}
            </Text>
            <Text style={[styles.itemDate, { color: colors.text }]}>
              {new Date(item.showStart).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.itemDetails}>
        <Text style={[styles.itemSubtitle, { color: colors.text }]} numberOfLines={1}>
          {item.EventSubtitle || 'No subtitle'}
        </Text>
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <MapPin size={16} color={colors.text} />
            <Text style={[styles.itemInfo, { color: colors.text }]} numberOfLines={1}>
              {item.VenueName}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <User size={16} color={colors.text} />
            <Text style={[styles.itemInfo, { color: colors.text }]} numberOfLines={1}>
              {item.organizerName}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <MapPin size={16} color={colors.text} />
            <Text style={[styles.itemInfo, { color: colors.text }]} numberOfLines={1}>
              {item.City}, {item.PostCode}
            </Text>
          </View>
        </View>
        
        {/* Waiver Information */}
        {item.WaiverLink && (
          <View style={styles.waiverSection}>
            <View style={styles.waiverHeader}>
              <FileCheck size={20} color={colors.primary} />
              <Text style={[styles.waiverTitle, { color: colors.text }]}>Waiver Required</Text>
            </View>
            <TouchableOpacity
              style={[styles.signButton, { backgroundColor: '#F59E0B' }]}
              onPress={() => handleSignWaiver(item)}
            >
              <FileCheck size={16} color="#FFFFFF" />
              <Text style={styles.signButtonText}>Sign Waiver</Text>
            </TouchableOpacity>
          </View>
          )}
        </View>
      </View>
    );

  // Show loading screen while checking authentication or loading initial data
  if (!authChecked || (loading && registrations.length === 0)) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          {!authChecked ? 'Authenticating...' : 'Loading registrants...'}
        </Text>
      </View>
    );
  }

  if (error && registrations.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: '#EF4444' }]}>Error: {error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setError(null);
            setAuthChecked(false);
            loadRegistrations();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Registrants</Text>
      </View>

      <FlatList
          data={registrations}
          keyExtractor={(item) => item.id}
          renderItem={renderRegistrationItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        />
      
      {/* WaiverSigningModal */}
      {selectedRegistration && selectedRegistration.WaiverLink && (
        <WaiverSigningModal
          visible={showWaiverModal}
          onClose={closeWaiverModal}
          waiver={{
            Ref: selectedRegistration.id,
            WaiverLink: selectedRegistration.WaiverLink,
            'Driver Rider Name': selectedRegistration.EventName,
            Category: 'Event Registration',
            ItemName: selectedRegistration.EventName,
            'Client Name': selectedRegistration.organizerName,
            Email: '',
            Mobile: '',
            'Contact Name': selectedRegistration.organizerName,
            Address: selectedRegistration.VenueAddress,
            CrewNames: '',
            Amount: '',
            Manufacturer: '',
            Model: '',
            'Engine Capacity': '',
            Year: '',
            'Quickest ET': '',
            'Quickest MPH': '',
            'ANDRA License Number': '',
            'Emergency Contact Name': '',
            'Emergency Contact Number': '',
            'Racing Number': '',
            WaiverSigned: 'No',
            CheckedIn: 'No',
            RegisteredDate: new Date().toISOString()
          }}
          eventName={selectedRegistration.EventName}
          eventDate={selectedRegistration.showStart}
          waiverLink={selectedRegistration.WaiverLink}
          waiverLogo={selectedRegistration.WaiverLogo}
          waiverBgImage={selectedRegistration.WaiverBgImage}
          onSubmit={async (waiverData) => {
            try {
              // Handle waiver submission
              closeWaiverModal();
            } catch (error) {
              console.error('Error submitting waiver:', error);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventSelector: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
  },
  dropdownButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    width: '90%',
    maxHeight: '70%',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownHeader: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dropdownList: {
    maxHeight: 400,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  dropdownItemDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  itemCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  itemDate: {
    fontSize: 12,
    marginTop: 2,
  },
  itemDetails: {
    gap: 6,
  },
  itemSubtitle: {
    fontSize: 14,
  },
  itemInfo: {
    fontSize: 13,
    flex: 1,
    marginLeft: 8,
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  itemInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  waiverActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  waiverStatus: {
    flexDirection: 'column',
    gap: 8,
    flex: 1,
  },
  waiverStatusText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
    alignSelf: 'flex-start',
  },
  signWaiverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginLeft: 12,
  },
  signWaiverButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  participantInfo: {
    flexDirection: 'column',
    flex: 1,
    marginLeft: 12,
  },
  detailsGrid: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  signButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  waiverSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  waiverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  waiverTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 