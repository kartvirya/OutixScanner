import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  Alert,
  StatusBar,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LogIn, LogOut } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import QRScanner from '../../components/QRScanner';
import { 
  validateQRCode, 
  scanQRCode, 
  unscanQRCode,
  QRValidationResponse,
} from '../../services/api';
import { feedback, initializeAudio } from '../../services/feedback';

type ScanMode = 'scan-in' | 'scan-out';

export default function ScannerScreen() {
  const { colors } = useTheme();
  const [currentEventId, setCurrentEventId] = useState('77809'); // Default event ID
  const [scanMode, setScanMode] = useState<ScanMode>('scan-in');
  const [toggleAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    initializeAudio();
  }, []);

  useEffect(() => {
    // Animate toggle when mode changes
    Animated.spring(toggleAnimation, {
      toValue: scanMode === 'scan-in' ? 0 : 1,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [scanMode]);

  const toggleScanMode = () => {
    feedback.buttonPress();
    setScanMode(prev => prev === 'scan-in' ? 'scan-out' : 'scan-in');
  };

  const handleScanResult = async (data: string) => {
    try {
      console.log('QR Code scanned:', data);
      
      const validationResult = await validateQRCode(currentEventId, data);
      
      if (!validationResult) {
        feedback.error();
        Alert.alert('Validation Error', 'Failed to validate QR code. Please try again.');
        return;
      }
      
      if (validationResult.error) {
        feedback.qrScanError();
        let errorMessage = 'This QR code is not valid for this event.';
        if (typeof validationResult.msg === 'string') {
          errorMessage = validationResult.msg;
        } else if (validationResult.msg && typeof validationResult.msg === 'object' && 'message' in validationResult.msg) {
          errorMessage = validationResult.msg.message;
        }
        
        Alert.alert('Invalid QR Code', errorMessage);
        return;
      }
      
      feedback.success();
      
      let ticketInfo = null;
      if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
        ticketInfo = validationResult.msg.info;
      }
      
      // Automatically perform the selected scan mode
      if (scanMode === 'scan-in') {
        await performScanIn(data, validationResult);
      } else {
        await performScanOut(data, validationResult);
      }
      
    } catch (error) {
      console.error('QR scan error:', error);
      feedback.error();
      Alert.alert('Error', 'An unexpected error occurred while processing the QR code.');
    }
  };

  const performScanIn = async (scanCode: string, validationResult: QRValidationResponse) => {
    try {
      const scanResult = await scanQRCode(currentEventId, scanCode);
      
      if (!scanResult || scanResult.error) {
        let errorMessage = 'Failed to scan in guest';
        if (scanResult?.msg) {
          errorMessage = typeof scanResult.msg === 'string' ? scanResult.msg : scanResult.msg.message;
        }
        
        feedback.error();
        Alert.alert('Scan In Failed', errorMessage);
        return;
      }
      
      feedback.checkIn();
      
      let successMessage = 'Scan successful';
      if (typeof scanResult.msg === 'string') {
        successMessage = scanResult.msg;
      } else if (scanResult.msg && typeof scanResult.msg === 'object' && 'message' in scanResult.msg) {
        successMessage = scanResult.msg.message;
      }
      
      let ticketInfo = null;
      if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
        ticketInfo = validationResult.msg.info;
      }
      
      Alert.alert(
        '✅ Guest Checked In',
        `${ticketInfo?.fullname || 'Guest'} has been checked in.\n\n${successMessage}`
      );
      
    } catch (error) {
      console.error('Scan in error:', error);
      feedback.error();
      Alert.alert('Scan In Error', 'Failed to scan in guest. Please try again.');
    }
  };

  const performScanOut = async (scanCode: string, validationResult: QRValidationResponse) => {
    try {
      const unscanResult = await unscanQRCode(currentEventId, scanCode);
      
      if (!unscanResult || unscanResult.error) {
        let errorMessage = 'Failed to scan out guest';
        if (unscanResult?.msg) {
          errorMessage = typeof unscanResult.msg === 'string' ? unscanResult.msg : unscanResult.msg.message;
        }
        
        feedback.error();
        Alert.alert('Scan Out Failed', errorMessage);
        return;
      }
      
      feedback.success();
      
      let successMessage = 'Unscan successful';
      if (typeof unscanResult.msg === 'string') {
        successMessage = unscanResult.msg;
      } else if (unscanResult.msg && typeof unscanResult.msg === 'object' && 'message' in unscanResult.msg) {
        successMessage = unscanResult.msg.message;
      }
      
      let ticketInfo = null;
      if (validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
        ticketInfo = validationResult.msg.info;
      }
      
      Alert.alert(
        '🚪 Guest Checked Out',
        `${ticketInfo?.fullname || 'Guest'} has been checked out.\n\n${successMessage}`
      );
      
    } catch (error) {
      console.error('Scan out error:', error);
      feedback.error();
      Alert.alert('Scan Out Error', 'Failed to scan out guest. Please try again.');
    }
  };

  const toggleBackgroundColor = toggleAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['#10B981', '#EF4444'], // Green for scan-in, Red for scan-out
  });

  const toggleTranslateX = toggleAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 44], // Move toggle button
  });

  // Custom header content for the QR scanner
  const customHeader = (
    <View style={[styles.customHeader, { backgroundColor: colors.card }]}>
      {/* Mode Toggle */}
      <View style={styles.toggleContainer}>
        <Animated.View style={[styles.toggleBackground, { backgroundColor: toggleBackgroundColor }]}>
          <Animated.View 
            style={[
              styles.toggleButton, 
              { 
                backgroundColor: colors.card,
                transform: [{ translateX: toggleTranslateX }]
              }
            ]}
          >
            {scanMode === 'scan-in' ? (
              <LogIn size={16} color="#10B981" />
            ) : (
              <LogOut size={16} color="#EF4444" />
            )}
          </Animated.View>
        </Animated.View>
        
        <TouchableOpacity 
          style={styles.toggleTouchable}
          onPress={toggleScanMode}
          activeOpacity={0.8}
        >
          <View style={styles.toggleLabels}>
            <Text style={[
              styles.toggleLabel, 
              { 
                color: scanMode === 'scan-in' ? '#FFFFFF' : '#CCCCCC',
                fontWeight: scanMode === 'scan-in' ? '600' : '400'
              }
            ]}>
              Scan In
            </Text>
            <Text style={[
              styles.toggleLabel, 
              { 
                color: scanMode === 'scan-out' ? '#FFFFFF' : '#CCCCCC',
                fontWeight: scanMode === 'scan-out' ? '600' : '400'
              }
            ]}>
              Scan Out
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Current Mode Indicator */}
      <View style={[
        styles.modeIndicator, 
        { 
          backgroundColor: scanMode === 'scan-in' ? '#10B981' : '#EF4444',
        }
      ]}>
        <View style={styles.modeIndicatorContent}>
          {scanMode === 'scan-in' ? (
            <LogIn size={20} color="#FFFFFF" />
          ) : (
            <LogOut size={20} color="#FFFFFF" />
          )}
          <Text style={styles.modeIndicatorText}>
            {scanMode === 'scan-in' ? 'SCAN IN MODE' : 'SCAN OUT MODE'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* QR Scanner with custom header */}
      <QRScanner
        onScan={handleScanResult}
        onClose={() => {}} // No close functionality since this is the main screen
        customHeader={customHeader}
        showCloseButton={false}
        headerTitle={scanMode === 'scan-in' ? 'Scan In Mode' : 'Scan Out Mode'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  customHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  toggleContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  toggleBackground: {
    width: 88,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleButton: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  toggleTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  toggleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: '100%',
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  modeIndicator: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modeIndicatorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeIndicatorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
}); 