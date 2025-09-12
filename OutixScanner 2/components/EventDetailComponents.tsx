import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ViewStyle,
  TextStyle,
  Pressable
} from 'react-native';
import {
  Users,
  UserCheck,
  BarChart,
  Calendar,
  Clock,
  MapPin,
  ChevronDown,
  RefreshCw
} from 'lucide-react-native';

// Types
interface StatCardProps {
  stats: {
    total: number;
    checkedIn: number;
    percentage: number;
  };
  colors: any;
  animation?: Animated.Value;
}

interface ActionCardProps {
  onGuestList: () => void;
  onAttendance: () => void;
  colors: any;
  animation?: Animated.Value;
}

interface ProgressCardProps {
  stats: {
    percentage: number;
    checkedIn: number;
    pending: number;
  };
  onRefresh: () => void;
  colors: any;
  animation?: Animated.Value;
}

interface EventHeaderProps {
  event: {
    title: string;
    date: string;
    time: string;
    location: string;
  };
  isExpanded: boolean;
  onToggleExpand: () => void;
  colors: any;
  animation?: Animated.Value;
}

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  animation?: Animated.Value;
  delay?: number;
}

// Animated Card Wrapper
export const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
  children, 
  style, 
  animation,
  delay = 0 
}) => {
  const localAnimation = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    Animated.timing(localAnimation, {
      toValue: 1,
      duration: 300,
      delay,
      useNativeDriver: true
    }).start();
  }, []);

  const animatedStyle = animation || localAnimation;

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: animatedStyle,
          transform: [{
            translateY: animatedStyle.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0]
            })
          }]
        }
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Event Header Component
export const EventHeader: React.FC<EventHeaderProps> = React.memo(({ 
  event, 
  isExpanded, 
  onToggleExpand, 
  colors,
  animation 
}) => {
  const rotateAnimation = React.useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(rotateAnimation, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true
    }).start();
  }, [isExpanded]);

  return (
    <AnimatedCard
      style={[styles.header, { backgroundColor: colors.card }]}
      animation={animation}
    >
      <Pressable onPress={onToggleExpand} style={styles.headerPressable}>
        <View style={styles.headerContent}>
          <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 1}>
            {event.title}
          </Text>
          <Animated.View
            style={{
              transform: [{
                rotate: rotateAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg']
                })
              }]
            }}
          >
            <ChevronDown size={20} color={colors.primary} />
          </Animated.View>
        </View>
        
        {isExpanded && (
          <Animated.View 
            style={[
              styles.eventDetails,
              {
                opacity: rotateAnimation
              }
            ]}
          >
            <DetailRow
              icon={<Calendar size={16} color={colors.primary} />}
              text={event.date}
              colors={colors}
            />
            <DetailRow
              icon={<Clock size={16} color={colors.primary} />}
              text={event.time}
              colors={colors}
            />
            <DetailRow
              icon={<MapPin size={16} color={colors.primary} />}
              text={event.location}
              colors={colors}
            />
          </Animated.View>
        )}
      </Pressable>
    </AnimatedCard>
  );
});

// Detail Row Component
const DetailRow: React.FC<{
  icon: React.ReactNode;
  text: string;
  colors: any;
}> = ({ icon, text, colors }) => (
  <View style={styles.detailRow}>
    <View style={[styles.detailIcon, { backgroundColor: colors.primary + '20' }]}>
      {icon}
    </View>
    <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={2}>
      {text}
    </Text>
  </View>
);

// Stats Card Component
export const StatsCard: React.FC<StatCardProps> = React.memo(({ 
  stats, 
  colors,
  animation 
}) => (
  <AnimatedCard
    style={[styles.statsCard, { backgroundColor: colors.card }]}
    animation={animation}
    delay={100}
  >
    <View style={styles.statsRow}>
      <StatItem
        icon={<Users size={20} color="#FF6B00" />}
        value={stats.total}
        label="Total"
        bgColor="rgba(255, 107, 0, 0.1)"
        textColor={colors.text}
        secondaryColor={colors.secondary}
      />
      
      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
      
      <StatItem
        icon={<UserCheck size={20} color="#22C55E" />}
        value={stats.checkedIn}
        label="Present"
        bgColor="rgba(34, 197, 94, 0.1)"
        textColor={colors.text}
        secondaryColor={colors.secondary}
      />
      
      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
      
      <StatItem
        icon={<BarChart size={20} color="#3B82F6" />}
        value={`${stats.percentage}%`}
        label="Rate"
        bgColor="rgba(59, 130, 246, 0.1)"
        textColor={colors.text}
        secondaryColor={colors.secondary}
      />
    </View>
  </AnimatedCard>
));

