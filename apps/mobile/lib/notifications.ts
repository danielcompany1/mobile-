import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { dueInstant, quietHoursEnd, type QuietHours } from '@dueday/shared';
import type { PlannerItem } from '@dueday/shared';
import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const PREFIX = 'dueday-local-reminders:';
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

export async function requestAndRegisterPush() {
  try {
    if (Platform.OS === 'web') return 'Device push notifications are available in the iOS and Android apps. You can still see reminders inside DueDay.';
    if (Platform.OS === 'android' && isRunningInExpoGo()) return 'Remote push needs a development build on Android. You can still use in-app reminders in Expo Go.';
    if (!Device.isDevice || !supabase) return 'Push notifications are available in a development or production build on a device.';
    if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('deadlines', { name: 'Deadline reminders', importance: Notifications.AndroidImportance.HIGH });
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return 'Notifications are off. You can still see reminders inside DueDay.';
    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID && !process.env.EXPO_PUBLIC_EAS_PROJECT_ID.includes('replace_with')
      ? process.env.EXPO_PUBLIC_EAS_PROJECT_ID
      : Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return 'Push setup needs an Expo project ID. Local reminders can still work on this device.';
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const { data } = await supabase.auth.getSession();
    if (!data.session || !API_URL) return 'Push permission is on, but device registration needs the API URL configured.';
    const response = await fetch(`${API_URL}/v1/push-devices`, {
      method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify({ token, platform: Platform.OS === 'ios' ? 'ios' : 'android' }),
    });
    if (!response.ok) return 'Push permission is on, but we could not register this device yet. Try again from Settings.';
    return 'Notifications are ready on this device.';
  } catch { return 'Push setup could not finish. You can still see reminders inside DueDay; try again from Settings.'; }
}

export async function unregisterPushToken() {
  try {
    if (Platform.OS === 'web' || (Platform.OS === 'android' && isRunningInExpoGo())) return;
    if (!supabase || !API_URL) return;
    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID && !process.env.EXPO_PUBLIC_EAS_PROJECT_ID.includes('replace_with')
      ? process.env.EXPO_PUBLIC_EAS_PROJECT_ID
      : Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await fetch(`${API_URL}/v1/push-devices`, { method: 'DELETE', headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ token }) });
  } catch { /* Sign-out should remain available when the network is down. */ }
}

export async function scheduleLocalReminders(item: PlannerItem) {
  if (Platform.OS === 'web') return;
  const old = await AsyncStorage.getItem(`${PREFIX}${item.id}`);
  if (old) for (const id of JSON.parse(old) as string[]) await Notifications.cancelScheduledNotificationAsync(id);
  if (item.status !== 'open') { await AsyncStorage.removeItem(`${PREFIX}${item.id}`); return; }
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') { await AsyncStorage.removeItem(`${PREFIX}${item.id}`); return; }
  const preference = supabase ? await supabase.from('notification_preferences').select('enabled,quiet_hours_enabled,quiet_start,quiet_end,timezone').maybeSingle() : { data: null };
  if (preference.data?.enabled === false) { await AsyncStorage.removeItem(`${PREFIX}${item.id}`); return; }
  const quiet: QuietHours = {
    enabled: Boolean(preference.data?.quiet_hours_enabled), start: preference.data?.quiet_start ?? '22:00',
    end: preference.data?.quiet_end ?? '08:00', timezone: preference.data?.timezone ?? item.timezone,
  };
  const existingCount = (await Notifications.getAllScheduledNotificationsAsync()).length;
  const budget = Math.max(0, 60 - existingCount);
  const candidates: Array<{ date: Date; offset: number; occurrenceDate: string }> = [];
  const count = item.recurrence_rule?.frequency === 'weekly' ? Math.min(52, item.recurrence_rule.count) : 1;
  const base = Date.parse(`${item.due_on}T00:00:00Z`);
  for (let index = 0; index < count; index += 1) {
    const occurrenceDate = new Date(base + index * 7 * 86_400_000).toISOString().slice(0, 10);
    const due = dueInstant(occurrenceDate, item.due_time, item.timezone).getTime();
    for (const offset of item.reminders) {
      const planned = new Date(due - offset * 60_000);
      const date = quietHoursEnd(planned, quiet) ?? planned;
      if (date.getTime() <= Date.now()) continue;
      if (!candidates.some((candidate) => candidate.date.getTime() === date.getTime())) candidates.push({ date, offset, occurrenceDate });
    }
  }
  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  const scheduled: string[] = [];
  for (const candidate of candidates.slice(0, budget)) {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: 'Deadline reminder', body: 'A deadline is coming up. Open DueDay to see what needs attention.', data: { itemId: item.id, notificationId: `local-${item.id}-${candidate.occurrenceDate}-${candidate.offset}` }, ...(Platform.OS === 'android' ? { channelId: 'deadlines' } : {}) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: candidate.date },
    });
    scheduled.push(id);
  }
  await AsyncStorage.setItem(`${PREFIX}${item.id}`, JSON.stringify(scheduled));
}

export async function cancelAllLocalReminders() {
  if (Platform.OS === 'web') return;
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(PREFIX));
  for (const key of keys) {
    const ids = JSON.parse((await AsyncStorage.getItem(key)) ?? '[]') as string[];
    for (const id of ids) await Notifications.cancelScheduledNotificationAsync(id);
  }
  await AsyncStorage.multiRemove(keys);
}
