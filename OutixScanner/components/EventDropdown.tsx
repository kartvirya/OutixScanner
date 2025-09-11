import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface AnyEvent {
  id?: string;
  EventId?: string;
  eventId?: string;
  ID?: string;
  Id?: string;
  EventName?: string;
  title?: string;
  name?: string;
  [key: string]: any;
}

interface EventDropdownProps {
  events: AnyEvent[];
  selectedEventId: string | null;
  onEventSelect: (eventId: string | null) => void;
  placeholder?: string;
  style?: any;
}

const getEventId = (event: AnyEvent): string | undefined => {
  return (
    event.id || event.EventId || event.eventId || event.ID || event.Id || undefined
  );
};

const EventDropdown: React.FC<EventDropdownProps> = ({
  events,
  selectedEventId,
  onEventSelect,
  placeholder = 'Select an event',
  style,
}) => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const allEventsOption = useMemo(() => ({ id: 'all', EventName: 'All Events' }), []);

  // Build options with a stable key for each event
  const eventOptions: AnyEvent[] = useMemo(() => {
    return [allEventsOption, ...events];
  }, [events, allEventsOption]);

  const selectedEvent: AnyEvent | undefined = useMemo(() => {
    if (selectedEventId === null || selectedEventId === 'all') return allEventsOption;
    return events.find(e => getEventId(e) === selectedEventId);
  }, [events, selectedEventId, allEventsOption]);

  const displayName = selectedEvent
    ? (selectedEvent.EventName || selectedEvent.title || selectedEvent.name || 'Unnamed Event')
    : placeholder;

  const handleSelect = (eventId: string) => {
    onEventSelect(eventId === 'all' ? null : eventId);
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          { 
            backgroundColor: colors.card, 
            borderColor: colors.border,
          },
          style
        ]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Text 
          style={[
            styles.dropdownButtonText, 
            { color: colors.text }
          ]}
          numberOfLines={1}
        >
          {displayName}
        </Text>
        <ChevronDown size={20} color={colors.secondary} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View 
            style={[
              styles.modalContent,
              { backgroundColor: colors.card }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select Event
              </Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
              >
                <Text style={[styles.closeButtonText, { color: colors.primary }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {eventOptions.map((event) => {
                const optionId = event.id === 'all' ? 'all' : (getEventId(event) || String(event));
                const isSelected = optionId === 'all'
                  ? (selectedEventId === null || selectedEventId === 'all')
                  : optionId === selectedEventId;
                
                return (
                  <TouchableOpacity
                    key={optionId}
                    style={[
                      styles.optionItem,
                      { borderBottomColor: colors.border }
                    ]}
                    onPress={() => handleSelect(optionId)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: colors.text },
                        isSelected && styles.selectedOptionText,
                        isSelected && { color: colors.primary }
                      ]}
                      numberOfLines={2}
                    >
                      {event.EventName || event.title || event.name || 'Unnamed Event'}
                    </Text>
                    {isSelected && (
                      <Check size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const { height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48,
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: screenHeight * 0.7,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionsList: {
    maxHeight: screenHeight * 0.5,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  selectedOptionText: {
    fontWeight: '700',
  },
});

export default EventDropdown;
