import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import ThemeToggle from "../../components/theme/ThemeToggle";
import { useTheme } from "../../context/ThemeContext";
import { Calendar, QrCode, User, BarChart, Bell } from "lucide-react-native";

interface TabIconProps {
  icon: React.ReactNode;
}

// Custom TabIcon component to handle icon display more reliably
const TabIcon: React.FC<TabIconProps> = ({ icon }) => {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
      {icon}
    </View>
  );
};

export default function TabsLayout() {
  const { colors, isDarkMode } = useTheme();

  // Log when TabsLayout initializes to confirm it's being rendered
  useEffect(() => {
    console.log("TabsLayout initialized");
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 30,
          paddingTop: 10,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerRight: () => <ThemeToggle />,
        headerRightContainerStyle: {
          paddingRight: 16,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Events",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ opacity: focused ? 1 : 0.7 }}>
              <Calendar size={24} color={color} strokeWidth={2.5} />
            </View>
          ),
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ opacity: focused ? 1 : 0.7 }}>
              <BarChart size={24} color={color} strokeWidth={2.5} />
            </View>
          ),
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scan & Pay",
          tabBarIcon: ({ color, focused }) => (
            <View style={[
              styles.scannerTab,
              {
                backgroundColor: focused ? colors.primary : isDarkMode ? '#2C2C2E' : '#E5E5EA',
                transform: [{ translateY: -28 }]
              }
            ]}>
              <QrCode size={32} color={focused ? '#FFFFFF' : colors.text} strokeWidth={2.5} />
            </View>
          ),
          headerShown: false,
          tabBarLabel: "",
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Updates",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ opacity: focused ? 1 : 0.7 }}>
              <Bell size={24} color={color} strokeWidth={2.5} />
            </View>
          ),
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ opacity: focused ? 1 : 0.7 }}>
              <User size={24} color={color} strokeWidth={2.5} />
            </View>
          ),
          headerShown: false,
        }}
      />
    </Tabs>
  );
} 

const styles = StyleSheet.create({
  scannerTab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'transparent',
  },
}); 