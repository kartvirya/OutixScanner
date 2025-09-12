import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import SignaturePad from './SignaturePad';
import { submitWaiver } from '../services/api';

interface WaiverModalProps {
  onClose: () => void;
  waiverLink: string;
}

export const WaiverModal: React.FC<WaiverModalProps> = ({ onClose, waiverLink }) => {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [signature, setSignature] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [witnessEmail, setWitnessEmail] = useState('');
  const [witnessSignature, setWitnessSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => {
    if (step === 1 && (!fullName || !email)) {
      Alert.alert('Required Fields', 'Please fill in all required fields.');
      return;
    }
    if (step === 2 && !signature) {
      Alert.alert('Signature Required', 'Please provide your signature.');
      return;
    }
    if (step === 4 && (!witnessName || !witnessEmail || !witnessSignature)) {
      Alert.alert('Witness Information Required', 'Please fill in all witness information and signature.');
      return;
    }
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const response = await submitWaiver({
        fullName,
        email,
        signature,
        witnessName,
        witnessEmail,
        witnessSignature,
        waiverLink,
      });

      if (response.success) {
        Alert.alert(
          'Success',
          'Waiver submitted successfully!',
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to submit waiver. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Personal Information</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Your Signature</Text>
            <SignaturePad
              onSignature={setSignature}
              containerStyle={styles.signaturePadContainer}
            />
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Review and Confirm</Text>
            <View style={styles.reviewSection}>
              <Text style={styles.reviewText}>Name: {fullName}</Text>
              <Text style={styles.reviewText}>Email: {email}</Text>
            </View>
            <Text style={styles.note}>Please review your information above. Click Next to proceed to witness information.</Text>
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Witness Information & Signature</Text>
            <TextInput
              style={styles.input}
              placeholder="Witness Full Name"
              value={witnessName}
              onChangeText={setWitnessName}
            />
            <TextInput
              style={styles.input}
              placeholder="Witness Email"
              value={witnessEmail}
              onChangeText={setWitnessEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.subtitle}>Witness Signature</Text>
            <SignaturePad
              onSignature={setWitnessSignature}
              containerStyle={styles.signaturePadContainer}
            />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.stepIndicator}>Step {step} of 4</Text>
        {renderStep()}
      </ScrollView>
      <View style={styles.buttonContainer}>
        {step > 1 && (
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={handleBack}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.button,
            styles.nextButton,
            isSubmitting && styles.disabledButton
          ]}
          onPress={handleNext}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>
            {step === 4 ? (isSubmitting ? 'Submitting...' : 'Submit') : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepContainer: {
    flex: 1,
    paddingVertical: 20,
  },
  stepIndicator: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  signaturePadContainer: {
    height: 200,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  backButton: {
    backgroundColor: '#6c757d',
  },
  nextButton: {
    backgroundColor: '#007bff',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewSection: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  reviewText: {
    fontSize: 16,
    marginBottom: 10,
  },
  note: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    marginBottom: 10,
  },
}); 