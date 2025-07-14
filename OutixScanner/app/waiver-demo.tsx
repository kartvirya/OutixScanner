import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import WaiverDemo from '../components/WaiverDemo';
import { useTheme } from '../context/ThemeContext';

export default function WaiverDemoPage() {
  const { colors, isDark } = useTheme();
  const [waiverStatuses, setWaiverStatuses] = useState({
    participant1: false,
    participant2: true,
    participant3: false,
  });

  const handleWaiverSigned = (participantId: string) => {
    setWaiverStatuses(prev => ({
      ...prev,
      [participantId]: true
    }));
  };

  const sampleParticipants = [
    {
      id: 'participant1',
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '+61 412 345 678',
      vehicle: 'Ford Mustang GT 2023',
      eventName: 'THE BEND 500 - 2025 SUPERCARS CHAMPIONSHIP',
      eventDate: 'Competition Licensing Saturday 16 August 2025',
      waiverSigned: waiverStatuses.participant1
    },
    {
      id: 'participant2',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '+61 423 456 789',
      vehicle: 'Porsche 911 GT3 2024',
      eventName: 'THE BEND 500 - 2025 SUPERCARS CHAMPIONSHIP',
      eventDate: 'Competition Licensing Saturday 16 August 2025',
      waiverSigned: waiverStatuses.participant2
    },
    {
      id: 'participant3',
      name: 'Michael Brown',
      email: 'michael.brown@email.com',
      phone: '+61 434 567 890',
      vehicle: 'BMW M4 Competition 2023',
      eventName: 'THE BEND 500 - 2025 SUPERCARS CHAMPIONSHIP',
      eventDate: 'Competition Licensing Saturday 16 August 2025',
      waiverSigned: waiverStatuses.participant3
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor="transparent" 
        translucent 
      />
      
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Digital Waiver Demo
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
          Modern waiver signing interface
        </Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            Key Features
          </Text>
          <Text style={[styles.infoText, { color: colors.secondary }]}>
            • Step-by-step guided process{'\n'}
            • Modern, intuitive interface{'\n'}
            • Digital signature capture{'\n'}
            • Pre-filled participant information{'\n'}
            • Comprehensive risk acknowledgment{'\n'}
            • Mobile-optimized design{'\n'}
            • Progress tracking{'\n'}
            • Form validation
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Sample Participants
        </Text>

        {sampleParticipants.map((participant) => (
          <WaiverDemo
            key={participant.id}
            participantName={participant.name}
            email={participant.email}
            phone={participant.phone}
            vehicle={participant.vehicle}
            eventName={participant.eventName}
            eventDate={participant.eventDate}
            waiverSigned={participant.waiverSigned}
            onWaiverSigned={() => handleWaiverSigned(participant.id)}
          />
        ))}

        <View style={[styles.comparisonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.comparisonTitle, { color: colors.text }]}>
            vs. Current WebView Implementation
          </Text>
          <View style={styles.comparisonList}>
            <Text style={[styles.comparisonItem, { color: colors.secondary }]}>
              ❌ Current: Multi-page web form with poor mobile UX
            </Text>
            <Text style={[styles.comparisonItem, { color: colors.primary }]}>
              ✅ New: Single-page native interface with step progression
            </Text>
            
            <Text style={[styles.comparisonItem, { color: colors.secondary }]}>
              ❌ Current: Difficult navigation between form pages
            </Text>
            <Text style={[styles.comparisonItem, { color: colors.primary }]}>
              ✅ New: Intuitive step-by-step flow with validation
            </Text>
            
            <Text style={[styles.comparisonItem, { color: colors.secondary }]}>
              ❌ Current: External web signature that may not work well
            </Text>
            <Text style={[styles.comparisonItem, { color: colors.primary }]}>
              ✅ New: Native digital signature capture
            </Text>
            
            <Text style={[styles.comparisonItem, { color: colors.secondary }]}>
              ❌ Current: No progress indication or form state management
            </Text>
            <Text style={[styles.comparisonItem, { color: colors.primary }]}>
              ✅ New: Clear progress bar and intelligent form handling
            </Text>
          </View>
        </View>

        <View style={[styles.noteCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
          <Text style={[styles.noteTitle, { color: colors.primary }]}>
            Implementation Note
          </Text>
          <Text style={[styles.noteText, { color: colors.primary }]}>
            This is a demonstration of the new waiver interface. To integrate with the actual waiver system, 
            the signature capture would need a proper signature library (like react-native-signature-capture) 
            and the API integration would need to be connected to the actual waiver submission endpoint.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  infoCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  comparisonCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  comparisonList: {
    gap: 12,
  },
  comparisonItem: {
    fontSize: 14,
    lineHeight: 18,
  },
  noteCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
}); 