import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { X, QrCode } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const { colors } = useTheme();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    // For testing, we'll simulate a scan with mock data after a delay
    const timer = setTimeout(() => {
      // Generate mock scan data
      const mockScanData = JSON.stringify({
        id: 'a1',
        timestamp: new Date().toISOString(),
      });
      
      // Call the onScan callback with our mock data
      onScan(mockScanData);
    }, 3000); // Simulate a scan after 3 seconds
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Scan QR Code</Text>
          <View style={styles.placeholderRight} />
        </View>
        
        <View style={styles.mockScannerArea}>
          <QrCode size={80} color="#FFFFFF" style={styles.qrcodeIcon} />
          <View style={styles.scanArea}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
          </View>
          
          <View style={styles.scanningIndicator}>
            <View style={styles.scanningLine} />
          </View>
        </View>
        
        <Text style={styles.instructions}>
          Simulating scan... Please wait.
        </Text>
        
        <TouchableOpacity 
          style={[styles.cancelButton, { backgroundColor: colors.primary }]} 
          onPress={onClose}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 10,
    marginBottom: 40,
  },
  closeButton: {
    padding: 10,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholderRight: {
    width: 44,
  },
  mockScannerArea: {
    width: 280,
    height: 280,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrcodeIcon: {
    opacity: 0.3,
  },
  scanArea: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderLeftWidth: 5,
    borderTopWidth: 5,
    borderColor: '#FFFFFF',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderColor: '#FFFFFF',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderLeftWidth: 5,
    borderBottomWidth: 5,
    borderColor: '#FFFFFF',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRightWidth: 5,
    borderBottomWidth: 5,
    borderColor: '#FFFFFF',
  },
  scanningIndicator: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#FF6B00',
    opacity: 0.8,
  },
  instructions: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    marginHorizontal: 20,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 40,
    marginBottom: 40,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 