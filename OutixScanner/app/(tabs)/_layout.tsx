import { Tabs, usePathname, useRouter } from "expo-router";
import { BarChart, Bell, Calendar, QrCode, User } from "lucide-react-native";
import React, { useEffect } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from 'react-native-svg';
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

// Custom Tab Bar Shape Component
const TabBarShape = ({ color }: { color: string }) => {
  const width = screenWidth;
  const height = 85;
  const centerX = width / 2;
  const cutoutRadius = 55; // Radius for the circular cutout
  const curveRadius = 30;
  const strokeWidth = 1;
  const cutoutOffset = 10;
  const curveOffset = 10;
  const strokeColor = '#FF6B00';
  
  // Create a smooth curved cutout path
  const pathData = `
    M 0,20
    L 0,${height}
    L ${width},${height}
    L ${width},20
    Q ${width},0 ${width - 20},0
    L ${centerX + cutoutRadius + curveRadius},0
    Q ${centerX + cutoutRadius},0 ${centerX + cutoutRadius - curveRadius},${curveRadius}
    A ${cutoutRadius},${cutoutRadius} 0 0,0 ${centerX - cutoutRadius + curveRadius},${curveRadius}
    Q ${centerX - cutoutRadius},0 ${centerX - cutoutRadius - curveRadius},0
    L 20,0
    Q 0,0 0,20
    Z
  `;

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
      <Path d={pathData} fill={color} />
    </Svg>
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
    <View style={styles.tabBarContainer}>
      {/* Custom Shaped Tab Bar Background */}
      <View style={[styles.customTabBar, { backgroundColor: 'transparent' }]}>
        <TabBarShape color={colors.background} />
        
        {/* Tab Content */}
        <View style={styles.tabContent}>
          {/* Left Side Tabs */}
          <View style={styles.leftTabsContainer}>
            {tabs.slice(0, 2).map((tab, index) => {
              const IconComponent = tab.icon;
              const active = isActive(tab.route);
              
              return (
                <TouchableOpacity
                  key={tab.name}
                  style={styles.regularTab}
                  onPress={() => handleTabPress(tab.route)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.tabIconContainer, 
                    { 
                      opacity: active ? 1 : 0.6,
                      backgroundColor: active ? `${colors.primary}15` : 'transparent',
                      borderRadius: 12,
                      padding: 8,
                    }
                  ]}>
                    <IconComponent 
                      size={22} 
                      color={active ? '#FF6B00' : colors.secondary} 
                      strokeWidth={active ? 2.5 : 2} 
                    />
                  </View>
                  <Text style={[
                    styles.tabLabel,
                    { 
                      color: active ? '#FF6B00' : colors.secondary,
                      marginTop: 4,
                      fontWeight: active ? '700' : '500',
                      opacity: active ? 1 : 0.7,
                    }
                  ]}>
                    {tab.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Center Cutout Space */}
          <View style={styles.centerCutout} />

          {/* Right Side Tabs */}
          <View style={styles.rightTabsContainer}>
            {tabs.slice(3).map((tab, index) => {
              const IconComponent = tab.icon;
              const active = isActive(tab.route);
              
              return (
                <TouchableOpacity
                  key={tab.name}
                  style={styles.regularTab}
                  onPress={() => handleTabPress(tab.route)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.tabIconContainer, 
                    { 
                      opacity: active ? 1 : 0.6,
                      backgroundColor: active ? `${colors.primary}15` : 'transparent',
                      borderRadius: 12,
                      padding: 8,
                    }
                  ]}>
                    <IconComponent 
                      size={22} 
                      color={active ? '#FF6B00' : colors.secondary} 
                      strokeWidth={active ? 2.5 : 2} 
                    />
                  </View>
                  <Text style={[
                    styles.tabLabel,
                    { 
                      color: active ? '#FF6B00' : colors.secondary,
                      marginTop: 4,
                      fontWeight: active ? '700' : '500',
                      opacity: active ? 1 : 0.7,
                    }
                  ]}>
                    {tab.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Elevated Center Tab */}
      {tabs.map((tab, index) => {
        if (tab.isCenter) {
          const IconComponent = tab.icon;
          const active = isActive(tab.route);
          
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.floatingTabContainer}
              onPress={() => handleTabPress(tab.route)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.floatingTab,
                {
                  backgroundColor: '#FF6B00',
                  transform: active ? [{ scale: 1.05 }] : [{ scale: 1 }],
                }
              ]}>
                <IconComponent size={28} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          );
        }
        return null;
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
          title: "Scan QR",
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
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 85,
  },
  customTabBar: {
    position: 'relative',
    height: 85,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  tabContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 1,
  },
  leftTabsContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingLeft: 10,
  },
  rightTabsContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingRight: 10,
  },
  centerCutout: {
    width: 120,
    height: 85,
    backgroundColor: 'transparent',
  },
  regularTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  floatingTabContainer: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    marginLeft: -32, // Half of the tab width (64/2)
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  floatingTab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});