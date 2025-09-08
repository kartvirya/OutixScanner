import { Stack } from 'expo-router';
import React from 'react';
import AppLayout from '../components/AppLayout';
import PushNotificationTest from '../components/PushNotificationTest';

export default function PushNotificationTestPage() {
  return (
    <AppLayout>
      <Stack.Screen 
        options={{ 
          title: "Push Notifications",
          headerShown: true,
        }}
      />
      <PushNotificationTest />
    </AppLayout>
  );
}




