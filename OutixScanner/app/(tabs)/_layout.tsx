import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import ThemeToggle from "../../components/theme/ThemeToggle";
import { useTheme } from "../../context/ThemeContext";
import { Calendar, QrCode, User, PlusCircle } from "lucide-react-native";

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
  const { colors } = useTheme();

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
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.card,
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
          tabBarIcon: ({ color }) => (
            <TabIcon icon={<Calendar size={20} color={color} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-event"
        options={{
          title: "Add Event",
          tabBarIcon: ({ color }) => (
            <TabIcon icon={<PlusCircle size={20} color={color} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scanner",
          tabBarIcon: ({ color }) => (
            <TabIcon icon={<QrCode size={20} color={color} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <TabIcon icon={<User size={20} color={color} />} />
          ),
        }}
      />
    </Tabs>
  );
} 