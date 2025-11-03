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
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { validateQRCode } from '../../../services/api';
import { feedback } from '../../../services/feedback';
import { formatAppDateTime } from '../../../utils/date';

export default function GuestDetailsPage() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  
  // Parse the guest data from URL params
  const guestData = params.guestData ? JSON.parse(params.guestData as string) : null;
  const eventTitle = params.eventTitle as string || 'Event';
  const returnTo = params.returnTo as string; // Get the return path for navigation
  
  // Debug logging for guest data
  console.log('🔍 Guest details - received guest data:', {
    checkedInDate: guestData?.checkedInDate,
    rawCheckedInDate: guestData?.rawData?.checkedin_date,
    scannedIn: guestData?.scannedIn,
    hasRawData: !!guestData?.rawData
  });
  
  // State for checked-in date and status
  const [checkedInDate, setCheckedInDate] = useState<string | null>(guestData?.checkedInDate || guestData?.rawData?.checkedin_date || null);
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(guestData?.scannedIn || false);
  const [isLoadingCheckedInDate, setIsLoadingCheckedInDate] = useState(false);
  
  // Initialize checked-in date from guest data if available
  useEffect(() => {
    if (guestData?.checkedInDate && !checkedInDate) {
      console.log('🔍 Initializing checked-in date from guest data:', guestData.checkedInDate);
      setCheckedInDate(guestData.checkedInDate);
    } else if (guestData?.rawData?.checkedin_date && !checkedInDate) {
      console.log('🔍 Initializing checked-in date from raw data:', guestData.rawData.checkedin_date);
      setCheckedInDate(guestData.rawData.checkedin_date);
    }
  }, [guestData?.checkedInDate, guestData?.rawData?.checkedin_date, checkedInDate]);

  // Fetch checked-in date when component mounts
  useEffect(() => {
    const fetchCheckedInDate = async () => {
      if (!guestData?.ticket_identifier) return;
      
      setIsLoadingCheckedInDate(true);
      try {
        console.log(`🔍 Fetching checked-in date for ticket: ${guestData.ticket_identifier}`);
        const eventId = params.eventId as string;
        const validationResult = await validateQRCode(eventId, guestData.ticket_identifier);
        
        if (validationResult && !validationResult.error && validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
          const info = validationResult.msg.info;
          if (info) {
            // Set checked-in status based on checkedin field (0 or 1)
            const checkedInStatus = String(info.checkedin) === '1';
            
            // Only update the checked-in status if it's different from what we already know
            // This prevents overriding the correct status when coming from scanner
            if (checkedInStatus !== isCheckedIn) {
              setIsCheckedIn(checkedInStatus);
              console.log(`🔍 Updated checked-in status: ${checkedInStatus} (checkedin: ${info.checkedin})`);
            } else {
              console.log(`🔍 Checked-in status unchanged: ${checkedInStatus} (checkedin: ${info.checkedin})`);
            }
            
            // Set checked-in date if available
            if (info.checkedin_date) {
              console.log(`✅ Found checked-in date from API: ${info.checkedin_date}`);
              setCheckedInDate(info.checkedin_date);
            } else {
              console.log('ℹ️ No checked-in date found in validation response');
              // If we know the guest is checked in but no date is available, 
              // we can set a fallback or leave it as null
              if (isCheckedIn && !checkedInDate) {
                console.log('🔍 Setting fallback checked-in date');
                setCheckedInDate('Unknown time');
              }
            }
          }
        } else {
          console.log('⚠️ Validation failed or no info available');
          // If validation fails but we know the guest is checked in, keep that status
          if (isCheckedIn && !checkedInDate) {
            setCheckedInDate('Unknown time');
          }
        }
      } catch (error) {
        console.error('❌ Error fetching checked-in date:', error);
        // If API call fails but we know the guest is checked in, keep that status
        if (isCheckedIn && !checkedInDate) {
          setCheckedInDate('Unknown time');
        }
      } finally {
        setIsLoadingCheckedInDate(false);
      }
    };

    fetchCheckedInDate();
  }, [guestData?.ticket_identifier, params.eventId]);

  // Handle check-in
  const handleCheckIn = async () => {
    if (!guestData?.ticket_identifier) return;
    
    feedback.buttonPress();
    try {
      console.log(`🔍 Checking in guest: ${guestData.ticket_identifier}`);
      const eventId = params.eventId as string;
      
      // Call the scan API for check-in
      const { scanQRCode } = await import('../../../services/api');
      const result = await scanQRCode(eventId, guestData.ticket_identifier);
      
      if (result && !result.error) {
        console.log('✅ Check-in successful');
        // Update checked-in status
        setIsCheckedIn(true);
        // Refresh the checked-in date
        const validationResult = await validateQRCode(eventId, guestData.ticket_identifier);
        if (validationResult && !validationResult.error && validationResult.msg && typeof validationResult.msg === 'object' && 'info' in validationResult.msg) {
          const info = validationResult.msg.info;
          if (info && info.checkedin_date) {
            setCheckedInDate(info.checkedin_date);
          }
        }
      } else {
        console.log('❌ Check-in failed:', result?.msg);
      }
    } catch (error) {
      console.error('❌ Check-in error:', error);
    }
  };

  // Handle pass-out
  const handleCheckOut = async () => {
    if (!guestData?.ticket_identifier) return;
    
    feedback.buttonPress();
    try {
      console.log(`🔍 Passing out guest: ${guestData.ticket_identifier}`);
      const eventId = params.eventId as string;
      
      // Call the unscan API for pass-out
      const { unscanQRCode } = await import('../../../services/api');
      const result = await unscanQRCode(eventId, guestData.ticket_identifier);
      
      if (result && !result.error) {
        console.log('✅ Pass-out successful');
        // Update checked-in status
        setIsCheckedIn(false);
        // Clear the checked-in date
        setCheckedInDate(null);
      } else {
        console.log('❌ Pass-out failed:', result?.msg);
      }
    } catch (error) {
      console.error('❌ Pass-out error:', error);
    }
  };

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
              // Navigate to the returnTo path if available, otherwise use back
              if (returnTo) {
                router.push(returnTo);
              } else {
                router.back();
              }
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

  const formatPriceValue = (priceInput?: string | number) => {
    if (priceInput === undefined || priceInput === null) return 'N/A';
    let str = String(priceInput).trim();
    if (str === '') return 'N/A';
    // Remove any currency symbols and spaces
    str = str.replace(/[^0-9.,-]/g, '');
    // Normalize comma as thousands separator
    const normalized = parseFloat(str.replace(/,/g, ''));
    if (Number.isNaN(normalized)) {
      // Fallback: just ensure single leading $
      return `$${str.replace(/^\$/,'')}`;
    }
    return `$${normalized.toFixed(2)}`;
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
        <Text style={[styles.infoLabel, { color: colors.text }]}>{label}</Text>
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
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                feedback.buttonPress();
                // Navigate to the returnTo path if available, otherwise use back
                if (returnTo) {
                  router.push(returnTo);
                } else {
                  router.back();
                }
              }}
              style={{
                marginLeft: 8,
                padding: 8,
                borderRadius: 8,
              }}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

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
                  backgroundColor: isCheckedIn ? '#34C759' : '#FF6B35',
                }
              ]}>
                {isCheckedIn ? (
                  <CheckCircle size={16} color="#FFFFFF" />
                ) : (
                  <Clock size={16} color="#FFFFFF" />
                )}
                <Text style={styles.statusText}>
                  {isCheckedIn ? 'Checked In' : 'Not Arrived'}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Checked-in Date/Time */}
          {(checkedInDate || guestData?.checkedInDate || guestData?.rawData?.checkedin_date) && (
            <View style={styles.checkInInfo}>
              <Text style={[styles.checkInLabel, { color: colors.text }]}>
                Checked in at:
              </Text>
              <Text style={[styles.checkInTime, { color: colors.text }]}>
                {(() => {
                  console.log('🔍 Formatting checked-in date:', checkedInDate, 'Type:', typeof checkedInDate);
                  console.log('🔍 Guest data checkedInDate:', guestData?.checkedInDate);
                  console.log('🔍 Guest data raw checkedin_date:', guestData?.rawData?.checkedin_date);
                  
                  // Try to use the date directly if it's valid, otherwise try to format it
                  let dateToFormat = checkedInDate;
                  
                  // If checkedInDate is null but we have data in guestData, use that
                  if (!dateToFormat && guestData?.checkedInDate) {
                    dateToFormat = guestData.checkedInDate;
                    console.log('🔍 Using guestData.checkedInDate:', dateToFormat);
                  } else if (!dateToFormat && guestData?.rawData?.checkedin_date) {
                    dateToFormat = guestData.rawData.checkedin_date;
                    console.log('🔍 Using guestData.rawData.checkedin_date:', dateToFormat);
                  }
                  
                  // Test if the date is valid
                  if (dateToFormat) {
                    const testDate = new Date(dateToFormat);
                    console.log('🔍 Date validation test:', {
                      original: dateToFormat,
                      parsed: testDate,
                      isValid: !isNaN(testDate.getTime()),
                      timestamp: testDate.getTime()
                    });
                  }
                  
                  const formatted = formatAppDateTime(dateToFormat);
                  console.log('🔍 Final formatted result:', formatted);
                  
                  // If still TBD but we know the guest is checked in, show a fallback
                  if (formatted === 'TBD' && isCheckedIn) {
                    return 'Unknown time';
                  }
                  
                  return formatted;
                })()}
              </Text>
            </View>
          )}
          
          {/* Loading state for checked-in date */}
          {isLoadingCheckedInDate && (
            <View style={styles.checkInInfo}>
              <Text style={[styles.checkInLabel, { color: colors.text }]}>
                Loading check-in status...
              </Text>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
          
          {/* Dynamic Check-in/Pass-out Button */}
          <View style={styles.actionButtonContainer}>
            {isCheckedIn ? (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
                onPress={handleCheckOut}
              >
                <Clock size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Pass Out</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={handleCheckIn}
              >
                <CheckCircle size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Check In</Text>
              </TouchableOpacity>
            )}
          </View>
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
            value={formatPriceValue(
              guestData.price !== undefined && guestData.price !== null
                ? guestData.price
                : guestData.rawData?.price
            )}
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  loadingText: {
    fontSize: 16,
    marginLeft: 8,
  },
  actionButtonContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 140,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 