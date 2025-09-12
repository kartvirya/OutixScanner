import { Calendar, ClipboardList, FileCheck, Mail, MapPin, Phone, Search, User, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WaiverSigningModal from '../../components/WaiverSigningModal';
import { useTheme } from '../../context/ThemeContext';
import {
  getRegistrations,
  getWaivers,
  isAuthenticated,
  Registration,
  submitWaiver,
  Waiver,
} from '../../services/api';
import { formatAppDateTime } from '../../utils/date';

// Performance optimization: Memoized components
const RegistrationCard = React.memo(function RegistrationCard({
  item, 
  onPress, 
  colors 
}: { 
  item: Registration; 
  onPress: (item: Registration) => void;
  colors: any;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.itemCard, { 
          backgroundColor: colors.card, 
          borderColor: colors.border,
          shadowColor: colors.text,
        }]}
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrapper, { backgroundColor: `${colors.primary}20` }]}>
            <Calendar size={20} color={colors.primary} />
          </View>
          <View style={styles.headerContent}>
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
              {item.EventName}
            </Text>
            <Text style={[styles.itemDate, { color: `${colors.text}88` }]}>
              {formatAppDateTime(item.showStart)}
            </Text>
          </View>
        </View>

        {item.EventSubtitle && (
          <View style={styles.subtitleContainer}>
            <Text style={[styles.itemSubtitle, { color: `${colors.text}CC` }]} numberOfLines={1}>
              {item.EventSubtitle}
            </Text>
          </View>
        )}

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <MapPin size={14} color={`${colors.text}88`} />
            <Text style={[styles.detailText, { color: `${colors.text}CC` }]} numberOfLines={1}>
              {item.VenueName}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <User size={14} color={`${colors.text}88`} />
            <Text style={[styles.detailText, { color: `${colors.text}CC` }]} numberOfLines={1}>
              {item.organizerName}
            </Text>
          </View>
          
          {item.City && (
            <View style={styles.detailRow}>
              <MapPin size={14} color={`${colors.text}88`} />
              <Text style={[styles.detailText, { color: `${colors.text}CC` }]} numberOfLines={1}>
                {item.City}{item.PostCode ? `, ${item.PostCode}` : ''}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.actionIndicator, { backgroundColor: `${colors.primary}15` }]}>
          <Text style={[styles.actionText, { color: colors.primary }]}>
            View Waivers →
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const WaiverCard = React.memo(function WaiverCard({
  item, 
  onSignDriver,
  onSignCrew,
  colors 
}: { 
  item: Waiver;
  onSignDriver: (waiver: Waiver) => void;
  onSignCrew: (waiver: Waiver) => void;
  colors: any;
}) {
  const isSigned = item.WaiverSigned && item.WaiverSigned.toLowerCase() === 'yes';
  
  return (
    <View style={[styles.waiverCard, { 
      backgroundColor: colors.card, 
      borderColor: isSigned ? '#10B98130' : colors.border,
      borderWidth: isSigned ? 2 : 1,
    }]}>
      <View style={styles.waiverHeader}>
        <View style={styles.waiverTitleSection}>
          <View style={[styles.waiverIconWrapper, { 
            backgroundColor: isSigned ? '#10B98120' : `${colors.primary}20` 
          }]}>
            <FileCheck size={20} color={isSigned ? '#10B981' : colors.primary} />
          </View>
          <View style={styles.waiverInfo}>
            <Text style={[styles.waiverName, { color: colors.text }]} numberOfLines={1}>
              {item['Driver Rider Name'] || item.ItemName}
            </Text>
            <Text style={[styles.waiverMeta, { color: `${colors.text}88` }]}>
              {formatAppDateTime(item.RegisteredDate)}
            </Text>
          </View>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: isSigned ? '#10B981' : '#EF4444' }
        ]}>
          <Text style={styles.statusBadgeText}>
            {isSigned ? '✓ Signed' : 'Pending'}
          </Text>
        </View>
      </View>

      <View style={[styles.categoryBadge, { backgroundColor: `${colors.primary}10` }]}>
        <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>
          {item.Category}
        </Text>
      </View>

      <View style={styles.waiverDetails}>
        <View style={styles.waiverDetailRow}>
          <Mail size={14} color={`${colors.text}66`} />
          <Text style={[styles.waiverDetailText, { color: `${colors.text}BB` }]} numberOfLines={1}>
            {item.Email}
          </Text>
        </View>
        
        {item.Mobile && (
          <View style={styles.waiverDetailRow}>
            <Phone size={14} color={`${colors.text}66`} />
            <Text style={[styles.waiverDetailText, { color: `${colors.text}BB` }]} numberOfLines={1}>
              {item.Mobile}
            </Text>
          </View>
        )}
        
        {item['Contact Name'] && (
          <View style={styles.waiverDetailRow}>
            <User size={14} color={`${colors.text}66`} />
            <Text style={[styles.waiverDetailText, { color: `${colors.text}BB` }]} numberOfLines={1}>
              {item['Contact Name']}
            </Text>
          </View>
        )}
      </View>

      {(item.Manufacturer || item.Model || item['Racing Number']) && (
        <View style={[styles.vehicleInfo, { backgroundColor: `${colors.text}08` }]}>
          <Text style={[styles.vehicleInfoTitle, { color: colors.text }]}>Vehicle</Text>
          <View style={styles.vehicleInfoContent}>
            {item.Manufacturer && (
              <Text style={[styles.vehicleInfoText, { color: `${colors.text}BB` }]}>
                {item.Manufacturer}
              </Text>
            )}
            {item.Model && (
              <Text style={[styles.vehicleInfoText, { color: `${colors.text}BB` }]}>
                {item.Model}
              </Text>
            )}
            {item['Racing Number'] && (
              <View style={[styles.racingNumberBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.racingNumberText}>#{item['Racing Number']}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {!isSigned && item.WaiverLink && (
        <View style={styles.waiverActions}>
          <TouchableOpacity
            style={[styles.waiverActionButton, styles.driverButton]}
            onPress={() => onSignDriver(item)}
            activeOpacity={0.8}
          >
            <User size={16} color="#FFFFFF" />
            <Text style={styles.waiverActionText}>Sign as Driver</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.waiverActionButton, styles.crewButton]}
            onPress={() => onSignCrew(item)}
            activeOpacity={0.8}
          >
            <ClipboardList size={16} color="#FFFFFF" />
            <Text style={styles.waiverActionText}>Sign as Crew</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

// Skeleton loader component
const SkeletonLoader = ({ colors }: { colors: any }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((index) => (
        <Animated.View
          key={index}
          style={[
            styles.skeletonCard,
            { 
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity,
            }
          ]}
        >
          <View style={styles.skeletonHeader}>
            <View style={[styles.skeletonIcon, { backgroundColor: colors.border }]} />
            <View style={styles.skeletonContent}>
              <View style={[styles.skeletonTitle, { backgroundColor: colors.border }]} />
              <View style={[styles.skeletonSubtitle, { backgroundColor: colors.border }]} />
            </View>
          </View>
          <View style={styles.skeletonDetails}>
            <View style={[styles.skeletonLine, { backgroundColor: colors.border }]} />
            <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: '70%' }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
};

// Debounce hook for search optimization
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default function OptimizedRegistrants() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [search, setSearch] = useState('');
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [selectedEventForWaivers, setSelectedEventForWaivers] = useState<Registration | null>(null);
  const [showWaiversModal, setShowWaiversModal] = useState(false);
  const [waiversLoading, setWaiversLoading] = useState(false);
  const [selectedWaiver, setSelectedWaiver] = useState<Waiver | null>(null);
  const [selectedRole, setSelectedRole] = useState<'driver' | 'crew'>('driver');

  // Debounced search value for performance
  const debouncedSearch = useDebounce(search, 300);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const checkAuthAndLogin = useCallback(async () => {
    try {
      console.log('Checking authentication status...');
      const authenticated = await isAuthenticated();
      
      if (!authenticated) {
        console.log('Not authenticated - user must login');
        setError('Please login to access this feature');
        setAuthChecked(true);
        return false;
      } else {
        console.log('Already authenticated');
        setAuthChecked(true);
        return true;
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      setError('Authentication check failed. Please login again.');
      setAuthChecked(true);
      return false;
    }
  }, []);

  const loadRegistrations = useCallback(async () => {
    try {
      console.log('Starting to load registrations...');
      setLoading(true);
      setError(null);
      
      const authenticated = await checkAuthAndLogin();
      if (!authenticated) {
        return;
      }
      
      const data = await getRegistrations();
      console.log('Registrations loaded:', data.length, 'items');
      
      setRegistrations(data);
    } catch (error) {
      console.error('Error loading registrations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load registrations');
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }, [checkAuthAndLogin]);

  const loadWaivers = useCallback(async (eventId: string) => {
    try {
      console.log('Starting to load waivers for event:', eventId);
      setWaiversLoading(true);
      setError(null);
      
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
      setWaiversLoading(false);
    }
  }, [checkAuthAndLogin]);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

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
  }, [loadRegistrations]);

  const handleRegistrationCardPress = useCallback((registration: Registration) => {
    setSelectedEventForWaivers(registration);
    setShowWaiversModal(true);
    loadWaivers(registration.id);
  }, [loadWaivers]);

  const handleSignWaiverForEvent = useCallback((waiver: Waiver, role: 'driver' | 'crew') => {
    if (!selectedEventForWaivers) {
      console.error('No event selected');
      return;
    }

    const waiverRegistration: Registration = {
      ...selectedEventForWaivers,
    };

    console.log('Signing waiver for role:', role);
    setSelectedRegistration(waiverRegistration);
    setSelectedWaiver(waiver);
    setSelectedRole(role);
    setShowWaiverModal(true);
    setShowWaiversModal(false);
  }, [selectedEventForWaivers]);

  const closeWaiverModal = useCallback(() => {
    setShowWaiverModal(false);
    setSelectedRegistration(null);
    setSelectedWaiver(null);
    setSelectedRole('driver');
    if (selectedEventForWaivers) {
      loadWaivers(selectedEventForWaivers.id);
      setShowWaiversModal(true);
    }
  }, [selectedEventForWaivers, loadWaivers]);

  const closeWaiversModal = useCallback(() => {
    setShowWaiversModal(false);
    setSelectedEventForWaivers(null);
    setWaivers([]);
    setError(null);
  }, []);

  // Optimized filtering with memoization
  const filteredRegistrations = useMemo(() => {
    if (!debouncedSearch.trim()) return registrations;
    const q = debouncedSearch.toLowerCase();
    return registrations.filter((r) =>
      (r.EventName && r.EventName.toLowerCase().includes(q)) ||
      (r.EventSubtitle && r.EventSubtitle.toLowerCase().includes(q)) ||
      (r.VenueName && r.VenueName.toLowerCase().includes(q)) ||
      (r.City && r.City.toLowerCase().includes(q)) ||
      (r.organizerName && r.organizerName.toLowerCase().includes(q))
    );
  }, [registrations, debouncedSearch]);

  const renderRegistrationItem = useCallback(({ item }: { item: Registration }) => (
    <RegistrationCard 
      item={item} 
      onPress={handleRegistrationCardPress} 
      colors={colors} 
    />
  ), [handleRegistrationCardPress, colors]);

  const renderWaiverItem = useCallback(({ item }: { item: Waiver }) => (
    <WaiverCard
      item={item}
      onSignDriver={(waiver) => handleSignWaiverForEvent(waiver, 'driver')}
      onSignCrew={(waiver) => handleSignWaiverForEvent(waiver, 'crew')}
      colors={colors}
    />
  ), [handleSignWaiverForEvent, colors]);

  const keyExtractor = useCallback((item: Registration, index: number) => 
    item.id ? `registration-${item.id}` : `registration-${index}`, []);

  const waiverKeyExtractor = useCallback((item: Waiver, index: number) => 
    item.Ref ? `waiver-${item.Ref}` : `waiver-${index}`, []);

  // Loading state
  if (!authChecked || (loading && registrations.length === 0)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <SkeletonLoader colors={colors} />
      </SafeAreaView>
    );
  }

  // Error state
  if (error && registrations.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <View style={[styles.errorIconWrapper, { backgroundColor: '#EF444420' }]}>
            <X size={48} color="#EF4444" />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Oops!</Text>
          <Text style={[styles.errorMessage, { color: `${colors.text}88` }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setError(null);
              setAuthChecked(false);
              loadRegistrations();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Registrations</Text>
          <Text style={[styles.headerSubtitle, { color: `${colors.text}66` }]}>
            {registrations.length} events
          </Text>
        </View>

        <View style={[styles.searchWrapper, { backgroundColor: colors.background }]}>
          <View style={[styles.searchContainer, { 
            backgroundColor: colors.card,
            borderColor: colors.border,
          }]}>
            <Search size={20} color={`${colors.text}66`} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search events, venues, organizers..."
              placeholderTextColor={`${colors.text}44`}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>
        </View>
      </Animated.View>

      <FlatList
        data={filteredRegistrations}
        keyExtractor={keyExtractor}
        renderItem={renderRegistrationItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.listContainer,
          filteredRegistrations.length === 0 && styles.centered
        ]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        ListEmptyComponent={
          <Animated.View style={[
            styles.emptyStateContainer,
            { 
              backgroundColor: colors.card,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}>
            <View style={[styles.emptyIconWrapper, { backgroundColor: `${colors.primary}15` }]}>
              <ClipboardList size={56} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Registrations Found
            </Text>
            <Text style={[styles.emptyDescription, { color: `${colors.text}66` }]}>
              {debouncedSearch 
                ? `No results for "${debouncedSearch}"`
                : 'You haven\'t registered for any events yet'}
            </Text>
            {debouncedSearch && (
              <TouchableOpacity
                style={[styles.clearSearchButton, { backgroundColor: `${colors.primary}15` }]}
                onPress={() => setSearch('')}
                activeOpacity={0.8}
              >
                <Text style={[styles.clearSearchText, { color: colors.primary }]}>
                  Clear Search
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        }
      />

      {/* Waivers Modal */}
      <Modal
        visible={showWaiversModal}
        animationType="slide"
        transparent={false}
        onRequestClose={closeWaiversModal}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { 
            backgroundColor: colors.background, 
            borderBottomColor: colors.border 
          }]}>
            <View style={styles.modalTitleContainer}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Event Waivers
              </Text>
              <Text style={[styles.modalSubtitle, { color: `${colors.text}66` }]}>
                {selectedEventForWaivers?.EventName}
              </Text>
              {selectedEventForWaivers && (
                <Text style={[styles.modalDate, { color: `${colors.text}44` }]}>
                  {formatAppDateTime(selectedEventForWaivers.showStart)}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.card }]}
              onPress={closeWaiversModal}
              activeOpacity={0.8}
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
                activeOpacity={0.8}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={waivers}
              keyExtractor={waiverKeyExtractor}
              renderItem={renderWaiverItem}
              contentContainerStyle={styles.modalListContainer}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <View style={[styles.emptyIconWrapper, { backgroundColor: `${colors.primary}15` }]}>
                    <FileCheck size={48} color={colors.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    No Waivers Found
                  </Text>
                  <Text style={[styles.emptyDescription, { color: `${colors.text}66` }]}>
                    No waivers available for this event
                  </Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Waiver Signing Modal */}
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
                signed_by_parent: waiverData.signedByParent,
                parent_name: waiverData.signedByParent ? waiverData.parentName : undefined
              };

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

// Removed unused screenWidth variable

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 0,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  itemCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  itemDate: {
    fontSize: 13,
    marginTop: 4,
  },
  subtitleContainer: {
    marginBottom: 12,
  },
  itemSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  actionIndicator: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonContainer: {
    padding: 20,
  },
  skeletonCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  skeletonHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonTitle: {
    height: 20,
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
  },
  skeletonSubtitle: {
    height: 14,
    borderRadius: 4,
    width: '50%',
  },
  skeletonDetails: {
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 4,
    width: '100%',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateContainer: {
    paddingVertical: 48,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: 40,
    alignItems: 'center',
  },
  emptyIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  clearSearchButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalDate: {
    fontSize: 13,
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  modalListContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  waiverCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  waiverHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  waiverTitleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  waiverIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  waiverInfo: {
    flex: 1,
  },
  waiverName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  waiverMeta: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  waiverDetails: {
    gap: 8,
    marginBottom: 12,
  },
  waiverDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waiverDetailText: {
    fontSize: 13,
    flex: 1,
  },
  vehicleInfo: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  vehicleInfoTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  vehicleInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  vehicleInfoText: {
    fontSize: 13,
  },
  racingNumberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  racingNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  waiverActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  waiverActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  driverButton: {
    backgroundColor: '#F59E0B',
  },
  crewButton: {
    backgroundColor: '#10B981',
  },
  waiverActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
});
