import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, MapPin, Users } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface EventImagePlaceholderProps {
  style?: {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    backgroundColor?: string;
    [key: string]: unknown;
  };
}

export const EventImagePlaceholder: React.FC<EventImagePlaceholderProps> = ({ style }) => {
  return (
    <LinearGradient
      colors={['#FF6B35', '#F7931E', '#FFD23F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      {/* Background pattern */}
      <View style={styles.backgroundPattern}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>OUTIX</Text>
        </View>
        
        <View style={styles.iconContainer}>
          <Calendar size={24} color="rgba(255, 255, 255, 0.8)" />
          <MapPin size={24} color="rgba(255, 255, 255, 0.8)" />
          <Users size={24} color="rgba(255, 255, 255, 0.8)" />
        </View>
        
        <Text style={styles.subtitle}>Event Scanner</Text>
      </View>
      
      {/* Overlay for better text readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)']}
        style={styles.overlay}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 120,
    height: 120,
    top: -20,
    right: -30,
  },
  circle2: {
    width: 80,
    height: 80,
    bottom: -10,
    left: -20,
  },
  circle3: {
    width: 60,
    height: 60,
    top: '50%',
    right: '20%',
    opacity: 0.6,
  },
  content: {
    alignItems: 'center',
    zIndex: 2,
  },
  logoContainer: {
    marginBottom: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  iconContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
}); 