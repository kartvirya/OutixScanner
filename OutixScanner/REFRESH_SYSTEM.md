# Manual Refresh System

The OutixScanner app includes a targeted refresh system that updates specific components after check-in/check-out operations only.

## Features

### 1. **Targeted Data Refresh**
- After every scan operation (check-in/check-out), only related components refresh
- Guest lists, attendance counts, and analytics update after user actions
- No automatic periodic refreshing - only manual refresh available

### 2. **Cross-Component Communication**
- Uses a centralized refresh context (`RefreshContext`) to coordinate updates
- Components register listeners for specific events and data types
- Triggers propagate updates only after check-in/check-out operations

### 3. **Manual Refresh Only**
- Pull-to-refresh functionality on all list screens
- Refresh buttons where appropriate
- User controls when data updates occur

## Components with Manual Refresh

### Events List (`/(tabs)/index.tsx`)
- **Triggers**: Manual only
- **Manual**: Pull-to-refresh gesture
- **Updates**: Event list from API

### Event Detail (`/(tabs)/[id].tsx`)
- **Triggers**: After individual scan operations only
- **Manual**: Manual refresh buttons
- **Updates**: Guest counts, attendance statistics

### Guest List (`/(tabs)/guest-list/[id].tsx`)
- **Triggers**: After scan operations only
- **Manual**: Pull-to-refresh, manual check-in buttons
- **Updates**: Guest list, check-in status, attendance counts

### Attendance (`/(tabs)/attendance/[id].tsx`)
- **Triggers**: After scan operations only
- **Manual**: Pull-to-refresh
- **Updates**: Checked-in guest list, attendance statistics

### Analytics (`/(tabs)/analytics.tsx`)
- **Triggers**: After any scan operation only
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
// Manual refresh management
const { 
  triggerGuestListRefresh,
  triggerAttendanceRefresh, 
  triggerAnalyticsRefresh,
  onGuestListRefresh,
  refreshAll 
} = useRefresh();
```

### Usage Pattern
```typescript
// Register for manual refresh
useEffect(() => {
  const unsubscribe = onGuestListRefresh(eventId, () => {
    fetchData(); // Refresh component data
  });
  return unsubscribe; // Cleanup on unmount
}, [eventId]);

// Trigger refresh after scan action only
const handleScanSuccess = () => {
  // Perform scan...
  triggerGuestListRefresh(eventId);
  triggerAnalyticsRefresh();
};
```

## Benefits

1. **Battery Efficiency**: No background auto-refresh saves device battery
2. **Network Efficiency**: Reduces unnecessary API calls
3. **User Control**: Users decide when to refresh data
4. **Targeted Updates**: Only updates after actual user actions (scan operations)
5. **Performance**: Smart triggering prevents unnecessary API calls

## Refresh Triggers

Data refreshes occur only in these scenarios:

1. **After Check-in/Check-out Operations**: Via scanner or manual buttons
2. **Manual Pull-to-Refresh**: User-initiated refresh gestures
3. **Manual Refresh Buttons**: Explicit user actions
4. **Initial Load**: When screens first load

The system is designed to be efficient and only updates when necessary, providing user control while ensuring data accuracy after scan operations. 