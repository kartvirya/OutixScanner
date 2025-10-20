import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import KeyEvent from 'react-native-keyevent';
import Toast from 'react-native-toast-message';

interface PowerButtonHandlerProps {
  enabled?: boolean;
  onDoublePress?: () => void;
}

export function useDoublePowerButton({ 
  enabled = true, 
  onDoublePress 
}: PowerButtonHandlerProps = {}) {
  const { selectedEventId } = useTheme();
  const appStateRef = useRef(AppState.currentState);
  const lastPressRef = useRef<number>(0);
  const pressCountRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    // Method 1: AppState-based detection (works for both platforms)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const currentTime = Date.now();
      
      // Check if app is coming to foreground (power button pressed)
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        const timeSinceLastPress = currentTime - lastPressRef.current;
        
        // If less than 800ms since last press, count as double press
        if (timeSinceLastPress < 800) {
          pressCountRef.current++;
          
          // Double press detected
          if (pressCountRef.current >= 2) {
            console.log('🎯 Double power button press detected (AppState) - opening scanner');
            
            // Show toast notification
            Toast.show({
              type: 'success',
              text1: 'Scanner Opened',
              text2: 'Double power button press detected',
              visibilityTime: 2000,
            });
            
            if (onDoublePress) {
              onDoublePress();
            } else {
              // Default action: open scanner
              if (selectedEventId) {
                router.push({
                  pathname: '/(tabs)/scanner',
                  params: { returnTo: `/(tabs)/${selectedEventId}` }
                });
              } else {
                router.push('/(tabs)/scanner');
              }
            }
            
            // Reset counter
            pressCountRef.current = 0;
          }
        } else {
          // Reset counter if too much time passed
          pressCountRef.current = 1;
        }
        
        lastPressRef.current = currentTime;
      }
      
      appStateRef.current = nextAppState;
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Method 2: Hardware key detection (Android specific)
    let keyEventSubscription: any = null;
    
    if (Platform.OS === 'android') {
      try {
        KeyEvent.onKeyDownListener((keyEvent) => {
          // Android key codes for power button and volume buttons
          if (keyEvent.keyCode === 26 || keyEvent.keyCode === 24 || keyEvent.keyCode === 25) {
            const currentTime = Date.now();
            const timeSinceLastPress = currentTime - lastPressRef.current;
            
            if (timeSinceLastPress < 800) {
              pressCountRef.current++;
              
              if (pressCountRef.current >= 2) {
                console.log('🎯 Double hardware key press detected (Android) - opening scanner');
                
                // Show toast notification
                Toast.show({
                  type: 'success',
                  text1: 'Scanner Opened',
                  text2: 'Double power button press detected',
                  visibilityTime: 2000,
                });
                
                if (onDoublePress) {
                  onDoublePress();
                } else {
                  if (selectedEventId) {
                    router.push({
                      pathname: '/(tabs)/scanner',
                      params: { returnTo: `/(tabs)/${selectedEventId}` }
                    });
                  } else {
                    router.push('/(tabs)/scanner');
                  }
                }
                
                pressCountRef.current = 0;
              }
            } else {
              pressCountRef.current = 1;
            }
            
            lastPressRef.current = currentTime;
          }
        });
      } catch (error) {
        console.log('KeyEvent not available:', error);
      }
    }

    return () => {
      appStateSubscription?.remove();
      if (keyEventSubscription) {
        keyEventSubscription.remove();
      }
    };
  }, [enabled, selectedEventId, onDoublePress]);

  // For iOS, we can also listen to hardware key events using a different approach
  useEffect(() => {
    if (!enabled || Platform.OS !== 'ios') return;

    // iOS specific implementation using volume buttons as alternative
    // This is a fallback since iOS doesn't allow direct power button detection
    const handleVolumeButtonPress = () => {
      const currentTime = Date.now();
      const timeSinceLastPress = currentTime - lastPressRef.current;
      
      if (timeSinceLastPress < 500) {
        pressCountRef.current++;
        
        if (pressCountRef.current >= 2) {
          console.log('🎯 Double volume button press detected (iOS fallback) - opening scanner');
          
          if (onDoublePress) {
            onDoublePress();
          } else {
            if (selectedEventId) {
              router.push({
                pathname: '/(tabs)/scanner',
                params: { returnTo: `/(tabs)/${selectedEventId}` }
              });
            } else {
              router.push('/(tabs)/scanner');
            }
          }
          
          pressCountRef.current = 0;
        }
      } else {
        pressCountRef.current = 1;
      }
      
      lastPressRef.current = currentTime;
    };

    // Note: For iOS, we would need a native module to detect volume button presses
    // This is a placeholder for the implementation
    console.log('iOS volume button detection would require native module');
    
  }, [enabled, selectedEventId, onDoublePress]);
}

// Alternative hook for Android-specific power button detection
export function useAndroidPowerButton({ 
  enabled = true, 
  onDoublePress 
}: PowerButtonHandlerProps = {}) {
  const { selectedEventId } = useTheme();
  const lastPressRef = useRef<number>(0);
  const pressCountRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const currentTime = Date.now();
      
      // Detect when app comes to foreground (power button pressed)
      if (nextAppState === 'active') {
        const timeSinceLastPress = currentTime - lastPressRef.current;
        
        if (timeSinceLastPress < 800) { // Slightly longer window for Android
          pressCountRef.current++;
          
          if (pressCountRef.current >= 2) {
            console.log('🎯 Android double power button press detected - opening scanner');
            
            if (onDoublePress) {
              onDoublePress();
            } else {
              if (selectedEventId) {
                router.push({
                  pathname: '/(tabs)/scanner',
                  params: { returnTo: `/(tabs)/${selectedEventId}` }
                });
              } else {
                router.push('/(tabs)/scanner');
              }
            }
            
            pressCountRef.current = 0;
          }
        } else {
          pressCountRef.current = 1;
        }
        
        lastPressRef.current = currentTime;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [enabled, selectedEventId, onDoublePress]);
}
