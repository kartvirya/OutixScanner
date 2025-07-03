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
    useWindowDimensions
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { useTheme } from '../context/ThemeContext';
import { signWaiver, Waiver } from '../services/api';

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
  waiverBgImage
}: WaiverSigningModalProps) {
  // Theme and window dimensions
  const { colors, colorScheme } = useTheme();
  const { width } = useWindowDimensions();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(0);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [waiverLoading, setWaiverLoading] = useState(false);
  const [waiverError, setWaiverError] = useState<string | null>(null);
  
  // Content states
  const [waiverContent, setWaiverContent] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const [witnessSignature, setWitnessSignature] = useState<string>("");
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Form data
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    dateOfBirth: "",
    address: "",
    acknowledged: false,
    witnessName: "",
    witnessEmail: "",
    witnessPhone: "",
    signature: "",
    witnessSignature: ""
  });
  
  // Refs
  const signatureRef = useRef<SignatureViewRef>(null);
  const witnessSignatureRef = useRef<SignatureViewRef>(null);

  // Effects
  useEffect(() => {
    if (visible && waiverLink) {
      fetchWaiverContent(waiverLink);
    }
  }, [visible, waiverLink]);

  // Function to fetch waiver content from the waiver link
  const fetchWaiverContent = async (url: string) => {
    try {
      setWaiverLoading(true);
      setWaiverError(null);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch waiver content: ${response.status}`);
      }
      
      const htmlContent = await response.text();
      setWaiverContent(htmlContent);
    } catch (error) {
      console.error('Error fetching waiver content:', error);
      setWaiverError(error instanceof Error ? error.message : 'Failed to load waiver content');
    } finally {
      setWaiverLoading(false);
    }
  };

  const steps = [
    { id: 0, title: 'Welcome', icon: FileText },
    { id: 1, title: 'Your Info', icon: User },
    { id: 2, title: 'Terms & Conditions', icon: AlertTriangle },
    { id: 3, title: 'Signatures', icon: PenTool }
  ];

  const resetForm = () => {
    setCurrentStep(0);
    setFormData({
      firstName: waiver?.['Client Name']?.split(' ')[0] || '',
      lastName: waiver?.['Client Name']?.split(' ').slice(1).join(' ') || '',
      email: waiver?.Email || '',
      mobile: waiver?.Mobile || '',
      dateOfBirth: '',
      address: waiver?.Address || '',
      acknowledged: false,
      witnessName: '',
      witnessEmail: '',
      witnessPhone: '',
      signature: '',
      witnessSignature: ''
    });
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

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return true; // Welcome step
      case 1:
        return !!(
          formData.firstName.trim() &&
          formData.lastName.trim() &&
          formData.email.trim() &&
          formData.dateOfBirth.trim()
        );
      case 2:
        return formData.acknowledged;
      case 3:
        return !!(formData.signature && formData.witnessSignature);
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!canProceedFromStep(3)) {
      Alert.alert('Incomplete', 'Please complete all required fields and sign the waiver.');
      return;
    }

    try {
      setLoading(true);
      
      // Get campaign_token and stoken from URL if available
      // In a real app, these would be passed as props or stored in context
      const urlParams = new URLSearchParams(window.location.search);
      const campaign_token = urlParams.get('campaign_token') || undefined;
      const stoken = urlParams.get('stoken') || undefined;

      // Prepare data without signature
      const waiverData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        mobile: formData.mobile,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        acknowledged: formData.acknowledged,
        campaign_token,
        stoken,
        witnessName: formData.witnessName,
        witnessEmail: formData.witnessEmail,
        witnessPhone: formData.witnessPhone,
        witnessSignature: formData.witnessSignature
      };

      // Call the API but don't send signature
      await signWaiver(waiverData);
      
      Alert.alert(
        'Success',
        'Waiver submitted successfully!',
        [{ 
          text: 'OK',
          onPress: () => {
            resetForm();
            onClose();
          }
        }]
      );
    } catch (error) {
      console.error('Error submitting waiver:', error);
      Alert.alert('Error', 'Failed to submit waiver. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignature = (signature: string) => {
    setFormData(prev => ({ ...prev, signature }));
  };

  const handleWitnessSignature = (signature: string) => {
    setFormData(prev => ({ ...prev, witnessSignature: signature }));
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
        Digital Waiver
      </Text>
      <Text style={[styles.description, { color: colors.text }]}>
        Please complete this digital waiver form to participate in the event.
      </Text>
      <Text style={[styles.eventDetails, { color: colors.text }]}>
        Event: {eventName}
      </Text>
      <Text style={[styles.eventDetails, { color: colors.text }]}>
        Date: {eventDate}
      </Text>
    </View>
  );

  const renderPersonalInfo = () => (
    <KeyboardAvoidingView 
      style={styles.stepContent} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Info!</Text>
          <Text style={[styles.description, { color: colors.text, opacity: 0.6 }]}>
            Please enter your details.
          </Text>
          
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="First Name"
              placeholderTextColor={`${colors.text}80`}
              value={formData.firstName}
              onChangeText={(text) => setFormData({ ...formData, firstName: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Last Name"
              placeholderTextColor={`${colors.text}80`}
              value={formData.lastName}
              onChangeText={(text) => setFormData({ ...formData, lastName: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Email Address"
              placeholderTextColor={`${colors.text}80`}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Mobile"
              placeholderTextColor={`${colors.text}80`}
              value={formData.mobile}
              onChangeText={(text) => setFormData({ ...formData, mobile: text })}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={[styles.textInput, styles.datePickerButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.datePickerText, { color: formData.dateOfBirth ? colors.text : colors.text }]}>
                {formData.dateOfBirth || 'Select Date of Birth'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderTermsAndConditions = () => {
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.description, { color: colors.text, opacity: 0.6 }]}>
          Please carefully read all the terms and conditions and proceed.
        </Text>

        <View style={[styles.termsContainer, { backgroundColor: colors.card }]}>
          {waiverLogo && (
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: waiverLogo }}
                style={styles.waiverLogo}
                contentFit="contain"
              />
            </View>
          )}
          
          {waiverLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : waiverError ? (
            <View style={styles.errorContainer}>
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
            <ScrollView 
              style={styles.termsScrollView}
              contentContainerStyle={styles.termsScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.htmlContainer}>
                <RenderHtml
                  contentWidth={width - 72} // Account for padding and margins
                  source={{ html: waiverContent }}
                  tagsStyles={{
                    body: {
                      color: colors.text,
                      fontSize: 14,
                      lineHeight: 20,
                    },
                    p: {
                      marginBottom: 16,
                    },
                    h3: {
                      fontSize: 16,
                      fontWeight: 'bold',
                      marginBottom: 8,
                      marginTop: 16,
                    },
                    ul: {
                      marginBottom: 16,
                      paddingLeft: 16,
                    },
                    li: {
                      marginBottom: 8,
                    },
                  }}
                />
              </View>
          </ScrollView>
          )}
        </View>

        <View style={styles.acknowledgementContainer}>
        <TouchableOpacity
            style={styles.checkbox}
          onPress={() => setFormData({ ...formData, acknowledged: !formData.acknowledged })}
        >
          <View style={[
              styles.checkboxInner,
              { borderColor: colors.primary },
              formData.acknowledged && { backgroundColor: colors.primary }
          ]}>
              {formData.acknowledged && <Check size={16} color="#FFF" />}
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
        <Text style={[styles.description, { color: colors.text, opacity: 0.6 }]}>
          Please sign below to acknowledge your agreement.
        </Text>
        
        <View style={[styles.signatureContainer, { backgroundColor: colors.card }]}>
          <View style={styles.signaturePadContainer}>
            <SignatureScreen
              ref={signatureRef}
              onOK={(signature) => setSignature(signature)}
              onEmpty={() => setSignature("")}
              webStyle={`
                .m-signature-pad {
                  box-shadow: none;
                  border: none;
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                }
                .m-signature-pad--body {
                  border: none;
                }
                .m-signature-pad--footer {
                  display: none;
                }
                canvas {
                  touch-action: none;
                }
              `}
              autoClear={true}
              imageType="image/svg+xml"
              onBegin={() => {
                // Disable scrolling when starting to sign
                if (Platform.OS === 'web') {
                  document.body.style.overflow = 'hidden';
                }
              }}
              onEnd={() => {
                // Re-enable scrolling after signing
                if (Platform.OS === 'web') {
                  document.body.style.overflow = 'auto';
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
                  setSignature("");
                }
              }}
            >
              <Text style={[styles.signatureButtonText, { color: colors.background }]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderWitnessSignature = () => {
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.description, { color: colors.text, opacity: 0.6 }]}>
          Please have a witness sign below.
        </Text>
        
        <View style={[styles.signatureContainer, { backgroundColor: colors.card }]}>
              <SignatureScreen
            ref={witnessSignatureRef}
            onOK={(signature) => setWitnessSignature(signature)}
            onEmpty={() => setWitnessSignature("")}
                webStyle={`
                  .m-signature-pad {
                    box-shadow: none;
                    border: none;
                  }
                  .m-signature-pad--body {
                    border: none;
                  }
                  .m-signature-pad--footer {
                    display: none;
                  }
                `}
              />
            </View>

        <View style={styles.signatureActions}>
            <TouchableOpacity
              style={[styles.clearButton, { borderColor: colors.border }]}
            onPress={() => witnessSignatureRef.current?.clearSignature()}
            >
            <Text style={[styles.clearButtonText, { color: colors.text }]}>Clear</Text>
            </TouchableOpacity>
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
        return renderWitnessSignature();
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
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
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              {[0, 1, 2, 3, 4].map((step) => (
                <View
                  key={step}
                  style={[
                    styles.progressStep,
                    { backgroundColor: step <= currentStep ? colors.primary : colors.border }
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.progressText, { color: colors.text }]}>
              Step {currentStep + 1} of 5
            </Text>
          </View>

        {/* Content */}
          <View style={styles.contentContainer}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              {currentStep === 0 && renderTermsAndConditions()}
              {currentStep === 1 && renderPersonalInfo()}
              {currentStep === 2 && renderSignature()}
              {currentStep === 3 && renderWitnessSignature()}
            </ScrollView>
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
                { backgroundColor: colors.primary },
                !canProceedFromStep(currentStep) && styles.disabledButton
              ]}
              onPress={currentStep === steps.length - 1 ? handleSubmit : nextStep}
              disabled={!canProceedFromStep(currentStep) || loading}
            >
              <Text style={[styles.footerButtonText, { color: '#FFFFFF' }]}>
                {currentStep === steps.length - 1 ? 'Submit' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.datePickerModalOverlay}>
          <View style={[styles.datePickerModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.datePickerTitle, { color: colors.text }]}>Select Date of Birth</Text>
            </View>
            
            <View style={styles.datePickerContent}>
              <View style={styles.dateInputsContainer}>
                <View style={styles.dateInputGroup}>
                  <Text style={[styles.dateLabel, { color: colors.text }]}>Day</Text>
                  <TextInput
                    style={[styles.dateInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                    placeholder="DD"
                    value={selectedDate.getDate().toString().padStart(2, '0')}
                    onChangeText={(text) => {
                      const day = parseInt(text) || 1;
                      const newDate = new Date(selectedDate);
                      newDate.setDate(day);
                      setSelectedDate(newDate);
                    }}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                
                <View style={styles.dateInputGroup}>
                  <Text style={[styles.dateLabel, { color: colors.text }]}>Month</Text>
                  <TextInput
                    style={[styles.dateInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                    placeholder="MM"
                    value={(selectedDate.getMonth() + 1).toString().padStart(2, '0')}
                    onChangeText={(text) => {
                      const month = parseInt(text) || 1;
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(month - 1);
                      setSelectedDate(newDate);
                    }}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                
                <View style={styles.dateInputGroup}>
                  <Text style={[styles.dateLabel, { color: colors.text }]}>Year</Text>
                  <TextInput
                    style={[styles.dateInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                    placeholder="YYYY"
                    value={selectedDate.getFullYear().toString()}
                    onChangeText={(text) => {
                      const year = parseInt(text) || new Date().getFullYear();
                      const newDate = new Date(selectedDate);
                      newDate.setFullYear(year);
                      setSelectedDate(newDate);
                    }}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </View>
            </View>
            
            <View style={styles.datePickerActions}>
            <TouchableOpacity
                style={[styles.datePickerButton, { borderColor: colors.border }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={[styles.datePickerButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.datePickerButton, styles.datePickerPrimaryButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  const formattedDate = `${selectedDate.getDate().toString().padStart(2, '0')}/${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}/${selectedDate.getFullYear()}`;
                  setFormData({ ...formData, dateOfBirth: formattedDate });
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.datePickerPrimaryButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
        </View>
      </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    marginRight: 32,
  },
  stepContent: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
  },
  termsContainer: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  waiverLogo: {
    width: '100%',
    height: 60,
    maxWidth: 200,
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
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  signatureContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  signaturePadContainer: {
    flex: 1,
    position: 'relative',
    minHeight: 200,
  },
  signatureButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  signatureButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  signatureButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
    flex: 1,
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
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  backButton: {
    backgroundColor: 'transparent',
  },
  nextButton: {
    flex: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  legalNotice: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  termsContentContainer: {
    padding: 20,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  termsText: {
    fontSize: 13,
    lineHeight: 18,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkboxText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    fontWeight: '600',
  },
  acknowledgementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    padding: 2,
  },
  checkboxInner: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acknowledgementText: {
    flex: 1,
    fontSize: 14,
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
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    textAlign: 'center',
  },
  datePickerButton: {
    justifyContent: 'center',
  },
  datePickerText: {
    fontSize: 16,
    opacity: 0.8,
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    width: '90%',
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  datePickerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  datePickerContent: {
    padding: 20,
  },
  dateInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  dateInputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    textAlign: 'center',
    width: '100%',
  },
  datePickerActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  datePickerPrimaryButton: {
    flex: 1,
  },
  datePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
  },
  datePickerPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 