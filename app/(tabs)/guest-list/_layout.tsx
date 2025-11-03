import { Stack } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';

export default function GuestListLayout() {
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
          title: "Guest List",
          headerShown: true,
          headerBackTitle: "Back",
        }} 
      />
      <Stack.Screen 
        name="[id]-improved" 
        options={{ 
          title: "Guest List",
          headerShown: true,
          headerBackTitle: "Back",
        }} 
      />
      <Stack.Screen 
        name="[id]-optimized" 
        options={{ 
          title: "Guest List",
          headerShown: true,
          headerBackTitle: "Back",
        }} 
      />
      <Stack.Screen 
        name="guest-details" 
        options={{ 
          title: "Guest Details",
          headerShown: true,
          headerBackTitle: "Back",
        }} 
      />
    </Stack>
  );
}

