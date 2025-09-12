import { CameraView, useCameraPermissions } from 'expo-camera';
import { QrCode, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { feedback } from '../services/feedback';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  customHeader?: React.ReactNode;
  showCloseButton?: boolean;
  headerTitle?: string;
  pauseScanning?: boolean;
  onRequestResume?: () => void;
  scanMode?: 'scan-in' | 'passout';
  onScanModeChange?: (mode: 'scan-in' | 'passout') => void;
}

const { width, height } = Dimensions.get('window');

export default function QRScanner({ onScan, onClose, customHeader, showCloseButton, headerTitle, pauseScanning, onRequestResume, scanMode, onScanModeChange }: QRScannerProps) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraKey, setCameraKey] = useState(0); // Add key to force camera remount
  const [lastScannedData, setLastScannedData] = useState<string>('');
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  // Local copy of scan mode to avoid a one-frame lag when parent updates it
  const [localMode, setLocalMode] = useState<'scan-in' | 'passout'>(scanMode ?? 'scan-in');

  // Keep in sync with parent changes
  useEffect(() => {
    setLocalMode(scanMode ?? 'scan-in');
  }, [scanMode]);

  useEffect(() => {
    // Reset camera state when component mounts
    setScanned(false);
    setCameraReady(false);
    // Clear duplicate prevention on mount
    setLastScannedData('');
    setLastScanTime(0);
    // Only increment camera key if needed for a fresh start
    setCameraKey(prev => prev + 1);
  }, []);

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
    const currentTime = Date.now();
    
    // Prevent any scans within 1200ms of the last scan for smoother UX
    if ((currentTime - lastScanTime) < 1200) {
      // Silently ignore - no logging to reduce noise
      return;
    }
    
    console.log('📱 QR Code scanned from camera:', { 
      type, 
      data, 
      dataLength: data.length,
      scanMode: localMode || 'unknown',
      timestamp: new Date().toISOString()
    });
    
    // Immediately prevent further scans and record this scan
    setScanned(true);
    setLastScannedData(data);
    setLastScanTime(currentTime);
    
    // Provide immediate feedback for successful scan
    feedback.qrScanSuccess();
    
    // Call the parent's scan handler immediately; parent handles duplicate guards
    console.log('📱 Calling parent onScan handler with data:', data);
    onScan(data);
    
    // Don't auto-reset - let parent control when to resume scanning
  };

  const handleCameraReady = () => {
    if (!cameraReady) {
      console.log('Camera is ready');
      setCameraReady(true);
      
      // Light haptic feedback when camera is ready (only once)
      feedback.buttonPress();
    }
  };

  // Add function to resume scanning
  const resumeScanning = () => {
    setScanned(false);
    // Clear duplicate prevention when resuming
    setLastScannedData('');
    setLastScanTime(0);
    if (onRequestResume) {
      onRequestResume();
    }
  };

  useEffect(() => {
    // Reset scanning state when pauseScanning changes
    if (!pauseScanning && scanned) {
      setScanned(false);
    }
  }, [pauseScanning, scanned]);

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
        key={cameraKey}
        style={styles.camera}
        facing="back"
        onCameraReady={handleCameraReady}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned || pauseScanning ? undefined : handleBarCodeScanned}
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
              <Text style={styles.headerText}>{headerTitle || (localMode === 'scan-in' ? 'Smart Check In' : 'Smart Check Out')}</Text>
            <View style={styles.placeholderRight} />
          </View>
          )}
          
          {/* Scanner Area */}
          <View style={styles.scannerContainer}>
            {/* Scan Mode Toggle Overlay */}
            {localMode && onScanModeChange && (
              <View style={styles.scanModeOverlay}>
                <View style={styles.scanModeToggleContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.scanModeButton,
                      localMode === 'scan-in' && styles.scanModeButtonActive,
                      { backgroundColor: localMode === 'scan-in' ? '#06D6A0' : 'rgba(0,0,0,0.6)' }
                    ]}
                    onPress={() => { setLocalMode('scan-in'); onScanModeChange('scan-in'); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.scanModeButtonText, 
                      { color: localMode === 'scan-in' ? '#FFFFFF' : '#FFFFFF' }
                    ]}>
                      Check In
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.scanModeButton,
                      localMode === 'passout' && styles.scanModeButtonActive,
                      { backgroundColor: localMode === 'passout' ? '#F72585' : 'rgba(0,0,0,0.6)' }
                    ]}
                    onPress={() => { setLocalMode('passout'); onScanModeChange && onScanModeChange('passout'); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.scanModeButtonText, 
                      { color: localMode === 'passout' ? '#FFFFFF' : '#FFFFFF' }
                    ]}>
                      Passout
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
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
                : pauseScanning
                ? "Scanning paused - processing..."
                : scanned 
                ? "QR code scanned successfully!" 
                : "Position the QR code within the frame"
              }
            </Text>
            
            {/* Show Scan Next button when scanned or paused */}
            {(scanned || pauseScanning) && (
              <TouchableOpacity 
                style={[styles.resumeButton, { backgroundColor: '#06D6A0' }]} 
                onPress={resumeScanning}
                disabled={pauseScanning}
              >
                <Text style={styles.buttonText}>
                  {pauseScanning ? 'Processing...' : 'Scan Next'}
                </Text>
              </TouchableOpacity>
            )}
            
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
    paddingBottom: 140, // Increased from 80 to 140 to avoid overlap with bottom navigation
    alignItems: 'center',
    minHeight: 120,
  },
  instructions: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20, // Reduced from 30 to 20 to optimize spacing
    lineHeight: 22,
  },
  cancelButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    minWidth: 120,
    marginTop: 10, // Added margin top for better spacing from buttons above
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
  resumeButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    marginTop: 15, // Reduced from 20 to 15 for better spacing
    marginBottom: 10, // Added margin bottom to separate from Cancel button
  },
  scanModeOverlay: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 10,
    paddingVertical: 16,
  },
  scanModeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    padding: 4,
  },
  scanModeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  scanModeButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  scanModeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});