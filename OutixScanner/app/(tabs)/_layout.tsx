import { Tabs, usePathname, useRouter } from "expo-router";
import { BarChart, Bell, Calendar, QrCode, User } from "lucide-react-native";
import React, { useEffect } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";

const { width: screenWidth } = Dimensions.get('window');

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

// Custom Tab Bar Component
function CustomTabBar() {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { name: 'index', title: 'Events', icon: Calendar, route: '/(tabs)' },
    { name: 'analytics', title: 'Analytics', icon: BarChart, route: '/(tabs)/analytics' },
    { name: 'scanner', title: '', icon: QrCode, route: '/(tabs)/scanner', isCenter: true },
    { name: 'notifications', title: 'Updates', icon: Bell, route: '/(tabs)/notifications' },
    { name: 'profile', title: 'Profile', icon: User, route: '/(tabs)/profile' },
  ];

  const isActive = (route: string) => {
    console.log('Checking active state:', { route, pathname });
    
    if (route === '/(tabs)') {
      return pathname === '/(tabs)' || pathname === '/(tabs)/' || pathname === '/';
    }
    if (route === '/(tabs)/analytics') {
      return pathname.includes('/analytics');
    }
    if (route === '/(tabs)/scanner') {
      return pathname.includes('/scanner');
    }
    if (route === '/(tabs)/notifications') {
      return pathname.includes('/notifications');
    }
    if (route === '/(tabs)/profile') {
      return pathname.includes('/profile');
    }
    return pathname === route;
  };

  const handleTabPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={[styles.customTabBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      {tabs.map((tab, index) => {
        const IconComponent = tab.icon;
        const active = isActive(tab.route);
        
        if (tab.isCenter) {
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.centerTabContainer}
              onPress={() => handleTabPress(tab.route)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.centerTab,
                {
                  backgroundColor: active ? '#FF6B00' : isDarkMode ? '#2C2C2E' : '#E5E5EA',
                }
              ]}>
                <IconComponent size={28} color={active ? '#FFFFFF' : colors.text} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.name}
            style={[
              styles.regularTab,
              active && styles.activeTab
            ]}
            onPress={() => handleTabPress(tab.route)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.tabIconContainer, 
              { 
                opacity: active ? 1 : 0.7,
                backgroundColor: active ? `${colors.primary}20` : 'transparent',
                borderRadius: 12,
                padding: 8,
              }
            ]}>
              <IconComponent 
                size={24} 
                color={active ? '#FF6B00' : colors.secondary} 
                strokeWidth={2.5} 
              />
            </View>
            <Text style={[
              styles.tabLabel,
              { 
                color: active ? '#FF6B00' : colors.secondary,
                marginTop: 4,
                fontWeight: active ? '700' : '600',
              }
            ]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { colors, isDarkMode } = useTheme();

  // Log when TabsLayout initializes to confirm it's being rendered
  useEffect(() => {
    console.log("TabsLayout initialized");
  }, []);

  return (
    <Tabs
      tabBar={() => <CustomTabBar />}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Events",
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scan & Pay",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Updates",
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="[id]"
        options={{
          title: "Event Details",
          tabBarButton: () => null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
} 

const styles = StyleSheet.create({
  customTabBar: {
    flexDirection: 'row',
    height: 85,
    paddingTop: 10,
    paddingBottom: 0,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  regularTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  activeTab: {
    transform: [{ scale: 1.05 }],
  },
  centerTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  centerTab: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    borderWidth: 4,
    borderColor: '#FFFFFF',
    transform: [{ translateY: -15 }],
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 