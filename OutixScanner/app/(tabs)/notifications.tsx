import { AlertCircle, Calendar, CheckCircle, Info, LucideIcon } from 'lucide-react-native';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface Notification {
  id: string;
  type: 'success' | 'alert' | 'warning' | 'info';
  title: string;
  message: string;
  time: string;
  icon: LucideIcon;
  color: string;
}

// Mock data for notifications
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'Successful Check-in',
    message: 'John Smith checked in to Tech Conference 2024',
    time: '2 mins ago',
    icon: CheckCircle,
    color: '#34C759'
  },
  {
    id: '2',
    type: 'alert',
    title: 'New Event Created',
    message: 'Summer Music Festival 2024 has been published',
    time: '1 hour ago',
    icon: Calendar,
    color: '#007AFF'
  },
  {
    id: '3',
    type: 'warning',
    title: 'Ticket Sales Alert',
    message: 'Tech Conference 2024 is 80% sold out',
    time: '3 hours ago',
    icon: AlertCircle,
    color: '#FF9500'
  },
  {
    id: '4',
    type: 'info',
    title: 'System Update',
    message: 'New features available in the latest update',
    time: '1 day ago',
    icon: Info,
    color: '#5856D6'
  },
];

export default function Notifications() {
  const { colors } = useTheme();

  const renderNotification = ({ item }: { item: Notification }) => {
    const IconComponent = item.icon;
    
    return (
      <TouchableOpacity 
        style={[styles.notificationItem, { backgroundColor: colors.card }]}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
          <IconComponent size={24} color={item.color} />
        </View>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.message, { color: colors.secondary }]}>{item.message}</Text>
          <Text style={[styles.time, { color: colors.secondary }]}>{item.time}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Updates</Text>
        <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
          Stay updated with your events
        </Text>
      </View>

      <FlatList
        data={mockNotifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
  listContainer: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
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
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
  },
}); 