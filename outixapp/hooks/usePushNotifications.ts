import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import pushNotificationService from '../services/pushNotifications';

export interface PushNotificationState {
  token: string | null;
  isInitialized: boolean;
  hasPermission: boolean;
  isLoading: boolean;
}

export const usePushNotifications = () => {
  const [state, setState] = useState<PushNotificationState>({
    token: null,
    isInitialized: false,
    hasPermission: false,
    isLoading: true,
  });

  const initialize = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      await pushNotificationService.initialize();
      
      setState(prev => ({ 
        ...prev, 
        isInitialized: true, 
        isLoading: false 
      }));
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      const hasPermission = await pushNotificationService.requestPermissions();
      setState(prev => ({ ...prev, hasPermission }));
      return hasPermission;
    } catch (error) {
      console.error('Failed to request permissions:', error);
      return false;
    }
  }, []);

  const sendTokenToBackend = useCallback(async (userId?: string) => {
    const token = pushNotificationService.getToken();
    if (token) {
      try {
        await pushNotificationService.sendTokenToBackend(token, userId);
        return true;
      } catch (error) {
        console.error('Failed to send token to backend:', error);
        return false;
      }
    }
    return false;
  }, []);

  const onTokenReceived = useCallback((callback: (token: string) => void) => {
    return pushNotificationService.onTokenReceived(callback);
  }, []);

  const onMessageReceived = useCallback((callback: (message: any) => void) => {
    return pushNotificationService.onMessageReceived(callback);
  }, []);

  useEffect(() => {
    // Initialize push notifications when hook is first used
    initialize();

    // Set up token listener
    const unsubscribeToken = pushNotificationService.onTokenReceived((token) => {
      setState(prev => ({ ...prev, token }));
    });

    // Set up message listener
    const unsubscribeMessage = pushNotificationService.onMessageReceived((message) => {
      // Handle incoming notifications
      console.log('Push notification received:', message);
      
      // Show alert for foreground notifications (you can customize this)
      if (message.title && message.body) {
        Alert.alert(message.title, message.body);
      }
    });

    return () => {
      unsubscribeToken();
      unsubscribeMessage();
    };
  }, [initialize]);

  return {
    ...state,
    initialize,
    requestPermissions,
    sendTokenToBackend,
    onTokenReceived,
    onMessageReceived,
  };
};




