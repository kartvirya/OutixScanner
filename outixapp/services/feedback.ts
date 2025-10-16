import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Settings for feedback preferences
interface FeedbackSettings {
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
  volume: number;
  soundType: 'system' | 'subtle' | 'off'; // New sound type option
}

// Default settings
let feedbackSettings: FeedbackSettings = {
  hapticsEnabled: true,
  soundsEnabled: true,
  volume: 0.3, // Lower default volume
  soundType: 'subtle', // Use subtle sounds by default
};

// Sound cache
const soundCache = new Map<string, Audio.Sound>();

// Timeout manager for cleanup
// TimeoutManager instance removed - using standard setTimeout instead

// Initialize audio mode
export const initializeAudio = async () => {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (error) {
    console.warn('Failed to initialize audio mode:', error);
  }
};

// Create a more pleasant tone using sine wave synthesis
const createPleasantTone = async (
  frequency: number = 800, 
  duration: number = 100,
  type: 'click' | 'success' | 'error' | 'notification' | 'scan' | 'checkin-success' | 'checkout-success' | 'checkin-error' | 'already-scanned' = 'click'
): Promise<Audio.Sound | null> => {
  try {
    let audioData = '';
    
    // Use different audio strategies based on sound type preference
    switch (feedbackSettings.soundType) {
      case 'system':
        // Try to use system sounds first
        return await createSystemSound(type);
      
      case 'subtle':
        // Use very subtle, pleasant tones
        audioData = generateSubtleTone(frequency, duration, type);
        break;
      
      case 'off':
        return null;
    }

    if (!audioData) return null;

    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/wav;base64,${audioData}` },
      { 
        shouldPlay: false, 
        volume: feedbackSettings.volume,
        rate: 1.0,
        shouldCorrectPitch: true,
      }
    );
    return sound;
  } catch (error) {
    console.warn('Failed to create pleasant tone:', error);
    return null;
  }
};

// Generate simple audio tones
const generateSubtleTone = (frequency: number, duration: number, type: string): string => {
  // Simple tone generation - create basic WAV data
  const sampleRate = 44100;
  const samples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples * 2, true);
  
  // Generate sine wave
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
    view.setInt16(44 + i * 2, sample * 32767, true);
  }
  
  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Try to use system sounds (iOS/Android specific)
const createSystemSound = async (type: string): Promise<Audio.Sound | null> => {
  try {
    // On iOS, we can try to use system sounds
    if (Platform.OS === 'ios') {
      let systemSoundId = '';
      switch (type) {
        case 'click':
          systemSoundId = '1104'; // Tock sound
          break;
        case 'success':
          systemSoundId = '1054'; // Anticipate sound
          break;
        case 'error':
          systemSoundId = '1053'; // Tink sound
          break;
        default:
          systemSoundId = '1104';
      }
      
      // For now, return null to fall back to haptics only
      // In a real implementation, you could use native modules to play system sounds
      return null;
    }
    
    // For Android, we'll stick with haptics
    return null;
  } catch (error) {
    console.warn('Failed to create system sound:', error);
    return null;
  }
};

// Haptic feedback functions
export const hapticFeedback = {
  light: async () => {
    if (!feedbackSettings.hapticsEnabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  },
  
  medium: async () => {
    if (!feedbackSettings.hapticsEnabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  },
  
  heavy: async () => {
    if (!feedbackSettings.hapticsEnabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  },
  
  selection: async () => {
    if (!feedbackSettings.hapticsEnabled) return;
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  },
  
  success: async () => {
    if (!feedbackSettings.hapticsEnabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  },
  
  warning: async () => {
    if (!feedbackSettings.hapticsEnabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  },
  
  error: async () => {
    if (!feedbackSettings.hapticsEnabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  },
};

// Improved sound feedback functions
export const soundFeedback = {
  click: async () => {
    if (!feedbackSettings.soundsEnabled || feedbackSettings.soundType === 'off') return;
    try {
      const sound = await createPleasantTone(1000, 30, 'click'); // Shorter duration
      if (sound) {
        await sound.playAsync();
        // Clean up after a short delay
        setTimeout(async () => {
          try {
            await sound.unloadAsync();
          } catch (e) {
            console.warn('Failed to unload click sound:', e);
          }
        }, 50);
      }
    } catch (error) {
      console.warn('Sound feedback failed:', error);
    }
  },
  
  success: async () => {
    if (!feedbackSettings.soundsEnabled || feedbackSettings.soundType === 'off') return;
    try {
      const sound = await createPleasantTone(1200, 80, 'success'); // Pleasant success tone
      if (sound) {
        await sound.playAsync();
        setTimeout(async () => {
          try {
            await sound.unloadAsync();
          } catch (e) {
            console.warn('Failed to unload success sound:', e);
          }
        }, 100);
      }
    } catch (error) {
      console.warn('Sound feedback failed:', error);
    }
  },
  
  error: async () => {
    if (!feedbackSettings.soundsEnabled || feedbackSettings.soundType === 'off') return;
    try {
      const sound = await createPleasantTone(500, 120, 'error'); // Gentle error tone
      if (sound) {
        await sound.playAsync();
        setTimeout(async () => {
          try {
            await sound.unloadAsync();
          } catch (e) {
            console.warn('Failed to unload error sound:', e);
          }
        }, 150);
      }
    } catch (error) {
      console.warn('Sound feedback failed:', error);
    }
  },
  
  scan: async () => {
    if (!feedbackSettings.soundsEnabled || feedbackSettings.soundType === 'off') return;
    try {
      const sound = await createPleasantTone(800, 60, 'scan'); // Quick scan beep
      if (sound) {
        await sound.playAsync();
        setTimeout(async () => {
          try {
            await sound.unloadAsync();
          } catch (e) {
            console.warn('Failed to unload scan sound:', e);
          }
        }, 80);
      }
    } catch (error) {
      console.warn('Sound feedback failed:', error);
    }
  },
  
  checkInSuccess: async () => {
    if (!feedbackSettings.soundsEnabled || feedbackSettings.soundType === 'off') return;
    try {
      const sound = await createPleasantTone(800, 0.3, 'checkin-success');
      if (sound) {
        await sound.playAsync();
        sound.unloadAsync();
      }
    } catch (error) {
      console.warn('Check-in success sound failed:', error);
    }
  },
  
  checkOutSuccess: async () => {
    if (!feedbackSettings.soundsEnabled || feedbackSettings.soundType === 'off') return;
    try {
      const sound = await createPleasantTone(600, 0.4, 'checkout-success');
      if (sound) {
        await sound.playAsync();
        sound.unloadAsync();
      }
    } catch (error) {
      console.warn('Check-out success sound failed:', error);
    }
  },
  
  checkInError: async () => {
    if (!feedbackSettings.soundsEnabled || feedbackSettings.soundType === 'off') return;
    try {
      const sound = await createPleasantTone(300, 0.5, 'checkin-error');
      if (sound) {
        await sound.playAsync();
        sound.unloadAsync();
      }
    } catch (error) {
      console.warn('Check-in error sound failed:', error);
    }
  },
  
  alreadyScanned: async () => {
    if (!feedbackSettings.soundsEnabled || feedbackSettings.soundType === 'off') return;
    try {
      const sound = await createPleasantTone(400, 0.6, 'already-scanned');
      if (sound) {
        await sound.playAsync();
        sound.unloadAsync();
      }
    } catch (error) {
      console.warn('Already scanned sound failed:', error);
    }
  },
  
  notification: async () => {
    if (!feedbackSettings.soundsEnabled || feedbackSettings.soundType === 'off') return;
    try {
      const sound = await createPleasantTone(900, 0.3, 'notification');
      if (sound) {
        await sound.playAsync();
        setTimeout(async () => {
          try {
            await sound.unloadAsync();
          } catch (e) {
            console.warn('Failed to unload notification sound:', e);
          }
        }, 90);
      }
    } catch (error) {
      console.warn('Sound feedback failed:', error);
    }
  },
};

// Combined feedback functions (unchanged logic, but now with better sounds)
export const feedback = {
  buttonPress: async () => {
    await Promise.all([
      hapticFeedback.light(),
      soundFeedback.click(),
    ]);
  },
  
  buttonPressHeavy: async () => {
    await Promise.all([
      hapticFeedback.medium(),
      soundFeedback.click(),
    ]);
  },
  
  success: async () => {
    await Promise.all([
      hapticFeedback.success(),
      soundFeedback.success(),
    ]);
  },
  
  error: async () => {
    await Promise.all([
      hapticFeedback.error(),
      soundFeedback.error(),
    ]);
  },
  
  warning: async () => {
    await Promise.all([
      hapticFeedback.warning(),
      soundFeedback.error(),
    ]);
  },
  
  qrScanSuccess: async () => {
    await Promise.all([
      hapticFeedback.success(),
      soundFeedback.scan(),
    ]);
  },
  
  qrScanError: async () => {
    await Promise.all([
      hapticFeedback.error(),
      soundFeedback.error(),
    ]);
  },
  
  checkIn: async () => {
    await Promise.all([
      hapticFeedback.heavy(),
      soundFeedback.checkInSuccess(),
    ]);
  },
  
  checkOut: async () => {
    await Promise.all([
      hapticFeedback.heavy(),
      soundFeedback.checkOutSuccess(),
    ]);
  },
  
  checkInError: async () => {
    await Promise.all([
      hapticFeedback.error(),
      soundFeedback.checkInError(),
    ]);
  },
  
  alreadyScanned: async () => {
    await Promise.all([
      hapticFeedback.warning(),
      soundFeedback.alreadyScanned(),
    ]);
  },
  
  tabSwitch: async () => {
    await Promise.all([
      hapticFeedback.selection(),
    ]);
  },
  
  notification: async () => {
    await Promise.all([
      hapticFeedback.medium(),
      soundFeedback.notification(),
    ]);
  },
  
  // New: Haptics-only feedback for when sounds are disabled or annoying
  hapticsOnly: {
    light: () => hapticFeedback.light(),
    medium: () => hapticFeedback.medium(),
    heavy: () => hapticFeedback.heavy(),
    success: () => hapticFeedback.success(),
    error: () => hapticFeedback.error(),
    warning: () => hapticFeedback.warning(),
    selection: () => hapticFeedback.selection(),
  }
};

// Enhanced settings management
export const updateFeedbackSettings = (newSettings: Partial<FeedbackSettings>) => {
  feedbackSettings = { ...feedbackSettings, ...newSettings };
  
  // If sound type is set to 'off', also disable sounds
  if (newSettings.soundType === 'off') {
    feedbackSettings.soundsEnabled = false;
  }
};

export const getFeedbackSettings = (): FeedbackSettings => {
  return { ...feedbackSettings };
};

// New: Quick disable all sounds
export const disableAllSounds = () => {
  updateFeedbackSettings({ soundsEnabled: false, soundType: 'off' });
};

// New: Enable only haptics
export const enableHapticsOnly = () => {
  updateFeedbackSettings({ 
    hapticsEnabled: true, 
    soundsEnabled: false, 
    soundType: 'off' 
  });
};

// New: Switch to subtle sounds
export const enableSubtleSounds = () => {
  updateFeedbackSettings({ 
    soundsEnabled: true, 
    soundType: 'subtle',
    volume: 0.2 // Very low volume for subtle sounds
  });
};

// Cleanup function
export const cleanupSounds = async () => {
  try {
    // Clear all timeouts first
    // Removed timeout manager cleanup
    
    // Then clean up sounds
    soundCache.forEach(async (sound, name) => {
      await sound.unloadAsync();
      soundCache.delete(name);
    });
  } catch (error) {
    console.warn('Error cleaning up sounds:', error);
  }
};

// Check if haptics are supported
export const isHapticsSupported = () => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}; 