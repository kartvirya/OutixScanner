import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AppLayoutProps {
  children: React.ReactNode;
  withPadding?: boolean;
}

export default function AppLayout({ children, withPadding = true }: AppLayoutProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, withPadding && styles.padded]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: 16,
  },
});