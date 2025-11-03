import AWS from 'aws-sdk';

// Configure AWS
AWS.config.update({
  region: 'us-east-1', // Replace with your AWS region
  accessKeyId: 'YOUR_ACCESS_KEY_ID', // Replace with your AWS access key
  secretAccessKey: 'YOUR_SECRET_ACCESS_KEY', // Replace with your AWS secret key
});

// Initialize SNS
const sns = new AWS.SNS();

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
}

export interface SNSMessage {
  GCM?: string; // For Android
  APNS?: string; // For iOS
  APNS_SANDBOX?: string; // For iOS sandbox
  default?: string; // Fallback
}

class SNSService {
  private platformApplicationArn: string;

  constructor() {
    // Replace with your SNS Platform Application ARN
    this.platformApplicationArn = 'YOUR_PLATFORM_APPLICATION_ARN';
  }

  /**
   * Send push notification to a specific device
   */
  async sendToDevice(
    deviceToken: string,
    payload: PushNotificationPayload,
    platform: 'ios' | 'android' = 'ios'
  ): Promise<AWS.SNS.PublishResponse> {
    try {
      const message = this.buildMessage(payload, platform);
      
      const params: AWS.SNS.PublishInput = {
        Message: JSON.stringify(message),
        TargetArn: deviceToken, // This should be the endpoint ARN, not the device token
        MessageStructure: 'json',
      };

      const result = await sns.publish(params).promise();
      console.log('Push notification sent successfully:', result);
      return result;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendToMultipleDevices(
    deviceTokens: string[],
    payload: PushNotificationPayload,
    platform: 'ios' | 'android' = 'ios'
  ): Promise<AWS.SNS.PublishResponse[]> {
    try {
      const message = this.buildMessage(payload, platform);
      const results: AWS.SNS.PublishResponse[] = [];

      for (const deviceToken of deviceTokens) {
        const params: AWS.SNS.PublishInput = {
          Message: JSON.stringify(message),
          TargetArn: deviceToken,
          MessageStructure: 'json',
        };

        const result = await sns.publish(params).promise();
        results.push(result);
      }

      console.log('Push notifications sent to multiple devices:', results);
      return results;
    } catch (error) {
      console.error('Error sending push notifications to multiple devices:', error);
      throw error;
    }
  }

  /**
   * Create a platform endpoint for a device token
   */
  async createPlatformEndpoint(
    deviceToken: string,
    platform: 'ios' | 'android' = 'ios',
    userData?: string
  ): Promise<string> {
    try {
      const params: AWS.SNS.CreatePlatformEndpointInput = {
        PlatformApplicationArn: this.platformApplicationArn,
        Token: deviceToken,
        CustomUserData: userData || 'User data',
      };

      const result = await sns.createPlatformEndpoint(params).promise();
      console.log('Platform endpoint created:', result.EndpointArn);
      return result.EndpointArn!;
    } catch (error) {
      console.error('Error creating platform endpoint:', error);
      throw error;
    }
  }

  /**
   * Delete a platform endpoint
   */
  async deletePlatformEndpoint(endpointArn: string): Promise<void> {
    try {
      const params: AWS.SNS.DeleteEndpointInput = {
        EndpointArn: endpointArn,
      };

      await sns.deleteEndpoint(params).promise();
      console.log('Platform endpoint deleted:', endpointArn);
    } catch (error) {
      console.error('Error deleting platform endpoint:', error);
      throw error;
    }
  }

  /**
   * Build the message structure for different platforms
   */
  private buildMessage(payload: PushNotificationPayload, platform: 'ios' | 'android'): SNSMessage {
    const { title, body, data, sound, badge } = payload;

    if (platform === 'ios') {
      const apnsPayload = {
        aps: {
          alert: {
            title,
            body,
          },
          sound: sound || 'default',
          badge: badge || 1,
        },
        ...data,
      };

      return {
        APNS: JSON.stringify(apnsPayload),
        APNS_SANDBOX: JSON.stringify(apnsPayload),
        default: body,
      };
    } else {
      // Android
      const gcmPayload = {
        data: {
          title,
          body,
          ...data,
        },
        notification: {
          title,
          body,
          sound: sound || 'default',
        },
      };

      return {
        GCM: JSON.stringify(gcmPayload),
        default: body,
      };
    }
  }

  /**
   * Send a test notification
   */
  async sendTestNotification(deviceToken: string): Promise<AWS.SNS.PublishResponse> {
    const testPayload: PushNotificationPayload = {
      title: 'Test Notification',
      body: 'This is a test push notification from AWS SNS!',
      data: {
        type: 'test',
        timestamp: Date.now(),
      },
      sound: 'default',
      badge: 1,
    };

    return this.sendToDevice(deviceToken, testPayload);
  }
}

// Create singleton instance
const snsService = new SNSService();

export default snsService;

