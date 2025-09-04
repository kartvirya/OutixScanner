# AWS SNS Push Notifications Setup Guide

This guide will help you set up AWS SNS push notifications for your React Native app.

## Prerequisites

1. AWS Account with SNS access
2. Apple Developer Account (for iOS)
3. React Native app with Expo

## Step 1: AWS SNS Configuration

### 1.1 Create SNS Platform Application

1. Go to AWS SNS Console
2. Navigate to "Mobile" → "Push notifications"
3. Click "Create platform application"
4. Choose "Apple iOS (APNS)" for iOS
5. Upload your APNS certificate (.p12 file)
6. Note down the Platform Application ARN

### 1.2 Configure AWS Credentials

Update the following files with your AWS credentials:

#### `aws-exports.js`
```javascript
const awsConfig = {
  "aws_project_region": "us-east-1", // Your AWS region
  "aws_cognito_identity_pool_id": "YOUR_IDENTITY_POOL_ID",
  "aws_cognito_region": "us-east-1",
  "aws_user_pools_id": "YOUR_USER_POOL_ID",
  "aws_user_pools_web_client_id": "YOUR_CLIENT_ID",
  "aws_push_notification_platform": "APNS",
  "aws_push_notification_app_id": "YOUR_APP_ID"
};

export default awsConfig;
```

#### `services/snsService.ts`
```typescript
AWS.config.update({
  region: 'us-east-1', // Your AWS region
  accessKeyId: 'YOUR_ACCESS_KEY_ID',
  secretAccessKey: 'YOUR_SECRET_ACCESS_KEY',
});

// Update the platform application ARN
this.platformApplicationArn = 'YOUR_PLATFORM_APPLICATION_ARN';
```

## Step 2: iOS Configuration

### 2.1 Create APNS Certificate

1. Log in to Apple Developer Console
2. Go to Certificates, Identifiers & Profiles
3. Create a new certificate for "Apple Push Notification service SSL"
4. Download and convert to .p12 format
5. Upload to AWS SNS Platform Application

### 2.2 Update iOS App Configuration

#### `ios/YourApp/AppDelegate.mm`
```objc
#import "AmplifyPushNotification.h"
#import <UserNotifications/UserNotifications.h>

- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
  [AmplifyPushNotification didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult result))completionHandler {
  [AmplifyPushNotification didReceiveRemoteNotification:userInfo withCompletionHandler:completionHandler];
}
```

#### `ios/YourApp/AppDelegate.h`
```objc
#import <UserNotifications/UNUserNotificationCenter.h>

@interface AppDelegate : RCTAppDelegate <UNUserNotificationCenterDelegate>
```

### 2.3 Enable Push Notifications

1. Open your iOS project in Xcode
2. Go to your app target settings
3. Enable "Push Notifications" capability
4. Add the APNS certificate to your provisioning profile

## Step 3: React Native Configuration

### 3.1 Install Dependencies

```bash
npm install aws-amplify @aws-amplify/react-native react-native-get-random-values react-native-url-polyfill --legacy-peer-deps
```

### 3.2 Initialize Amplify

#### `app/_layout.tsx`
```typescript
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Amplify, Notifications } from 'aws-amplify';
import awsconfig from '../aws-exports';

// Configure AWS Amplify
Amplify.configure(awsconfig);

// Enable push notifications
Notifications.Push.enable();
```

## Step 4: Usage

### 4.1 Using the Push Notification Hook

```typescript
import { usePushNotifications } from '../hooks/usePushNotifications';

function MyComponent() {
  const {
    token,
    isInitialized,
    hasPermission,
    requestPermissions,
    sendTokenToBackend,
  } = usePushNotifications();

  // Request permissions
  const handleRequestPermissions = async () => {
    const granted = await requestPermissions();
    if (granted) {
      console.log('Permissions granted!');
    }
  };

  // Send token to your backend
  const handleSendToken = async () => {
    if (token) {
      await sendTokenToBackend('user-id');
    }
  };

  return (
    <View>
      <Text>Token: {token}</Text>
      <Button title="Request Permissions" onPress={handleRequestPermissions} />
      <Button title="Send Token" onPress={handleSendToken} />
    </View>
  );
}
```

### 4.2 Using the SNS Service

```typescript
import snsService from '../services/snsService';

// Send a test notification
const sendTestNotification = async (deviceToken: string) => {
  try {
    await snsService.sendTestNotification(deviceToken);
    console.log('Test notification sent!');
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
};

// Send custom notification
const sendCustomNotification = async (deviceToken: string) => {
  const payload = {
    title: 'Custom Notification',
    body: 'This is a custom message',
    data: {
      type: 'custom',
      userId: '123',
    },
    sound: 'default',
    badge: 1,
  };

  try {
    await snsService.sendToDevice(deviceToken, payload, 'ios');
    console.log('Custom notification sent!');
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
};
```

## Step 5: Testing

### 5.1 Test Push Notifications

1. Run your app on a physical device (push notifications don't work in simulator)
2. Navigate to Profile → Push Notifications → Test
3. Request permissions if needed
4. Copy the device token
5. Use AWS SNS console to send a test message

### 5.2 AWS SNS Console Testing

1. Go to AWS SNS Console
2. Navigate to your Platform Application
3. Click "Create application endpoint"
4. Paste the device token
5. Click "Publish message to the endpoint"
6. Enter your test message and send

## Step 6: Backend Integration

### 6.1 Store Device Tokens

Create an API endpoint to store device tokens:

```typescript
// POST /api/register-device
{
  "token": "device_token_here",
  "platform": "ios",
  "userId": "user_id_here",
  "timestamp": 1234567890
}
```

### 6.2 Send Notifications from Backend

```typescript
import snsService from '../services/snsService';

// Send notification to user
const sendNotificationToUser = async (userId: string, message: string) => {
  // Get user's device tokens from database
  const deviceTokens = await getUserDeviceTokens(userId);
  
  const payload = {
    title: 'New Message',
    body: message,
    data: {
      type: 'message',
      userId,
    },
  };

  // Send to all user's devices
  for (const token of deviceTokens) {
    await snsService.sendToDevice(token, payload, 'ios');
  }
};
```

## Troubleshooting

### Common Issues

1. **"Invalid token" error**: Make sure you're using the correct APNS certificate (sandbox vs production)
2. **"Endpoint disabled" error**: The device token might be invalid or expired
3. **No notifications received**: Check that push notifications are enabled in device settings
4. **Permissions denied**: User must manually enable notifications in device settings

### Debug Steps

1. Check AWS CloudWatch logs for SNS errors
2. Verify APNS certificate is valid and uploaded correctly
3. Test with AWS SNS console first
4. Check device token format and validity
5. Ensure app is running on physical device, not simulator

## Security Considerations

1. Store AWS credentials securely (use environment variables)
2. Implement proper token validation
3. Use IAM roles with minimal required permissions
4. Regularly rotate AWS access keys
5. Monitor SNS usage and costs

## Cost Optimization

1. Use SNS topics for broadcasting to multiple users
2. Implement token cleanup for inactive devices
3. Monitor and optimize notification frequency
4. Use appropriate message sizes to minimize costs

## Next Steps

1. Implement notification categories and actions
2. Add rich media support (images, videos)
3. Implement notification analytics
4. Add support for Android FCM
5. Implement notification scheduling

