import { Calendar, ChevronDown, ClipboardList, FileCheck, Mail, MapPin, Phone, User, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View, SafeAreaView, StatusBar, Platform } from 'react-native';
import WaiverSigningModal from '../../components/WaiverSigningModal';
import { useTheme } from '../../context/ThemeContext';
import { getRegistrations, getWaivers, isAuthenticated, login, submitWaiver, Registration, Waiver } from '../../services/api';

export default function Registrants() {
  const { colors } = useTheme();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [selectedEventForWaivers, setSelectedEventForWaivers] = useState<Registration | null>(null);
  const [showWaiversModal, setShowWaiversModal] = useState(false);
  const [waiversLoading, setWaiversLoading] = useState(false);
  
  // Add new state for selected waiver and role
  const [selectedWaiver, setSelectedWaiver] = useState<Waiver | null>(null);
  const [selectedRole, setSelectedRole] = useState<'driver' | 'crew'>('driver');

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

  const loadWaivers = async (eventId: string) => {
    try {
      console.log('Starting to load waivers for event:', eventId);
      setWaiversLoading(true);
      setError(null);
      
      // Ensure we're authenticated first
      const authenticated = await checkAuthAndLogin();
      if (!authenticated) {
        return;
      }
      
      const data = await getWaivers(eventId);
      console.log('Waivers loaded:', data.length, 'items');
      setWaivers(data);
    } catch (error) {
      console.error('Error loading waivers:', error);
      // Show some user feedback
      setError(error instanceof Error ? error.message : 'Failed to load waivers');
      setWaivers([]);
    } finally {
      setWaiversLoading(false);
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

  const handleRegistrationCardPress = (registration: Registration) => {
    setSelectedEventForWaivers(registration);
    setShowWaiversModal(true);
    loadWaivers(registration.id);
  };

  const handleSignWaiverForEvent = (waiver: Waiver, role: 'driver' | 'crew') => {
    if (!selectedEventForWaivers) {
      console.error('No event selected');
      return;
    }

    // Create a registration-like object for the waiver modal
    const waiverRegistration: Registration = {
      id: selectedEventForWaivers.id,
      EventName: selectedEventForWaivers.EventName,
      EventSubtitle: selectedEventForWaivers.EventSubtitle,
      EventDuration: selectedEventForWaivers.EventDuration,
      organizerName: selectedEventForWaivers.organizerName,
      urlShortName: selectedEventForWaivers.urlShortName,
      EventLogo: selectedEventForWaivers.EventLogo,
      EventImage: selectedEventForWaivers.EventImage,
      showStart: selectedEventForWaivers.showStart,
      VenueName: selectedEventForWaivers.VenueName,
      VenueAddress: selectedEventForWaivers.VenueAddress,
      City: selectedEventForWaivers.City,
      PostCode: selectedEventForWaivers.PostCode,
      WaiverLink: selectedEventForWaivers.WaiverLink,
      WaiverLogo: selectedEventForWaivers.WaiverLogo,
      WaiverBgImage: selectedEventForWaivers.WaiverBgImage,
    };

    // Store the role for the waiver signing process
    console.log('Signing waiver for role:', role);
    setSelectedRegistration(waiverRegistration);
    setSelectedWaiver(waiver);
    setSelectedRole(role);
    setShowWaiverModal(true);
    setShowWaiversModal(false); // Close the waivers list modal
  };

  const closeWaiverModal = () => {
    setShowWaiverModal(false);
    setSelectedRegistration(null);
    setSelectedWaiver(null);
    setSelectedRole('driver');
    // Refresh waivers to get updated status
    if (selectedEventForWaivers) {
      loadWaivers(selectedEventForWaivers.id);
      setShowWaiversModal(true); // Show the waivers list modal again
    }
  };

  const closeWaiversModal = () => {
    setShowWaiversModal(false);
    setSelectedEventForWaivers(null);
    setWaivers([]);
    setError(null);
  };

  const renderRegistrationItem = ({ item }: { item: Registration }) => (
    <TouchableOpacity
      style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => handleRegistrationCardPress(item)}
      activeOpacity={0.7}
    >
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


      </View>
    </TouchableOpacity>
  );

  const renderWaiverItem = ({ item }: { item: Waiver }) => (
    <View style={[styles.waiverCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header with status */}
      <View style={styles.waiverHeader}>
        <View style={styles.waiverTitleContainer}>
          <FileCheck size={24} color={colors.primary} />
          <View style={styles.waiverInfo}>
            <Text style={[styles.waiverTitle, { color: colors.text }]} numberOfLines={2}>
              {item['Driver Rider Name'] || item.ItemName}
            </Text>
            <Text style={[styles.waiverDate, { color: colors.text }]}>
              Registered: {new Date(item.RegisteredDate).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={[
          styles.waiverStatusBadge,
          { backgroundColor: item.WaiverSigned === 'Yes' ? '#10B981' : '#EF4444' }
        ]}>
          <Text style={styles.waiverStatusText}>
            {item.WaiverSigned === 'Yes' ? 'Signed' : 'Pending'}
          </Text>
        </View>
      </View>

      {/* Category */}
      <View style={styles.waiverCategory}>
        <Text style={[styles.categoryText, { color: colors.text }]}>
          {item.Category}
        </Text>
      </View>

      {/* Contact Information */}
      <View style={styles.contactSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>
        <View style={styles.contactGrid}>
          <View style={styles.contactItem}>
            <Mail size={16} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.text }]} numberOfLines={1}>
              {item.Email}
            </Text>
          </View>
          
          <View style={styles.contactItem}>
            <Phone size={16} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.text }]} numberOfLines={1}>
              {item.Mobile}
            </Text>
          </View>
          
          <View style={styles.contactItem}>
            <User size={16} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.text }]} numberOfLines={1}>
              {item['Contact Name']}
            </Text>
          </View>
          
          {item.Address && (
            <View style={styles.contactItem}>
              <MapPin size={16} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.text }]} numberOfLines={1}>
                {item.Address}
              </Text>
            </View>
          )}
        </View>
      </View>
        
      {/* Vehicle Details */}
      {(item.Manufacturer || item.Model || item['Racing Number']) && (
        <View style={styles.vehicleSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Vehicle Details</Text>
          <View style={styles.vehicleGrid}>
            {item.Manufacturer && (
              <View style={styles.vehicleItem}>
                <Text style={[styles.vehicleLabel, { color: colors.text }]}>Make:</Text>
                <Text style={[styles.vehicleValue, { color: colors.text }]}>{item.Manufacturer}</Text>
              </View>
            )}
            {item.Model && (
              <View style={styles.vehicleItem}>
                <Text style={[styles.vehicleLabel, { color: colors.text }]}>Model:</Text>
                <Text style={[styles.vehicleValue, { color: colors.text }]}>{item.Model}</Text>
              </View>
            )}
            {item['Racing Number'] && (
              <View style={styles.vehicleItem}>
                <Text style={[styles.vehicleLabel, { color: colors.text }]}>Racing #:</Text>
                <Text style={[styles.vehicleValue, { color: colors.text }]}>{item['Racing Number']}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Waiver Actions - only show if waiver is not signed */}
      {item.WaiverSigned !== 'Yes' && item.WaiverLink && (
        <View style={styles.waiverActions}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Waiver Signing Required</Text>
          <View style={styles.waiverButtonsContainer}>
            <TouchableOpacity
              style={[styles.waiverButton, styles.driverButton]}
              onPress={() => handleSignWaiverForEvent(item, 'driver')}
            >
              <User size={18} color="#FFFFFF" />
              <Text style={styles.waiverButtonText}>Driver Waiver</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.waiverButton, styles.crewButton]}
              onPress={() => handleSignWaiverForEvent(item, 'crew')}
            >
              <ClipboardList size={18} color="#FFFFFF" />
              <Text style={styles.waiverButtonText}>Crew Waiver</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderWaiversModal = () => (
    <Modal
      visible={showWaiversModal}
      animationType="slide"
      transparent={false}
      onRequestClose={closeWaiversModal}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <StatusBar 
          barStyle={colors.background === '#000000' ? 'light-content' : 'dark-content'} 
          backgroundColor={colors.background} 
          translucent={false}
        />
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.modalTitleContainer}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Waivers - {selectedEventForWaivers?.EventName}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.text }]}>
              {selectedEventForWaivers && new Date(selectedEventForWaivers.showStart).toLocaleDateString()}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.card }]}
            onPress={closeWaiversModal}
          >
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {waiversLoading ? (
          <View style={[styles.container, styles.centered]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading waivers...
            </Text>
          </View>
        ) : error ? (
          <View style={[styles.container, styles.centered]}>
            <Text style={[styles.errorText, { color: '#EF4444' }]}>Error: {error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setError(null);
                if (selectedEventForWaivers) {
                  loadWaivers(selectedEventForWaivers.id);
                }
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={waivers}
            keyExtractor={(item) => item.Ref}
            renderItem={renderWaiverItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={[styles.errorText, { color: colors.text }]}>
                  No waivers found for this event
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );

  // Show loading screen while checking authentication or loading initial data
  if (!authChecked || (loading && registrations.length === 0)) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar 
          barStyle={colors.background === '#000000' ? 'light-content' : 'dark-content'} 
          backgroundColor={colors.background} 
          translucent={false}
        />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          {!authChecked ? 'Authenticating...' : 'Loading registrations...'}
        </Text>
      </SafeAreaView>
    );
  }

  if (error && registrations.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar 
          barStyle={colors.background === '#000000' ? 'light-content' : 'dark-content'} 
          backgroundColor={colors.background} 
          translucent={false}
        />
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={colors.background === '#000000' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background} 
        translucent={false}
      />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Registrations</Text>
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

      {renderWaiversModal()}
      
      {/* WaiverSigningModal */}
      {selectedRegistration && selectedRegistration.WaiverLink && selectedWaiver && (
        <WaiverSigningModal
          visible={showWaiverModal}
          onClose={closeWaiverModal}
          waiver={selectedWaiver}
          eventName={selectedRegistration.EventName}
          eventDate={selectedRegistration.showStart}
          waiverLink={selectedRegistration.WaiverLink}
          waiverLogo={selectedRegistration.WaiverLogo}
          waiverBgImage={selectedRegistration.WaiverBgImage}
          role={selectedRole}
          onSubmit={async (waiverData) => {
            try {
              // Transform WaiverData into WaiverSubmissionData
              const submissionData = {
                waiverType: (selectedRole === 'driver' ? 'Entrant' : 'Crew') as 'Entrant' | 'Crew',
                waiver_ref: selectedWaiver.Ref || 'unknown-ref',
                first_name: waiverData.firstName,
                last_name: waiverData.lastName,
                date_of_birth: waiverData.dateOfBirth,
                email_address: waiverData.email,
                mobile_number: waiverData.mobile,
                witness_name: waiverData.witnessName,
                applicant_name: `${waiverData.firstName} ${waiverData.lastName}`,
                witness_address: waiverData.witnessPhone || 'Not provided',
                applicantSignFile: waiverData.signature,
                witnessSignFile: waiverData.witnessSignature,
                // Add parent/guardian information if signed by parent
                signed_by_parent: waiverData.signedByParent,
                parent_name: waiverData.signedByParent ? waiverData.parentName : undefined
              };

              // Submit the waiver data
              const response = await submitWaiver(submissionData);
              
              if (response.success) {
                Alert.alert(
                  'Success',
                  'Waiver submitted successfully!',
                  [{ text: 'OK', onPress: closeWaiverModal }]
                );
              } else {
                throw new Error(response.message || 'Failed to submit waiver');
              }
            } catch (error) {
              console.error('Error submitting waiver:', error);
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to submit waiver. Please try again.',
                [{ text: 'OK' }]
              );
            }
          }}
        />
      )}
    </SafeAreaView>
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    borderBottomWidth: 1,
  },
  modalTitleContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  tapIndicator: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  tapIndicatorText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
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
  waiverCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  waiverTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  waiverInfo: {
    flexDirection: 'column',
    flex: 1,
    marginLeft: 12,
  },
  waiverDate: {
    fontSize: 12,
    marginTop: 2,
  },
  waiverStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  waiverStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  waiverCategory: {
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contactSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  contactGrid: {
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 13,
    flex: 1,
    marginLeft: 8,
  },
  vehicleSection: {
    marginBottom: 12,
  },
  vehicleGrid: {
    gap: 8,
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  vehicleValue: {
    fontSize: 13,
    flex: 1,
  },
  waiverActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  waiverButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  waiverButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  driverButton: {
    backgroundColor: '#F59E0B',
  },
  crewButton: {
    backgroundColor: '#10B981',
  },
  waiverButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 