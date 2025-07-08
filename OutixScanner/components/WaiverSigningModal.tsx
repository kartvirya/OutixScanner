import { Image } from 'expo-image';
import {
    AlertTriangle,
    Check,
    FileText,
    PenTool,
    User,
    X,
    AlertCircle
} from 'lucide-react-native';
import React, { useRef, useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
    SafeAreaView,
    StatusBar
} from 'react-native';
import WebView from 'react-native-webview';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { useTheme } from '../context/ThemeContext';
import { submitWaiver, Waiver } from '../services/api';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

// Add type for signature pad ref
interface SignaturePad {
  clearSignature: () => void;
}

interface WaiverData {
  // Participant Info
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  dateOfBirth: string;
  address: string;
  signature: string;
  acknowledged: boolean;
  
  // Parent/Guardian Info
  signedByParent: boolean;
  parentName: string;
  
  // Minor Info
  isMinor: boolean;
  guardianName: string;
  guardianRelationship: string;
  guardianSignature: string;
  
  // Witness Info
  witnessName: string;
  witnessEmail: string;
  witnessPhone: string;
  witnessSignature: string;
  
  // Additional Info from Waiver List
  driverRiderName?: string;
  manufacturer?: string;
  model?: string;
  engineCapacity?: string;
  year?: string;
  sponsors?: string;
  quickestET?: string;
  quickestMPH?: string;
  andraLicenseNumber?: string;
  ihraLicenseNumber?: string;
  licenseExpiryDate?: string;
  driversLicenseNumber?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  racingNumber?: string;
}

interface WaiverSigningModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (waiverData: WaiverData) => Promise<void>;
  waiver?: Waiver; // Waiver data for auto-fill
  eventName: string;
  eventDate: string;
  waiverLink?: string; // Dynamic waiver link
  waiverLogo?: string; // Dynamic waiver logo
  waiverBgImage?: string; // Dynamic waiver background image
  role?: 'driver' | 'crew'; // Add role parameter
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  dateOfBirth: string;
  signature: string;
  acknowledged: boolean;
  witnessName: string;
  witnessEmail: string;
  witnessPhone: string;
  witnessSignature: string;
  isMinor: boolean;
  signedByParent: boolean;
  parentName: string;
  guardianName: string;
  guardianRelationship: string;
  guardianSignature: string;
}

interface WaiverSubmissionResponse {
  success: boolean;
  message?: string;
  waiverData: WaiverData; // Make waiverData required since we use it
}

