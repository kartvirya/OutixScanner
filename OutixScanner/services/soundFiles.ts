import { Audio } from 'expo-av';

// Sound file paths
export const SOUND_FILES = {
  checkinSuccess: require('../../assets/sounds/checkin-success.mp3'),
  checkoutSuccess: require('../../assets/sounds/checkout-success.mp3'),
  checkinError: require('../../assets/sounds/checkin-error.mp3'),
  alreadyScanned: require('../../assets/sounds/already-scanned.mp3'),
} as const;

// Sound cache to avoid reloading
const soundCache = new Map<string, Audio.Sound>();

// Load and cache a sound file
export const loadSound = async (soundKey: keyof typeof SOUND_FILES): Promise<Audio.Sound | null> => {
  try {
    // Return cached sound if available
    if (soundCache.has(soundKey)) {
      return soundCache.get(soundKey)!;
    }

    // Load new sound
    const { sound } = await Audio.Sound.createAsync(SOUND_FILES[soundKey], {
      shouldPlay: false,
      volume: 0.8,
      rate: 1.0,
      shouldCorrectPitch: true,
    });

    // Cache the sound
    soundCache.set(soundKey, sound);
    return sound;
  } catch (error) {
    console.warn(`Failed to load sound ${soundKey}:`, error);
    return null;
  }
};

// Play a sound file
export const playSound = async (soundKey: keyof typeof SOUND_FILES): Promise<void> => {
  try {
    const sound = await loadSound(soundKey);
    if (sound) {
      await sound.replayAsync();
    }
  } catch (error) {
    console.warn(`Failed to play sound ${soundKey}:`, error);
  }
};

// Unload all cached sounds
export const unloadAllSounds = async (): Promise<void> => {
  for (const [key, sound] of soundCache.entries()) {
    try {
      await sound.unloadAsync();
    } catch (error) {
      console.warn(`Failed to unload sound ${key}:`, error);
    }
  }
  soundCache.clear();
};
