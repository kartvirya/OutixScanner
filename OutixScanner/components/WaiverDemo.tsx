import { FileCheck, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import WaiverSigningModal from './WaiverSigningModal';

interface WaiverDemoProps {
  participantName: string;
  email: string;
  phone: string;
  vehicle: string;
  eventName: string;
  eventDate: string;
  waiverSigned: boolean;
  onWaiverSigned: () => void;
}

export default function WaiverDemo({
  participantName,
  email,
  phone,
  vehicle,
  eventName,
  eventDate,
  waiverSigned,
  onWaiverSigned
}: WaiverDemoProps) {
  const { colors } = useTheme();
  const [showWaiverModal, setShowWaiverModal] = useState(false);

  const handleWaiverSubmit = async (waiverData: any) => {
    // Simulate API submission
    console.log('Submitting waiver data:', waiverData);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate success
    Alert.alert(
      'Waiver Submitted Successfully!',
      'Your digital waiver has been recorded and you are now cleared for participation.',
      [{ text: 'OK', onPress: onWaiverSigned }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.participantCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.participantHeader}>
          <User size={24} color={colors.primary} />
          <Text style={[styles.participantName, { color: colors.text }]}>{participantName}</Text>
        </View>
        
        <Text style={[styles.participantDetails, { color: colors.secondary }]}>
          {email} • {phone}
        </Text>
        <Text style={[styles.vehicleDetails, { color: colors.secondary }]}>
          Vehicle: {vehicle}
        </Text>

        <View style={styles.waiverStatus}>
          <View style={[
            styles.statusBadge,
            { 
              backgroundColor: waiverSigned ? '#10B98120' : '#EF444420',
              borderColor: waiverSigned ? '#10B981' : '#EF4444',
            }
          ]}>
            <Text style={[
              styles.statusBadgeText, 
              { color: waiverSigned ? '#10B981' : '#EF4444' }
            ]}>
              {waiverSigned ? '✓ Waiver Signed' : '✗ Waiver Pending'}
            </Text>
          </View>
        </View>

        {!waiverSigned && (
          <TouchableOpacity
            style={[styles.signWaiverButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowWaiverModal(true)}
          >
            <FileCheck size={18} color="#FFFFFF" />
            <Text style={styles.signWaiverButtonText}>Sign Digital Waiver</Text>
          </TouchableOpacity>
        )}
      </View>

      <WaiverSigningModal
        visible={showWaiverModal}
        onClose={() => setShowWaiverModal(false)}
        onSubmit={handleWaiverSubmit}
        participantInfo={{
          name: participantName,
          email: email,
          phone: phone,
          vehicle: vehicle
        }}
        eventName={eventName}
        eventDate={eventDate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  participantCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantName: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  participantDetails: {
    fontSize: 14,
    marginBottom: 8,
  },
  vehicleDetails: {
    fontSize: 14,
    marginBottom: 16,
  },
  waiverStatus: {
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  signWaiverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  signWaiverButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 