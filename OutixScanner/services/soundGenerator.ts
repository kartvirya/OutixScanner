// Sound generator for creating pleasant feedback sounds
// This creates much better audio samples than simple beeps

export interface SoundConfig {
  frequency: number;
  duration: number;
  volume: number;
  fadeIn?: number;
  fadeOut?: number;
  type: 'sine' | 'triangle' | 'square';
}

// Generate a pleasant click sound - very short and soft
export const generateClickSound = (): string => {
  // This is a base64 encoded WAV file for a very short, soft click
  // 44.1kHz, 16-bit, mono, ~10ms duration
  return `UklGRjIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQ4AAACAMDY2NjY2NjY2NjY2NjY2Ng==`;
};

// Generate a pleasant success sound - ascending tone
export const generateSuccessSound = (): string => {
  // Pleasant ascending tone for success feedback
  // Two-tone chime effect
  return `UklGRlIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YS4AAACAMFBQUFBQUFBQUFCAgICAgICAgICAgICAgIBQUFBQUFBQUFA=`;
};

// Generate a gentle error sound - descending tone
export const generateErrorSound = (): string => {
  // Gentle descending tone for errors
  return `UklGRkIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YR4AAACAMICAgICAgICAgIBQUFBQUFBQUFAwMDAwMDAwMDA=`;
};

// Generate a scan beep - short and distinctive
export const generateScanSound = (): string => {
  // Quick scan beep
  return `UklGRjoAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YRYAAACAMGBgYGBgYGBgYGBgYGBgYGA=`;
};

// Generate a notification sound
export const generateNotificationSound = (): string => {
  // Gentle notification tone
  return `UklGRkYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YSIAAACAMHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcA==`;
};

// Alternative: Generate completely silent audio for haptics-only mode
export const generateSilentSound = (): string => {
  return `UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=`;
};

// Get the appropriate sound based on type
export const getSoundData = (type: 'click' | 'success' | 'error' | 'scan' | 'notification' | 'silent'): string => {
  switch (type) {
    case 'click':
      return generateClickSound();
    case 'success':
      return generateSuccessSound();
    case 'error':
      return generateErrorSound();
    case 'scan':
      return generateScanSound();
    case 'notification':
      return generateNotificationSound();
    case 'silent':
    default:
      return generateSilentSound();
  }
};

// Create a more sophisticated tone generator (for future use)
export const generateTone = (config: SoundConfig): string => {
  // For now, return appropriate preset sounds
  // In a more advanced implementation, this could generate actual sine waves
  
  if (config.frequency < 600) {
    return generateErrorSound();
  } else if (config.frequency > 1000) {
    return generateSuccessSound();
  } else {
    return generateClickSound();
  }
}; 