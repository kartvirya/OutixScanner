# Waiver Submission API Documentation

## Overview
This document describes the API endpoint for submitting digital waivers from the OutixScanner mobile application.

## Endpoint Configuration

### Demo Endpoint (Currently Used)
```
POST https://jsonplaceholder.typicode.com/posts
```

### Production Endpoint (Replace This)
```
POST https://your-production-server.com/api/waivers/submit
```

## Request Headers
```
Content-Type: application/json
Accept: application/json
Auth-Token: [Your authentication token if required]
```

## Request Payload

### Complete Parameter List

```json
{
  // === PERSONAL INFORMATION ===
  "firstName": "string",           // Required - Participant's first name
  "lastName": "string",            // Required - Participant's last name  
  "fullName": "string",            // Auto-generated: firstName + lastName
  "email": "string",               // Required - Participant's email address
  "mobile": "string",              // Required - Participant's mobile number
  "dateOfBirth": "string",         // Required - Format: YYYY-MM-DD
  "address": "string",             // Optional - Participant's address
  "signature": "string",           // Required - Base64 encoded SVG signature
  "acknowledged": true,            // Required - Must be true (user accepted terms)
  
  // === WITNESS INFORMATION ===
  "witnessName": "string",         // Required - Witness full name
  "witnessEmail": "string",        // Required - Witness email address
  "witnessPhone": "string",        // Optional - Witness phone number
  "witnessSignature": "string",    // Required - Base64 encoded SVG signature
  
  // === EVENT INFORMATION ===
  "eventId": "string",             // Required - Unique event identifier
  "eventName": "string",           // Required - Name of the event
  "eventDate": "string",           // Required - Event date (ISO format)
  "waiverLink": "string",          // Optional - URL to waiver terms
  
  // === ADDITIONAL RACING/VEHICLE FIELDS ===
  "driverRiderName": "string",     // Optional - Driver/Rider name
  "manufacturer": "string",        // Optional - Vehicle manufacturer
  "model": "string",               // Optional - Vehicle model
  "engineCapacity": "string",      // Optional - Engine capacity
  "year": "string",                // Optional - Vehicle year
  "sponsors": "string",            // Optional - Sponsor information
  "quickestET": "string",          // Optional - Quickest elapsed time
  "quickestMPH": "string",         // Optional - Quickest speed (MPH)
  "andraLicenseNumber": "string",  // Optional - ANDRA license number
  "ihraLicenseNumber": "string",   // Optional - IHRA license number
  "licenseExpiryDate": "string",   // Optional - License expiry date
  "driversLicenseNumber": "string", // Optional - Driver's license number
  "emergencyContactName": "string", // Optional - Emergency contact name
  "emergencyContactNumber": "string", // Optional - Emergency contact number
  "racingNumber": "string",        // Optional - Racing number
  
  // === METADATA ===
  "submissionTimestamp": "string", // Required - ISO timestamp when submitted
  "deviceInfo": "string",          // Required - Device/app information
  "ipAddress": "string",           // Optional - Will be determined by server
  "source": "OutixScanner",        // Fixed - Application identifier
  "version": "1.0.0"               // Fixed - App version
}
```

