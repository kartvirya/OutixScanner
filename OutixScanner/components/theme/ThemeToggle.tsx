import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { isDarkMode, toggleTheme, colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? '#1C1C1E' : '#F2F2F7' }
      ]}
      onPress={toggleTheme}
      activeOpacity={0.8}
    >
      <View style={[
        styles.indicator,
        isDarkMode ? styles.indicatorRight : styles.indicatorLeft,
        { backgroundColor: isDarkMode ? '#333333' : '#FFFFFF' }
      ]}>
        <FontAwesome5
          name={isDarkMode ? 'moon' : 'sun'}
          size={16}
          color={isDarkMode ? '#FFFFFF' : colors.primary}
        />
      </View>
      
      <Text 
        style={[
          styles.currentModeText, 
          isDarkMode ? styles.textRight : styles.textLeft,
          { color: colors.primary }
        ]}
      >
        {isDarkMode ? 'Dark' : 'Light'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 110,
    height: 36,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  indicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  indicatorLeft: {
    left: 2,
  },
  indicatorRight: {
    right: 2,
  },
  currentModeText: {
    fontSize: 14,
    fontWeight: '600',
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  textLeft: {
    right: 0,
    paddingRight: 14,
  },
  textRight: {
    left: 0,
    paddingLeft: 14,
  },
}); 