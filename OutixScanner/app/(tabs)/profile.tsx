import { router } from "expo-router";
import { Building2, LogOut, Mail, Moon, Settings, Sun, User, UserCheck } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { getUserProfile, logout, UserProfile } from "../../services/api";

export default function Profile() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
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
        email: "outix@thebend.co",
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading profile...</Text>
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
            Manage your account and preferences
          </Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={styles.profileHeader}>
            <View style={[styles.profileAvatar, { backgroundColor: '#FF9500' }]}>
              {user?.profileImage ? (
                <Image 
                  source={{ uri: user.profileImage }} 
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
              <User size={32} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.name || "Outix Test"}
              </Text>
              <Text style={[styles.userEmail, { color: colors.secondary }]}>
                {user?.email || "outix@thebend.co"}
              </Text>
            </View>
          </View>
          
          <View style={[styles.roleBadge, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
            <Text style={[styles.roleText, { color: '#FF9500' }]}>
              {user?.role || "Event Manager"}
            </Text>
          </View>
        </View>

        {/* User Details Card */}
        <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
          <View style={styles.detailsHeader}>
            <UserCheck size={20} color="#FF9500" />
            <Text style={[styles.detailsTitle, { color: colors.text }]}>Account Details</Text>
          </View>
          
          {/* User Name */}
          <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
            <View style={styles.detailLeft}>
              <View style={[styles.detailIcon, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                <User size={18} color="#34C759" />
              </View>
              <View style={styles.detailInfo}>
                <Text style={[styles.detailLabel, { color: colors.text }]}>Display Name</Text>
                <Text style={[styles.detailValue, { color: colors.secondary }]}>
                  {user?.name || "Outix Test"}
                </Text>
              </View>
            </View>
          </View>

          {/* Email */}
          <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
            <View style={styles.detailLeft}>
              <View style={[styles.detailIcon, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                <Mail size={18} color="#007AFF" />
              </View>
              <View style={styles.detailInfo}>
                <Text style={[styles.detailLabel, { color: colors.text }]}>Email Address</Text>
                <Text style={[styles.detailValue, { color: colors.secondary }]}>
                  {user?.email || "outix@thebend.co"}
                </Text>
              </View>
            </View>
          </View>

          {/* Client Name */}
          <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
            <View style={styles.detailLeft}>
              <View style={[styles.detailIcon, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                <Building2 size={18} color="#FF9500" />
              </View>
              <View style={styles.detailInfo}>
                <Text style={[styles.detailLabel, { color: colors.text }]}>Organization</Text>
                <Text style={[styles.detailValue, { color: colors.secondary }]}>
                  The Bend Motorsport Park Pty Ltd
                </Text>
              </View>
            </View>
          </View>

          {/* Alias (if available) */}
          {user?.role && user.role !== "Event Manager" && (
            <View style={[styles.detailItem, { borderBottomWidth: 0 }]}>
              <View style={styles.detailLeft}>
                <View style={[styles.detailIcon, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                  <UserCheck size={18} color="#FF3B30" />
                </View>
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>Alias</Text>
                  <Text style={[styles.detailValue, { color: colors.secondary }]}>
                    {user.role}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Settings Card */}
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          <View style={styles.settingsHeader}>
            <Settings size={20} color="#FF9500" />
            <Text style={[styles.settingsTitle, { color: colors.text }]}>Settings</Text>
          </View>
          
          {/* Theme Setting */}
          <TouchableOpacity style={[styles.settingItem, { borderBottomWidth: 0 }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                {isDarkMode ? (
                  <Moon size={18} color="#FF9500" />
                ) : (
                  <Sun size={18} color="#FF9500" />
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
              trackColor={{ false: '#E5E5EA', true: '#FF9500' }}
              thumbColor="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
        
        {/* Logout Button */}
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: colors.card }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={18} color="#FF3B30" />
            <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
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
  header: {
    marginBottom: 32,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  profileCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#FF9500",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: "500",
    opacity: 0.8,
    marginBottom: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  detailsCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  settingsCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
}); 