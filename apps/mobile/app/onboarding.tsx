import React, { useState } from 'react';
import { Platform, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Eyebrow, Field, Screen, colors, ui } from '../components/ui';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { PUSH_READY_MESSAGE, requestAndRegisterPush } from '../lib/notifications';
import { isValidTimeZone } from '@dueday/shared';

export default function Onboarding() {
  useColorScheme();
  const { session, signOut } = useAuth();
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [school, setSchool] = useState('');
  const [term, setTerm] = useState('');
  const [week, setWeek] = useState('1');
  const [busy, setBusy] = useState(false);
  const [message, setMessageState] = useState({ text: '', error: false });
  const setMessage = (text: string) => setMessageState({ text, error: false });
  const setFailure = (text: string) => setMessageState({ text, error: true });
  async function continueToApp() {
    if (!name.trim()) { setFailure('Add your name to finish setup.'); return; }
    if (!['0', '1'].includes(week.trim())) { setFailure('Enter 1 for Monday or 0 for Sunday as your week start.'); return; }
    if (!isValidTimeZone(timezone.trim() || 'UTC')) { setFailure('Enter a valid time zone, such as America/Chicago.'); return; }
    if (!supabase || !session) { setFailure('Sign in again to continue.'); return; }
    setBusy(true); setMessage('');
    const { error } = await supabase.from('profiles').upsert({ id: session.user.id, full_name: name.trim(), timezone: timezone.trim() || 'UTC', school: school.trim() || null, current_term: term.trim() || null, week_starts_on: Number(week.trim()) }, { onConflict: 'id' });
    setBusy(false);
    if (error) { setFailure('We could not save your profile yet. Check your connection and try again.'); return; }
    router.replace('/(tabs)/today');
  }
  async function enableReminders() {
    const status = await requestAndRegisterPush();
    if (status !== PUSH_READY_MESSAGE) { setFailure(status); return; }
    if (session && supabase) {
      const { error } = await supabase.from('notification_preferences').update({ push_enabled: true }).eq('owner_id', session.user.id);
      if (error) { setFailure('This device is registered, but the push preference could not be saved. Try again in Settings.'); return; }
    }
    setMessage(status);
  }
  return <Screen><View style={{ gap: 20 }}><View><Eyebrow>One quick setup</Eyebrow><Text accessibilityRole="header" style={{ color: colors.ink, fontWeight: '800', fontSize: 32 }}>Make it yours</Text><Text style={[ui.body, { color: colors.muted, marginTop: 7 }]}>Your time zone keeps due times and reminders in the right place.</Text></View>
    <Card><Field label="Your name" value={name} onChangeText={setName} placeholder="First name" autoComplete="given-name" /><Field label="Time zone" value={timezone} onChangeText={setTimezone} placeholder="America/Chicago" autoCapitalize="none" /><Field label="Week starts on" value={week} onChangeText={setWeek} placeholder="1 = Monday, 0 = Sunday" keyboardType="number-pad" hint="Enter 1 for Monday or 0 for Sunday." /><Field label="School (optional)" value={school} onChangeText={setSchool} placeholder="School or campus" /><Field label="Current term (optional)" value={term} onChangeText={setTerm} placeholder="Fall 2026" />
    </Card>
    <Card style={{ backgroundColor: colors.soft }}><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>A timely nudge, when you want one</Text>{Platform.OS === 'web' ? <Text style={ui.body}>Your reminders appear inside DueDay. Device notifications are available in the iOS and Android apps.</Text> : <><Text style={ui.body}>DueDay can show reminders on this device and send push alerts. You can keep everything in the app if you prefer. We’ll ask for notification access only if you choose to turn it on.</Text><Button title="Enable reminders" onPress={() => void enableReminders()} variant="secondary" /></>}</Card>
    {message.text ? <Text accessibilityRole={message.error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={{ color: message.error ? colors.red : colors.green }}>{message.text}</Text> : null}
    <Button title={busy ? 'Saving…' : 'Continue to DueDay'} onPress={() => void continueToApp()} disabled={busy} />
    <Text accessibilityRole="button" onPress={() => void signOut()} style={{ textAlign: 'center', color: colors.muted, padding: 8 }}>Sign out</Text>
  </View></Screen>;
}
