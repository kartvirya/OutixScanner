import { Audio } from 'expo-audio';

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

// Sound file mappings - using macOS system sounds converted to MP3
// These are high-quality notification sounds from macOS
const SOUND_FILES = {
  'checkin-success': require('../assets/sounds/checkin-success.mp3'), // Glass sound - bright and pleasant
  'checkout-success': require('../assets/sounds/checkout-success.mp3'), // Hero sound - warm completion
  'checkin-error': require('../assets/sounds/error.mp3'), // Basso sound - clear error tone
  'already-scanned': require('../assets/sounds/notification.mp3'), // Pop sound - neutral notification
} as const;

// Create a sound using imported audio files
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
    
    // Use the imported sound file
    const soundFile = SOUND_FILES[type];
    if (!soundFile) {
      console.error(`No sound file found for ${type}`);
      return null;
    }

    const { sound } = await Audio.Sound.createAsync(
      soundFile,
      {
        shouldPlay: false,
        volume: finalConfig.volume,
        rate: finalConfig.rate,
        shouldCorrectPitch: finalConfig.shouldCorrectPitch,
      }
    );

    return sound;
  } catch (error) {
    console.warn(`Failed to create sound for ${type}:`, error);
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

// Sound generator functions are no longer needed
// We're using imported macOS system sounds (Glass, Hero, Basso, Pop) for better quality

