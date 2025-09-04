import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    Calendar,
    CheckCircle,
    Clock,
    CreditCard,
    DollarSign,
    FileText,
    Mail,
    Phone,
    Ticket,
    User
} from 'lucide-react-native';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { feedback } from '../../../services/feedback';
import { formatAppDateTime } from '../../../utils/date';

export default function GuestDetailsPage() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  
  // Parse the guest data from URL params
  const guestData = params.guestData ? JSON.parse(params.guestData as string) : null;
  const eventTitle = params.eventTitle as string || 'Event';

  if (!guestData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Guest Details", headerShown: true }} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Guest information not found
          </Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              feedback.buttonPress();
              router.back();
            }}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return formatAppDateTime(dateString);
  };

  const getCardLastDigits = (cardInfo?: string) => {
    if (!cardInfo) return 'N/A';
    // Extract last 4 digits if it's a card number
    const digits = cardInfo.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `****${digits.slice(-4)}`;
    }
    return cardInfo;
  };

  const InfoRow = ({ icon, label, value, iconColor = colors.primary }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    iconColor?: string;
  }) => (
    <View style={[styles.infoRow, { backgroundColor: colors.card }]}>
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        {React.isValidElement(icon) ? 
          React.cloneElement(icon, { 
            size: 20, 
            color: iconColor 
          } as any) : 
          icon
        }
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.secondary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: "Guest Details",
          headerShown: true,
        }}
      />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity 
          style={styles.headerBackButton}
          onPress={() => {
            feedback.buttonPress();
            router.back();
          }}
        >
          <ArrowLeft size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Guest Details</Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>{eventTitle}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Guest Status Card */}
        <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
          <View style={styles.statusHeader}>
            <View style={styles.avatarContainer}>
              <User size={32} color={colors.primary} />
            </View>
            <View style={styles.statusInfo}>
              <Text style={[styles.guestName, { color: colors.text }]}>
                {guestData.name}
              </Text>
              <View style={[
                styles.statusBadge, 
                { 
                  backgroundColor: guestData.scannedIn ? '#34C759' : '#FF6B35',
                }
              ]}>
                {guestData.scannedIn ? (
                  <CheckCircle size={16} color="#FFFFFF" />
                ) : (
                  <Clock size={16} color="#FFFFFF" />
                )}
                <Text style={styles.statusText}>
                  {guestData.scannedIn ? 'Checked In' : 'Not Arrived'}
                </Text>
              </View>
            </View>
          </View>
          
          {guestData.scannedIn && guestData.scanInTime && (
            <View style={styles.checkInInfo}>
              <Text style={[styles.checkInLabel, { color: colors.secondary }]}>
                Checked in at:
              </Text>
              <Text style={[styles.checkInTime, { color: colors.text }]}>
                {guestData.scanInTime}
              </Text>
            </View>
          )}
        </View>

        {/* Guest Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Contact Information
          </Text>
          
          <InfoRow
            icon={<Mail />}
            label="Email Address"
            value={guestData.email || 'N/A'}
            iconColor="#007AFF"
          />
          
          <InfoRow
            icon={<Phone />}
            label="Phone Number"
            value={guestData.mobile || guestData.rawData?.mobile || 'N/A'}
            iconColor="#34C759"
          />
        </View>

        {/* Ticket Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Ticket Information
          </Text>
          
          <InfoRow
            icon={<Ticket />}
            label="Ticket Type"
            value={guestData.ticketType || 'General'}
            iconColor="#8E44AD"
          />
          
          <InfoRow
            icon={<DollarSign />}
            label="Price"
            value={guestData.price ? `$${guestData.price}` : guestData.rawData?.price ? `$${guestData.rawData.price}` : 'N/A'}
            iconColor="#27AE60"
          />
          
          <InfoRow
            icon={<Calendar />}
            label="Purchase Date"
            value={formatDate(guestData.purchased_date || guestData.rawData?.purchased_date)}
            iconColor="#3498DB"
          />
          
          <InfoRow
            icon={<FileText />}
            label="Booking Reference"
            value={guestData.rawData?.booking_reference || guestData.reference_num || guestData.rawData?.reference_num || 'N/A'}
            iconColor="#E67E22"
          />
          
          <InfoRow
            icon={<CreditCard />}
            label="Card Last Digits"
            value={getCardLastDigits(guestData.rawData?.card_last_digits || guestData.rawData?.payment_method)}
            iconColor="#9B59B6"
          />
        </View>

        {/* Additional Information */}
        {(guestData.notes || guestData.rawData?.notes || guestData.rawData?.remarks) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Additional Notes
            </Text>
            
            <View style={[styles.notesContainer, { backgroundColor: colors.card }]}>
              <Text style={[styles.notesText, { color: colors.text }]}>
                {guestData.notes || guestData.rawData?.notes || guestData.rawData?.remarks}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerBackButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 120, // Space for tab bar + extra padding
  },
  statusCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  checkInInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  checkInLabel: {
    fontSize: 14,
  },
  checkInTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  notesContainer: {
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  debugContainer: {
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  debugText: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
}); 