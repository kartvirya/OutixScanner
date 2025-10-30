import {
    ArrowLeft,
    ChevronDown,
    Search,
    User,
    UserCheck,
    Users,
} from 'lucide-react-native';
import React, { memo } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Attendee } from '../context/GuestListContext';
import { useTheme } from '../context/ThemeContext';

// Guest List Header Component
export const GuestListHeader = memo(({
  eventTitle,
  totalCount,
  checkedInCount,
  attendancePercentage,
  onBack,
}: {
  eventTitle: string;
  totalCount: number;
  checkedInCount: number;
  attendancePercentage: number;
  onBack: () => void;
}) => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.header, { backgroundColor: colors.card }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={20} color="#FF6B00" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Guest List</Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>{eventTitle}</Text>
        </View>
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{totalCount}</Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#22C55E' }]}>{checkedInCount}</Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Present</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#FF6B00' }]}>{attendancePercentage}%</Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Rate</Text>
        </View>
      </View>
    </View>
  );
});

GuestListHeader.displayName = 'GuestListHeader';

// Search and Filter Component
export const SearchAndFilter = memo(({
  searchQuery,
  filterStatus,
  onSearchChange,
  onFilterChange,
}: {
  searchQuery: string;
  filterStatus: 'all' | 'checked-in' | 'not-arrived';
  onSearchChange: (query: string) => void;
  onFilterChange: (status: 'all' | 'checked-in' | 'not-arrived') => void;
}) => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Search size={16} color={colors.secondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search guests..."
          placeholderTextColor={colors.secondary}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      </View>
      
      <View style={styles.filterButtons}>
        <FilterButton
          label="All"
          active={filterStatus === 'all'}
          activeColor="#FF6B00"
          onPress={() => onFilterChange('all')}
        />
        <FilterButton
          label="Checked In"
          active={filterStatus === 'checked-in'}
          activeColor="#22C55E"
          onPress={() => onFilterChange('checked-in')}
        />
        <FilterButton
          label="Pending"
          active={filterStatus === 'not-arrived'}
          activeColor="#FF6B35"
          onPress={() => onFilterChange('not-arrived')}
        />
      </View>
    </View>
  );
});

SearchAndFilter.displayName = 'SearchAndFilter';

