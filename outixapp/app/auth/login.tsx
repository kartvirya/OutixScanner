import { router } from 'expo-router';
import { Eye, EyeOff, Lock, User } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { login } from '../../services/api';

export default function LoginScreen() {
  const { colors } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting login with credentials...');
      const token = await login(username.trim(), password.trim());

      if (token) {
        console.log('Login successful. Saving token...');
        await AsyncStorage.setItem('authToken', token);

        // Navigate directly after successful login
        router.replace('/(tabs)');
      } else {
        console.log('Login failed - invalid credentials');
        Alert.alert('Login Failed', 'Invalid username or password. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Error', 'An error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Please contact your administrator to reset your password.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Decorative Elements */}
          <View style={styles.decorativeContainer}>
            <View style={[styles.decorativeCircle, styles.circle1, { backgroundColor: colors.primary }]} />
            <View style={[styles.decorativeCircle, styles.circle2, { backgroundColor: colors.primary }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
              <Lock size={28} color="#FFFFFF" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: '#8E8E93' }]}>
              Sign in to continue to Outix Checkin
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            {/* Username Field */}
            <View style={styles.fieldWrapper}>
              <Text style={[styles.label, { color: colors.text }]}>Username</Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: colors.card },
                  usernameFocused && [styles.inputFocused, { borderColor: colors.primary }],
                ]}
              >
                <View style={[styles.iconWrapper, { backgroundColor: colors.background }]}>
                  <User size={18} color="#8E8E93" />
                </View>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your username"
                  placeholderTextColor="#8E8E93"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!isLoading}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldWrapper}>
              <Text style={[styles.label, { color: colors.text }]}>Password</Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: colors.card },
                  passwordFocused && [styles.inputFocused, { borderColor: colors.primary }],
                ]}
              >
                <View style={[styles.iconWrapper, { backgroundColor: colors.background }]}>
                  <Lock size={18} color="#8E8E93" />
                </View>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your password"
                  placeholderTextColor="#8E8E93"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#8E8E93" />
                  ) : (
                    <Eye size={18} color="#8E8E93" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={handleForgotPassword}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={[styles.forgotButtonText, { color: colors.primary }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: colors.primary },
                isLoading && styles.disabledButton,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.loadingText}>Signing in...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Sign in</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: '#8E8E93' }]} />
              <Text style={[styles.dividerText, { color: '#8E8E93' }]}>Powered by</Text>
              <View style={[styles.dividerLine, { backgroundColor: '#8E8E93' }]} />
            </View>
            <Text style={[styles.footerText, { color: colors.text }]}>Outix</Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardContainer: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  decorativeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    overflow: 'hidden',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.05,
  },
  circle1: {
    width: 300,
    height: 300,
    top: -150,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    top: -80,
    left: -80,
  },
  header: {
    marginTop: 60,
    marginBottom: 44,
    alignItems: 'center',
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    opacity: 0.7,
    letterSpacing: 0.1,
  },
  form: {
    gap: 24,
  },
  fieldWrapper: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputFocused: {
    borderWidth: 2,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  eyeIcon: {
    padding: 8,
    marginRight: -4,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginTop: -8,
  },
  forgotButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  loginButton: {
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  disabledButton: { opacity: 0.6 },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 32,
    gap: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.2,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});