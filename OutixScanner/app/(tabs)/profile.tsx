import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, Switch } from "react-native";
import { Paintbrush, LogOut, User } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { getUserProfile, logout, UserProfile } from "../../services/api";
import { router } from "expo-router";

export default function Profile() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        const userData = await getUserProfile();
        setUser(userData);
      } catch (err) {
        console.error("Error fetching user profile:", err);
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
      <View style={styles.content}>
        {/* Profile Section */}
      <View style={[styles.profileSection, { backgroundColor: colors.card }]}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
            <User size={48} color="#FFFFFF" />
          </View>
          
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.name || "Outix Scanner"}
          </Text>
          <Text style={[styles.userEmail, { color: colors.secondary }]}>
            {user?.email || "scanner@outix.co"}
          </Text>
          <Text style={[styles.userRole, { color: colors.primary }]}>
            {user?.role || "Event Manager"}
          </Text>
        </View>

        {/* Settings Section */}
        <View style={[styles.settingsSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
          
          {/* Theme Toggle */}
          <View style={[styles.settingsItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingsItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Paintbrush size={20} color={colors.primary} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>Appearance</Text>
            </View>
            <View style={styles.settingsItemRight}>
              <Text style={[styles.themeLabel, { color: colors.secondary }]}>
                {isDarkMode ? "Dark" : "Light"}
              </Text>
              <Switch 
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.card}
              />
            </View>
          </View>
        </View>
        
        {/* Logout Button */}
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: colors.card, borderColor: colors.error }]}
          onPress={handleLogout}
        >
          <LogOut size={20} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  profileSection: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
    fontWeight: "500",
  },
  userRole: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },
  settingsSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingsItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  settingsLabel: {
    fontSize: 18,
    fontWeight: "600",
  },
  themeLabel: {
    fontSize: 16,
    marginRight: 12,
    fontWeight: "500",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 12,
    letterSpacing: 0.5,
  },
}); 