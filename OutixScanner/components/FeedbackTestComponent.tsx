import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { 
  hapticFeedback, 
  soundFeedback, 
  feedback, 
  updateFeedbackSettings, 
  getFeedbackSettings,
  isHapticsSupported,
  disableAllSounds,
  enableHapticsOnly,
  enableSubtleSounds
} from '../services/feedback';

export default function FeedbackTestComponent() {
  const { colors } = useTheme();

  const testButtons = [
    {
      title: 'Light Haptic',
      onPress: () => hapticFeedback.light(),
      description: 'Light touch feedback'
    },
    {
      title: 'Medium Haptic',
      onPress: () => hapticFeedback.medium(),
      description: 'Medium intensity haptic'
    },
    {
      title: 'Heavy Haptic',
      onPress: () => hapticFeedback.heavy(),
      description: 'Strong haptic feedback'
    },
    {
      title: 'Selection Haptic',
      onPress: () => hapticFeedback.selection(),
      description: 'Selection change feedback'
    },
    {
      title: 'Success Haptic',
      onPress: () => hapticFeedback.success(),
      description: 'Success notification haptic'
    },
    {
      title: 'Warning Haptic',
      onPress: () => hapticFeedback.warning(),
      description: 'Warning notification haptic'
    },
    {
      title: 'Error Haptic',
      onPress: () => hapticFeedback.error(),
      description: 'Error notification haptic'
    },
    {
      title: 'Click Sound',
      onPress: () => soundFeedback.click(),
      description: 'Button click sound'
    },
    {
      title: 'Success Sound',
      onPress: () => soundFeedback.success(),
      description: 'Success notification sound'
    },
    {
      title: 'Error Sound',
      onPress: () => soundFeedback.error(),
      description: 'Error notification sound'
    },
    {
      title: 'Scan Sound',
      onPress: () => soundFeedback.scan(),
      description: 'QR scan sound'
    },
    {
      title: 'Notification Sound',
      onPress: () => soundFeedback.notification(),
      description: 'General notification sound'
    },
  ];

  const combinedButtons = [
    {
      title: 'Button Press',
      onPress: () => feedback.buttonPress(),
      description: 'Light haptic + click sound'
    },
    {
      title: 'Heavy Button Press',
      onPress: () => feedback.buttonPressHeavy(),
      description: 'Medium haptic + click sound'
    },
    {
      title: 'Success Feedback',
      onPress: () => feedback.success(),
      description: 'Success haptic + success sound'
    },
    {
      title: 'Error Feedback',
      onPress: () => feedback.error(),
      description: 'Error haptic + error sound'
    },
    {
      title: 'QR Scan Success',
      onPress: () => feedback.qrScanSuccess(),
      description: 'Success haptic + scan sound'
    },
    {
      title: 'QR Scan Error',
      onPress: () => feedback.qrScanError(),
      description: 'Error haptic + error sound'
    },
    {
      title: 'Check-in',
      onPress: () => feedback.checkIn(),
      description: 'Heavy haptic + success sound'
    },
    {
      title: 'Tab Switch',
      onPress: () => feedback.tabSwitch(),
      description: 'Selection haptic only'
    },
    {
      title: 'Notification',
      onPress: () => feedback.notification(),
      description: 'Medium haptic + notification sound'
    },
  ];

  const toggleHaptics = () => {
    const settings = getFeedbackSettings();
    updateFeedbackSettings({ hapticsEnabled: !settings.hapticsEnabled });
    feedback.buttonPress();
    Alert.alert(
      'Haptics',
      `Haptics ${!settings.hapticsEnabled ? 'enabled' : 'disabled'}`
    );
  };

  const toggleSounds = () => {
    const settings = getFeedbackSettings();
    updateFeedbackSettings({ soundsEnabled: !settings.soundsEnabled });
    feedback.buttonPress();
    Alert.alert(
      'Sounds',
      `Sounds ${!settings.soundsEnabled ? 'enabled' : 'disabled'}`
    );
  };

  const cycleSoundType = () => {
    const settings = getFeedbackSettings();
    let newSoundType: 'system' | 'subtle' | 'off';
    
    switch (settings.soundType) {
      case 'subtle':
        newSoundType = 'off';
        break;
      case 'off':
        newSoundType = 'subtle';
        break;
      default:
        newSoundType = 'subtle';
    }
    
    updateFeedbackSettings({ soundType: newSoundType, soundsEnabled: newSoundType !== 'off' });
    feedback.buttonPress();
    Alert.alert(
      'Sound Type',
      `Sound type changed to: ${newSoundType === 'off' ? 'Off (Haptics Only)' : 
        newSoundType === 'subtle' ? 'Subtle Tones' : 'System Sounds'}`
    );
  };

  const showSettings = () => {
    const settings = getFeedbackSettings();
    feedback.buttonPress();
    Alert.alert(
      'Feedback Settings',
      `Haptics: ${settings.hapticsEnabled ? 'On' : 'Off'}\n` +
      `Sounds: ${settings.soundsEnabled ? 'On' : 'Off'}\n` +
      `Sound Type: ${settings.soundType === 'off' ? 'Off' : 
        settings.soundType === 'subtle' ? 'Subtle' : 'System'}\n` +
      `Volume: ${Math.round(settings.volume * 100)}%\n` +
      `Haptics Supported: ${isHapticsSupported() ? 'Yes' : 'No'}`
    );
  };

  const quickDisableSounds = () => {
    disableAllSounds();
    feedback.hapticsOnly.medium();
    Alert.alert('Sounds Disabled', 'All sounds disabled. Using haptics only.');
  };

  const enableHapticsOnlyMode = () => {
    enableHapticsOnly();
    feedback.hapticsOnly.success();
    Alert.alert('Haptics Only', 'Switched to haptics-only mode for a distraction-free experience.');
  };

  const enableSubtleMode = () => {
    enableSubtleSounds();
    feedback.success();
    Alert.alert('Subtle Sounds', 'Enabled subtle, pleasant sound feedback.');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={showSettings}
        >
          <Text style={styles.buttonText}>Show Current Settings</Text>
        </TouchableOpacity>
        
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.smallButton, { backgroundColor: colors.secondary }]}
            onPress={toggleHaptics}
          >
            <Text style={styles.buttonText}>Toggle Haptics</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.smallButton, { backgroundColor: colors.secondary }]}
            onPress={cycleSoundType}
          >
            <Text style={styles.buttonText}>Sound Type</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.smallButton, { backgroundColor: '#28a745' }]}
            onPress={enableSubtleMode}
          >
            <Text style={styles.buttonText}>Subtle Sounds</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.smallButton, { backgroundColor: '#6c757d' }]}
            onPress={enableHapticsOnlyMode}
          >
            <Text style={styles.buttonText}>Haptics Only</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#dc3545' }]}
          onPress={quickDisableSounds}
        >
          <Text style={styles.buttonText}>Disable All Sounds</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Individual Feedback Types</Text>
        
        {testButtons.map((button, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.testButton, { backgroundColor: colors.background }]}
            onPress={button.onPress}
          >
            <Text style={[styles.testButtonTitle, { color: colors.text }]}>
              {button.title}
            </Text>
            <Text style={[styles.testButtonDescription, { color: colors.secondary }]}>
              {button.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Combined Feedback</Text>
        
        {combinedButtons.map((button, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.testButton, { backgroundColor: colors.background }]}
            onPress={button.onPress}
          >
            <Text style={[styles.testButtonTitle, { color: colors.text }]}>
              {button.title}
            </Text>
            <Text style={[styles.testButtonDescription, { color: colors.secondary }]}>
              {button.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  smallButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.3)',
  },
  testButtonTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  testButtonDescription: {
    fontSize: 14,
  },
}); 