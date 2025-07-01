import {
    AlertTriangle,
    Check,
    FileText,
    PenTool,
    User,
    Users,
    X
} from 'lucide-react-native';
import React, { useRef, useState } from 'react';
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
    View
} from 'react-native';
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
}

export default function WaiverSigningModal({
  visible,
  onClose,
  onSubmit,
  waiver,
  eventName,
  eventDate
}: WaiverSigningModalProps) {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const signaturePadRef = useRef<SignatureViewRef>(null);
  const witnessSignaturePadRef = useRef<SignatureViewRef>(null);
  
  // Initialize form data with waiver info if available
  const [formData, setFormData] = useState<WaiverData>(() => ({
    // Participant Info
    firstName: waiver?.['Client Name']?.split(' ')[0] || '',
    lastName: waiver?.['Client Name']?.split(' ').slice(1).join(' ') || '',
    email: waiver?.Email || '',
    mobile: waiver?.Mobile || '',
    dateOfBirth: '',
    address: waiver?.Address || '',
    signature: '',
    acknowledged: false,
    
    // Witness Info
    witnessName: '',
    witnessEmail: '',
    witnessPhone: '',
    witnessSignature: '',
    
    // Additional Info from Waiver
    driverRiderName: waiver?.['Driver Rider Name'] || '',
    manufacturer: waiver?.Manufacturer || '',
    model: waiver?.Model || '',
    engineCapacity: waiver?.['Engine Capacity'] || '',
    year: waiver?.Year || '',
    sponsors: waiver?.Sponsors || '',
    quickestET: waiver?.['Quickest ET'] || '',
    quickestMPH: waiver?.['Quickest MPH'] || '',
    andraLicenseNumber: waiver?.['ANDRA License Number'] || '',
    ihraLicenseNumber: waiver?.['IHRA License Number'] || '',
    licenseExpiryDate: waiver?.['License Expiry Date'] || '',
    driversLicenseNumber: waiver?.['Drivers License Number'] || '',
    emergencyContactName: waiver?.['Emergency Contact Name'] || '',
    emergencyContactNumber: waiver?.['Emergency Contact Number'] || '',
    racingNumber: waiver?.['Racing Number'] || ''
  }));

  const steps = [
    { id: 0, title: 'Welcome', icon: FileText },
    { id: 1, title: 'Your Info', icon: User },
    { id: 2, title: 'Vehicle Info', icon: FileText },
    { id: 3, title: 'Terms & Conditions', icon: AlertTriangle },
    { id: 4, title: 'Your Signature', icon: PenTool },
    { id: 5, title: 'Witness Info', icon: Users }
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
      signature: '',
      acknowledged: false,
      witnessName: '',
      witnessEmail: '',
      witnessPhone: '',
      witnessSignature: '',
      driverRiderName: waiver?.['Driver Rider Name'] || '',
      manufacturer: waiver?.Manufacturer || '',
      model: waiver?.Model || '',
      engineCapacity: waiver?.['Engine Capacity'] || '',
      year: waiver?.Year || '',
      sponsors: waiver?.Sponsors || '',
      quickestET: waiver?.['Quickest ET'] || '',
      quickestMPH: waiver?.['Quickest MPH'] || '',
      andraLicenseNumber: waiver?.['ANDRA License Number'] || '',
      ihraLicenseNumber: waiver?.['IHRA License Number'] || '',
      licenseExpiryDate: waiver?.['License Expiry Date'] || '',
      driversLicenseNumber: waiver?.['Drivers License Number'] || '',
      emergencyContactName: waiver?.['Emergency Contact Name'] || '',
      emergencyContactNumber: waiver?.['Emergency Contact Number'] || '',
      racingNumber: waiver?.['Racing Number'] || ''
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
        return !!(
          formData.driverRiderName &&
          formData.manufacturer &&
          formData.model &&
          formData.engineCapacity &&
          formData.year
        );
      case 3:
        return formData.acknowledged;
      case 4:
        return !!formData.signature;
      case 5:
        return !!(
          formData.witnessName.trim() &&
          formData.witnessEmail.trim() &&
          formData.witnessPhone.trim() &&
          formData.witnessSignature.trim()
        );
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!canProceedFromStep(5)) {
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
        witnessSignature: formData.witnessSignature,
        driverRiderName: formData.driverRiderName,
        manufacturer: formData.manufacturer,
        model: formData.model,
        engineCapacity: formData.engineCapacity,
        year: formData.year,
        sponsors: formData.sponsors,
        quickestET: formData.quickestET,
        quickestMPH: formData.quickestMPH,
        andraLicenseNumber: formData.andraLicenseNumber,
        ihraLicenseNumber: formData.ihraLicenseNumber,
        licenseExpiryDate: formData.licenseExpiryDate,
        driversLicenseNumber: formData.driversLicenseNumber,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactNumber: formData.emergencyContactNumber,
        racingNumber: formData.racingNumber
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
                <step.icon size={16} color={index === currentStep ? "#FFFFFF" : colors.secondary} />
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
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.welcomeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* THE BEND Logo Area */}
        <View style={styles.logoContainer}>
          <View style={[styles.logoPlaceholder, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
            <Text style={[styles.logoText, { color: colors.primary }]}>THE BEND</Text>
          </View>
        </View>
        
        <View style={styles.welcomeContent}>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>
            Hi, Welcome to ANDRA - DRAGWAY AT THE BEND!
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.text }]}>
            You are completing a waiver for the event: {eventName}!
          </Text>
          <Text style={[styles.welcomeDescription, { color: colors.secondary }]}>
            Please kindly complete all the requests.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.proceedButton, { backgroundColor: '#F59E0B' }]}
          onPress={nextStep}
        >
          <Text style={styles.proceedButtonText}>PROCEED</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderPersonalInfo = () => (
    <KeyboardAvoidingView 
      style={styles.stepContent} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Info!</Text>
          <Text style={[styles.description, { color: colors.secondary }]}>
            Please enter your details.
          </Text>
          
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="First Name"
              placeholderTextColor={colors.secondary}
              value={formData.firstName}
              onChangeText={(text) => setFormData({ ...formData, firstName: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Last Name"
              placeholderTextColor={colors.secondary}
              value={formData.lastName}
              onChangeText={(text) => setFormData({ ...formData, lastName: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Email Address"
              placeholderTextColor={colors.secondary}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="DOB"
              placeholderTextColor={colors.secondary}
              value={formData.dateOfBirth}
              onChangeText={(text) => setFormData({ ...formData, dateOfBirth: text })}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderVehicleInfo = () => (
    <KeyboardAvoidingView 
      style={styles.stepContent} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Vehicle Info</Text>
          <Text style={[styles.description, { color: colors.secondary }]}>
            Please enter your vehicle details.
          </Text>
          
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Driver/Rider Name"
              placeholderTextColor={colors.secondary}
              value={formData.driverRiderName}
              onChangeText={(text) => setFormData({ ...formData, driverRiderName: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Manufacturer"
              placeholderTextColor={colors.secondary}
              value={formData.manufacturer}
              onChangeText={(text) => setFormData({ ...formData, manufacturer: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Model"
              placeholderTextColor={colors.secondary}
              value={formData.model}
              onChangeText={(text) => setFormData({ ...formData, model: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Engine Capacity"
              placeholderTextColor={colors.secondary}
              value={formData.engineCapacity}
              onChangeText={(text) => setFormData({ ...formData, engineCapacity: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Year"
              placeholderTextColor={colors.secondary}
              value={formData.year}
              onChangeText={(text) => setFormData({ ...formData, year: text })}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderTermsAndConditions = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <View style={styles.formSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Terms & Conditions</Text>
        <Text style={[styles.description, { color: colors.secondary }]}>
          Please carefully read all the terms and conditions and proceed.
        </Text>

        <View style={[styles.termsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.termsTitle, { color: colors.text }]}>
            ANDRA DRAG RACING RISK STATEMENT
          </Text>
          
          <ScrollView style={styles.termsScrollView} nestedScrollEnabled={true}>
            <Text style={[styles.termsText, { color: colors.text }]}>
              Online exclusion of risk systems can, when used correctly, remove the need to obtain a Participant or Entrant's physical signature on a form when they enter an Event. However, it is critical that these systems meet certain legal requirements so that they are effective in obtaining each Participant and Entrant's agreement to ANDRA's Disclaimer.
              {'\n\n'}
              Obtaining their agreement to ANDRA's Disclaimer is not only a requirement of ANDRA's insurer, but it also assists in reducing Event Organisers, Venues, ANDRA and others legal liability arising from an Event.
              {'\n\n'}
              Completing this online Disclaimer is designed for the participant to acknowledge their agreement to ANDRA's Disclaimer.
              {'\n\n'}
              This is an important document, which affects your legal rights and obligations. Read it carefully and do not sign it unless you are satisfied that you understand it. If you have any questions, please ask a representative of the Business.
              {'\n\n'}
              <Text style={{ fontWeight: 'bold' }}>The Business</Text>
              {'\n'}
              Australian National Drag Racing Association Limited (ANDRA) and ANDRA Member Tracks organising events and permitted activities recognised by ANDRA.
              {'\n\n'}
              <Text style={{ fontWeight: 'bold' }}>The Activity</Text>
              {'\n'}
              Administration, organisation and promotion of, and participation in, drag racing and related permitted activities.
              {'\n\n'}
              <Text style={{ fontWeight: 'bold' }}>Acknowledgements</Text>
              {'\n'}
              I acknowledge that:
              {'\n'}
              • I am the Participant.
              {'\n'}
              • I am being supplied with a recreational service by the Business.
              {'\n'}
              • The Activity is a dangerous recreational activity, which involves a significant risk of physical harm.
              {'\n'}
              • I may be injured as a result of my participation in the Activity.
              {'\n'}
              • Other people may cause me injury in the course of my participation in the Activity.
              {'\n'}
              • I may cause injury to myself or other persons in the course of my participation in the Activity.
              {'\n'}
              • The natural conditions in which the Activity is conducted may vary without warning.
              {'\n'}
              • My participation in the Activity is voluntary and I have not been required by the Business to engage in the Activity.
              {'\n\n'}
              <Text style={{ fontWeight: 'bold' }}>Risk Warning</Text>
              {'\n'}
              • I acknowledge that I have been warned of the Risks of the Activity.
              {'\n'}
              • I acknowledge that participation in the Activity may also involve other risks not noted in the Risks of the Activity listed in Section 3.
              {'\n'}
              • The Business has placed signs around the site on which the Activity is to be performed warning of the risk of injury. I have read the signs and understand the warnings provided.
              {'\n'}
              • The Business has provided me with warnings of the Risks associated with the Activity and the risks of physical or psychological harm in participating in the Activity.
              {'\n\n'}
              <Text style={{ fontWeight: 'bold' }}>Assumption Of Risk</Text>
              {'\n'}
              Notwithstanding the significant risk of physical harm and injury inherent in the Activity, some of which are noted above, I agree to participate in the Activity at my own risk.
            </Text>
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[styles.checkboxItem, { borderColor: colors.border }]}
          onPress={() => setFormData({ ...formData, acknowledged: !formData.acknowledged })}
        >
          <View style={[
            styles.checkbox,
            {
              backgroundColor: formData.acknowledged ? colors.primary : 'transparent',
              borderColor: formData.acknowledged ? colors.primary : colors.border
            }
          ]}>
            {formData.acknowledged && (
              <Check size={16} color="#FFFFFF" />
            )}
          </View>
          <Text style={[styles.checkboxText, { color: colors.text }]}>
            I/We have carefully read/understood and accept all terms and conditions.
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderDigitalSignature = () => {
    const windowWidth = Dimensions.get('window').width;
    const signaturePadWidth = windowWidth - 40;
    const signaturePadHeight = 200;

    return (
      <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Signature</Text>
          <Text style={[styles.description, { color: colors.secondary }]}>
            Please sign in the box below using your finger or stylus.
          </Text>

          <View style={[styles.signaturePadContainer, { borderColor: colors.border }]}>
            <SignatureScreen
              ref={signaturePadRef}
              onOK={handleSignature}
              webStyle={`
                .m-signature-pad {
                  width: ${signaturePadWidth}px;
                  height: ${signaturePadHeight}px;
                  margin: 0;
                  box-shadow: none;
                  border: none;
                }
                .m-signature-pad--body {
                  border: none;
                }
                .m-signature-pad--footer {
                  display: none;
                }
                canvas {
                  width: ${signaturePadWidth}px;
                  height: ${signaturePadHeight}px;
                }
              `}
              autoClear={true}
              imageType="image/svg+xml"
            />
          </View>

          <TouchableOpacity
            style={[styles.clearButton, { borderColor: colors.border }]}
            onPress={() => {
              if (signaturePadRef.current) {
                signaturePadRef.current.clearSignature();
                setFormData(prev => ({ ...prev, signature: '' }));
              }
            }}
          >
            <Text style={[styles.clearButtonText, { color: colors.text }]}>Clear Signature</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderWitnessInfo = () => {
    const windowWidth = Dimensions.get('window').width;
    const signaturePadWidth = windowWidth - 40;
    const signaturePadHeight = 200;

    return (
      <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Witness Information</Text>
          <Text style={[styles.description, { color: colors.secondary }]}>
            Please provide witness details and signature.
          </Text>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Witness Full Name"
              placeholderTextColor={colors.secondary}
              value={formData.witnessName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, witnessName: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Witness Email"
              placeholderTextColor={colors.secondary}
              value={formData.witnessEmail}
              onChangeText={(text) => setFormData(prev => ({ ...prev, witnessEmail: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Witness Phone"
              placeholderTextColor={colors.secondary}
              value={formData.witnessPhone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, witnessPhone: text }))}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={[styles.sectionSubtitle, { color: colors.text, marginTop: 20 }]}>Witness Signature</Text>
          <View style={[styles.signaturePadContainer, { borderColor: colors.border }]}>
            <SignatureScreen
              ref={witnessSignaturePadRef}
              onOK={handleWitnessSignature}
              webStyle={`
                .m-signature-pad {
                  width: ${signaturePadWidth}px;
                  height: ${signaturePadHeight}px;
                  margin: 0;
                  box-shadow: none;
                  border: none;
                }
                .m-signature-pad--body {
                  border: none;
                }
                .m-signature-pad--footer {
                  display: none;
                }
                canvas {
                  width: ${signaturePadWidth}px;
                  height: ${signaturePadHeight}px;
                }
              `}
              autoClear={true}
              imageType="image/svg+xml"
            />
          </View>

          <TouchableOpacity
            style={[styles.clearButton, { borderColor: colors.border }]}
            onPress={() => {
              if (witnessSignaturePadRef.current) {
                witnessSignaturePadRef.current.clearSignature();
                setFormData(prev => ({ ...prev, witnessSignature: '' }));
              }
            }}
          >
            <Text style={[styles.clearButtonText, { color: colors.text }]}>Clear Witness Signature</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderWelcomeStep();
      case 1:
        return renderPersonalInfo();
      case 2:
        return renderVehicleInfo();
      case 3:
        return renderTermsAndConditions();
      case 4:
        return renderDigitalSignature();
      case 5:
        return renderWitnessInfo();
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Digital Waiver</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Content */}
        <View style={styles.content}>
          {renderStepContent()}
        </View>

        {/* Navigation */}
        <View style={[styles.navigation, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.secondaryButton,
              { 
                backgroundColor: 'transparent',
                borderColor: colors.border,
                opacity: currentStep === 0 ? 0.5 : 1
              }
            ]}
            onPress={prevStep}
            disabled={currentStep === 0}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Previous
            </Text>
          </TouchableOpacity>

          {currentStep < steps.length - 1 ? (
            <TouchableOpacity
              style={[
                styles.navButton,
                styles.primaryButton,
                { 
                  backgroundColor: canProceedFromStep(currentStep) ? '#F59E0B' : colors.border
                }
              ]}
              onPress={nextStep}
              disabled={!canProceedFromStep(currentStep)}
            >
              <Text style={styles.primaryButtonText}>PROCEED</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.navButton,
                styles.primaryButton,
                { 
                  backgroundColor: canProceedFromStep(currentStep) ? '#F59E0B' : colors.border
                }
              ]}
              onPress={handleSubmit}
              disabled={!canProceedFromStep(currentStep) || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>PROCEED</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerRight: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
    maxWidth: 400,
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
  content: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeCard: {
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoPlaceholder: {
    width: 120,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
  },
  welcomeContent: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  proceedButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
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
  termsContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    maxHeight: 400,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  termsScrollView: {
    maxHeight: 320,
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
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    fontWeight: '600',
  },
  signaturePadContainer: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  clearButton: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '500',
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
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    gap: 12,
  },
  navButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
}); 