export default function WaiverSigningModal({
  visible,
  onClose,
  onSubmit,
  waiver,
  eventName,
  eventDate,
  waiverLink,
  waiverLogo,
  waiverBgImage,
  role = 'driver' // Default to driver if not specified
}: WaiverSigningModalProps) {
  const { colors, colorScheme } = useTheme();
  const { width } = useWindowDimensions();
  
  // All useState hooks at the top level
  const [currentStep, setCurrentStep] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const [isMinor, setIsMinor] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    dateOfBirth: '',
    signature: '',
    acknowledged: false,
    witnessName: '',
    witnessEmail: '',
    witnessPhone: '',
    witnessSignature: '',
    isMinor: false,
    signedByParent: false,
    parentName: '',
    guardianName: '',
    guardianRelationship: '',
    guardianSignature: ''
  });

  // All useRef hooks
  const signatureRef = useRef<SignatureViewRef>(null);
  const witnessSignatureRef = useRef<SignatureViewRef>(null);
  const guardianSignatureRef = useRef<SignatureViewRef>(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [waiverLoading, setWaiverLoading] = useState(false);
  const [waiverError, setWaiverError] = useState<string | null>(null);
  
  // Content states
  const [signature, setSignature] = useState<string>("");
  const [witnessSignature, setWitnessSignature] = useState<string>("");

  // Effects
  useEffect(() => {
    if (visible && waiverLink) {
      fetchWaiverContent(waiverLink);
    }
  }, [visible, waiverLink]);

  // Reset form when modal opens or when role/waiver changes
  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible, role, waiver]);

  // Function to fetch waiver content from the waiver link
  const fetchWaiverContent = async (waiverLink: string) => {
    try {
      setWaiverLoading(true);
      setWaiverError(null);
      
      // Just verify that the URL is accessible
      const response = await fetch(waiverLink, {
        method: 'HEAD',
        redirect: 'follow'
      });
      
      if (!response.ok) {
        throw new Error('Failed to access waiver content');
      }
      
      setWaiverLoading(false);
    } catch (error) {
      console.error('Error fetching waiver:', error);
      setWaiverError("Failed to load waiver content.");
      setWaiverLoading(false);
    }
  };
  

  const steps = [
    { id: 0, title: 'Welcome', icon: FileText },
    { id: 1, title: 'Your Info', icon: User },
    { id: 2, title: 'Terms & Conditions', icon: AlertTriangle },
    { id: 3, title: 'Your Signature', icon: PenTool },
    { id: 4, title: 'Witness Info', icon: User },
    { id: 5, title: 'Witness Signature', icon: PenTool }
  ];

  const resetForm = () => {
    setCurrentStep(0);
    
    // For driver waiver, prefill data from the waiver card
    if (role === 'driver' && waiver) {
      const nameParts = waiver['Client Name']?.split(' ') || [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setFormData({
        firstName: firstName,
        lastName: lastName,
        email: waiver.Email || '',
        mobile: waiver.Mobile || '',
        dateOfBirth: '',
        signature: '',
        acknowledged: false,
        witnessName: '',
        witnessEmail: '',
        witnessPhone: '',
        witnessSignature: '',
        isMinor: false,
        signedByParent: false,
        parentName: '',
        guardianName: '',
        guardianRelationship: '',
        guardianSignature: ''
      });
    } else {
      // For crew waiver or when no waiver data, use empty form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
        dateOfBirth: '',
        signature: '',
        acknowledged: false,
        witnessName: '',
        witnessEmail: '',
        witnessPhone: '',
        witnessSignature: '',
        isMinor: false,
        signedByParent: false,
        parentName: '',
        guardianName: '',
        guardianRelationship: '',
        guardianSignature: ''
      });
    }
  };

  const handleClose = () => {
    if (currentStep > 0) {
      Alert.alert(
        'Incomplete Waiver',
        'Are you sure you want to exit? Your progress will be lost.',
        [
          { text: 'Continue Signing', style: 'cancel' },
          { 
            text: 'Exit', 
            style: 'destructive',
            onPress: () => {
              resetForm();
              onClose();
            }
          }
        ]
      );
    } else {
      onClose();
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Add function to calculate age
  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Update date of birth handler to check age
  const handleDateOfBirth = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const age = calculateAge(dateString);
    setFormData(prev => ({
      ...prev,
      dateOfBirth: dateString,
      isMinor: age < 18,
      // Reset parent fields when age changes
      signedByParent: false,
      parentName: ''
    }));
  };

  // Platform-specific date picker rendering
  const renderDatePicker = () => {
    if (Platform.OS === 'ios') {
      return (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
        >
          <View style={styles.datePickerOverlay}>
            <View style={[styles.datePickerContent, { backgroundColor: colors.background }]}>
              <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={{ color: colors.text, fontSize: 17 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    handleDateOfBirth(date);
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={{ color: colors.primary, fontSize: 17 }}>Confirm</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setDate(selectedDate);
                    }
                  }}
                  textColor={colors.text}
                  maximumDate={new Date()}
                  style={styles.datePicker}
                />
              </View>
            </View>
          </View>
        </Modal>
      );
    }

    // For Android, show the native date picker
    if (showDatePicker) {
      return (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (event.type === 'set' && selectedDate) {
              setDate(selectedDate);
              handleDateOfBirth(selectedDate);
            }
          }}
          maximumDate={new Date()}
        />
      );
    }

    return null;
  };

  // Handle guardian signature
  const handleGuardianSignature = (signature: string) => {
    setFormData(prev => ({
      ...prev,
      guardianSignature: signature
    }));
  };

  // Update canProceedFromStep to include guardian signature check
  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 0: // Welcome
        return true;
      case 1: // Personal Info
        return !!(
          formData.firstName &&
          formData.lastName &&
          formData.email &&
          formData.mobile &&
          formData.dateOfBirth
        );
      case 2: // Terms
        return formData.acknowledged;
      case 3: // Signature
        if (isMinor) {
          return !!(
            formData.guardianName &&
            formData.guardianRelationship &&
            formData.guardianSignature
          );
        }
        return !!formData.signature;
      case 4: // Witness Info
        return !!(
          formData.witnessName &&
          formData.witnessEmail &&
          formData.witnessPhone
        );
      case 5: // Witness Signature
        return !!formData.witnessSignature;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Create WaiverData object from FormData
      const waiverData: WaiverData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        mobile: formData.mobile,
        dateOfBirth: formData.dateOfBirth,
        address: '', // Not used in this form
        signature: formData.signature,
        acknowledged: formData.acknowledged,
        signedByParent: formData.signedByParent,
        parentName: formData.parentName,
        isMinor: formData.isMinor,
        guardianName: formData.guardianName,
        guardianRelationship: formData.guardianRelationship,
        guardianSignature: formData.guardianSignature,
        witnessName: formData.witnessName,
        witnessEmail: formData.witnessEmail,
        witnessPhone: formData.witnessPhone,
        witnessSignature: formData.witnessSignature
      };

      // Create submission data for API
      const submissionData = {
        waiverType: role === 'driver' ? 'Entrant' as const : 'Crew' as const,
        waiver_ref: waiver?.Ref || 'unknown-ref',
        first_name: formData.firstName,
        last_name: formData.lastName,
        date_of_birth: formData.dateOfBirth,
        email_address: formData.email,
        mobile_number: formData.mobile,
        witness_name: formData.witnessName,
        applicant_name: `${formData.firstName} ${formData.lastName}`,
        witness_address: formData.witnessPhone || 'Not provided',
        applicantSignFile: formData.signature,
        witnessSignFile: formData.witnessSignature,
        signed_by_parent: formData.signedByParent,
        parent_name: formData.parentName
      };

      const response = await submitWaiver(submissionData);
      if (response.success) {
        onSubmit(waiverData);
      } else {
        Alert.alert('Error', response.message || 'Failed to submit waiver');
      }
    } catch (error) {
      console.error('Error submitting waiver:', error);
      Alert.alert('Error', 'Failed to submit waiver. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignature = (signature: string) => {
    setFormData(prev => ({ ...prev, signature }));
    setSignature(signature);
  };

  const handleWitnessSignature = (signature: string) => {
    setFormData(prev => ({ ...prev, witnessSignature: signature }));
    setWitnessSignature(signature);
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        {steps.map((step, index) => (
          <View key={step.id} style={styles.progressStep}>
            <View style={[
              styles.progressStepCircle,
              {
                backgroundColor: index <= currentStep ? colors.primary : colors.border,
                borderColor: index <= currentStep ? colors.primary : colors.border
              }
            ]}>
              {index < currentStep ? (
                <Check size={16} color="#FFFFFF" />
              ) : (
                <step.icon size={16} color={index === currentStep ? "#FFFFFF" : colors.text} style={{ opacity: index === currentStep ? 1 : 0.6 }} />
              )}
            </View>
            {index < steps.length - 1 && (
              <View style={[
                styles.progressLine,
                { backgroundColor: index < currentStep ? colors.primary : colors.border }
              ]} />
            )}
          </View>
        ))}
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        {steps[currentStep].title}
      </Text>
    </View>
  );

  const renderWelcomeStep = () => (
    <View style={styles.stepContent}>
      {/* Dynamic Background Image */}
      {waiverBgImage && (
        <Image
          source={{ uri: waiverBgImage }}
          style={styles.backgroundImage}
          contentFit="cover"
        />
      )}
      
      <View style={styles.logoContainer}>
        {/* Dynamic Waiver Logo */}
        {waiverLogo ? (
          <Image
            source={{ uri: waiverLogo }}
            style={styles.logo}
            contentFit="contain"
          />
        ) : (
        <Image
          source={
            colorScheme === 'dark' 
              ? require('../assets/bendlogo/darkmode.svg')
              : require('../assets/bendlogo/lighmode.svg')
          }
          style={styles.logo}
          contentFit="contain"
        />
        )}
      </View>
      <Text style={[styles.title, { color: colors.text }]}>
        {role === 'driver' ? 'Driver Waiver' : 'Crew Waiver'}
      </Text>
      <Text style={[styles.description, { color: colors.text }]}>
        Please complete this digital {role} waiver form to participate in the event.
      </Text>
      <Text style={[styles.eventDetails, { color: colors.text }]}>
        Event: {eventName}
      </Text>
      <Text style={[styles.eventDetails, { color: colors.text }]}>
        Date: {eventDate}
      </Text>
    </View>
  );

  const renderPersonalInfo = () => {
    return (
      <View style={styles.stepContent}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Info!</Text>
          <Text style={[styles.description, { color: colors.text, opacity: 0.6 }]}>
            Please enter your details.
          </Text>
          
            <TextInput
          style={[styles.textInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="First Name"
              placeholderTextColor={`${colors.text}80`}
              value={formData.firstName}
          onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
            />

            <TextInput
          style={[styles.textInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Last Name"
              placeholderTextColor={`${colors.text}80`}
              value={formData.lastName}
          onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
            />

            <TextInput
          style={[styles.textInput, { borderColor: colors.border, color: colors.text }]}
          placeholder="Email"
              placeholderTextColor={`${colors.text}80`}
              value={formData.email}
          onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
          style={[styles.textInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Mobile"
              placeholderTextColor={`${colors.text}80`}
              value={formData.mobile}
          onChangeText={(text) => setFormData(prev => ({ ...prev, mobile: text }))}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
          style={[styles.textInput, { borderColor: colors.border, justifyContent: 'center' }]}
              onPress={() => setShowDatePicker(true)}
            >
          <Text style={{ color: formData.dateOfBirth ? colors.text : `${colors.text}80` }}>
            {formData.dateOfBirth || 'Date of Birth'}
              </Text>
            </TouchableOpacity>

        {renderDatePicker()}
          </View>
  );
  };

const renderTermsAndConditions = () => {
  // CSS to inject into the WebView
  const cssInject = `
    (function() {
      if (typeof document === 'undefined') {
        return;
      }
      
      const style = document.createElement('style');
      style.textContent = \`
        body {
          font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
          padding: 24px !important;
          color: ${colorScheme === 'dark' ? '#FFFFFF' : '#000000'} !important;
          background-color: ${colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF'} !important;
          line-height: 1.7 !important;
          font-size: 16px !important;
          margin: 0 !important;
        }
        
        * {
          color: ${colorScheme === 'dark' ? '#FFFFFF' : '#000000'} !important;
        }
        
        h1, h2, h3, h4, h5, h6 {
          color: ${colors.primary} !important;
          margin: 28px 0 18px !important;
          font-weight: 600 !important;
          line-height: 1.3 !important;
        }

        h1 { 
          font-size: 26px !important; 
          text-align: center !important;
          margin-bottom: 24px !important;
        }
        h2 { 
          font-size: 22px !important; 
          margin-top: 32px !important;
        }
        h3 { 
          font-size: 19px !important; 
          margin-top: 28px !important;
        }
        
        p {
          margin: 0 0 18px !important;
          font-size: 16px !important;
          line-height: 1.7 !important;
          color: ${colorScheme === 'dark' ? '#FFFFFF' : '#000000'} !important;
        }
        
        ul, ol {
          margin: 0 0 20px !important;
          padding-left: 28px !important;
        }
        
        li {
          margin-bottom: 10px !important;
          line-height: 1.6 !important;
          color: ${colorScheme === 'dark' ? '#FFFFFF' : '#000000'} !important;
          font-size: 15px !important;
        }
        
        img {
          max-width: 100% !important;
          height: auto !important;
          margin: 28px auto !important;
          display: block !important;
          border-radius: 8px !important;
        }
        
        table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 28px 0 !important;
          font-size: 15px !important;
        }
        
        th, td {
          border: 1px solid ${colorScheme === 'dark' ? '#666666' : '#DDDDDD'} !important;
          padding: 14px 18px !important;
          text-align: left !important;
          color: ${colorScheme === 'dark' ? '#FFFFFF' : '#000000'} !important;
        }
        
        th {
          background-color: ${colorScheme === 'dark' ? '#333333' : '#F5F5F5'} !important;
          font-weight: 600 !important;
          color: ${colorScheme === 'dark' ? '#FFFFFF' : '#000000'} !important;
        }
        
        tr:nth-child(even) {
          background-color: ${colorScheme === 'dark' ? '#262626' : '#F8F8F8'} !important;
        }
        
        a {
          color: ${colors.primary} !important;
          text-decoration: none !important;
        }
        
        strong, b {
          font-weight: 600 !important;
          color: ${colorScheme === 'dark' ? '#FFFFFF' : '#000000'} !important;
        }
        
        div, span, section, article {
          color: ${colorScheme === 'dark' ? '#FFFFFF' : '#000000'} !important;
        }

        .section {
          margin: 24px 0 !important;
          padding: 20px !important;
          border-radius: 12px !important;
          background-color: ${colorScheme === 'dark' ? '#2A2A2A' : '#F8F8F8'} !important;
          border: 1px solid ${colorScheme === 'dark' ? '#444444' : '#EEEEEE'} !important;
        }
      \`;
      
      if (document.head) {
        document.head.appendChild(style);
      } else {
        setTimeout(() => {
          if (document.head) {
            document.head.appendChild(style);
          }
        }, 100);
      }
    })();
    true;
  `;

  return (
    <View style={styles.termsStepContainer}>
      <View style={[styles.termsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {waiverLogo && (
          <View style={[styles.logoContainer, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
            <Image
              source={{ uri: waiverLogo }}
              style={styles.waiverLogo}
              contentFit="contain"
            />
          </View>
        )}

        {waiverLoading ? (
          <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading terms and conditions...
            </Text>
          </View>
        ) : waiverError ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
            <AlertCircle size={32} color="#EF4444" />
            <Text style={[styles.errorText, { color: "#EF4444" }]}>
              {waiverError}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (waiverLink) {
                  fetchWaiverContent(waiverLink);
                }
              }}
            >
              <Text style={[styles.retryButtonText, { color: colors.background }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.webViewContainer}>
            {waiverLink && (
              <WebView
                source={{ uri: waiverLink }}
                style={styles.webView}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                )}
                onError={() => {
                  setWaiverError("Failed to load waiver content.");
                }}
                scalesPageToFit={true}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scrollEnabled={true}
                bounces={false}
                nestedScrollEnabled={true}
                injectedJavaScript={cssInject}
                onLoadEnd={() => {
                  // Additional styling after page loads
                  const additionalStyling = `
                    (function() {
                      if (typeof document === 'undefined') return;
                      
                      setTimeout(() => {
                        try {
                          if (document.body) {
                            document.body.style.color = '${colorScheme === 'dark' ? '#FFFFFF' : '#000000'}';
                            document.body.style.backgroundColor = '${colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF'}';
                          }
                          
                          const allElements = document.querySelectorAll('*');
                          allElements.forEach(el => {
                            if (el.tagName !== 'IMG' && el.tagName !== 'SVG') {
                              el.style.color = '${colorScheme === 'dark' ? '#FFFFFF' : '#000000'}';
                            }
                          });
                        } catch (e) {
                          console.log('Styling error:', e);
                        }
                      }, 200);
                    })();
                    true;
                  `;
                  
                  // Only run additional styling on platforms that support it
                  if (Platform.OS === 'ios' || Platform.OS === 'android') {
                    setTimeout(() => {
                      // This will be handled by the WebView's JavaScript engine
                    }, 100);
                  }
                }}
                onMessage={(event) => {
                  console.log('WebView message:', event.nativeEvent.data);
                }}
              />
            )}
          </View>
        )}
      </View>

      <View style={[styles.acknowledgementContainer, { 
        borderTopColor: colors.border,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1
      }]}>
        <TouchableOpacity
          style={[styles.checkbox, { borderColor: colors.text }]}
          onPress={() =>
            setFormData((prev) => ({
              ...prev,
              acknowledged: !prev.acknowledged,
            }))
          }
        >
          <View style={[
            styles.checkboxInner,
            { borderColor: colors.text },
            formData.acknowledged && { backgroundColor: colors.text }
          ]}>
            {formData.acknowledged && <Check size={12} color={colors.background} />}
          </View>
        </TouchableOpacity>
        <Text style={[styles.acknowledgementText, { color: colors.text }]}>
          I have read and agree to the terms and conditions
        </Text>
      </View>
    </View>
  );
};


  const renderSignature = () => {
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Signature</Text>
        <Text style={[styles.description, { color: colors.text, opacity: 0.6 }]}>
          {formData.isMinor 
            ? 'Please have a parent or guardian sign below.'
            : 'Please sign below to acknowledge the waiver terms.'
          }
        </Text>

        {formData.isMinor && (
          <>
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={[styles.checkbox, { borderColor: colors.text }]}
                onPress={() => setFormData(prev => ({ ...prev, signedByParent: !prev.signedByParent }))}
              >
                <View style={[
                  styles.checkboxInner,
                  { borderColor: colors.text },
                  formData.signedByParent && { backgroundColor: colors.text }
                ]}>
                  {formData.signedByParent && <Check size={12} color={colors.background} />}
                </View>
              </TouchableOpacity>
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                I am the lawful custodial parent or non-custodial parent or legal guardian(s) of the registrant.
              </Text>
            </View>

            {formData.signedByParent && (
              <TextInput
                style={[styles.textInput, { borderColor: colors.border, color: colors.text }]}
                placeholder="Parent/Guardian Full Name"
                placeholderTextColor={`${colors.text}80`}
                value={formData.parentName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, parentName: text }))}
              />
            )}
          </>
        )}

        <View style={[styles.signatureContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.signaturePadContainer, { borderColor: colors.border }]}>
            <SignatureScreen
              ref={signatureRef}
              onOK={handleSignature}
              onEmpty={() => handleSignature("")}
              webStyle={`
                .m-signature-pad {
                  box-shadow: none;
                  border: none;
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  touch-action: none;
                  user-select: none;
                  -webkit-user-select: none;
                  -webkit-touch-callout: none;
                }
                .m-signature-pad--body {
                  border: none;
                  position: relative;
                  touch-action: none;
                  overflow: hidden;
                }
                .m-signature-pad--footer {
                  display: none;
                }
                canvas {
                  touch-action: none;
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  height: 100%;
                  user-select: none;
                  -webkit-user-select: none;
                  -webkit-touch-callout: none;
                }
                body {
                  touch-action: none;
                  overflow: hidden;
                  position: fixed;
                  width: 100%;
                  height: 100%;
                }
                html {
                  touch-action: none;
                  overflow: hidden;
                }
                * {
                  -webkit-user-select: none;
                  -moz-user-select: none;
                  -ms-user-select: none;
                  user-select: none;
                }
              `}
              autoClear={false}
              imageType="image/svg+xml"
              onBegin={() => {
                // Disable scrolling when starting to sign
                if (Platform.OS === 'web') {
                  document.body.style.overflow = 'hidden';
                  document.body.style.touchAction = 'none';
                  document.body.style.position = 'fixed';
                  document.documentElement.style.overflow = 'hidden';
                  document.documentElement.style.touchAction = 'none';
                }
              }}
              onEnd={() => {
                // Re-enable scrolling after signing
                if (Platform.OS === 'web') {
                  document.body.style.overflow = 'auto';
                  document.body.style.touchAction = 'auto';
                  document.body.style.position = 'static';
                  document.documentElement.style.overflow = 'auto';
                  document.documentElement.style.touchAction = 'auto';
                }
              }}
            />
          </View>

          <View style={[styles.signatureButtons, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.signatureButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (signatureRef.current) {
                  signatureRef.current.clearSignature();
                  handleSignature("");
                }
              }}
            >
              <Text style={[styles.signatureButtonText, { color: colors.background }]}>
                Clear
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.signatureButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (signatureRef.current) {
                  signatureRef.current.readSignature();
                }
              }}
            >
              <Text style={[styles.signatureButtonText, { color: colors.background }]}>
                Save Signature
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderWitnessInfo = () => (
    <KeyboardAvoidingView 
      style={styles.stepContent} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Witness Information</Text>
          <Text style={[styles.description, { color: colors.text, opacity: 0.6 }]}>
            Please have a witness enter their details.
            </Text>

            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="Witness Full Name"
              placeholderTextColor={`${colors.text}80`}
                value={formData.witnessName}
              onChangeText={(text) => setFormData({ ...formData, witnessName: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="Witness Email"
              placeholderTextColor={`${colors.text}80`}
                value={formData.witnessEmail}
              onChangeText={(text) => setFormData({ ...formData, witnessEmail: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Witness Phone (Optional)"
              placeholderTextColor={`${colors.text}80`}
                value={formData.witnessPhone}
              onChangeText={(text) => setFormData({ ...formData, witnessPhone: text })}
                keyboardType="phone-pad"
              />
            </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderWitnessSignature = () => {
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Witness Signature</Text>
        <Text style={[styles.description, { color: colors.text, opacity: 0.6 }]}>
          Please have your witness sign below to acknowledge their presence.
        </Text>
        
        <View style={[styles.signatureContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.signaturePadContainer, { borderColor: colors.border }]}>
            <SignatureScreen
              ref={witnessSignatureRef}
              onOK={(signature) => handleWitnessSignature(signature)}
              onEmpty={() => handleWitnessSignature("")}
              webStyle={`
                .m-signature-pad {
                  box-shadow: none;
                  border: none;
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  touch-action: none;
                  user-select: none;
                  -webkit-user-select: none;
                  -webkit-touch-callout: none;
                }
                .m-signature-pad--body {
                  border: none;
                  position: relative;
                  touch-action: none;
                  overflow: hidden;
                }
                .m-signature-pad--footer {
                  display: none;
                }
                canvas {
                  touch-action: none;
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  height: 100%;
                  user-select: none;
                  -webkit-user-select: none;
                  -webkit-touch-callout: none;
                }
                body {
                  touch-action: none;
                  overflow: hidden;
                  position: fixed;
                  width: 100%;
                  height: 100%;
                }
                html {
                  touch-action: none;
                  overflow: hidden;
                }
                * {
                  -webkit-user-select: none;
                  -moz-user-select: none;
                  -ms-user-select: none;
                  user-select: none;
                }
              `}
              autoClear={false}
              imageType="image/svg+xml"
              onBegin={() => {
                // Disable scrolling when starting to sign
                if (Platform.OS === 'web') {
                  document.body.style.overflow = 'hidden';
                  document.body.style.touchAction = 'none';
                  document.body.style.position = 'fixed';
                  document.documentElement.style.overflow = 'hidden';
                  document.documentElement.style.touchAction = 'none';
                }
              }}
              onEnd={() => {
                // Re-enable scrolling after signing
                if (Platform.OS === 'web') {
                  document.body.style.overflow = 'auto';
                  document.body.style.touchAction = 'auto';
                  document.body.style.position = 'static';
                  document.documentElement.style.overflow = 'auto';
                  document.documentElement.style.touchAction = 'auto';
                }
              }}
            />
          </View>

          <View style={[styles.signatureButtons, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.signatureButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (witnessSignatureRef.current) {
                  witnessSignatureRef.current.clearSignature();
                  handleWitnessSignature("");
                }
              }}
            >
              <Text style={[styles.signatureButtonText, { color: colors.background }]}>
                Clear
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.signatureButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (witnessSignatureRef.current) {
                  witnessSignatureRef.current.readSignature();
                }
              }}
            >
              <Text style={[styles.signatureButtonText, { color: colors.background }]}>
                Save Signature
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderWelcomeStep();
      case 1:
        return renderPersonalInfo();
      case 2:
        return renderTermsAndConditions();
      case 3:
        return renderSignature();
      case 4:
        return renderWitnessInfo();
      case 5:
        return renderWitnessSignature();
      default:
        return null;
    }
  };

const styles = StyleSheet.create({
    container: {
    flex: 1,
  },
  modalContent: {
      flex: 1,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
    contentContainer: {
    flex: 1,
  },
    scrollView: {
      flex: 1,
  },
    scrollContent: {
      paddingBottom: 20,
    },
    stepContent: {
    flex: 1,
    padding: 16,
    },
    textInput: {
      height: 48,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 16,
    marginBottom: 16,
      fontSize: 16,
  },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginVertical: 16,
      paddingHorizontal: 4,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 2,
      borderRadius: 4,
      marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
    checkboxLabel: {
      flex: 1,
    fontSize: 14,
      lineHeight: 20,
    },
    signaturePadContainer: {
      marginTop: 0,
      height: 300,
      borderWidth: 0,
      borderRadius: 8,
      overflow: 'hidden',
    },
  signatureButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
      paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  signatureButton: {
      paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
      minWidth: 100,
    alignItems: 'center',
  },
  signatureButtonText: {
    fontSize: 14,
      fontWeight: '600',
  },
    sectionTitle: {
      fontSize: 24,
      fontWeight: 'bold',
    marginBottom: 8,
  },
    description: {
    fontSize: 16,
      marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
      paddingTop: 16,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
      alignItems: 'center',
  },
  backButton: {
      marginRight: 8,
  },
  nextButton: {
    flex: 2,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
    disabledButton: {
      opacity: 0.5,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
  logo: {
    width: '100%',
    height: 60,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  eventDetails: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 20,
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
    termsContainer: {
      flex: 1,
      borderRadius: 12,
      padding: 0,
      marginVertical: 16,
      minHeight: 300,
      maxHeight: Dimensions.get('window').height * 0.5,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    waiverLogo: {
      width: '100%',
      height: 50,
      maxWidth: 160,
    },
    termsScrollView: {
      flex: 1,
  },
    termsScrollContent: {
      flexGrow: 1,
      paddingBottom: 16,
  },
    htmlContainer: {
      flex: 1,
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: colors.background,
      borderRadius: 12,
    },
    errorText: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 20,
      lineHeight: 20,
    },
    retryButton: {
    paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
  },
    retryButtonText: {
    fontSize: 14,
      fontWeight: '600',
    },
    signatureContainer: {
      minHeight: 200,
      maxHeight: 450,
      borderRadius: 12,
      overflow: 'hidden',
      marginVertical: 16,
      borderWidth: 1,
    },
    progressContainer: {
      marginTop: 'auto',
      paddingTop: 16,
    },
    progressBar: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 8,
    },
    progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
    progressStepCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
    progressLine: {
      flex: 1,
      height: 2,
      marginHorizontal: 8,
    },
    stepTitle: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    acknowledgementContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: 20,
      paddingBottom: 20,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      marginTop: 20,
      borderRadius: 12,
      minHeight: 60,
    },
    acknowledgementText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      marginLeft: 12,
    },
    signatureNote: {
    fontSize: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  signatureArea: {
    height: 150,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  signaturePlaceholder: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  signatureInstructions: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  signatureComplete: {
    fontSize: 24,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  footerInfo: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  witnessSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    opacity: 0.1,
    zIndex: -1,
  },
  loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
  },
  loadingText: {
      marginTop: 12,
      fontSize: 14,
  },
    webViewContainer: {
    flex: 1,
      minHeight: 400,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: 'transparent',
  },
    webView: {
    flex: 1,
      height: '100%',
      width: '100%',
      backgroundColor: 'transparent',
  },
    guardianSection: {
      marginTop: 24,
    },
    participantLabel: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 8,
  },
    datePickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
  },
  datePickerContent: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
    datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
  },
    datePickerTitle: {
      fontSize: 17,
    fontWeight: '600',
  },
    datePickerContainer: {
      height: 216,
      alignItems: 'center',
      justifyContent: 'center',
    },
    datePicker: {
    width: '100%',
      height: 216,
  },
    checkboxInner: {
      width: 16,
      height: 16,
      borderRadius: 2,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noScrollContent: {
      flex: 1,
    },
    termsStepContainer: {
      flex: 1,
      padding: 16,
    },
}); 

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar 
          barStyle={colors.background === '#000000' ? 'light-content' : 'dark-content'} 
          backgroundColor={colors.background} 
          translucent={false}
        />
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.container]}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X color={colors.text} size={24} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Sign Waiver</Text>
              <View style={{ width: 32 }} />
            </View>

            {/* Progress Indicator */}
            {renderProgressBar()}

            {/* Content */}
            <View style={styles.contentContainer}>
              {/* Remove ScrollView for signature steps and terms step to prevent scroll interference */}
              {currentStep === 2 || currentStep === 3 || currentStep === 5 ? (
                // For Terms & Conditions and Signature steps - no outer scroll
                <View style={styles.noScrollContent}>
                  {renderStepContent()}
                </View>
              ) : (
                // For other steps - use ScrollView
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {renderStepContent()}
                </ScrollView>
              )}
            </View>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={[styles.footerButton, styles.backButton]}
                  onPress={prevStep}
                >
                  <Text style={[styles.footerButtonText, { color: colors.primary }]}>
                    Back
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.footerButton,
                  styles.nextButton,
                  { 
                    backgroundColor: !canProceedFromStep(currentStep) || loading ? 
                      `${colors.primary}50` : colors.primary 
                  },
                  !canProceedFromStep(currentStep) && styles.disabledButton
                ]}
                onPress={currentStep === steps.length - 1 ? handleSubmit : nextStep}
                disabled={!canProceedFromStep(currentStep) || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.footerButtonText, { color: '#FFFFFF' }]}>
                    {currentStep === steps.length - 1 ? 'Submit' : 'Next'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
} 