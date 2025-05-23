# QR Code Validation Implementation

This document describes the implementation of QR code validation features for the OutixScanner app, including validation, scanning, and unscanning functionality.

## Overview

The QR validation system implements three main API endpoints:
1. **Validate QR Code** - Validates a QR code without admitting the guest
2. **Scan QR Code** - Admits the guest (performs the actual check-in)
3. **Unscan QR Code** - Removes the admission (undo check-in)

## API Endpoints

### Base URL
- **Production**: `https://www.outix.co/apis`
- **Proxy**: `http://localhost:3000/api` (for CORS bypass)

### 1. Validate QR Code
**GET** `/validate/:eventid/:scancode`

Validates the QR code without performing any admission.

**Headers:**
- `Auth-Token`: (from Login)

**Response:**
```json
{
  "error": false,
  "msg": {
    "message": "The International Club - Weekend (Sat + Sun) 1 Admit(s)",
    "info": {
      "id": "7880418",
      "booking_id": "11276388",
      "reference_num": "2219667572",
      "ticket_identifier": "11276388SUBUZUDE",
      "ticket_title": "The International Club - Weekend (Sat + Sun)",
      "checkedin": 0,
      "checkedin_date": "0000-00-00 00:00:00",
      "totaladmits": "1",
      "admits": "2",
      "available": 1,
      "price": "900.00",
      "remarks": "",
      "email": "Hillfish1@gmail.com",
      "fullname": "Tracy Hill",
      "address": " ",
      "notes": "",
      "purchased_date": "2024-10-18 03:26:17",
      "reason": "",
      "message": "",
      "mobile": "",
      "picture_display": "",
      "scannable": "1",
      "ticket_id": "64599",
      "passout": "0"
    }
  },
  "status": 200
}
```

### 2. Scan QR Code (Admit Guest)
**GET** `/scan/:eventid/:scancode`

Scans the QR code and admits the guest.

**Headers:**
- `Auth-Token`: (from Login)

**Response:**
Same structure as validate, but `checkedin` will be updated to 1 and `checkedin_date` will be set.

### 3. Unscan QR Code (Remove Admission)
**GET** `/scan/:eventid/:scancode?unscan=1`

Removes the admission from a previously scanned QR code.

**Headers:**
- `Auth-Token`: (from Login)

**Response:**
Same structure as validate, but `checkedin` will be updated to 0.

## Implementation Details

### Proxy Server Updates

Added three new endpoints in `OutixScanner/server.js`:

```javascript
// Validate QR code
app.get('/api/validate/:eventid/:scancode', async (req, res) => { ... });

// Scan QR code (with unscan support)
app.get('/api/scan/:eventid/:scancode', async (req, res) => { ... });
```

### API Service Functions

Added to `OutixScanner/services/api.ts`:

```typescript
// Type definitions
export interface TicketInfo { ... }
export interface QRValidationResponse { ... }

// Functions
export const validateQRCode = async (eventId: string, scanCode: string): Promise<QRValidationResponse | null>
export const scanQRCode = async (eventId: string, scanCode: string): Promise<QRValidationResponse | null>
export const unscanQRCode = async (eventId: string, scanCode: string): Promise<QRValidationResponse | null>
```

### Updated Event Detail Screen

Modified `OutixScanner/app/[id].tsx` to use the new QR validation workflow:

1. When QR code is scanned, first validate it
2. Show ticket information and confirmation dialog
3. If user confirms, scan the QR code to admit the guest
4. Refresh the guest list to show updated status

## Usage Examples

### Basic Usage

```typescript
import { validateQRCode, scanQRCode, unscanQRCode } from '../services/api';

// Validate a QR code
const validationResult = await validateQRCode('eventId', 'scanCode');
if (validationResult && !validationResult.error) {
  console.log('Valid ticket for:', validationResult.msg.info.fullname);
}

// Admit a guest
const scanResult = await scanQRCode('eventId', 'scanCode');
if (scanResult && !scanResult.error) {
  console.log('Guest admitted:', scanResult.msg.info.fullname);
}

// Remove admission
const unscanResult = await unscanQRCode('eventId', 'scanCode');
if (unscanResult && !unscanResult.error) {
  console.log('Admission removed for:', unscanResult.msg.info.fullname);
}
```

### With Error Handling

```typescript
try {
  const result = await validateQRCode(eventId, scanCode);
  
  if (!result) {
    Alert.alert('Error', 'Failed to validate QR code');
    return;
  }
  
  if (result.error) {
    Alert.alert('Invalid QR Code', result.msg?.message || 'Invalid code');
    return;
  }
  
  // Process valid result
  const ticketInfo = result.msg.info;
  console.log(`Valid ticket for ${ticketInfo.fullname}`);
  
} catch (error) {
  console.error('Validation error:', error);
  Alert.alert('Error', 'An unexpected error occurred');
}
```

## Testing

### QR Validation Demo Component

Created `OutixScanner/components/QRValidationDemo.tsx` for testing the functionality:

- Input field for scan codes
- Buttons for Validate, Scan, and Unscan
- Display of results and ticket information
- Error handling and loading states

### Testing the Demo

1. Navigate to an event detail screen
2. Use the QR Validation Demo component
3. Enter a valid scan code
4. Test each operation (validate, scan, unscan)

## Integration with Existing Features

### QR Scanner Component

The existing `QRScanner` component now works with the new validation system:

1. Scan QR code with camera
2. Automatically validate the scanned code
3. Show confirmation dialog with ticket details
4. Allow user to admit the guest
5. Update guest list in real-time

### Authentication

All QR validation requests use the existing authentication system:
- Auth token is automatically added to request headers
- Same login credentials as other API calls
- Fallback to stored tokens if available

## Error Handling

The implementation includes comprehensive error handling:

### Network Errors
- Timeout handling (10 second timeout)
- Connection error detection
- Graceful fallbacks

### API Errors
- HTTP status code checking
- Error message extraction from API responses
- User-friendly error messages

### Validation Errors
- Invalid QR code format
- Expired or invalid tickets
- Already scanned tickets
- Insufficient admits remaining

## Future Enhancements

### Potential Improvements

1. **Offline Support**: Cache QR validation results for offline use
2. **Batch Operations**: Support scanning multiple QR codes at once
3. **Detailed Logging**: Enhanced logging for audit trails
4. **Push Notifications**: Real-time updates for scan events
5. **Analytics**: Detailed scanning statistics and reports

### Performance Optimizations

1. **Request Caching**: Cache validation results to reduce API calls
2. **Background Sync**: Queue operations for background processing
3. **Optimistic Updates**: Update UI immediately, sync in background

## Troubleshooting

### Common Issues

1. **Proxy Server Not Running**
   - Ensure `npm run proxy` is running
   - Check proxy URL in `services/api.ts`

2. **Authentication Failures**
   - Verify auth token is valid
   - Check network connectivity
   - Try logging in again

3. **Invalid QR Codes**
   - Ensure QR code is for the correct event
   - Check if ticket is still valid
   - Verify scan code format

### Debug Information

Enable debug logging by checking console output:
- Network requests and responses
- Authentication status
- QR validation results
- Error details

## Security Considerations

### Best Practices

1. **Token Security**: Auth tokens are stored securely
2. **Input Validation**: All inputs are validated before API calls
3. **Error Handling**: No sensitive information in error messages
4. **Network Security**: HTTPS for all API communications

### Data Protection

- Personal information is handled according to privacy policies
- Temporary storage of ticket information only
- No unnecessary data retention 