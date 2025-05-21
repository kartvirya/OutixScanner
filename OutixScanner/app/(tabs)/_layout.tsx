import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import ThemeToggle from "../../components/theme/ThemeToggle";
import { useTheme } from "../../context/ThemeContext";
import { Calendar, QrCode, User } from "lucide-react-native";

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
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: 4,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: -4,
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
              <Calendar size={24} color={color} />
            </View>
          ),
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scanner",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ opacity: focused ? 1 : 0.7 }}>
              <QrCode size={24} color={color} />
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ opacity: focused ? 1 : 0.7 }}>
              <User size={24} color={color} />
            </View>
          ),
          headerShown: false,
        }}
      />
    </Tabs>
  );
} 