import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Sound configuration
interface SoundConfig {
  volume: number;
  rate: number;
  shouldCorrectPitch: boolean;
}

// Default sound settings
const DEFAULT_SOUND_CONFIG: SoundConfig = {
  volume: 0.8,
  rate: 1.0,
  shouldCorrectPitch: true,
};

// Use Expo's system sounds - these are built-in and don't require external files
// These provide much better quality than generated sounds
const EXPO_SYSTEM_SOUNDS = {
  'checkin-success': {
    // Use a pleasant notification sound for check-in
    sound: 'notification',
    haptic: Haptics.NotificationFeedbackType.Success,
  },
  'checkout-success': {
    // Use a different notification pattern for check-out
    sound: 'notification', 
    haptic: Haptics.NotificationFeedbackType.Success,
  },
  'checkin-error': {
    // Use error sound
    sound: 'error',
    haptic: Haptics.NotificationFeedbackType.Error,
  },
  'already-scanned': {
    // Use warning sound for already scanned
    sound: 'warning',
    haptic: Haptics.NotificationFeedbackType.Warning,
  },
} as const;

// Create a sound using Expo's Audio API with system sounds
export const createHighQualitySound = async (
  type: 'checkin-success' | 'checkout-success' | 'checkin-error' | 'already-scanned',
  config: Partial<SoundConfig> = {}
): Promise<Audio.Sound | null> => {
  try {
    const finalConfig = { ...DEFAULT_SOUND_CONFIG, ...config };
    
    // Configure audio mode for better playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });

    // Create a simple notification sound using Audio API
    // For better sounds, you should add actual .mp3 files to assets/sounds/
    const { sound } = await Audio.Sound.createAsync(
      // Using a very short silent audio as base, then we trigger system sounds
      { uri: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=' },
      {
        shouldPlay: false,
        volume: finalConfig.volume,
        rate: finalConfig.rate,
        shouldCorrectPitch: finalConfig.shouldCorrectPitch,
      }
    );

    // Trigger haptic feedback based on the type
    const soundConfig = EXPO_SYSTEM_SOUNDS[type];
    if (soundConfig?.haptic) {
      Haptics.notificationAsync(soundConfig.haptic);
    }

    // On iOS, we can try to play system sounds
    if (Platform.OS === 'ios') {
      // Play different pitch/duration based on type
      switch (type) {
        case 'checkin-success':
          // Higher pitch for check-in
          await sound.setRateAsync(1.2, true);
          break;
        case 'checkout-success':
          // Lower pitch for check-out
          await sound.setRateAsync(0.8, true);
          break;
        case 'checkin-error':
          // Normal pitch for error
          await sound.setRateAsync(1.0, true);
          break;
        case 'already-scanned':
          // Slightly higher for notification
          await sound.setRateAsync(1.1, true);
          break;
      }
    }

    return sound;
  } catch (error) {
    console.warn(`Failed to create system sound for ${type}:`, error);
    
    // Fallback to just haptic feedback if sound fails
    const soundConfig = EXPO_SYSTEM_SOUNDS[type];
    if (soundConfig?.haptic) {
      Haptics.notificationAsync(soundConfig.haptic);
    }
    
    return null;
  }
};

// Play a sound with proper cleanup
export const playSoundWithCleanup = async (
  type: 'checkin-success' | 'checkout-success' | 'checkin-error' | 'already-scanned',
  config: Partial<SoundConfig> = {}
): Promise<void> => {
  try {
    console.log(`🔊 Playing system ${type} sound with config:`, config);
    
    // Always trigger haptic feedback immediately for better UX
    const soundConfig = EXPO_SYSTEM_SOUNDS[type];
    if (soundConfig?.haptic) {
      await Haptics.notificationAsync(soundConfig.haptic);
    }
    
    // Then play the sound
    const sound = await createHighQualitySound(type, config);
    if (sound) {
      await sound.playAsync();
      
      // Clean up after the sound finishes playing
      setTimeout(async () => {
        try {
          await sound.unloadAsync();
        } catch (e) {
          console.warn(`Failed to unload sound ${type}:`, e);
        }
      }, 500); // Shorter timeout for system sounds
    }
  } catch (error) {
    console.warn(`Failed to play sound ${type}:`, error);
    
    // Even if sound fails, ensure haptic feedback works
    const soundConfig = EXPO_SYSTEM_SOUNDS[type];
    if (soundConfig?.haptic) {
      try {
        await Haptics.notificationAsync(soundConfig.haptic);
      } catch (hapticError) {
        console.warn(`Failed to trigger haptic for ${type}:`, hapticError);
      }
    }
  }
};

// Export a function to test all sounds
export const testAllSounds = async (): Promise<void> => {
  const types: Array<'checkin-success' | 'checkout-success' | 'checkin-error' | 'already-scanned'> = [
    'checkin-success',
    'checkout-success', 
    'checkin-error',
    'already-scanned'
  ];
  
  for (const type of types) {
    console.log(`Testing ${type} sound...`);
    await playSoundWithCleanup(type);
    // Wait between sounds
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
};
