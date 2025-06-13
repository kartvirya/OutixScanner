# Auto-Refresh System

The OutixScanner app now includes a comprehensive auto-refresh system that keeps all data synchronized across different screens after every action.

## Features

### 1. **Real-time Data Synchronization**
- After every scan operation (check-in/check-out), all related screens automatically refresh
- Guest lists, attendance counts, and analytics update instantly
- No need to manually refresh or navigate away and back

### 2. **Cross-Component Communication**
- Uses a centralized refresh context (`RefreshContext`) to coordinate updates
- Components register listeners for specific events and data types
- Triggers propagate updates across the entire app

### 3. **Automatic Periodic Refresh**
- Events list refreshes every 60 seconds
- Analytics and other data refreshes every 30 seconds (configurable)
- Ensures data stays current even without user interaction

### 4. **Manual Refresh Support**
- Pull-to-refresh functionality on all list screens
- Refresh buttons where appropriate
- User can force immediate data updates

## Components with Auto-Refresh

### Events List (`/(tabs)/index.tsx`)
- **Triggers**: Periodic refresh every 60 seconds
- **Manual**: Pull-to-refresh gesture
- **Updates**: Event list from API

### Event Detail (`/(tabs)/[id].tsx`)
- **Triggers**: After individual scan operations, auto-refresh from context
- **Manual**: Manual refresh buttons
- **Updates**: Guest counts, attendance statistics

### Guest List (`/(tabs)/guest-list/[id].tsx`)
- **Triggers**: After scan operations, context-based refresh
- **Manual**: Pull-to-refresh, manual check-in buttons
- **Updates**: Guest list, check-in status, attendance counts

### Attendance (`/(tabs)/attendance/[id].tsx`)
- **Triggers**: After scan operations, context-based refresh
- **Manual**: Pull-to-refresh
- **Updates**: Checked-in guest list, attendance statistics

### Analytics (`/(tabs)/analytics.tsx`)
- **Triggers**: After any scan operation, periodic refresh
- **Manual**: Pull-to-refresh gesture
- **Updates**: All analytics data, attendance rates, revenue

### Scanner (`/(tabs)/scanner.tsx`)
- **Triggers**: After successful scan operations
- **Effects**: Triggers refresh for guest list, attendance, and analytics
- **Updates**: Propagates scan results to other components

### Group Scanner (`/(tabs)/group-scan/[id].tsx`)
- **Triggers**: After successful group scan operations
- **Effects**: Triggers refresh for guest list, attendance, and analytics
- **Updates**: Propagates group scan results to other components

## Technical Implementation

### RefreshContext
```typescript
// Central refresh management
const { 
  triggerGuestListRefresh,
  triggerAttendanceRefresh, 
  triggerAnalyticsRefresh,
  onGuestListRefresh,
  setAutoRefreshInterval 
} = useRefresh();
```

### Usage Pattern
```typescript
// Register for auto-refresh
useEffect(() => {
  const unsubscribe = onGuestListRefresh(eventId, () => {
    fetchData(); // Refresh component data
  });
  return unsubscribe; // Cleanup on unmount
}, [eventId]);

// Trigger refresh after action
const handleScanSuccess = () => {
  // Perform scan...
  triggerGuestListRefresh(eventId);
  triggerAnalyticsRefresh();
};
```

### Auto-Refresh Intervals
- **Events**: 60 seconds
- **Analytics**: 30 seconds (default)
- **Event-specific data**: On-demand via context triggers

## Benefits

1. **Real-time Updates**: Users see immediate results after scanning
2. **Consistent Data**: All screens show the same current information
3. **Better UX**: No need to manually refresh or navigate between screens
4. **Performance**: Smart triggering prevents unnecessary API calls
5. **Reliability**: Periodic refresh ensures data doesn't get stale

## Configuration

Auto-refresh intervals can be adjusted in the RefreshContext:

```typescript
// Enable auto-refresh with custom interval
setAutoRefreshInterval(true, 45000); // 45 seconds

// Disable auto-refresh
setAutoRefreshInterval(false);
```

The system is designed to be efficient and only updates when necessary, providing a seamless user experience while keeping data fresh and synchronized across all app components. 