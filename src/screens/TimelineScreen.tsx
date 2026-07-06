import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { getEvents } from '../services/scheduleFunctions';
import { ScheduleEvent } from '../types';

export default function TimelineScreen() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadEvents();
  }, [selectedDate]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      // TODO: Get actual user ID from auth
      const userId = 'user-id-placeholder';
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await getEvents(userId, dateStr);
      setEvents(data);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>→</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.timeline}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color="#00d4ff" size="large" />
          </View>
        ) : events.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No hay eventos para este día</Text>
          </View>
        ) : (
          events.map((event: ScheduleEvent, index: number) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.timeIndicator}>
                <Text style={styles.timeText}>{formatTime(event.start_time)}</Text>
                <View style={styles.timelineDot} />
              </View>
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {event.description && (
                  <Text style={styles.eventDescription}>{event.description}</Text>
                )}
                <Text style={styles.eventTimeRange}>
                  {formatTime(event.start_time)} - {formatTime(event.end_time)}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a24',
  },
  navButton: {
    padding: 10,
  },
  navButtonText: {
    color: '#00d4ff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timeline: {
    flex: 1,
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  eventCard: {
    flexDirection: 'row',
    marginBottom: 24,
    position: 'relative',
  },
  timeIndicator: {
    width: 60,
    alignItems: 'flex-end',
    paddingRight: 16,
  },
  timeText: {
    color: '#00d4ff',
    fontSize: 14,
    fontWeight: '600',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00d4ff',
    marginTop: 6,
    position: 'absolute',
    right: 10,
    borderWidth: 2,
    borderColor: '#0a0a0f',
  },
  eventContent: {
    flex: 1,
    backgroundColor: '#1a1a24',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#00d4ff',
  },
  eventTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventDescription: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
  },
  eventTimeRange: {
    color: '#666',
    fontSize: 12,
  },
});
