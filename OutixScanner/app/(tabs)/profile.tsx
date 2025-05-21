import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from "react-native";
import { Bell, Paintbrush, Lock, HelpCircle, Info, ChevronRight, LogOut } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { getUserProfile, logout, UserProfile } from "../../services/api";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingsOption {
  id: number;
  icon: React.ReactNode;
  label: string;
  badge: string | null;
  action: () => void;
}

const renderSettingsItem = (item: SettingsOption, colors: any, isDarkMode: boolean, notificationsEnabled: boolean, handleNotificationsToggle: () => void) => {
  const getIconContainerStyle = () => {
    return {
      backgroundColor: isDarkMode ? 'rgba(255,107,0,0.2)' : 'rgba(255,107,0,0.1)',
      borderWidth: 0,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center' as 'center',
      alignItems: 'center' as 'center',
      marginRight: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    };
  };

  return (
    <TouchableOpacity 
      key={item.id} 
      style={[styles.settingsItem, { borderBottomColor: colors.border }]}
      onPress={item.action}
    >
      <View style={styles.settingsItemLeft}>
        <View style={getIconContainerStyle()}>
          {item.icon}
        </View>
        <Text style={[styles.settingsLabel, { color: colors.text }]}>{item.label}</Text>
      </View>
      
      <View style={styles.settingsItemRight}>
        {item.id === 1 ? (
          <Switch 
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />
        ) : (
          <>
            {item.badge && <Text style={[styles.badge, { color: colors.secondary }]}>{item.badge}</Text>}
            <ChevronRight size={16} color={colors.secondary} />
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function Profile() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        const userData = await getUserProfile();
        setUser(userData);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

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
              await logout();
              router.replace("/");
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

  const handleThemeChange = () => {
    toggleTheme();
  };

  const handleNotificationsToggle = () => {
    setNotificationsEnabled(!notificationsEnabled);
    // Save notification preferences to storage
    AsyncStorage.setItem('notifications_enabled', (!notificationsEnabled).toString())
      .catch(err => console.error("Error saving notification preference:", err));
  };

  const handleEditProfile = () => {
    Alert.alert("Coming Soon", "Profile editing will be available in the next update.");
  };

  const handlePrivacySettings = () => {
    Alert.alert("Privacy Settings", "Manage your privacy settings and data sharing preferences.");
  };

  const handleHelp = () => {
    Alert.alert("Help & Support", "Contact support at support@outix.co or call us at 1-800-OUTIX.");
  };

  const handleAbout = () => {
    Alert.alert("About OutixScanner", "Version 1.0.0\n\nOutixScanner is a powerful tool for event management and ticket scanning.");
  };

  // Settings options with actions
  const settingsOptions: SettingsOption[] = [
    { 
      id: 1, 
      icon: <Bell size={16} color={colors.primary} />, 
      label: "Notifications", 
      badge: notificationsEnabled ? "On" : "Off",
      action: handleNotificationsToggle
    },
    { 
      id: 2, 
      icon: <Paintbrush size={16} color={colors.primary} />, 
      label: "Appearance", 
      badge: isDarkMode ? "Dark" : "Light",
      action: handleThemeChange
    },
    { 
      id: 3, 
      icon: <Lock size={16} color={colors.primary} />, 
      label: "Privacy", 
      badge: null,
      action: handlePrivacySettings
    },
    { 
      id: 4, 
      icon: <HelpCircle size={16} color={colors.primary} />, 
      label: "Help & Support", 
      badge: null,
      action: handleHelp
    },
    { 
      id: 5, 
      icon: <Info size={16} color={colors.primary} />, 
      label: "About", 
      badge: "v1.0.0",
      action: handleAbout
    },
  ];

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.profileSection, { backgroundColor: colors.card }]}>
        <View style={styles.profileImageContainer}>
          {user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.profileImage} />
          ) : (
            <View style={[
              styles.profileImagePlaceholder, 
              { 
                backgroundColor: colors.primary,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }
            ]}>
              <Text style={styles.profileImagePlaceholderText}>
                {user?.name ? user.name.split(" ").map(name => name[0]).join("") : "OS"}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={[styles.userName, { color: colors.text }]}>{user?.name || "User"}</Text>
        <Text style={[styles.userEmail, { color: colors.secondary }]}>{user?.email || "user@example.com"}</Text>
        <Text style={[styles.userRole, { color: colors.primary }]}>{user?.role || "User"}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{user?.eventsCreated || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>Created</Text>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{user?.eventsAttended || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>Attended</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.editButton, { backgroundColor: colors.background }]}
          onPress={handleEditProfile}
        >
          <Text style={[styles.editButtonText, { color: colors.primary }]}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.settingsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
        <View style={[styles.settingsContainer, { backgroundColor: colors.card }]}>
          {settingsOptions.map(item => renderSettingsItem(item, colors, isDarkMode, notificationsEnabled, handleNotificationsToggle))}
        </View>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.logoutButton, 
          { 
            backgroundColor: colors.card,
            borderWidth: isDarkMode ? 1 : 0,
            borderColor: colors.error
          }
        ]}
        onPress={handleLogout}
      >
        <LogOut 
          size={16} 
          color={colors.error}
          style={styles.logoutIcon}
        />
        <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#F2F2F7",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#8E8E93",
  },
  profileSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FF6B00",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImagePlaceholderText: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "bold",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: "#8E8E93",
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: "#FF6B00",
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    marginBottom: 20,
    width: "80%",
    justifyContent: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E5EA",
    marginHorizontal: 20,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#8E8E93",
  },
  editButton: {
    backgroundColor: "#F2F2F7",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  editButtonText: {
    color: "#FF6B00",
    fontWeight: "600",
  },
  settingsSection: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
    marginLeft: 4,
  },
  settingsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsLabel: {
    fontSize: 16,
    color: "#000000",
  },
  badge: {
    fontSize: 14,
    color: "#8E8E93",
    marginRight: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 40,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "600",
  },
}); 