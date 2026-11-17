import React, { useCallback, useState } from 'react';
import { Pressable, Text, View , useColorScheme} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Button, Card, Eyebrow, Heading, Loading, Screen, colors, ui } from '../components/ui';
import { supabase } from '../lib/supabase';

interface InAppNotification { id: string; item_id: string | null; title: string; body: string; read_at: string | null; created_at: string }
export default function NotificationsList() {
  useColorScheme();
  const [entries, setEntries] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const { data, error: queryError } = await supabase.from('in_app_notifications').select('*').order('created_at', { ascending: false }).limit(100);
    if (queryError) setError('Notifications could not be loaded.'); else setEntries((data ?? []) as InAppNotification[]);
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  async function open(entry: InAppNotification) {
    if (entry.read_at === null && supabase) {
      await supabase.from('in_app_notifications').update({ read_at: new Date().toISOString() }).eq('id', entry.id);
      setEntries((all) => all.map((item) => item.id === entry.id ? { ...item, read_at: new Date().toISOString() } : item));
    }
    if (entry.item_id) router.push({ pathname: '/item/[id]', params: { id: entry.item_id } });
  }
  async function markAllRead() {
    const unread = entries.filter((entry) => !entry.read_at);
    if (supabase && unread.length) await supabase.from('in_app_notifications').update({ read_at: new Date().toISOString() }).in('id', unread.map((entry) => entry.id));
    setEntries((all) => all.map((entry) => ({ ...entry, read_at: entry.read_at ?? new Date().toISOString() })));
  }
  return <Screen><View style={{ gap: 15 }}><Pressable accessibilityRole="button" onPress={() => router.back()} style={{ paddingVertical: 4 }}><Text style={ui.action}>‹  Back</Text></Pressable><Eyebrow>YOUR INBOX</Eyebrow><Heading subtitle="A private in-app fallback for deadline reminders.">Notifications</Heading>{entries.some((entry) => !entry.read_at) ? <Button title="Mark all as read" variant="quiet" onPress={() => void markAllRead()} /> : null}{loading ? <Loading /> : error ? <Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text> : entries.length ? entries.map((entry) => <Pressable key={entry.id} accessibilityRole="button" onPress={() => void open(entry)}><Card style={{ borderColor: entry.read_at ? colors.line : colors.green, backgroundColor: entry.read_at ? colors.card : colors.soft }}><View style={ui.row}><Text style={{ flex: 1, color: colors.ink, fontWeight: '800' }}>{entry.title}</Text>{!entry.read_at ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green }} /> : null}</View><Text style={ui.body}>{entry.body}</Text><Text style={ui.small}>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(entry.created_at))}</Text></Card></Pressable>) : <Card><Text style={{ color: colors.ink, fontWeight: '800' }}>You’re all caught up</Text><Text style={ui.small}>When a deadline reminder is due, you’ll see it here.</Text></Card>}</View></Screen>;
}
