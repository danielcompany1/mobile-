import React, { useEffect, useState } from 'react';
import { Pressable, Text, View , useColorScheme} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Button, Card, Eyebrow, Heading, Loading, Screen, colors, ui } from '../../components/ui';
import { ItemCard } from '../../components/ItemCard';
import { useAuth } from '../../lib/auth';
import { usePlannerItems } from '../../hooks/usePlannerItems';
import { supabase } from '../../lib/supabase';
import { cancelAllLocalReminders, scheduleLocalReminders } from '../../lib/notifications';
import { deadlineState, localDateAt, weeklyOccurrences } from '@dueday/shared';

export default function Today() {
  useColorScheme();
  const { session } = useAuth();
  const { items, setItems, loading, offline, error, refresh } = usePlannerItems();
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  useFocusEffect(React.useCallback(() => {
    if (session && supabase) supabase.from('profiles').select('full_name,timezone').eq('id', session.user.id).maybeSingle().then(({ data }) => { setName(data?.full_name ?? ''); if (data?.timezone) setTimezone(data.timezone); });
  }, [session?.user.id]));
  const todayDate = localDateAt(new Date(), timezone);
  const recurring = weeklyOccurrences(items.filter((item) => item.recurrence_rule), todayDate, new Date(Date.parse(`${todayDate}T00:00:00Z`) + 112 * 86_400_000).toISOString().slice(0, 10));
  const visibleItems = [...items.filter((item) => !item.recurrence_rule), ...recurring];
  const overdue = visibleItems.filter((item) => item.status === 'open' && deadlineState(item.due_on, new Date(), timezone) === 'overdue');
  const today = visibleItems.filter((item) => item.status === 'open' && deadlineState(item.due_on, new Date(), timezone) === 'today');
  const upcoming = visibleItems.filter((item) => item.status === 'open' && deadlineState(item.due_on, new Date(), timezone) === 'upcoming').slice(0, 3);
  async function complete(itemId: string) {
    if (!supabase) return;
    const { error: saveError } = await supabase.from('planner_items').update({ status: 'completed' }).eq('id', itemId);
    if (saveError) return;
    setItems((current) => current.map((item) => item.id === itemId ? { ...item, status: 'completed' } : item));
    const item = items.find((entry) => entry.id === itemId); if (item) await scheduleLocalReminders({ ...item, status: 'completed' });
  }
  useEffect(() => { if (offline) void refresh(); }, []);
  if (loading) return <Screen><Loading /></Screen>;
  return <Screen><View style={{ gap: 18 }}>
    <View style={ui.row}><View><Eyebrow>{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone }).format(new Date())}</Eyebrow><Heading subtitle={name ? `Good to see you, ${name.split(' ')[0]}.` : 'A clear view of what needs your attention.'}>Today, at a glance</Heading></View><Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push('/notifications')} style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>♧</Text></Pressable></View>
    {offline ? <Card style={{ backgroundColor: colors.soft }}><Text style={{ color: colors.ink }}>You’re offline. Showing your last saved planner view.</Text></Card> : null}
    {error ? <Card><Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text><Button title="Try again" onPress={() => void refresh()} variant="secondary" /></Card> : null}
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary, padding: 20 }}><Text style={{ color: '#DAEAD8', fontSize: 13, fontWeight: '700' }}>YOUR NEXT SMALL STEP</Text><Text style={{ color: '#FFFFFF', fontSize: 21, lineHeight: 27, fontWeight: '800' }}>{overdue.length ? `${overdue.length} deadline${overdue.length > 1 ? 's' : ''} need a quick look` : today.length ? today[0]!.title : upcoming[0] ? upcoming[0].title : 'Add a deadline to get started'}</Text><Button title={items.length ? 'Open planner' : 'Add your first deadline'} variant="secondary" onPress={() => items.length ? router.push('/(tabs)/planner') : router.push('/item/new')} />
    </Card>
    {overdue.length > 0 ? <View style={ui.section}><View style={ui.row}><Text style={{ color: colors.ink, fontSize: 18, fontWeight: '800' }}>Overdue</Text><Text style={{ color: colors.red, fontWeight: '800' }}>{overdue.length}</Text></View>{overdue.map((item) => <ItemCard key={item.id} item={item} timezone={timezone} onComplete={(entry) => void complete(entry.id)} />)}</View> : null}
    <View style={ui.section}><View style={ui.row}><Text style={{ color: colors.ink, fontSize: 18, fontWeight: '800' }}>Due today</Text><Text style={ui.small}>{today.length ? `${today.length} item${today.length === 1 ? '' : 's'}` : 'All clear'}</Text></View>{today.length ? today.map((item) => <ItemCard key={item.id} item={item} timezone={timezone} onComplete={(entry) => void complete(entry.id)} />) : <Card><Text style={{ color: colors.ink, fontWeight: '700' }}>Nothing due today</Text><Text style={ui.small}>A little breathing room is good. Add a task whenever you need to.</Text></Card>}</View>
    <View style={ui.section}><View style={ui.row}><Text style={{ color: colors.ink, fontSize: 18, fontWeight: '800' }}>Coming up</Text><Text accessibilityRole="button" onPress={() => router.push('/(tabs)/planner')} style={ui.action}>View planner  →</Text></View>{upcoming.length ? upcoming.map((item) => <ItemCard key={item.id} item={item} timezone={timezone} />) : <Card><Text style={{ color: colors.ink, fontWeight: '700' }}>{items.length ? 'No upcoming deadlines' : 'Your planner starts here'}</Text><Text style={ui.small}>{items.length ? 'You’re caught up for now.' : 'Keep assignments, fees, exams, and applications together.'}</Text></Card>}</View>
    <Button title="＋  Add deadline" onPress={() => router.push('/item/new')} />
  </View></Screen>;
}
