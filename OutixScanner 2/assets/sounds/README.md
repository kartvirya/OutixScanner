# Sound Files Included

This directory contains high-quality notification sounds converted from macOS system sounds. These provide much better audio feedback than generated sounds.

## Current Sound Files:

1. **checkin-success.mp3** (27KB) - macOS "Glass" sound
   - A bright, pleasant chime sound perfect for successful check-ins
   - Clear and uplifting tone that indicates success

2. **checkout-success.mp3** (18KB) - macOS "Hero" sound  
   - A warm, confirming completion sound for successful pass-outs
   - Deeper and more final-sounding than check-in

3. **error.mp3** (13KB) - macOS "Basso" sound
   - A clear error notification that's distinctive but not harsh
   - Low-pitched tone that clearly indicates an issue

4. **notification.mp3** (26KB) - macOS "Pop" sound
   - A neutral, informative sound for "already scanned" messages
   - Gentle pop sound that's neither positive nor negative

## Sound Sources:

These sounds were converted from macOS system sounds located at `/System/Library/Sounds/` using ffmpeg:
```bash
ffmpeg -i /System/Library/Sounds/Glass.aiff -acodec mp3 -ab 128k checkin-success.mp3
ffmpeg -i /System/Library/Sounds/Hero.aiff -acodec mp3 -ab 128k checkout-success.mp3
ffmpeg -i /System/Library/Sounds/Basso.aiff -acodec mp3 -ab 128k error.mp3
ffmpeg -i /System/Library/Sounds/Pop.aiff -acodec mp3 -ab 128k notification.mp3
```

## File Requirements:
- Format: MP3 or WAV (MP3 preferred for smaller size)
- Duration: 0.5 - 2 seconds
- Sample Rate: 44.1 kHz or 48 kHz
- Bit Rate: 128 kbps or higher for MP3
- File Size: Keep under 100KB each for optimal performance

## Testing:
After adding the sound files, test them in the app to ensure they:
1. Play correctly on both iOS and Android
2. Have appropriate volume levels
3. Are distinctive enough to differentiate events
4. Are pleasant and not jarring to users

## Customization:

If you want to replace these with different sounds:
1. Find or download new notification sounds (MP3 format preferred)
2. Keep them under 100KB for optimal performance
3. Replace the files with the same names
4. Test on both iOS and Android devices

The audioService.ts is configured to use these imported sounds for much better quality than the previously generated sounds.
