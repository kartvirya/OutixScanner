import { CheckCircle, UserCheck, UserX, Users } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'check-in' | 'check-out' | 'group-check-in' | 'group-check-out';
  guestName?: string;
  ticketType?: string;
  count?: number;
  message?: string;
  hideContinueButton?: boolean;
  accentColor?: string; // optional override color (e.g., selectcolor from API)
}

const { width: screenWidth } = Dimensions.get('window');

export default function SuccessModal({ 
  visible, 
  onClose, 
  type, 
  guestName, 
  ticketType, 
  count = 1,
  message,
  hideContinueButton = false,
  accentColor
}: SuccessModalProps) {
  const { colors, isDark } = useTheme();

  const getEffectiveColor = () => {
    if (accentColor && typeof accentColor === 'string' && accentColor.trim() !== '') {
      return accentColor;
    }
    switch (type) {
      case 'check-in':
      case 'group-check-in':
        return '#34C759';
      case 'check-out':
      case 'group-check-out':
        return '#FF9500';
      default:
        return colors.primary;
    }
  };

  const getIcon = () => {
    const color = getEffectiveColor();
    switch (type) {
      case 'check-in':
        return <UserCheck size={48} color={color} />;
      case 'check-out':
        return <UserX size={48} color={color} />;
      case 'group-check-in':
        return <Users size={48} color={color} />;
      case 'group-check-out':
        return <Users size={48} color={color} />;
      default:
        return <CheckCircle size={48} color={color} />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'check-in':
        return 'Check-in Successful';
      case 'check-out':
        return 'Check-out Successful';
      case 'group-check-in':
        return 'Group Check-in Successful';
      case 'group-check-out':
        return 'Group Check-out Successful';
      default:
        return 'Success';
    }
  };

  const getSubtitle = () => {
    if (count > 1) {
      return `${count} tickets processed`;
    } else if (guestName) {
      return guestName;
    }
    return 'Operation completed';
  };

  const getDescription = () => {
    if (message) {
      return message;
    }
    
    if (count > 1) {
      switch (type) {
        case 'group-check-in':
          return 'All selected tickets have been checked in successfully.';
        case 'group-check-out':
          return 'All selected tickets have been checked out successfully.';
        default:
          return 'Tickets processed successfully.';
      }
    } else {
      switch (type) {
        case 'check-in':
          return `${guestName || 'Guest'} has been checked in successfully.`;
        case 'check-out':
          return `${guestName || 'Guest'} has been checked out successfully.`;
        default:
          return 'Operation completed successfully.';
      }
    }
  };

  // Button keeps the original type-based color so it's always visible
  const getButtonColor = () => {
    switch (type) {
      case 'check-in':
      case 'group-check-in':
        return '#34C759';
      case 'check-out':
      case 'group-check-out':
        return '#FF9500';
      default:
        return colors.primary;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          {/* Success Icon */}
          <View style={[styles.iconContainer, { backgroundColor: `${getEffectiveColor()}15` }]}>
            {getIcon()}
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {getTitle()}
          </Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: getEffectiveColor() }]}>
            {getSubtitle()}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.secondary }]}>
            {getDescription()}
          </Text>

          {/* Ticket Type (if available) */}
          {ticketType && count === 1 && (
            <View style={[styles.ticketTypeContainer, { backgroundColor: colors.border }]}>
              <Text style={[styles.ticketType, { color: colors.text }]}>
                {ticketType}
              </Text>
            </View>
          )}

          {/* Action Button - Only show if not hidden */}
          {!hideContinueButton && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: getButtonColor() }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    width: screenWidth - 40,
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  ticketTypeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 24,
  },
  ticketType: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

