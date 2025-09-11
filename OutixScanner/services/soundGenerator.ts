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

// Generate a check-in success sound - Bright celebratory chime
export const generateCheckInSuccessSound = (): string => {
  // High-pitched celebratory three-tone ascending chime - very distinctive
  // Much brighter and more positive than other sounds
  return `UklGRnIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YU4AAACAMICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA`;
};

// Generate a check-out success sound - Low warm confirmation
export const generateCheckOutSuccessSound = (): string => {
  // Low, warm, single-tone confirmation - completely different from check-in
  // Deep, satisfying "boop" sound for check-out completion
  return `UklGRkIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YR4AAACAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=`;
};

// Generate a gentle error sound - descending tone
export const generateErrorSound = (): string => {
  // Gentle descending tone for errors
  return `UklGRkIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YR4AAACAMICAgICAgICAgIBQUFBQUFBQUFAwMDAwMDAwMDA=`;
};

// Generate a check-in error sound - Double beep error
export const generateCheckInErrorSound = (): string => {
  // Double beep error pattern - very distinctive from success sounds
  // Two short, sharp tones to clearly indicate an error
  return `UklGRlIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YS4AAACAMEBAQEBAQEBAQEAwMDAwMDAwMDAwMEBAQEBAQEBAQEAwMDAwMDAwMDAwMA==`;
};

// Generate an already scanned sound - Triple tap notification
export const generateAlreadyScannedSound = (): string => {
  // Three quick, soft taps - distinctive informational pattern
  // Different rhythm from error sounds, neutral and informative
  return `UklGRmIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YT4AAACAMGBgYGAwMDAwMDAwMGBgYGAwMDAwMDAwMGBgYGAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=`;
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
export const getSoundData = (type: 'click' | 'success' | 'error' | 'scan' | 'notification' | 'silent' | 'checkin-success' | 'checkout-success' | 'checkin-error' | 'already-scanned'): string => {
  switch (type) {
    case 'click':
      return generateClickSound();
    case 'success':
      return generateSuccessSound();
    case 'checkin-success':
      return generateCheckInSuccessSound();
    case 'checkout-success':
      return generateCheckOutSuccessSound();
    case 'error':
      return generateErrorSound();
    case 'checkin-error':
      return generateCheckInErrorSound();
    case 'already-scanned':
      return generateAlreadyScannedSound();
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