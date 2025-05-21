import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { ArrowLeft, CheckCircle } from "lucide-react-native";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";
import { useTheme } from "../../context/ThemeContext";

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSendResetLink = () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }
    
    // In a real app, you would make an API call to send a reset link
    setIsSubmitted(true);
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.contentContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Forgot Password</Text>
            
            {!isSubmitted ? (
              <>
                <Text style={[styles.description, { color: colors.secondary }]}>
                  Enter your registered email below to receive password reset instructions
                </Text>
                
                <AuthInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email Address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  iconName="envelope"
                />
                
                <AuthButton
                  title="Send Reset Link"
                  onPress={handleSendResetLink}
                  disabled={!email}
                />
              </>
            ) : (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <CheckCircle size={60} color={colors.primary} />
                </View>
                
                <Text style={[styles.successTitle, { color: colors.text }]}>Check Your Email</Text>
                
                <Text style={[styles.successMessage, { color: colors.secondary }]}>
                  We've sent password reset instructions to:
                </Text>
                
                <Text style={[styles.emailText, { color: colors.primary }]}>{email}</Text>
                
                <AuthButton
                  title="Back to Login"
                  onPress={handleGoBack}
                  style={styles.backToLoginButton}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  backButton: {
    marginTop: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    marginBottom: 32,
    lineHeight: 24,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
  },
  emailText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 40,
  },
  backToLoginButton: {
    width: "100%",
  },
}); 