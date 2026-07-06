import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase, schedulesTable } from './supabase';
import { ScheduleEvent } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00d4ff',
    });
  }

  return true;
}

export async function scheduleNotification(
  eventId: string,
  title: string,
  startTime: string
): Promise<string> {
  const eventDate = new Date(startTime);
  const notificationTime = new Date(eventDate.getTime() - 15 * 60 * 1000); // 15 minutes before

  if (notificationTime <= new Date()) {
    console.log('Event is too soon to schedule notification');
    return '';
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'SYNKROS Recordatorio',
      body: `${title} comienza en 15 minutos`,
      data: { eventId },
    },
    trigger: {
      date: notificationTime,
    },
  });

  return identifier;
}

export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export function setupScheduleListener(userId: string): () => void {
  const subscription = supabase
    .channel(`schedules:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: schedulesTable,
        filter: `user_id=eq.${userId}`,
      },
      async (payload: any) => {
        const newEvent = payload.new as ScheduleEvent;
        try {
          await scheduleNotification(newEvent.id, newEvent.title, newEvent.start_time);
          console.log(`[SYNKROS] Notification scheduled for event: ${newEvent.title} at ${newEvent.start_time}`);
        } catch (error) {
          console.error('[SYNKROS] Failed to schedule notification:', error);
        }
      }
    )
    .subscribe((status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => {
      if (status === 'SUBSCRIBED') {
        console.log(`[SYNKROS] Realtime subscription established for user: ${userId}`);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        console.error(`[SYNKROS] Realtime subscription error: ${status}`);
      }
    });

  return () => {
    supabase.removeChannel(subscription);
    console.log(`[SYNKROS] Realtime subscription removed for user: ${userId}`);
  };
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