### Example Request Payload

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "mobile": "+1234567890",
  "dateOfBirth": "1990-05-15",
  "address": "123 Main St, City, State 12345",
  "signature": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE1...",
  "acknowledged": true,
  
  "witnessName": "Jane Smith",
  "witnessEmail": "jane.smith@example.com",
  "witnessPhone": "+1987654321",
  "witnessSignature": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE1...",
  
  "eventId": "evt_2024_racing_championship",
  "eventName": "2024 Racing Championship",
  "eventDate": "2024-08-15T10:00:00Z",
  "waiverLink": "https://example.com/waivers/racing-terms",
  
  "driverRiderName": "John Doe",
  "manufacturer": "Ford",
  "model": "Mustang",
  "engineCapacity": "5.0L V8",
  "year": "2023",
  "sponsors": "Local Garage, Speed Shop",
  "quickestET": "12.5",
  "quickestMPH": "115",
  "andraLicenseNumber": "ANDRA123456",
  "ihraLicenseNumber": "",
  "licenseExpiryDate": "2025-12-31",
  "driversLicenseNumber": "DL123456789",
  "emergencyContactName": "Mary Doe",
  "emergencyContactNumber": "+1555123456",
  "racingNumber": "42",
  
  "submissionTimestamp": "2024-01-15T14:30:00Z",
  "deviceInfo": "OutixScanner Mobile App - ios",
  "ipAddress": "192.168.1.100",
  "source": "OutixScanner",
  "version": "1.0.0"
}
```

## Expected Response

### Success Response
```json
{
  "success": true,
  "message": "Waiver submitted successfully",
  "waiverUrl": "https://your-server.com/waivers/view/12345",
  "waiverRef": "WAV-1705329000000",
  "submissionId": "sub_1705329000000",
  "status": 200
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation error: Email is required",
  "error": true,
  "status": 400
}
```

## Implementation Steps for Production

### 1. Update API Endpoint
In `OutixScanner/services/api.ts`, replace the demo endpoint:

```typescript
// Change this line:
const DEMO_ENDPOINT = 'https://jsonplaceholder.typicode.com/posts';

// To your production endpoint:
const PRODUCTION_ENDPOINT = 'https://your-production-server.com/api/waivers/submit';
```

### 2. Server-Side Implementation Requirements

Your production server should:

1. **Validate Required Fields**
   - firstName, lastName, email, mobile, dateOfBirth
   - signature, witnessName, witnessEmail, witnessSignature
   - eventId, eventName, eventDate

2. **Handle Signatures**
   - Signatures are Base64 encoded SVG data
   - Store them securely (database BLOB or file storage)
   - Consider generating thumbnail images for quick preview

3. **Generate Unique References**
   - `waiverRef`: Unique waiver reference (e.g., WAV-timestamp)
   - `submissionId`: Database primary key or UUID

4. **Store Complete Data**
   - All fields should be stored for legal compliance
   - Include submission timestamp and device info for audit trail

5. **Return Proper Response**
   - Follow the response format shown above
   - Include generated URLs and references

### 3. Authentication
If your API requires authentication, the app will automatically include the `Auth-Token` header from the user's login session.

### 4. Error Handling
The app handles various HTTP status codes:
- 200: Success
- 400: Validation error
- 401: Authentication required
- 500: Server error

### 5. Testing
Use the demo endpoint first to test the complete flow, then switch to production.

## Security Considerations

1. **HTTPS Only**: Ensure all communication uses HTTPS
2. **Input Validation**: Validate all input fields on the server
3. **Signature Verification**: Consider implementing signature validation
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Audit Trail**: Log all submissions for compliance

## Database Schema Suggestion

```sql
CREATE TABLE waiver_submissions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    waiver_ref VARCHAR(50) UNIQUE NOT NULL,
    
    -- Personal Info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    date_of_birth DATE NOT NULL,
    address TEXT,
    signature LONGTEXT NOT NULL,
    acknowledged BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Witness Info
    witness_name VARCHAR(200) NOT NULL,
    witness_email VARCHAR(255) NOT NULL,
    witness_phone VARCHAR(20),
    witness_signature LONGTEXT NOT NULL,
    
    -- Event Info
    event_id VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_date DATETIME NOT NULL,
    waiver_link TEXT,
    
    -- Additional Fields
    driver_rider_name VARCHAR(200),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    engine_capacity VARCHAR(50),
    year VARCHAR(4),
    sponsors TEXT,
    quickest_et VARCHAR(20),
    quickest_mph VARCHAR(20),
    andra_license_number VARCHAR(50),
    ihra_license_number VARCHAR(50),
    license_expiry_date DATE,
    drivers_license_number VARCHAR(50),
    emergency_contact_name VARCHAR(200),
    emergency_contact_number VARCHAR(20),
    racing_number VARCHAR(20),
    
    -- Metadata
    submission_timestamp DATETIME NOT NULL,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    source VARCHAR(50) DEFAULT 'OutixScanner',
    version VARCHAR(20),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_waiver_ref (waiver_ref),
    INDEX idx_event_id (event_id),
    INDEX idx_email (email),
    INDEX idx_submission_date (submission_timestamp)
);
```

## Support
For questions about this API implementation, please contact the development team. 