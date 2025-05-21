import React from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

interface SettingsOption {
  id: number;
  icon: string;
  label: string;
  badge: string | null;
}

export default function Profile() {
  const { colors, isDarkMode } = useTheme();

  // Mock user data
  const user = {
    name: "John Doe",
    email: "john.doe@example.com",
    role: "Event Manager",
    eventsCreated: 12,
    eventsAttended: 8,
    profileImage: null, // In a real app, this would be a URL or require statement
  };

  // Mock settings options
  const settingsOptions: SettingsOption[] = [
    { id: 1, icon: "bell", label: "Notifications", badge: "On" },
    { id: 2, icon: "palette", label: "Appearance", badge: isDarkMode ? "Dark" : "Light" },
    { id: 3, icon: "lock", label: "Privacy", badge: null },
    { id: 4, icon: "question-circle", label: "Help & Support", badge: null },
    { id: 5, icon: "info-circle", label: "About", badge: "v1.0.0" },
  ];

  const renderSettingsItem = (item: SettingsOption) => (
    <TouchableOpacity key={item.id} style={[styles.settingsItem, { borderBottomColor: colors.border }]}>
      <View style={styles.settingsItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
          <FontAwesome5 name={item.icon} size={16} color={colors.primary} />
        </View>
        <Text style={[styles.settingsLabel, { color: colors.text }]}>{item.label}</Text>
      </View>
      
      <View style={styles.settingsItemRight}>
        {item.badge && <Text style={[styles.badge, { color: colors.secondary }]}>{item.badge}</Text>}
        <FontAwesome5 name="chevron-right" size={14} color={colors.secondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.profileSection, { backgroundColor: colors.card }]}>
        <View style={styles.profileImageContainer}>
          {user.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImagePlaceholderText}>
                {user.name.split(" ").map(name => name[0]).join("")}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
        <Text style={[styles.userEmail, { color: colors.secondary }]}>{user.email}</Text>
        <Text style={[styles.userRole, { color: colors.primary }]}>{user.role}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{user.eventsCreated}</Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>Created</Text>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{user.eventsAttended}</Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>Attended</Text>
          </View>
        </View>
        
        <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.background }]}>
          <Text style={[styles.editButtonText, { color: colors.primary }]}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.settingsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
        <View style={[styles.settingsContainer, { backgroundColor: colors.card }]}>
          {settingsOptions.map(renderSettingsItem)}
        </View>
      </View>
      
      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.card }]}>
        <FontAwesome5 name="sign-out-alt" size={16} color={colors.error} style={styles.logoutIcon} />
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