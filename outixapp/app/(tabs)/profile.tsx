import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ChevronRight, LogOut, Mail, Moon, Shield, Star, Sun, User } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { getUserProfile, logout, UserProfile } from "../../services/api";

export default function Profile() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const fetchUserProfile = async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      console.log("Fetching user profile...");
      const userData = await getUserProfile();
      console.log("User profile data received:", JSON.stringify(userData, null, 2));
      setUser(userData);
    } catch (err) {
      console.error("Error fetching user profile:", err);
      // Set default user data on error
      // Don't set fallback data - let the UI show loading state
      setUser(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    
    // Trigger animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRefresh = async () => {
    await fetchUserProfile(true);
  };

  const handleLogout = async () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              console.log('Starting logout process...');
              await logout();
              console.log('Logout completed, redirecting...');
              
              // Force redirect to login screen
              router.replace("/auth/login");
              
            } catch (err) {
              console.error("Logout error:", err);
              Alert.alert("Error", "Failed to log out. Please try again.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Hero Header Section */}
        <LinearGradient
          colors={isDarkMode 
            ? [colors.primary, '#FF4500', '#FF6B00']
            : [colors.primary, '#FF8C00', '#FFA500']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroSection, { paddingTop: insets.top + 20 }]}
        >
          <Animated.View 
            style={[
              styles.heroContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.avatarContainer}>
              <View style={styles.avatarGlow} />
              <View style={styles.profileAvatar}>
                <User size={40} color="#FFFFFF" />
              </View>
              <View style={styles.avatarBadge}>
                <Star size={12} color="#FFFFFF" />
              </View>
            </View>
            
            <Text style={styles.heroName}>
              {user?.name || "Loading..."}
            </Text>
            <Text style={styles.heroEmail}>
              {user?.email || "Loading..."}
            </Text>
            <View style={styles.heroBadge}>
              <Shield size={14} color="#FFFFFF" />
              <Text style={styles.heroBadgeText}>
                {user?.role || "Loading..."}
              </Text>
            </View>
          </Animated.View>
        </LinearGradient>



        {/* Account Information */}
        <Animated.View 
          style={[
            styles.sectionCard,
            styles.firstCard,
            { 
              backgroundColor: colors.card,
              opacity: fadeAnim,
              transform: [{ translateY: Animated.multiply(slideAnim, 0.5) }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Information</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={[styles.editButton, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.infoRow}
            activeOpacity={0.7}
          >
            <View style={styles.infoLeft}>
              <View style={[styles.infoIcon, { backgroundColor: `${colors.primary}10` }]}>
                <User size={16} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.secondary }]}>Full Name</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {user?.name || "Not Available"}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.secondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.infoRow}
            activeOpacity={0.7}
          >
            <View style={styles.infoLeft}>
              <View style={[styles.infoIcon, { backgroundColor: `${colors.primary}10` }]}>
                <Mail size={16} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.secondary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {user?.email || "Not Available"}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.secondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.infoRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
          >
            <View style={styles.infoLeft}>
              <View style={[styles.infoIcon, { backgroundColor: `${colors.primary}10` }]}>
                <Shield size={16} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.secondary }]}>Role</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {user?.role || "Not Available"}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.secondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Preferences */}
        <Animated.View 
          style={[
            styles.sectionCard,
            { 
              backgroundColor: colors.card,
              opacity: fadeAnim,
              transform: [{ translateY: Animated.multiply(slideAnim, 0.3) }]
            }
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLeft}>
              <View style={[styles.preferenceIcon, { backgroundColor: isDarkMode ? '#8E8EFF15' : '#FFB80015' }]}>
                {isDarkMode ? (
                  <Moon size={18} color="#8E8EFF" />
                ) : (
                  <Sun size={18} color="#FFB800" />
                )}
              </View>
              <View style={styles.preferenceContent}>
                <Text style={[styles.preferenceLabel, { color: colors.text }]}>Appearance</Text>
                <Text style={[styles.preferenceDescription, { color: colors.secondary }]}>
                  {isDarkMode ? "Dark mode" : "Light mode"}
                </Text>
              </View>
            </View>
            <Switch 
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.border}
            />
          </View>

        </Animated.View>


        {/* Logout Button */}
        <Animated.View
          style={[
            {
              opacity: fadeAnim
            }
          ]}
        >
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: colors.card }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF3B30', '#FF5555']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.logoutGradient}
            >
              <LogOut size={18} color="#FFFFFF" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Hero Section
  heroSection: {
    paddingBottom: 30,
    marginBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    top: -10,
    left: -10,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  heroName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroEmail: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  
  // Section Cards
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  firstCard: {
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Info Rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Preferences
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  preferenceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  preferenceContent: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  preferenceDescription: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Logout
  logoutButton: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
