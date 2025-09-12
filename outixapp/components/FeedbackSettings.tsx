import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { Settings, Volume, VolumeX, Vibrate } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { 
  getFeedbackSettings,
  updateFeedbackSettings,
  enableHapticsOnly,
  enableSubtleSounds,
  disableAllSounds,
  feedback,
  isHapticsSupported
} from '../services/feedback';

interface FeedbackSettingsProps {
  visible: boolean;
  onClose: () => void;
}

export default function FeedbackSettings({ visible, onClose }: FeedbackSettingsProps) {
  const { colors } = useTheme();
  const [settings, setSettings] = useState(getFeedbackSettings());

  useEffect(() => {
    if (visible) {
      setSettings(getFeedbackSettings());
    }
  }, [visible]);

  const handleHapticsOnly = () => {
    enableHapticsOnly();
    setSettings(getFeedbackSettings());
    feedback.hapticsOnly.success();
    Alert.alert(
      'Haptics Only', 
      'Sound feedback disabled. Using haptic feedback only for a quiet experience.'
    );
  };

  const handleSubtleSounds = () => {
    enableSubtleSounds();
    setSettings(getFeedbackSettings());
    feedback.success();
    Alert.alert(
      'Subtle Sounds', 
      'Enabled gentle, pleasant sound feedback at low volume.'
    );
  };

  const handleDisableAll = () => {
    disableAllSounds();
    updateFeedbackSettings({ hapticsEnabled: false });
    setSettings(getFeedbackSettings());
    Alert.alert(
      'All Feedback Disabled', 
      'Both sound and haptic feedback have been disabled.'
    );
  };

  const handleEnableAll = () => {
    updateFeedbackSettings({ 
      hapticsEnabled: true, 
      soundsEnabled: true, 
      soundType: 'subtle',
      volume: 0.3
    });
    setSettings(getFeedbackSettings());
    feedback.success();
    Alert.alert(
      'Feedback Enabled', 
      'Both haptic and subtle sound feedback have been enabled.'
    );
  };

  const handleClose = () => {
    feedback.buttonPress();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>Feedback Settings</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: colors.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Settings</Text>
            
            <View style={styles.currentSettings}>
              <View style={styles.settingRow}>
                <Vibrate size={20} color={settings.hapticsEnabled ? colors.primary : colors.secondary} />
                <Text style={[styles.settingText, { color: colors.text }]}>
                  Haptics: {settings.hapticsEnabled ? 'On' : 'Off'}
                </Text>
              </View>
              
              <View style={styles.settingRow}>
                {settings.soundsEnabled ? (
                  <Volume size={20} color={colors.primary} />
                ) : (
                  <VolumeX size={20} color={colors.secondary} />
                )}
                <Text style={[styles.settingText, { color: colors.text }]}>
                  Sounds: {settings.soundsEnabled ? 'On' : 'Off'} 
                  {settings.soundsEnabled && ` (${settings.soundType})`}
                </Text>
              </View>
              
              <View style={styles.settingRow}>
                <Settings size={20} color={colors.secondary} />
                <Text style={[styles.settingText, { color: colors.text }]}>
                  Volume: {Math.round(settings.volume * 100)}%
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Presets</Text>
            
            <TouchableOpacity 
              style={[styles.presetButton, { backgroundColor: '#28a745' }]}
              onPress={handleSubtleSounds}
            >
              <Volume size={20} color="#FFFFFF" />
              <View style={styles.presetTextContainer}>
                <Text style={styles.presetTitle}>Subtle Sounds</Text>
                <Text style={styles.presetDescription}>Pleasant, quiet audio feedback</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.presetButton, { backgroundColor: '#6c757d' }]}
              onPress={handleHapticsOnly}
            >
              <Vibrate size={20} color="#FFFFFF" />
              <View style={styles.presetTextContainer}>
                <Text style={styles.presetTitle}>Haptics Only</Text>
                <Text style={styles.presetDescription}>Silent mode with tactile feedback</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.presetButton, { backgroundColor: colors.primary }]}
              onPress={handleEnableAll}
            >
              <Settings size={20} color="#FFFFFF" />
              <View style={styles.presetTextContainer}>
                <Text style={styles.presetTitle}>Full Feedback</Text>
                <Text style={styles.presetDescription}>Both haptic and sound feedback</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.presetButton, { backgroundColor: '#dc3545' }]}
              onPress={handleDisableAll}
            >
              <VolumeX size={20} color="#FFFFFF" />
              <View style={styles.presetTextContainer}>
                <Text style={styles.presetTitle}>Disable All</Text>
                <Text style={styles.presetDescription}>Turn off all feedback</Text>
              </View>
            </TouchableOpacity>
          </View>

          {!isHapticsSupported() && (
            <View style={[styles.warning, { backgroundColor: '#ffc107' }]}>
              <Text style={styles.warningText}>
                ⚠️ Haptic feedback is not supported on this device
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
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
  currentSettings: {
    gap: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
  },
  presetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  presetTextContainer: {
    flex: 1,
  },
  presetTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  presetDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
  },
  warning: {
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  warningText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
}); 