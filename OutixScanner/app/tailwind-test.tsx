import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import TailwindTest from '../components/TailwindTest';

export default function TailwindTestPage() {
  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />
      <TailwindTest />
    </SafeAreaView>
  );
}
