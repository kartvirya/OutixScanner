import React, { useState } from 'react';
import { Modal, SafeAreaView, StyleSheet, TouchableOpacity, View, Text, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';

interface WaiverWebViewModalProps {
  visible: boolean;
  onClose: () => void;
  waiverUrl: string;
  title?: string;
}

export default function WaiverWebViewModal({ visible, onClose, waiverUrl, title }: WaiverWebViewModalProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <View style={[styles.header, { borderBottomColor: colors.border }]}> 
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title || 'Sign Waiver'}
          </Text>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.card }]} activeOpacity={0.8}>
            <X size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        <WebView
          source={{ uri: waiverUrl }}
          onLoadEnd={() => setLoading(false)}
          startInLoadingState={false}
          incognito
          style={styles.webView}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  closeBtn: { padding: 8, borderRadius: 8, marginLeft: 12 },
  loadingOverlay: { position: 'absolute', top: 80, left: 0, right: 0, alignItems: 'center', zIndex: 2 },
  webView: { flex: 1 },
});


