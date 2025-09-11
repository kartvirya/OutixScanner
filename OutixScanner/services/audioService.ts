import { Audio } from 'expo-av';

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

// Sound cache
const soundCache = new Map<string, Audio.Sound>();

// Create a high-quality sound using Web Audio API-style synthesis
export const createHighQualitySound = async (
  type: 'checkin-success' | 'checkout-success' | 'checkin-error' | 'already-scanned',
  config: Partial<SoundConfig> = {}
): Promise<Audio.Sound | null> => {
  try {
    const finalConfig = { ...DEFAULT_SOUND_CONFIG, ...config };
    
    // Create different sound patterns for different types
    let audioData = '';
    
    switch (type) {
      case 'checkin-success':
        // iPhone-style success chime - ascending three-tone melody
        audioData = generateCheckInSuccessSound();
        break;
      case 'checkout-success':
        // Gentle confirmation tone - warm and pleasant
        audioData = generateCheckOutSuccessSound();
        break;
      case 'checkin-error':
        // Clear error notification - distinctive but not harsh
        audioData = generateCheckInErrorSound();
        break;
      case 'already-scanned':
        // Gentle notification - neutral and informative
        audioData = generateAlreadyScannedSound();
        break;
      default:
        return null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/wav;base64,${audioData}` },
      {
        shouldPlay: false,
        volume: finalConfig.volume,
        rate: finalConfig.rate,
        shouldCorrectPitch: finalConfig.shouldCorrectPitch,
      }
    );

    return sound;
  } catch (error) {
    console.warn(`Failed to create high-quality sound for ${type}:`, error);
    return null;
  }
};

// Play a sound with proper cleanup
export const playSoundWithCleanup = async (
  type: 'checkin-success' | 'checkout-success' | 'checkin-error' | 'already-scanned',
  config: Partial<SoundConfig> = {}
): Promise<void> => {
  try {
    console.log(`🔊 Playing new ${type} sound with config:`, config);
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
      }, 1000); // Give enough time for the sound to finish
    }
  } catch (error) {
    console.warn(`Failed to play sound ${type}:`, error);
  }
};

// Import the sound generation functions
import {
    generateAlreadyScannedSound,
    generateCheckInErrorSound,
    generateCheckInSuccessSound,
    generateCheckOutSuccessSound
} from './soundGenerator';

