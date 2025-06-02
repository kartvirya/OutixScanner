import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, QrCode } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { feedback } from '../services/feedback';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  customHeader?: React.ReactNode;
  showCloseButton?: boolean;
  headerTitle?: string;
}

const { width, height } = Dimensions.get('window');

export default function QRScanner({ onScan, onClose, customHeader, showCloseButton, headerTitle }: QRScannerProps) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    const requestCameraPermission = async () => {
      try {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert(
            'Camera Permission Required',
            'Please allow camera access to scan QR codes',
            [
              { text: 'Cancel', onPress: onClose },
              { text: 'Settings', onPress: requestPermission }
            ]
          );
        }
      } catch (error) {
        console.error('Permission error:', error);
        Alert.alert('Error', 'Failed to request camera permission');
      }
    };

    if (!permission) {
      requestCameraPermission();
    }
  }, [permission, requestPermission, onClose]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    console.log('QR Code scanned:', { type, data });
    setScanned(true);
    
    // Provide immediate feedback for successful scan
    feedback.qrScanSuccess();
    
    // Vibrate or provide feedback here if needed
    onScan(data);
    
    // Reset after 3 seconds
    setTimeout(() => {
      setScanned(false);
    }, 3000);
  };

  const handleCameraReady = () => {
    console.log('Camera is ready');
    setCameraReady(true);
    
    // Light haptic feedback when camera is ready
    feedback.buttonPress();
  };

  // Loading state
  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Camera Access</Text>
            <View style={styles.placeholderRight} />
          </View>
          
          <View style={styles.permissionContent}>
            <QrCode size={80} color="#FFFFFF" style={styles.qrcodeIcon} />
            <Text style={styles.permissionText}>
              Camera permission is required to scan QR codes
            </Text>
            <TouchableOpacity 
              style={[styles.permissionButton, { backgroundColor: colors.primary }]} 
              onPress={() => {
                feedback.buttonPress();
                requestPermission();
              }}
            >
              <Text style={styles.buttonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Main camera view
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onCameraReady={handleCameraReady}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          {/* Header */}
          {customHeader ? (
            customHeader
          ) : (
            <View style={styles.headerBar}>
              {showCloseButton && (
                <TouchableOpacity onPress={() => {
                  feedback.buttonPress();
                  onClose();
                }} style={styles.closeButton}>
                  <X size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <Text style={styles.headerText}>{headerTitle || 'Scan QR Code'}</Text>
              <View style={styles.placeholderRight} />
            </View>
          )}
          
          {/* Scanner Area */}
          <View style={styles.scannerContainer}>
            <View style={styles.scanArea}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
              
              {scanned && (
                <View style={styles.scannedOverlay}>
                  <Text style={styles.scannedText}>✓ Scanned!</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructions}>
              {!cameraReady 
                ? "Initializing camera..." 
                : scanned 
                ? "QR code detected and processed" 
                : "Position the QR code within the frame"
              }
            </Text>
            
            <TouchableOpacity 
              style={[styles.cancelButton, { backgroundColor: colors.primary }]} 
              onPress={() => {
                feedback.buttonPress();
                onClose();
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholderRight: {
    width: 40,
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: '#FFFFFF',
    borderRadius: 4,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderColor: '#FFFFFF',
    borderRadius: 4,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: '#FFFFFF',
    borderRadius: 4,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderColor: '#FFFFFF',
    borderRadius: 4,
  },
  scannedOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -15 }],
    backgroundColor: 'rgba(0, 255, 0, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scannedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 50,
    alignItems: 'center',
  },
  instructions: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  cancelButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    minWidth: 120,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Permission screens
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 30,
    lineHeight: 24,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 20,
  },
  qrcodeIcon: {
    opacity: 0.3,
  },
});