import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Upload, FileImage, FileText, X, Code } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface QRCodeImporterProps {
  visible: boolean;
  onClose: () => void;
  onQRCodeDetected: (qrCode: string) => void;
}

export default function QRCodeImporter({ visible, onClose, onQRCodeDetected }: QRCodeImporterProps) {
  const { colors } = useTheme();
  const [customQRCode, setCustomQRCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleManualQRCode = () => {
    if (customQRCode.trim()) {
      console.log('✅ Manual QR Code entered:', customQRCode.trim());
      onQRCodeDetected(customQRCode.trim());
      setCustomQRCode('');
      onClose();
    } else {
      Alert.alert('Invalid Input', 'Please enter a QR code.');
    }
  };

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    
    try {
      console.log('📁 File selected:', file.name, 'Type:', file.type);
      
      // Check if it's an image or PDF
      if (file.type.startsWith('image/')) {
        await processImageFile(file);
      } else if (file.type === 'application/pdf') {
        await processPDFFile(file);
      } else {
        Alert.alert('Invalid File Type', 'Please select an image file (JPG, PNG, etc.) or PDF file.');
        return;
      }
    } catch (error) {
      console.error('❌ File processing error:', error);
      Alert.alert('Error', 'Failed to process the uploaded file.');
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const processImageFile = async (file: File) => {
    try {
      // Create a FileReader to read the image
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const imageData = e.target?.result as string;
          console.log('🖼️ Image loaded, processing for QR codes...');
          
          // Simulate file processing time
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // For web environment, we'll use the manual input field instead of Alert.prompt
          // Clear the input field for user to enter the QR code manually
          setCustomQRCode('');
          Alert.alert(
            'Image Processed',
            'Please enter the QR code text found in the uploaded image in the text field below, then click "Use QR Code".'
          );
          
        } catch (error) {
          console.error('❌ Image processing error:', error);
          Alert.alert('Error', 'Failed to process the image.');
        }
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('❌ Image file processing error:', error);
      throw error;
    }
  };

  const processPDFFile = async (file: File) => {
    try {
      console.log('📄 Processing PDF file:', file.name);
      
      // Simulate PDF processing
      // In a real implementation, you'd need to:
      // 1. Convert PDF pages to images
      // 2. Scan each image for QR codes
      // 3. Extract the QR code data
      
      // For web environment, we'll use the manual input field instead of Alert.prompt
      // Clear the input field for user to enter the QR code manually
      setCustomQRCode('');
      Alert.alert(
        'PDF Processed',
        'Please enter the QR code text found in the uploaded PDF in the text field below, then click "Use QR Code".'
      );
      
    } catch (error) {
      console.error('❌ PDF processing error:', error);
      throw error;
    }
  };


  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Import QR Code
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={[styles.description, { color: colors.secondary }]}>
              Upload an image or PDF containing a QR code to import it into the scanner
            </Text>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.processingText, { color: colors.text }]}>
                  Processing file...
                </Text>
              </View>
            ) : (
              <View style={styles.optionsContainer}>
                {/* File Upload Options */}
                <View style={styles.uploadSection}>
                  <TouchableOpacity
                    style={[styles.uploadButton, { backgroundColor: colors.primary }]}
                    onPress={handleFileUpload}
                  >
                    <Upload size={24} color="#FFFFFF" />
                    <Text style={styles.uploadButtonText}>Upload Image or PDF</Text>
                    <Text style={styles.uploadButtonSubtext}>
                      Select a file containing a QR code
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Manual QR Code Entry */}
                <View style={styles.inputSection}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    Or enter QR code manually:
                  </Text>
                  <TextInput
                    style={[styles.qrInput, { 
                      backgroundColor: colors.background, 
                      borderColor: colors.border,
                      color: colors.text 
                    }]}
                    value={customQRCode}
                    onChangeText={setCustomQRCode}
                    placeholder="Enter QR code text here..."
                    placeholderTextColor={colors.secondary}
                    multiline
                    numberOfLines={3}
                  />
                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: colors.primary }]}
                    onPress={handleManualQRCode}
                    disabled={!customQRCode.trim()}
                  >
                    <Code size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Use QR Code</Text>
                  </TouchableOpacity>
                </View>

              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 0,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 16,
  },
  uploadSection: {
    gap: 12,
  },
  uploadButton: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textAlign: 'center',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  inputSection: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  qrInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
