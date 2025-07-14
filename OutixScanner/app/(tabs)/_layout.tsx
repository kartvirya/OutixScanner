import { Tabs, usePathname, useRouter } from "expo-router";
import { BarChart, Calendar, QrCode, User, Users } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
const TabBarShape = ({ color, showCutout }: { color: string; showCutout: boolean }) => {
  const width = screenWidth;
  const height = 85;
  const centerX = width / 2;
  const cutoutRadius = 55; // Radius for the circular cutout
  const curveRadius = 30;
  
  let pathData;
  
  if (showCutout) {
    // Create a smooth curved cutout path
    pathData = `
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
  } else {
    // Create a simple rounded rectangle without cutout
    pathData = `
      M 0,20
      L 0,${height}
      L ${width},${height}
      L ${width},20
      Q ${width},0 ${width - 20},0
      L 20,0
      Q 0,0 0,20
      Z
    `;
  }

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
      <Path 
        d={pathData} 
        fill={color} 
        stroke="rgba(255, 107, 0, 0.2)" 
        strokeWidth={1}
      />
    </Svg>
  );
};

// Custom Tab Bar Component
function CustomTabBar() {
  const { colors, isDarkMode, selectedEventId } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  
  // Animation values
  const scannerOpacity = useRef(new Animated.Value(0)).current;
  const scannerScale = useRef(new Animated.Value(0.8)).current;
  const tabBarAnimation = useRef(new Animated.Value(0)).current;

  // Check if we're on an event detail page using pathname only
  // Debug logging
  console.log('Current pathname:', pathname);
  console.log('Selected event ID:', selectedEventId);
  
  // Only use pathname detection - more reliable for actual page detection
  const isOnEventDetailPage = Boolean(
    pathname !== '/(tabs)' && 
    pathname !== '/(tabs)/' && 
    pathname !== '/' &&
    !pathname.includes('/analytics') && 
    !pathname.includes('/scanner') && 
    !pathname.includes('/registrants') && 
    !pathname.includes('/profile') &&
    (pathname.match(/\/\(tabs\)\/[^\/]+$/) || pathname.match(/\/[0-9]+$/) || pathname.match(/\/[a-zA-Z0-9]+$/) && pathname.length > 8)
  );
  
  console.log('Is on event detail page:', isOnEventDetailPage);

  // Animate scanner tab appearance/disappearance
  useEffect(() => {
    if (isOnEventDetailPage) {
      // Animate in
      Animated.parallel([
        Animated.timing(scannerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scannerScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(tabBarAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(scannerOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scannerScale, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(tabBarAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isOnEventDetailPage]);

  const tabs = [
    { name: 'index', title: 'Events', icon: Calendar, route: '/(tabs)' },
    { name: 'registrants', title: 'Registrations', icon: Users, route: '/(tabs)/registrants' },
    ...(isOnEventDetailPage ? [{ name: 'scanner', title: '', icon: QrCode, route: '/(tabs)/scanner', isCenter: true }] : []),
    { name: 'analytics', title: 'Analytics', icon: BarChart, route: '/(tabs)/analytics' },
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
    if (route === '/(tabs)/registrants') {
      return pathname.includes('/registrants');
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
      <Animated.View style={[
        styles.customTabBar, 
        { 
          backgroundColor: 'transparent',
          shadowOpacity: tabBarAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.1, 0.25],
          }),
          elevation: tabBarAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [8, 12],
          }),
        }
      ]}>
        <TabBarShape color={colors.background} showCutout={isOnEventDetailPage} />
        
        {/* Tab Content */}
        <View style={styles.tabContent}>
          {/* Left Side Tabs */}
          <View style={styles.leftTabsContainer}>
            {tabs.filter(tab => !tab.isCenter).slice(0, isOnEventDetailPage ? 2 : 2).map((tab, index) => {
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

          {/* Center Cutout Space - only show when scanner is visible */}
          {isOnEventDetailPage && <View style={styles.centerCutout} />}

          {/* Right Side Tabs */}
          <View style={styles.rightTabsContainer}>
            {tabs.filter(tab => !tab.isCenter).slice(isOnEventDetailPage ? 2 : 2).map((tab, index) => {
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
      </Animated.View>

      {/* Elevated Center Tab */}
      {tabs.map((tab, index) => {
        if (tab.isCenter) {
          const IconComponent = tab.icon;
          const active = isActive(tab.route);
          
          return (
            <Animated.View
              key={tab.name}
              style={[
                styles.floatingTabContainer,
                {
                  opacity: scannerOpacity,
                  transform: [{ scale: scannerScale }],
                }
              ]}
            >
              <TouchableOpacity
                style={styles.floatingTabTouchable}
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
            </Animated.View>
          );
        }
        return null;
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  // Log when TabsLayout initializes to confirm it's being rendered
  useEffect(() => {
    console.log("TabsLayout initialized");
  }, []);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
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
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          headerShown: false,
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
        name="registrants"
        options={{
          title: "Registrations",
          headerShown: false,
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
    </View>
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
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 107, 0, 0.1)',
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
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  floatingTabTouchable: {
    borderRadius: 32,
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