import { Tabs, usePathname, useRouter } from "expo-router";
import { BarChart, Calendar, QrCode, User, Users } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { useTheme } from "../../context/ThemeContext";

const { width: screenWidth } = Dimensions.get('window');

interface TabIconProps {
  icon: React.ReactNode;
}

const TabIcon: React.FC<TabIconProps> = ({ icon }) => {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
      {icon}
    </View>
  );
};

// Enhanced Tab Bar Shape with gradient support
const TabBarShape = ({ color, showCutout, isDark }: { color: string; showCutout: boolean; isDark: boolean }) => {
  const width = screenWidth;
  const height = 75;
  const centerX = width / 2;
  const cutoutRadius = 50;
  const curveRadius = 28;
  
  let pathData;
  
  if (showCutout) {
    pathData = `
      M 0,16
      L 0,${height}
      L ${width},${height}
      L ${width},16
      Q ${width},0 ${width - 16},0
      L ${centerX + cutoutRadius + curveRadius},0
      Q ${centerX + cutoutRadius},0 ${centerX + cutoutRadius - curveRadius},${curveRadius}
      A ${cutoutRadius},${cutoutRadius} 0 0,0 ${centerX - cutoutRadius + curveRadius},${curveRadius}
      Q ${centerX - cutoutRadius},0 ${centerX - cutoutRadius - curveRadius},0
      L 16,0
      Q 0,0 0,16
      Z
    `;
  } else {
    pathData = `
      M 0,16
      L 0,${height}
      L ${width},${height}
      L ${width},16
      Q ${width},0 ${width - 16},0
      L 16,0
      Q 0,0 0,16
      Z
    `;
  }

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
      <Defs>
        <LinearGradient id="tabGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.98" />
          <Stop offset="100%" stopColor={color} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Path 
        d={pathData} 
        fill="url(#tabGradient)"
        stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"} 
        strokeWidth={0.5}
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
  const scannerScale = useRef(new Animated.Value(0.3)).current;
  const scannerRotate = useRef(new Animated.Value(0)).current;
  const tabBarSlide = useRef(new Animated.Value(0)).current;
  
  // Individual tab animations
  const tabAnimations = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

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

  const hideForTicketAction = pathname.includes('/ticket-action');

  // Animate scanner tab with spring and rotation
  useEffect(() => {
    if (isOnEventDetailPage) {
      Animated.parallel([
        Animated.timing(scannerOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scannerScale, {
          toValue: 1,
          tension: 80,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(scannerRotate, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(tabBarSlide, {
          toValue: 1,
          tension: 70,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scannerOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scannerScale, {
          toValue: 0.3,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scannerRotate, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(tabBarSlide, {
          toValue: 0,
          tension: 70,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOnEventDetailPage]);

  const tabs = [
    { name: 'index', title: 'Events', icon: Calendar, route: '/(tabs)', key: 'index' },
    { name: 'registrants', title: 'Registrations', icon: Users, route: '/(tabs)/registrants', key: 'registrants' },
    ...(isOnEventDetailPage ? [{ name: 'scanner', title: '', icon: QrCode, route: '/(tabs)/scanner', isCenter: true, key: 'scanner' }] : []),
    { name: 'analytics', title: 'Analytics', icon: BarChart, route: '/(tabs)/analytics', key: 'analytics' },
    { name: 'profile', title: 'Profile', icon: User, route: '/(tabs)/profile', key: 'profile' },
  ];

  const isActive = (route: string) => {
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

  const handleTabPress = (route: string, index: number) => {
    // Animate the pressed tab
    Animated.sequence([
      Animated.timing(tabAnimations[index], {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(tabAnimations[index], {
        toValue: 1,
        tension: 100,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    if (route === '/(tabs)/scanner') {
      const currentPath = pathname;
      let returnTo = '/(tabs)';
      
      if (isOnEventDetailPage) {
        const eventIdMatch = currentPath.match(/\/(\d+)$/) || currentPath.match(/\/([^/]+)$/);
        if (eventIdMatch && eventIdMatch[1]) {
          returnTo = `/(tabs)/${eventIdMatch[1]}`;
        }
      }
      
      router.push({
        pathname: route,
        params: { returnTo }
      } as any);
    } else {
      router.push(route as any);
    }
  };

  if (hideForTicketAction) {
    return null;
  }

  const rotation = scannerRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '0deg'],
  });

  return (
    <View style={styles.tabBarContainer} pointerEvents="box-none">
      {/* Animated Tab Bar Background */}
      <Animated.View style={[
        styles.customTabBar, 
        { 
          backgroundColor: 'transparent',
          shadowColor: '#FF6B00',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isOnEventDetailPage ? 0.15 : 0.08,
          shadowRadius: 12,
          elevation: isOnEventDetailPage ? 16 : 10,
          transform: [{
            translateY: tabBarSlide.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -2],
            })
          }]
        }
      ]}>
        <TabBarShape color={colors.background} showCutout={isOnEventDetailPage} isDark={isDarkMode} />
        
        {/* Tab Content */}
        <View style={styles.tabContent}>
          {/* Left Side Tabs */}
          <View style={styles.leftTabsContainer}>
            {tabs.filter(tab => !tab.isCenter).slice(0, 2).map((tab, index) => {
              const IconComponent = tab.icon;
              const active = isActive(tab.route);
              
              return (
                <Animated.View
                  key={tab.key}
                  style={{
                    flex: 1,
                    transform: [{ scale: tabAnimations[index] }]
                  }}
                >
                  <TouchableOpacity
                    style={styles.regularTab}
                    onPress={() => handleTabPress(tab.route, index)}
                    activeOpacity={0.7}
                  >
                    <Animated.View style={[
                      styles.tabIconContainer, 
                      { 
                        backgroundColor: active ? `${colors.primary}12` : 'transparent',
                        transform: [{ scale: active ? 1 : 0.95 }],
                      }
                    ]}>
                      <IconComponent 
                        size={23} 
                        color={active ? '#FF6B00' : colors.text} 
                        strokeWidth={active ? 2.5 : 2} 
                      />
                    </Animated.View>
                    {active && (
                      <View style={styles.activeIndicator}>
                        <View style={[styles.activeDot, { backgroundColor: '#FF6B00' }]} />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* Center Cutout Space */}
          {isOnEventDetailPage && <View style={styles.centerCutout} />}

          {/* Right Side Tabs */}
          <View style={styles.rightTabsContainer}>
            {tabs.filter(tab => !tab.isCenter).slice(2).map((tab, index) => {
              const IconComponent = tab.icon;
              const active = isActive(tab.route);
              const actualIndex = index + 2;
              
              return (
                <Animated.View
                  key={tab.key}
                  style={{
                    flex: 1,
                    transform: [{ scale: tabAnimations[actualIndex] }]
                  }}
                >
                  <TouchableOpacity
                    style={styles.regularTab}
                    onPress={() => handleTabPress(tab.route, actualIndex)}
                    activeOpacity={0.7}
                  >
                    <Animated.View style={[
                      styles.tabIconContainer, 
                      { 
                        backgroundColor: active ? `${colors.primary}12` : 'transparent',
                        transform: [{ scale: active ? 1 : 0.95 }],
                      }
                    ]}>
                      <IconComponent 
                        size={23} 
                        color={active ? '#FF6B00' : colors.text} 
                        strokeWidth={active ? 2.5 : 2} 
                      />
                    </Animated.View>
                    {active && (
                      <View style={styles.activeIndicator}>
                        <View style={[styles.activeDot, { backgroundColor: '#FF6B00' }]} />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {/* Elevated Center Scanner Button */}
      {tabs.map((tab) => {
        if (tab.isCenter) {
          const IconComponent = tab.icon;
          const active = isActive(tab.route);
          
          return (
            <Animated.View
              key={tab.key}
              style={[
                styles.floatingTabContainer,
                {
                  opacity: scannerOpacity,
                  transform: [
                    { scale: scannerScale },
                    { rotate: rotation }
                  ],
                }
              ]}
              pointerEvents={isOnEventDetailPage ? 'auto' : 'none'}
            >
              <TouchableOpacity
                style={styles.floatingTabTouchable}
                onPress={() => handleTabPress(tab.route, 2)}
                activeOpacity={0.85}
              >
                <Animated.View style={[
                  styles.floatingTab,
                  {
                    backgroundColor: '#FF6B00',
                    transform: active ? [{ scale: 1.08 }] : [{ scale: 1 }],
                    shadowColor: '#FF6B00',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.4,
                    shadowRadius: 16,
                    elevation: 20,
                  }
                ]}>
                  {/* Pulse effect ring */}
                  <View style={styles.pulseRing}>
                    <View style={[styles.pulseRingInner, { borderColor: '#FF6B00' }]} />
                  </View>
                  <IconComponent size={30} color="#FFFFFF" strokeWidth={2.5} />
                </Animated.View>
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

  useEffect(() => {
    console.log("TabsLayout initialized");
  }, []);

  return (
    <View style={{ flex: 1 }}>
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
        <Tabs.Screen
          name="attendance"
          options={{
            title: "Attendance",
            tabBarButton: () => null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="guest-list"
          options={{
            title: "Guest List",
            tabBarButton: () => null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="ticket-action"
          options={{
            title: "Guest Information",
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
    height: 75,
  },
  customTabBar: {
    position: 'relative',
    height: 75,
  },
  tabContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 6,
    zIndex: 1,
  },
  leftTabsContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingLeft: 8,
  },
  rightTabsContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingRight: 8,
  },
  centerCutout: {
    width: 110,
    height: 75,
    backgroundColor: 'transparent',
  },
  regularTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    width: 48,
    height: 48,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    alignItems: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  floatingTabContainer: {
    position: 'absolute',
    bottom: 26,
    left: '50%',
    marginLeft: -34,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  floatingTab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  floatingTabTouchable: {
    borderRadius: 34,
  },
  pulseRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRingInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    opacity: 0.3,
  },
});