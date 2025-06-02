import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react-native";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";
import { useTheme } from "../../context/ThemeContext";
import { login } from "../../services/api";

const { width } = Dimensions.get('window');

// Retain mock credentials as fallback
const mockUser = {
  email: "test@example.com",
  password: "password123",
};

export default function LoginScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [logoLoaded, setLogoLoaded] = useState(false);

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email change with validation
  const handleEmailChange = (text) => {
    setEmail(text);
    if (text && !validateEmail(text)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  // Handle password change with validation
  const handlePasswordChange = (text) => {
    setPassword(text);
    if (text && text.length < 6) {
      setPasswordError("Password must be at least 6 characters");
    } else {
      setPasswordError("");
    }
  };

  const handleLogin = async () => {
    // Validate inputs before submission
    if (!email) {
      setEmailError("Email is required");
      return;
    }
    if (!password) {
      setPasswordError("Password is required");
      return;
    }
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    try {
      setIsLoading(true);
      
      // First check if we're using mock login
      if (email === mockUser.email && password === mockUser.password) {
        // Simulate API delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        router.replace("/(tabs)");
        return;
      }

      // Otherwise try API login
      const token = await login();
      
      if (token) {
        router.replace("/(tabs)");
      } else {
        Alert.alert(
          "Login Failed", 
          "Invalid credentials. Please check your email and password and try again.",
          [{ text: "OK", style: "default" }]
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Connection Error", 
        "Unable to connect to the server. Please check your internet connection and try again.",
        [{ text: "Retry", onPress: handleLogin }, { text: "Cancel", style: "cancel" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push("/auth/forgot-password");
  };

  const handleSignUp = () => {
    router.push("/auth/signup");
  };

  const isFormValid = email && password && !emailError && !passwordError && validateEmail(email) && password.length >= 6;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoWrapper}>
              <Image
                source={{ uri: "https://www.outix.co/tickets/images/outix-logo.png" }}
                style={styles.logo}
                resizeMode="contain"
                onLoad={() => setLogoLoaded(true)}
                onError={() => setLogoLoaded(false)}
              />
              {!logoLoaded && (
                <View style={[styles.logoPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.logoPlaceholderText}>OUTIX</Text>
                </View>
              )}
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>Outix Scan</Text>
            <Text style={[styles.tagline, { color: colors.secondary }]}>
              Streamline your event management
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <View style={styles.welcomeSection}>
              <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome back</Text>
              <Text style={[styles.welcomeSubtitle, { color: colors.secondary }]}>
                Sign in to your account to continue
              </Text>
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <AuthInput
                value={email}
                onChangeText={handleEmailChange}
                placeholder="Email Address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                iconName="mail"
                error={emailError}
                leftIcon={<Mail size={20} color={colors.secondary} />}
              />
              {emailError ? (
                <View style={styles.errorContainer}>
                  <AlertCircle size={14} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{emailError}</Text>
                </View>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <AuthInput
                value={password}
                onChangeText={handlePasswordChange}
                placeholder="Password"
                secureTextEntry={!showPassword}
                autoComplete="password"
                error={passwordError}
                leftIcon={<Lock size={20} color={colors.secondary} />}
                rightIcon={
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? 
                      <EyeOff size={20} color={colors.secondary} /> : 
                      <Eye size={20} color={colors.secondary} />
                    }
                  </TouchableOpacity>
                }
              />
              {passwordError ? (
                <View style={styles.errorContainer}>
                  <AlertCircle size={14} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{passwordError}</Text>
                </View>
              ) : null}
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                Forgot your password?
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            {isLoading ? (
              <View style={[styles.loadingButton, { backgroundColor: colors.primary }]}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.loadingText}>Signing in...</Text>
              </View>
            ) : (
              <AuthButton
                title="Sign In"
                onPress={handleLogin}
                disabled={!isFormValid}
                style={!isFormValid && styles.disabledButton}
              />
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: Platform.OS === 'ios' ? 40 : 60,
    marginBottom: 40,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    marginBottom: 20,
    position: 'relative',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    width: "100%",
    flex: 1,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 32,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "600",
  },
  loadingButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: "500",
  },
  apiInfoContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  apiInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  apiInfoText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  noAccountText: {
    fontSize: 14,
  },
  signupText: {
    fontSize: 14,
    fontWeight: "600",
  },
});