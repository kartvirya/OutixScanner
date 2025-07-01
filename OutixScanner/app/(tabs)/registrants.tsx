import { Calendar, Car, ChevronDown, ClipboardList, DollarSign, ExternalLink, FileCheck, Hash, Mail, MapPin, Phone, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../context/ThemeContext';
import { getRegistrations, getWaivers, isAuthenticated, login, Registration, Waiver } from '../../services/api';

type TabType = 'registrations' | 'waivers';

export default function Registrants() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('registrations');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [selectedWaiverUrl, setSelectedWaiverUrl] = useState<string>('');

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
      
      // Auto-select first event for waivers if available
      if (data.length > 0 && !selectedEventId) {
        console.log('Auto-selecting first event:', data[0].id);
        setSelectedEventId(data[0].id);
        await loadWaivers(data[0].id);
      }
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
      setLoading(true);
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
      setError(error instanceof Error ? error.message : 'Failed to load waivers');
      setWaivers([]);
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
      if (activeTab === 'registrations') {
        await loadRegistrations();
      } else if (selectedEventId) {
        await loadWaivers(selectedEventId);
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, selectedEventId]);

  const handleEventSelect = async (eventId: string) => {
    setSelectedEventId(eventId);
    setShowEventDropdown(false);
    await loadWaivers(eventId);
  };

  const handleSignWaiver = (waiverUrl: string) => {
    setSelectedWaiverUrl(waiverUrl);
    setShowWaiverModal(true);
  };

  const closeWaiverModal = () => {
    setShowWaiverModal(false);
    setSelectedWaiverUrl('');
    // Refresh waivers to get updated status
    if (selectedEventId) {
      loadWaivers(selectedEventId);
    }
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tab,
          { backgroundColor: activeTab === 'registrations' ? colors.primary : 'transparent' }
        ]}
        onPress={() => setActiveTab('registrations')}
      >
        <ClipboardList size={20} color={activeTab === 'registrations' ? '#fff' : colors.text} />
        <Text style={[
          styles.tabText,
          { color: activeTab === 'registrations' ? '#fff' : colors.text }
        ]}>
          Registrations
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tab,
          { backgroundColor: activeTab === 'waivers' ? colors.primary : 'transparent' }
        ]}
        onPress={() => setActiveTab('waivers')}
      >
        <FileCheck size={20} color={activeTab === 'waivers' ? '#fff' : colors.text} />
        <Text style={[
          styles.tabText,
          { color: activeTab === 'waivers' ? '#fff' : colors.text }
        ]}>
          Waivers
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEventSelector = () => {
    if (activeTab !== 'waivers' || registrations.length === 0) return null;

    const selectedEvent = registrations.find(event => event.id === selectedEventId);
    
    return (
      <View style={styles.eventSelector}>
        <Text style={[styles.selectorLabel, { color: colors.text }]}>Select Event:</Text>
        
        <TouchableOpacity
          style={[styles.dropdownButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowEventDropdown(true)}
        >
          <Text style={[styles.dropdownButtonText, { color: colors.text }]} numberOfLines={1}>
            {selectedEvent ? selectedEvent.EventName : 'Select an event'}
          </Text>
          <ChevronDown size={20} color={colors.text} />
        </TouchableOpacity>

        <Modal
          visible={showEventDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEventDropdown(false)}
        >
      <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowEventDropdown(false)}
      >
            <View style={[styles.dropdownModal, { backgroundColor: colors.card }]}>
              <View style={[styles.dropdownHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.dropdownTitle, { color: colors.text }]}>Select Event</Text>
        </View>
              
              <FlatList
                data={registrations}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: colors.border },
                      selectedEventId === item.id && { backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => {
                      handleEventSelect(item.id);
                      setShowEventDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        { color: selectedEventId === item.id ? colors.primary : colors.text }
                      ]}
                      numberOfLines={2}
                    >
                      {item.EventName}
                    </Text>
                    <Text style={[styles.dropdownItemDate, { color: colors.secondary }]}>
                      {new Date(item.showStart).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
                style={styles.dropdownList}
              />
        </View>
      </TouchableOpacity>
        </Modal>
      </View>
    );
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
            <Text style={[styles.itemDate, { color: colors.secondary }]}>
              {new Date(item.showStart).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.itemDetails}>
        <Text style={[styles.itemSubtitle, { color: colors.secondary }]} numberOfLines={1}>
          {item.EventSubtitle || 'No subtitle'}
        </Text>
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <MapPin size={16} color={colors.secondary} />
            <Text style={[styles.itemInfo, { color: colors.secondary }]} numberOfLines={1}>
              {item.VenueName}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <User size={16} color={colors.secondary} />
            <Text style={[styles.itemInfo, { color: colors.secondary }]} numberOfLines={1}>
              {item.organizerName}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <MapPin size={16} color={colors.secondary} />
            <Text style={[styles.itemInfo, { color: colors.secondary }]} numberOfLines={1}>
              {item.City}, {item.PostCode}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderWaiverItem = ({ item }: { item: Waiver }) => (
    <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleContainer}>
          <FileCheck size={24} color={colors.primary} />
          <View style={styles.participantInfo}>
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
              {item['Driver Rider Name']}
            </Text>
            <Text style={[styles.itemSubtitle, { color: colors.secondary }]} numberOfLines={1}>
              {item.Category} - {item.ItemName}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.itemDetails}>
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Mail size={16} color={colors.secondary} />
            <Text style={[styles.itemInfo, { color: colors.secondary }]} numberOfLines={1}>
              {item.Email}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Phone size={16} color={colors.secondary} />
            <Text style={[styles.itemInfo, { color: colors.secondary }]} numberOfLines={1}>
              {item.Mobile}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Car size={16} color={colors.secondary} />
            <Text style={[styles.itemInfo, { color: colors.secondary }]} numberOfLines={1}>
              {item.Manufacturer} {item.Model} ({item.Year})
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <DollarSign size={16} color={colors.secondary} />
            <Text style={[styles.itemInfo, { color: colors.secondary }]}>
              ${item.Amount}
            </Text>
          </View>
          
          {item['Racing Number'] && item['Racing Number'] !== 'NA' && (
            <View style={styles.detailItem}>
              <Hash size={16} color={colors.secondary} />
              <Text style={[styles.itemInfo, { color: colors.secondary }]}>
                Racing #{item['Racing Number']}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.waiverActions}>
          <View style={styles.waiverStatus}>
            <View style={[
              styles.statusBadge,
              { 
                backgroundColor: item.WaiverSigned === 'YES' ? '#10B98120' : '#EF444420',
                borderColor: item.WaiverSigned === 'YES' ? '#10B981' : '#EF4444',
              }
            ]}>
              <Text style={[
                styles.statusBadgeText, 
                { color: item.WaiverSigned === 'YES' ? '#10B981' : '#EF4444' }
              ]}>
                {item.WaiverSigned === 'YES' ? '✓ Waiver Signed' : '✗ Waiver Pending'}
              </Text>
            </View>
            
            <View style={[
              styles.statusBadge,
              { 
                backgroundColor: item.CheckedIn === 'YES' ? '#10B98120' : '#F59E0B20',
                borderColor: item.CheckedIn === 'YES' ? '#10B981' : '#F59E0B',
              }
            ]}>
              <Text style={[
                styles.statusBadgeText, 
                { color: item.CheckedIn === 'YES' ? '#10B981' : '#F59E0B' }
              ]}>
                {item.CheckedIn === 'YES' ? '✓ Checked In' : '⏳ Check-in Pending'}
      </Text>
            </View>
          </View>
          
          {item.WaiverSigned !== 'YES' && (
            <TouchableOpacity
              style={[styles.signWaiverButton, { backgroundColor: colors.primary }]}
              onPress={() => handleSignWaiver(item.WaiverLink)}
            >
              <ExternalLink size={18} color="#FFFFFF" />
              <Text style={styles.signWaiverButtonText}>Sign Waiver</Text>
            </TouchableOpacity>
          )}
        </View>
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

      {renderTabs()}
      {renderEventSelector()}
      
      {activeTab === 'registrations' ? (
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
      ) : (
        <FlatList
          data={waivers}
          keyExtractor={(item) => item.Ref}
          renderItem={renderWaiverItem}
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
      )}
      
      {/* WebView Modal for Waiver Signing */}
      <Modal
        visible={showWaiverModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeWaiverModal}
      >
        <View style={[styles.waiverModalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.waiverModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.waiverModalTitle, { color: colors.text }]}>Sign Waiver</Text>
            <TouchableOpacity
              style={[styles.closeWaiverButton, { backgroundColor: colors.card }]}
              onPress={closeWaiverModal}
            >
              <Text style={[styles.closeWaiverButtonText, { color: colors.text }]}>Done</Text>
            </TouchableOpacity>
          </View>
          
          {selectedWaiverUrl ? (
            <WebView
              source={{ uri: selectedWaiverUrl }}
              style={styles.webView}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={[styles.webViewLoading, { backgroundColor: colors.background }]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.text }]}>Loading waiver...</Text>
                </View>
              )}
            />
          ) : null}
        </View>
      </Modal>
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
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
  waiverModalContainer: {
    flex: 1,
  },
  waiverModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  waiverModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  closeWaiverButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeWaiverButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantInfo: {
    flexDirection: 'column',
    flex: 1,
    marginLeft: 12,
  },
  detailsGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
}); 