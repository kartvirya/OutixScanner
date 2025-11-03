import { Stack } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';

export default function AttendanceLayout() {
  const { colors } = useTheme();
  
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackTitleVisible: false,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="[id]" 
        options={{ 
          title: "Live Attendance",
          headerShown: true,
          headerBackTitle: "Back",
        }} 
      />
    </Stack>
  );
}

