import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  FlatList,
  RefreshControl,
  Modal,
  Alert,
  StyleSheet,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { useRefresh } from '../../../context/RefreshContext';
import { GuestListProvider, useGuestList } from '../../../context/GuestListContext';
import {
  GuestListHeader,
  SearchAndFilter,
  GuestListItem,
  EmptyState,
  LoadingState,
  LoadMoreFooter,
  SearchInfoBar,
} from '../../../components/GuestListComponents';
import QRScanner from '../../../components/QRScanner';
import SuccessModal from '../../../components/SuccessModal';
import ErrorModal from '../../../components/ErrorModal';
import { feedback } from '../../../services/feedback';
import { validateQRCode, scanQRCode } from '../../../services/api';
import { getEvents } from '../../../services/api';

// Main component wrapped with provider
export default function GuestListPageOptimized() {
  return (
    <GuestListProvider>
      <GuestListContent />
    </GuestListProvider>
  );
}

// Inner component that uses the context
function GuestListContent() {
  const { colors } = useTheme();
  const { triggerAttendanceRefresh, triggerAnalyticsRefresh } = useRefresh();
  const { id } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id || '1';
  
  const { state, actions, computed } = useGuestList();
  const [showScanner, setShowScanner] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalData, setModalData] = useState<{
    type?: 'checkin-success' | 'checkout-success';
    errorType?: 'already-scanned' | 'not-checked-in' | 'invalid-ticket' | 'general';
    guestName?: string;
    ticketType?: string;
    checkedInDate?: string;
    message?: string;
  }>({});
  
  // Initialize event info
  useEffect(() => {
    const initializeEvent = async () => {
      try {
        const events = await getEvents();
        const event = events.find(e => e.id === eventId);
        if (event) {
          actions.setEventInfo(eventId, event.title);
        }
      } catch (error) {
        console.error('Failed to get event info:', error);
        actions.setEventInfo(eventId, 'Event');
      }
    };
    
    initializeEvent();
  }, [eventId]);
  
  // Initial load
  useEffect(() => {
    if (state.eventId) {
      actions.fetchGuestsPaginated(1);
      actions.fetchCheckedInGuests();
    }
  }, [state.eventId]);
  
  // Handle manual check-in
  const handleCheckIn = useCallback(async (guest) => {
    feedback.buttonPressHeavy();
    
    const success = await actions.checkInGuest(guest);
    
    if (success) {
      feedback.checkIn();
      
      // Show success modal like QR scanning
      setModalData({
        type: 'checkin-success',
        guestName: guest.name,
        ticketType: guest.ticketType,
        message: 'Guest has been checked in successfully',
      });
      setShowSuccessModal(true);
      
      triggerAttendanceRefresh(eventId);
      triggerAnalyticsRefresh();
    } else {
      feedback.checkInError();
      
      // Show error modal like QR scanning
      setModalData({
        errorType: 'general',
        guestName: guest.name,
        ticketType: guest.ticketType,
        message: 'Unable to check in guest. Please try again.',
      });
      setShowErrorModal(true);
    }
  }, [actions, eventId, triggerAttendanceRefresh, triggerAnalyticsRefresh]);
  
  // Handle manual check-out
  const handleCheckOut = useCallback(async (guest) => {
    feedback.buttonPressHeavy();
    
    const success = await actions.checkOutGuest(guest);
    
    if (success) {
      feedback.checkOut();
      
      // Show success modal like QR scanning
      setModalData({
        type: 'checkout-success',
        guestName: guest.name,
        ticketType: guest.ticketType,
        message: 'Guest has been checked out successfully',
      });
      setShowSuccessModal(true);
      
      triggerAttendanceRefresh(eventId);
      triggerAnalyticsRefresh();
    } else {
      feedback.error();
      
      // Show error modal like QR scanning
      setModalData({
        errorType: 'general',
        guestName: guest.name,
        ticketType: guest.ticketType,
        message: 'Unable to check out guest. Please try again.',
      });
      setShowErrorModal(true);
    }
  }, [actions, eventId, triggerAttendanceRefresh, triggerAnalyticsRefresh]);
  
  // Handle guest press
  const handleGuestPress = useCallback((guest) => {
    feedback.buttonPress();
    router.push({
      pathname: '/guest-list/guest-details',
      params: {
        guestData: JSON.stringify(guest),
        eventTitle: state.eventTitle,
        returnTo: `/guest-list/${eventId}` // Add return path to guest list
      },
    });
  }, [state.eventTitle, eventId]);
  
  // Handle QR scan result
  const handleScanResult = useCallback(async (data: string) => {
    try {
      feedback.scan();
      
      // Validate QR code first
      const validationResult = await validateQRCode(eventId, data);
      
      if (validationResult?.error) {
        feedback.checkInError();
        Alert.alert('Invalid QR Code', validationResult.msg || 'This QR code is not valid for this event');
        return;
      }
      
      // Perform the scan
      const scanResult = await scanQRCode(eventId, data);
      
      if (scanResult?.error) {
        if (scanResult.msg?.includes('already')) {
          feedback.alreadyScanned();
          Alert.alert('Already Checked In', scanResult.msg);
        } else {
          feedback.checkInError();
          Alert.alert('Scan Failed', scanResult.msg || 'Failed to check in guest');
        }
      } else {
        feedback.checkIn();
        
        // Refresh the lists
        await Promise.all([
          actions.fetchCheckedInGuests(),
          actions.fetchGuestsPaginated(state.currentPage, true),
        ]);
        
        triggerAttendanceRefresh(eventId);
        triggerAnalyticsRefresh();
        
        Alert.alert('Success', scanResult?.msg || 'Guest checked in successfully');
      }
      
      setShowScanner(false);
    } catch (error) {
      console.error('Scan error:', error);
      feedback.error();
      Alert.alert('Error', 'An error occurred while processing the scan');
      setShowScanner(false);
    }
  }, [eventId, actions, state.currentPage, triggerAttendanceRefresh, triggerAnalyticsRefresh]);
  
  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await actions.refreshGuestList();
    triggerAttendanceRefresh(eventId);
    triggerAnalyticsRefresh();
  }, [actions, eventId, triggerAttendanceRefresh, triggerAnalyticsRefresh]);
  
  // Render guest item with memoization
  const renderItem = useCallback(({ item }) => (
    <GuestListItem
      guest={item}
      onPress={() => handleGuestPress(item)}
      onCheckIn={() => handleCheckIn(item)}
      onCheckOut={() => handleCheckOut(item)}
    />
  ), [handleGuestPress, handleCheckIn, handleCheckOut]);
  
  // Key extractor
  const keyExtractor = useCallback((item) => item.id, []);
  
  // Get item layout for better performance
  const getItemLayout = useCallback((data, index) => ({
    length: 90, // Estimated item height
    offset: 90 * index,
    index,
  }), []);
  
  // Empty component based on state
  const ListEmptyComponent = useMemo(() => {
    if (state.loading) return null;
    
    const isFiltered = state.isSearchMode || state.filterStatus !== 'all';
    
    return (
      <EmptyState
        message={
          state.isSearchMode
            ? `No guests found for "${state.searchQuery}"`
            : isFiltered
            ? 'No guests match your filters'
            : 'No guests registered'
        }
        description={
          state.isSearchMode
            ? 'Try a different search term or check spelling.'
            : isFiltered
            ? 'Try adjusting your search or filter criteria.'
            : 'No one has registered for this event yet.'
        }
        actionLabel={
          state.isSearchMode
            ? 'Clear Search'
            : !isFiltered
            ? 'Refresh List'
            : undefined
        }
        onAction={
          state.isSearchMode
            ? actions.clearSearch
            : !isFiltered
            ? handleRefresh
            : undefined
        }
      />
    );
  }, [state.loading, state.isSearchMode, state.filterStatus, state.searchQuery, actions.clearSearch, handleRefresh]);
  
  // List footer component
  const ListFooterComponent = useMemo(() => (
    <>
      <LoadMoreFooter
        loading={state.loadingMore}
        hasMore={state.hasMore}
        onLoadMore={actions.loadMore}
        totalCount={state.totalCount}
        displayedCount={computed.filteredGuests.length}
      />
      <SearchInfoBar
        isSearchMode={state.isSearchMode}
        searchQuery={state.searchQuery}
        resultCount={computed.filteredGuests.length}
        filterStatus={state.filterStatus}
        onClearSearch={actions.clearSearch}
      />
    </>
  ), [
    state.loadingMore,
    state.hasMore,
    state.isSearchMode,
    state.searchQuery,
    state.filterStatus,
    state.totalCount,
    computed.filteredGuests.length,
    actions.loadMore,
    actions.clearSearch,
  ]);
  
  if (state.loading && state.guests.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Guest List", headerShown: true }} />
        <LoadingState />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: "Guest List", headerShown: true }} />
      
      <GuestListHeader
        eventTitle={state.eventTitle}
        totalCount={state.totalCount}
        checkedInCount={computed.checkedInCount}
        attendancePercentage={computed.attendancePercentage}
        onBack={() => {
          feedback.buttonPress();
          router.back();
        }}
      />
      
      <SearchAndFilter
        searchQuery={state.searchQuery}
        filterStatus={state.filterStatus}
        onSearchChange={actions.setSearchQuery}
        onFilterChange={actions.setFilterStatus}
      />
      
      <FlatList
        data={computed.filteredGuests}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        onEndReached={actions.loadMore}
        onEndReachedThreshold={0.1}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        initialNumToRender={15}
      />
      
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
        statusBarTranslucent
      >
        <QRScanner
          onScan={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      </Modal>
      
      {/* Success Modal for manual operations */}
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setModalData({});
        }}
        type={modalData.type || 'checkin-success'}
        guestName={modalData.guestName}
        ticketType={modalData.ticketType}
        message={modalData.message}
      />
      
      {/* Error Modal for manual operations */}
      <ErrorModal
        visible={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setModalData({});
        }}
        type={modalData.errorType || 'general'}
        guestName={modalData.guestName}
        ticketType={modalData.ticketType}
        message={modalData.message}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 120,
    flexGrow: 1,
  },
});
