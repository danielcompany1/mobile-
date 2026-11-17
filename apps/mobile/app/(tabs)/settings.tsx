import React, { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, Share, Text, View, useColorScheme } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card, Eyebrow, Field, Heading, Loading, Screen, colors, ui } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { cancelAllLocalReminders, requestAndRegisterPush, scheduleLocalReminders, unregisterPushToken } from '../../lib/notifications';
import { type PlannerItem } from '@dueday/shared';
import { isValidEmail, isValidTimeZone, normalizeEmail } from '@dueday/shared';
import { showAlert } from '../../lib/dialogs';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';
const CALENDAR_KEY = 'dueday-calendar-export-enabled';

export default function Settings() {
  useColorScheme();
  const { session, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [school, setSchool] = useState('');
  const [term, setTerm] = useState('');
  const [week, setWeek] = useState('1');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');
  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!supabase || !session) { setLoading(false); return; }
    const [profile, prefs, storedCalendar] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
      supabase.from('notification_preferences').select('*').eq('owner_id', session.user.id).maybeSingle(),
      AsyncStorage.getItem(CALENDAR_KEY),
    ]);
    if (profile.data) { setName(profile.data.full_name ?? ''); setTimezone(profile.data.timezone ?? timezone); setSchool(profile.data.school ?? ''); setTerm(profile.data.current_term ?? ''); setWeek(String(profile.data.week_starts_on ?? 1)); }
    if (prefs.data) { setNotificationsEnabled(prefs.data.enabled); setPushEnabled(prefs.data.push_enabled); setQuietEnabled(prefs.data.quiet_hours_enabled); setQuietStart(prefs.data.quiet_start.slice(0, 5)); setQuietEnd(prefs.data.quiet_end.slice(0, 5)); }
    setCalendarEnabled(storedCalendar === 'true'); setLoading(false);
  }, [session?.user.id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function saveProfile() {
    if (!session || !supabase) return;
    if (!name.trim()) { setMessage('Add your name before saving.'); return; }
    if (!['0', '1'].includes(week)) { setMessage('Choose 0 for Sunday or 1 for Monday week start.'); return; }
    if (!isValidTimeZone(timezone.trim())) { setMessage('Enter a valid IANA time zone, such as America/Chicago.'); return; }
    if (quietEnabled && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(quietStart) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(quietEnd))) { setMessage('Enter quiet hours in 24-hour format, such as 22:00.'); return; }
    setSaving(true);
    const [profile, prefs] = await Promise.all([
      supabase.from('profiles').update({ full_name: name.trim(), timezone: timezone.trim() || 'UTC', school: school.trim() || null, current_term: term.trim() || null, week_starts_on: Number(week) }).eq('id', session.user.id),
      supabase.from('notification_preferences').update({ timezone: timezone.trim() || 'UTC', enabled: notificationsEnabled, push_enabled: pushEnabled, quiet_hours_enabled: quietEnabled, quiet_start: quietStart, quiet_end: quietEnd }).eq('owner_id', session.user.id),
    ]);
    setSaving(false);
    if (profile.error || prefs.error) { setMessage('Settings could not be saved. Check your connection and try again.'); return; }
    if (supabase) {
      const { data: items } = await supabase.from('planner_items').select('*').eq('status', 'open');
      for (const item of (items ?? []) as PlannerItem[]) await scheduleLocalReminders(item);
    }
    setMessage('Settings saved.');
  }
  async function requestEmailChange() {
    const normalized = normalizeEmail(newEmail);
    if (!isValidEmail(normalized)) { setMessage('Check the new email address format and try again.'); return; }
    if (!supabase || normalized === session?.user.email?.toLowerCase()) { setMessage('Check that the new address is different from your current one.'); return; }
    setSaving(true); setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ email: normalized }, { emailRedirectTo: `${WEB_URL}/auth/callback` });
      if (error) { setMessage('We could not start the email change. Check the address and try again.'); return; }
      setNewEmail(''); setMessage('If the address can be used, Supabase sent confirmation instructions. Your current sign-in email stays active until you confirm.');
    } catch { setMessage('We could not start the email change. Check your connection and try again.'); }
    finally { setSaving(false); }
  }
  async function togglePush() {
    const next = !pushEnabled;
    if (next) {
      setMessage('DueDay sends general deadline reminders without titles or private notes.');
      const status = await requestAndRegisterPush();
      if (status !== 'Notifications are ready on this device.') { setPushEnabled(false); setMessage(status); return; }
    } else await unregisterPushToken();
    if (supabase && session) {
      const { error } = await supabase.from('notification_preferences').update({ push_enabled: next }).eq('owner_id', session.user.id);
      if (error) { setPushEnabled(!next); setMessage('We could not save this reminder preference. Try again.'); return; }
    }
    setPushEnabled(next); setMessage(next ? 'Push reminders are enabled on this device.' : 'Push reminders are off. In-app reminders stay available.');
  }
  async function toggleAllReminders() {
    const next = !notificationsEnabled;
    if (supabase && session) {
      const { error } = await supabase.from('notification_preferences').update({ enabled: next }).eq('owner_id', session.user.id);
      if (error) { setMessage('We could not save this reminder preference. Try again.'); return; }
    }
    setNotificationsEnabled(next);
    if (!next) await cancelAllLocalReminders();
    else if (supabase) {
      const { data } = await supabase.from('planner_items').select('*').eq('status', 'open');
      for (const item of (data ?? []) as PlannerItem[]) await scheduleLocalReminders(item);
    }
    setMessage(next ? 'Reminders are on.' : 'Reminders are off on this device.');
  }
  async function connectCalendar() {
    if (Platform.OS === 'web') { setMessage('Device calendar export is available in the iOS and Android apps. Your in-app calendar is available here.'); return; }
    showAlert('Enable device calendar export?', 'When you choose Add to device calendar on an item, your device opens an event editor for you to review. DueDay will not read or import calendar events.', [
      { text: 'Not now', style: 'cancel' }, { text: 'Enable export', onPress: () => { void AsyncStorage.setItem(CALENDAR_KEY, 'true').then(() => { setCalendarEnabled(true); setMessage('Calendar export is enabled for this device.'); }); } },
    ]);
  }
  async function disconnectCalendar() { await AsyncStorage.setItem(CALENDAR_KEY, 'false'); setCalendarEnabled(false); setMessage('Calendar export is disabled on this device.'); }
  async function exportData() {
    if (!supabase) return;
    setMessage('');
    const tables = ['profiles', 'academic_terms', 'courses', 'planner_items', 'planner_checklist_steps', 'applications', 'application_steps', 'notification_preferences', 'in_app_notifications'];
    const result = await Promise.all(tables.map(async (table) => {
      const { data, error } = await supabase!.from(table).select('*');
      if (error) throw new Error('Export failed');
      return [table, data];
    })).catch(() => null);
    if (!result) { setMessage('We could not export your data. Check your connection and try again.'); return; }
    const json = JSON.stringify({ exportedAt: new Date().toISOString(), data: Object.fromEntries(result) }, null, 2);
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'dueday-data.json';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Your data export has downloaded.');
      return;
    }
    await Share.share({ title: 'DueDay data export', message: json });
  }
  function deleteAccount() {
    showAlert('Delete your DueDay account?', 'This permanently deletes your planner, applications, checklist steps, and profile. You can export your data first in Settings.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Delete account', style: 'destructive', onPress: () => { void (async () => {
        if (!API_URL || !session) { setMessage('Account deletion needs EXPO_PUBLIC_API_URL configured.'); return; }
        setSaving(true);
        try {
          const response = await fetch(`${API_URL}/v1/account`, { method: 'DELETE', headers: { authorization: `Bearer ${session.access_token}` } });
          if (!response.ok) { setMessage('Account deletion could not be completed. Try again later.'); return; }
          await signOut(); router.replace('/auth/sign-in');
        } catch { setMessage('Account deletion could not be completed. Check your connection and try again.'); }
        finally { setSaving(false); }
      })(); } },
    ]);
  }
  async function signOutAction() { await unregisterPushToken(); await signOut(); router.replace('/auth/sign-in'); }
  async function openPage(path: string) { await Linking.openURL(`${WEB_URL}${path}`); }
  if (loading) return <Screen><Loading /></Screen>;
  return <Screen><View style={{ gap: 16 }}><Eyebrow>YOUR ACCOUNT</Eyebrow><Heading subtitle="Your school details and notification preferences." >Settings</Heading>
    <Card><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>Profile</Text><Text style={ui.small}>Signed in as {session?.user.email ?? ''}</Text><Field label="Name" value={name} onChangeText={setName} placeholder="Your name" /><Field label="Time zone" value={timezone} onChangeText={setTimezone} autoCapitalize="none" placeholder="America/Chicago" /><Field label="Week starts on" value={week} onChangeText={setWeek} keyboardType="number-pad" hint="0 = Sunday, 1 = Monday" /><Field label="School (optional)" value={school} onChangeText={setSchool} placeholder="School or campus" /><Field label="Current term (optional)" value={term} onChangeText={setTerm} placeholder="Fall 2026" /></Card>
    <Card><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>Change sign-in email</Text><Text style={ui.small}>Your current address stays active until you confirm the new one.</Text><Field label="New email address" value={newEmail} onChangeText={setNewEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" /><Button title="Send confirmation" variant="secondary" onPress={() => void requestEmailChange()} disabled={saving} /></Card>
    <Card><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>Reminders</Text><Text style={ui.small}>Push text stays general and won’t include deadline titles or notes. Push preference applies to every registered device on this account. We ask for access only when you turn push on. A device reminder may be delayed by the operating system.</Text><Button title={`${notificationsEnabled ? '✓' : '○'}  ${notificationsEnabled ? 'Reminders on' : 'Reminders off'}`} variant="secondary" onPress={() => void toggleAllReminders()} />{Platform.OS === 'web' ? <Text style={ui.small}>Device push is available in the iOS and Android apps. In-app reminders remain available in this browser.</Text> : <Button title={`${pushEnabled ? '✓' : '○'}  ${pushEnabled ? 'Push on for this account' : 'Push off'}`} variant="secondary" onPress={() => void togglePush()} />}<Pressable accessibilityRole="checkbox" accessibilityState={{ checked: quietEnabled }} onPress={() => setQuietEnabled((value) => !value)} style={[ui.row, { justifyContent: 'flex-start' }]}><Text style={{ color: colors.green, fontSize: 18 }}>{quietEnabled ? '☑' : '□'}</Text><Text style={{ color: colors.ink, fontWeight: '700' }}>Quiet hours</Text></Pressable>{quietEnabled ? <View style={ui.row}><View style={{ flex: 1 }}><Field label="Quiet starts" value={quietStart} onChangeText={setQuietStart} placeholder="22:00" /></View><View style={{ flex: 1 }}><Field label="Quiet ends" value={quietEnd} onChangeText={setQuietEnd} placeholder="08:00" /></View></View> : null}</Card>
    <Card><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>Device calendar</Text><Text style={ui.small}>The in-app calendar works on its own. Enable export to open the device event editor only for deadlines you choose. DueDay does not read your personal calendar.</Text>{Platform.OS === 'web' ? <Text style={ui.small}>Device calendar export is available in the iOS and Android apps. The in-app planner works in this browser.</Text> : <Button title={calendarEnabled ? 'Disable device calendar export' : 'Enable device calendar export'} variant="secondary" onPress={() => void (calendarEnabled ? disconnectCalendar() : connectCalendar())} />}</Card>
    <Card><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>Your data</Text><Button title="Export my data" variant="secondary" onPress={() => void exportData()} /><Button title="Privacy policy" variant="quiet" onPress={() => void openPage('/privacy')} /><Button title="Terms of service" variant="quiet" onPress={() => void openPage('/terms')} /><Button title="Account deletion information" variant="quiet" onPress={() => void openPage('/account-deletion')} /></Card>
    {message ? <Text accessibilityRole="status" style={{ color: message.includes('could not') || message.includes('failed') || message.includes('Check') || message.includes('Enter') ? colors.red : colors.green }}>{message}</Text> : null}<Button title={saving ? 'Saving…' : 'Save settings'} onPress={() => void saveProfile()} disabled={saving} /><Button title="Sign out" variant="quiet" onPress={() => void signOutAction()} /><Button title="Delete account" variant="danger" onPress={deleteAccount} />
  </View></Screen>;
}
