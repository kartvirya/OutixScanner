import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BarChart, TrendingUp, Users, DollarSign } from 'lucide-react-native';

export default function Analytics() {
  const { colors } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
        <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
          Track your event performance
        </Text>
      </View>

      <View style={styles.statsContainer}>
        {/* Revenue Card */}
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(52,199,89,0.1)' }]}>
            <DollarSign size={24} color="#34C759" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>$12,450</Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Total Revenue</Text>
        </View>

        {/* Events Card */}
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
            <BarChart size={24} color="#007AFF" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>24</Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Total Events</Text>
        </View>

        {/* Attendees Card */}
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(88,86,214,0.1)' }]}>
            <Users size={24} color="#5856D6" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>1,234</Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Total Attendees</Text>
        </View>

        {/* Growth Card */}
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,149,0,0.1)' }]}>
            <TrendingUp size={24} color="#FF9500" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>+24%</Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>Monthly Growth</Text>
        </View>
      </View>

      {/* Add more analytics sections here */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  statCard: {
    width: '46%',
    margin: '2%',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
}); 