// Filter Button Component
const FilterButton = memo(({
  label,
  active,
  activeColor,
  onPress,
}: {
  label: string;
  active: boolean;
  activeColor: string;
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  
  return (
    <TouchableOpacity
      style={[
        styles.filterButton,
        { backgroundColor: active ? activeColor : colors.card }
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.filterText,
        { color: active ? '#FFFFFF' : colors.text }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

FilterButton.displayName = 'FilterButton';

// Guest List Item Component
export const GuestListItem = memo(({
  guest,
  onPress,
  onCheckIn,
  onCheckOut,
}: {
  guest: Attendee;
  onPress: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
}) => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.guestItem, { backgroundColor: colors.card }]}>
      <TouchableOpacity style={styles.guestInfo} onPress={onPress}>
        <Text style={[styles.guestName, { color: colors.text }]}>{guest.name}</Text>
        <Text style={[styles.guestEmail, { color: colors.secondary }]}>{guest.email}</Text>
        <Text style={[styles.guestTicket, { color: '#FF6B00' }]}>{guest.ticketType}</Text>
      </TouchableOpacity>
      
      <View style={styles.guestActions}>
        {guest.scannedIn ? (
          <View style={styles.actionGroup}>
            <TouchableOpacity
              style={styles.checkOutButton}
              onPress={onCheckOut}
              activeOpacity={0.7}
            >
              <User size={12} color="#FFFFFF" />
              <Text style={styles.checkOutText}>Pass Out</Text>
            </TouchableOpacity>
            <View style={styles.statusPresent} />
          </View>
        ) : (
          <View style={styles.actionGroup}>
            <TouchableOpacity
              style={styles.checkInButton}
              onPress={onCheckIn}
            >
              <UserCheck size={12} color="#FFFFFF" />
              <Text style={styles.checkInText}>Check In</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
});

GuestListItem.displayName = 'GuestListItem';

// Empty State Component
export const EmptyState = memo(({
  message,
  description,
  actionLabel,
  onAction,
}: {
  message: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) => {
  const { colors } = useTheme();
  
  return (
    <View style={styles.emptyContainer}>
      <Users size={60} color={colors.secondary} opacity={0.5} />
      <Text style={[styles.emptyText, { color: colors.text }]}>{message}</Text>
      <Text style={[styles.emptySubtext, { color: colors.secondary }]}>{description}</Text>
      
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.emptyActionButton, { backgroundColor: colors.primary }]}
          onPress={onAction}
        >
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

EmptyState.displayName = 'EmptyState';

// Loading State Component
export const LoadingState = memo(({ message = 'Loading guest list...' }: { message?: string }) => {
  const { colors } = useTheme();
  
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.text }]}>{message}</Text>
    </View>
  );
});

LoadingState.displayName = 'LoadingState';

// Load More Footer Component
export const LoadMoreFooter = memo(({
  loading,
  hasMore,
  onLoadMore,
  totalCount,
  displayedCount,
}: {
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  totalCount: number;
  displayedCount: number;
}) => {
  const { colors } = useTheme();
  
  if (loading) {
    return (
      <View style={styles.loadMoreContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadMoreText, { color: colors.secondary }]}>
          Loading more guests...
        </Text>
      </View>
    );
  }
  
  if (hasMore) {
    return (
      <TouchableOpacity
        style={[styles.showMoreButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onLoadMore}
      >
        <Text style={[styles.showMoreText, { color: colors.primary }]}>
          Show More Guests
        </Text>
        <ChevronDown size={16} color={colors.primary} />
      </TouchableOpacity>
    );
  }
  
  if (displayedCount > 0) {
    return (
      <View style={styles.endOfListContainer}>
        <Text style={[styles.endOfListText, { color: colors.secondary }]}>
          All guests loaded ({totalCount} total)
        </Text>
      </View>
    );
  }
  
  return null;
});

LoadMoreFooter.displayName = 'LoadMoreFooter';

// Search Info Bar Component
export const SearchInfoBar = memo(({
  isSearchMode,
  searchQuery,
  resultCount,
  filterStatus,
  onClearSearch,
}: {
  isSearchMode: boolean;
  searchQuery: string;
  resultCount: number;
  filterStatus: string;
  onClearSearch: () => void;
}) => {
  const { colors } = useTheme();
  
  if (!isSearchMode && filterStatus === 'all') return null;
  
  return (
    <View style={[styles.searchInfoContainer, { backgroundColor: colors.card }]}>
      <Text style={[styles.searchInfoText, { color: colors.secondary }]}>
        {isSearchMode
          ? `Found ${resultCount} guests matching "${searchQuery}"`
          : `Showing ${resultCount} guests (${filterStatus})`
        }
      </Text>
      {isSearchMode && (
        <TouchableOpacity onPress={onClearSearch} style={styles.clearSearchButton}>
          <Text style={[styles.clearSearchText, { color: colors.primary }]}>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

SearchInfoBar.displayName = 'SearchInfoBar';

const styles = StyleSheet.create({
  // Header styles
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    opacity: 0.7,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Search and filter styles
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Guest item styles
  guestItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginVertical: 3,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  guestInfo: {
    flex: 1,
    paddingRight: 8,
  },
  guestName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  guestEmail: {
    fontSize: 12,
    marginBottom: 3,
  },
  guestTicket: {
    fontSize: 11,
    fontWeight: '500',
  },
  guestActions: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 100,
  },
  actionGroup: {
    alignItems: 'flex-end',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#FF6B00',
    marginBottom: 6,
  },
  checkInText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
    marginLeft: 3,
  },
  checkOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F72585',
    marginBottom: 6,
  },
  checkOutText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
    marginLeft: 3,
  },
  statusPresent: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  
  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '80%',
  },
  emptyActionButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Loading state styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  
  // Load more footer styles
  loadMoreContainer: {
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    marginLeft: 8,
  },
  showMoreButton: {
    margin: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  endOfListContainer: {
    padding: 12,
    alignItems: 'center',
  },
  endOfListText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  
  // Search info bar styles
  searchInfoContainer: {
    margin: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchInfoText: {
    fontSize: 14,
    flex: 1,
  },
  clearSearchButton: {
    padding: 8,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