// Stat Item Component
const StatItem: React.FC<{
  icon: React.ReactNode;
  value: number | string;
  label: string;
  bgColor: string;
  textColor: string;
  secondaryColor: string;
}> = ({ icon, value, label, bgColor, textColor, secondaryColor }) => (
  <View style={styles.statItem}>
    <View style={[styles.statIcon, { backgroundColor: bgColor }]}>
      {icon}
    </View>
    <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: secondaryColor }]}>{label}</Text>
  </View>
);

// Action Card Component
export const ActionCard: React.FC<ActionCardProps> = React.memo(({ 
  onGuestList, 
  onAttendance, 
  colors,
  animation 
}) => (
  <AnimatedCard
    style={[styles.actionsGrid, { backgroundColor: colors.card }]}
    animation={animation}
    delay={200}
  >
    <ActionButton
      icon={<Users size={24} color="#FFFFFF" />}
      label="Guest List"
      color="#3B82F6"
      bgColor="rgba(59, 130, 246, 0.05)"
      onPress={onGuestList}
    />
    
    <ActionButton
      icon={<UserCheck size={24} color="#FFFFFF" />}
      label="Attendance"
      color="#22C55E"
      bgColor="rgba(34, 197, 94, 0.05)"
      onPress={onAttendance}
    />
  </AnimatedCard>
));

// Action Button Component
const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}> = ({ icon, label, color, bgColor, onPress }) => (
  <Pressable 
    style={({ pressed }) => [
      styles.actionItem,
      { backgroundColor: bgColor },
      pressed && styles.actionPressed
    ]}
    onPress={onPress}
    android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
  >
    <View style={[styles.actionIconContainer, { backgroundColor: color }]}>
      {icon}
    </View>
    <Text style={styles.actionText}>{label}</Text>
  </Pressable>
);

// Progress Card Component
export const ProgressCard: React.FC<ProgressCardProps> = React.memo(({ 
  stats, 
  onRefresh, 
  colors,
  animation 
}) => {
  const progressAnimation = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: stats.percentage / 100,
      duration: 1000,
      delay: 500,
      useNativeDriver: false
    }).start();
  }, [stats.percentage]);

  return (
    <AnimatedCard
      style={[styles.progressCard, { backgroundColor: colors.card }]}
      animation={animation}
      delay={300}
    >
      <View style={styles.progressHeader}>
        <Text style={[styles.progressTitle, { color: colors.text }]}>
          Check-in Progress
        </Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <RefreshCw size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.progressContent}>
        <View style={styles.progressCircle}>
          <Text style={[styles.progressPercentage, { color: colors.primary }]}>
            {stats.percentage}%
          </Text>
        </View>
        
        <View style={styles.progressStats}>
          <ProgressStat
            value={stats.checkedIn}
            label="Checked In"
            color="#22C55E"
            secondaryColor={colors.secondary}
          />
          <ProgressStat
            value={stats.pending}
            label="Pending"
            color={colors.secondary}
            secondaryColor={colors.secondary}
          />
        </View>
      </View>
      
      <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
        <Animated.View 
          style={[
            styles.progressBar,
            { 
              backgroundColor: colors.primary,
              width: progressAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              })
            }
          ]}
        />
      </View>
    </AnimatedCard>
  );
});

// Progress Stat Component
const ProgressStat: React.FC<{
  value: number;
  label: string;
  color: string;
  secondaryColor: string;
}> = ({ value, label, color, secondaryColor }) => (
  <View style={styles.progressStat}>
    <Text style={[styles.progressStatValue, { color }]}>{value}</Text>
    <Text style={[styles.progressStatLabel, { color: secondaryColor }]}>{label}</Text>
  </View>
);

// Quick Action Button
export const QuickActionButton: React.FC<{
  text: string;
  onPress: () => void;
  primary?: boolean;
  colors: any;
}> = React.memo(({ text, onPress, primary = true, colors }) => (
  <TouchableOpacity 
    style={[
      styles.quickActionButton,
      { backgroundColor: primary ? colors.primary : colors.card }
    ]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={[
      styles.quickActionText,
      { color: primary ? '#FFFFFF' : colors.text }
    ]}>
      {text}
    </Text>
  </TouchableOpacity>
));

const styles = StyleSheet.create({
  // Header
  header: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerPressable: {
    flex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  eventDetails: {
    marginTop: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  
  // Stats Card
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 12,
  },
  
  // Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  actionPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  
  // Progress Card
  progressCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 4,
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: '700',
  },
  progressStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  progressStatLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  
  // Quick Actions
  quickActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
