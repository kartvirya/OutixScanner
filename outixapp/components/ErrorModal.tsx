import { AlertTriangle, UserCheck, UserX, XCircle } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ErrorModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'already-scanned' | 'not-checked-in' | 'invalid-ticket' | 'general';
  title?: string;
  message?: string;
  guestName?: string;
  ticketType?: string;
  checkedInDate?: string;
}

const { width: screenWidth } = Dimensions.get('window');

export default function ErrorModal({ 
  visible, 
  onClose, 
  type, 
  title,
  message,
  guestName,
  ticketType,
  checkedInDate
}: ErrorModalProps) {
  const { colors, isDark } = useTheme();

  const getIcon = () => {
    switch (type) {
      case 'already-scanned':
        return <UserCheck size={48} color="#FF9500" />;
      case 'not-checked-in':
        return <UserX size={48} color="#FF9500" />;
      case 'invalid-ticket':
        return <XCircle size={48} color="#FF3B30" />;
      default:
        return <AlertTriangle size={48} color="#FF3B30" />;
    }
  };

  const getTitle = () => {
    if (title) return title;
    
    switch (type) {
      case 'already-scanned':
        return 'Already Scanned';
      case 'not-checked-in':
        return 'Not Checked In';
      case 'invalid-ticket':
        return 'Invalid Ticket';
      default:
        return 'Error';
    }
  };

  const getMessage = () => {
    if (message) return message;
    
    switch (type) {
      case 'already-scanned':
        return 'This ticket has already been checked in.';
      case 'not-checked-in':
        return 'This ticket has not been checked in yet.';
      case 'invalid-ticket':
        return 'This QR code is not valid for this event.';
      default:
        return 'An unexpected error occurred.';
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'already-scanned':
      case 'not-checked-in':
        return '#FF9500';
      case 'invalid-ticket':
        return '#FF3B30';
      default:
        return '#FF3B30';
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
          {/* Error Icon */}
          <View style={[styles.iconContainer, { backgroundColor: `${getButtonColor()}15` }]}>
            {getIcon()}
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {getTitle()}
          </Text>

          {/* Guest Info (if available) */}
          {guestName && (
            <Text style={[styles.guestName, { color: colors.primary }]}>
              {guestName}
            </Text>
          )}

          {/* Ticket Type (if available) */}
          {ticketType && (
            <View style={[styles.ticketTypeContainer, { backgroundColor: colors.border }]}>
              <Text style={[styles.ticketType, { color: colors.text }]}>
                {ticketType}
              </Text>
            </View>
          )}

          {/* Check-in Date (for already scanned) */}
          {checkedInDate && type === 'already-scanned' && (
            <View style={[styles.dateContainer, { backgroundColor: colors.border }]}>
              <Text style={[styles.dateLabel, { color: colors.secondary }]}>
                Checked in:
              </Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {checkedInDate}
              </Text>
            </View>
          )}

          {/* Message */}
          <Text style={[styles.message, { color: colors.secondary }]}>
            {getMessage()}
          </Text>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: getButtonColor() }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
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
  guestName: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  ticketTypeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
  },
  ticketType: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  dateContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
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

