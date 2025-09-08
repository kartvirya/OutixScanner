import { router } from "expo-router";
import { Bell, Building2, LogOut, Mail, Moon, Sun, User } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { getUserProfile, logout, UserProfile } from "../../services/api";

export default function Profile() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      setUser({
        id: 'fallback',
        name: "Outix Test",
        email: "user@example.com",
        role: "Event Manager",
        eventsCreated: 0,
        eventsAttended: 0,
        profileImage: null
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
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
              
              // Force redirect to index which will check auth and redirect to login
              router.replace("/");
              
              // Also try to force a complete navigation reset
              setTimeout(() => {
                router.replace("/auth/login");
              }, 100);
              
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 4 }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 4 }]}>
      {/* Header */}
      <Text style={[styles.header, { color: colors.text }]}>Profile</Text>
      
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
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={styles.profileHeader}>
            <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
              <User size={28} color="#FFFFFF" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.name || "Outix Test"}
              </Text>
              <Text style={[styles.userEmail, { color: colors.secondary }]}>
                {user?.email || "user@example.com"}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: `${colors.primary}15` }]}>
                <Text style={[styles.roleText, { color: colors.primary }]}>
                  {user?.role || "Event Manager"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Details */}
        <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Details</Text>
          
          <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.detailIcon, { backgroundColor: `${colors.primary}15` }]}>
              <User size={18} color={colors.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={[styles.detailLabel, { color: colors.text }]}>Display Name</Text>
              <Text style={[styles.detailValue, { color: colors.secondary }]}>
                {user?.name || "Outix Test"}
              </Text>
            </View>
          </View>

          <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.detailIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Mail size={18} color={colors.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={[styles.detailLabel, { color: colors.text }]}>Email Address</Text>
              <Text style={[styles.detailValue, { color: colors.secondary }]}>
                {user?.email || "user@example.com"}
              </Text>
            </View>
          </View>

          <View style={[styles.detailItem, { borderBottomWidth: 0 }]}>
            <View style={[styles.detailIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Building2 size={18} color={colors.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={[styles.detailLabel, { color: colors.text }]}>Organization</Text>
              <Text style={[styles.detailValue, { color: colors.secondary }]}>
                The Bend Motorsport Park Pty Ltd
              </Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
          
          <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: `${colors.primary}15` }]}>
                {isDarkMode ? (
                  <Moon size={18} color={colors.primary} />
                ) : (
                  <Sun size={18} color={colors.primary} />
                )}
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Appearance</Text>
                <Text style={[styles.settingDescription, { color: colors.secondary }]}>
                  {isDarkMode ? "Dark mode" : "Light mode"}
                </Text>
              </View>
            </View>
            <Switch 
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Push Notifications */}
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Push Notifications</Text>
          
          <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Bell size={18} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Test Push Notifications</Text>
                <Text style={[styles.settingDescription, { color: colors.secondary }]}>
                  Test AWS SNS push notifications
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.settingButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/push-notification-test')}
            >
              <Text style={styles.settingButtonText}>Test</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: colors.card, borderColor: '#FF3B30' }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={18} color="#FF3B30" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
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
  profileCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 12,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  settingsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,

    elevation: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
  settingButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 