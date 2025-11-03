import { CameraView, useCameraPermissions } from 'expo-camera';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { 
  Alert, Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View 
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../context/ThemeContext';
import { feedback } from '../services/feedback';

interface ModernQRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  headerTitle?: string;
  pauseScanning?: boolean;
  scanMode?: 'scan-in' | 'passout';
  onScanModeChange?: (mode: 'scan-in' | 'passout') => void;
  showCamera?: boolean;
}

const { width } = Dimensions.get('window');

export default function ModernQRScanner({
  onScan,
  onClose,
  headerTitle = 'Event Scanner',
  pauseScanning,
  scanMode = 'scan-in',
  onScanModeChange,
  showCamera = true,
}: ModernQRScannerProps) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [mode, setMode] = useState<'scan-in' | 'passout'>(scanMode);
  const [showPreview, setShowPreview] = useState(false);
  const [qrData, setQRData] = useState('');
  const scaleAnim = useState(new Animated.Value(0.8))[0];

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  useEffect(() => {
    // Sync mode with scanMode prop
    setMode(scanMode);
  }, [scanMode]);

  // Cleanup effect - reset state when component unmounts
  useEffect(() => {
    return () => {
      console.log('🔄 ModernQRScanner unmounting - cleaning up');
      setScanned(false);
      setShowPreview(false);
      setQRData('');
    };
  }, []);

  // Force camera cleanup when showCamera becomes false
  useEffect(() => {
    if (!showCamera) {
      console.log('🔄 Force stopping camera - showCamera is false');
      // Reset all camera-related state
      setScanned(false);
      setShowPreview(false);
      setQRData('');
    }
  }, [showCamera]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || pauseScanning) return;
    setScanned(true);
    setQRData(data);
    setShowPreview(true);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    setTimeout(() => onScan(data), 1500);
  };

  const handleModeToggle = (newMode: 'scan-in' | 'passout') => {
    setMode(newMode);
    onScanModeChange?.(newMode);
  };

  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, marginBottom: 12 }}>
          Camera permission is required to scan QR codes
        </Text>
         <TouchableOpacity
           onPress={requestPermission}
           style={[styles.permissionButton, { backgroundColor: colors.primary }]}
         >
           <Text style={styles.permissionButtonText}>Grant Permission</Text>
         </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{headerTitle}</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Mode Switch */}
      <View style={styles.switchRow}>
        {(['scan-in', 'passout'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => handleModeToggle(m)}
            style={[
              styles.switchBtn,
              { backgroundColor: mode === m ? colors.primary : colors.border },
            ]}
          >
            <Text style={{ color: mode === m ? '#fff' : colors.text }}>
              {m === 'scan-in' ? 'Check In' : 'Pass Out'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

       {/* Camera */}
       <View style={{ flex: 1 }}>
         {showCamera ? (
           <CameraView
             style={{ flex: 1 }}
             facing="back"
             onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
             barcodeScannerSettings={{ barcodeTypes: ['qr', 'pdf417'] }}
           >
             <View style={styles.overlay}>
               <View style={[styles.frame, { borderColor: colors.primary }]}>
                 {showPreview && (
                   <Animated.View
                     style={[
                       styles.qrInsideFrame,
                       { transform: [{ scale: scaleAnim }] },
                     ]}
                   >
                     <View style={styles.qrContainer}>
                       <QRCode
                         value={qrData}
                         size={120}
                         color="#000000"
                         backgroundColor="#FFFFFF"
                         logoSize={0}
                         logoMargin={0}
                         logoBorderRadius={0}
                         quietZone={10}
                       />
                     </View>
                   </Animated.View>
                 )}
               </View>
               <Text style={[styles.scanText, { color: colors.text }]}>
                 {showPreview ? 'QR Code Detected' : 'Position QR inside frame'}
               </Text>
             </View>
           </CameraView>
         ) : (
           <View style={[styles.cameraPlaceholder, { backgroundColor: colors.background }]}>
             <Text style={[styles.placeholderText, { color: colors.text }]}>
               Camera Stopped
             </Text>
           </View>
         )}
       </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  headerBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  switchBtn: {
    flex: 1,
    marginHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
   frame: {
     width: width * 0.6,
     height: width * 0.6,
     borderWidth: 2,
     borderRadius: 16,
     justifyContent: 'center',
     alignItems: 'center',
   },
   qrInsideFrame: {
     justifyContent: 'center',
     alignItems: 'center',
   },
   qrContainer: {
     backgroundColor: '#FFFFFF',
     padding: 12,
     borderRadius: 8,
     shadowColor: '#000000',
     shadowOffset: {
       width: 0,
       height: 2,
     },
     shadowOpacity: 0.25,
     shadowRadius: 4,
     elevation: 5,
   },
  scanText: {
    marginTop: 20,
    fontSize: 14,
    opacity: 0.7,
  },
   permissionButton: {
     paddingVertical: 12,
     paddingHorizontal: 24,
     borderRadius: 10,
   },
   permissionButtonText: {
     color: '#fff',
     fontWeight: '600',
     fontSize: 16,
   },
   cameraPlaceholder: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
   },
   placeholderText: {
     fontSize: 18,
     fontWeight: '600',
   },
});
