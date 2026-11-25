import React, { useState } from 'react';
import { Pressable, Text, View, useColorScheme } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Button, Card, EmptyState, Eyebrow, Fab, Icon, IconButton, Loading, Screen, SectionHeader, colors, tap } from '../../components/ui';
import { ItemCard } from '../../components/ItemCard';
import { useAuth } from '../../lib/auth';
import { usePlannerItems } from '../../hooks/usePlannerItems';
import { supabase } from '../../lib/supabase';
import { scheduleLocalReminders } from '../../lib/notifications';
import { deadlineState, localDateAt, weeklyOccurrences } from '@dueday/shared';

function greeting(timezone: string) {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: timezone }).format(new Date()));
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

function Stat({ value, label, tone, onPress }: { value: number; label: string; tone: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${value} ${label}`} onPress={() => { tap(); onPress(); }}
    style={({ pressed }) => [{ flex: 1, backgroundColor: colors.overlay, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12, gap: 2, opacity: pressed ? 0.8 : 1 }]}>
    <Text style={{ color: tone, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>{value}</Text>
    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' }}>{label}</Text>
  </Pressable>;
}

export default function Today() {
  useColorScheme();
  const { session } = useAuth();
  const { items, setItems, loading, offline, error, refresh } = usePlannerItems();
  const [name, setName] = useState('');
  const [unread, setUnread] = useState(false);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  useFocusEffect(React.useCallback(() => {
    if (!session || !supabase) return;
    supabase.from('profiles').select('full_name,timezone').eq('id', session.user.id).maybeSingle().then(({ data }) => { setName(data?.full_name ?? ''); if (data?.timezone) setTimezone(data.timezone); });
    supabase.from('in_app_notifications').select('id', { count: 'exact', head: true }).is('read_at', null).then(({ count }) => setUnread(Boolean(count)));
  }, [session?.user.id]));
  const todayDate = localDateAt(new Date(), timezone);
  const recurring = weeklyOccurrences(items.filter((item) => item.recurrence_rule), todayDate, new Date(Date.parse(`${todayDate}T00:00:00Z`) + 112 * 86_400_000).toISOString().slice(0, 10));
  const visibleItems = [...items.filter((item) => !item.recurrence_rule), ...recurring];
  const open = visibleItems.filter((item) => item.status === 'open');
  const overdue = open.filter((item) => deadlineState(item.due_on, new Date(), timezone) === 'overdue');
  const today = open.filter((item) => deadlineState(item.due_on, new Date(), timezone) === 'today');
  const allUpcoming = open.filter((item) => deadlineState(item.due_on, new Date(), timezone) === 'upcoming');
  const upcoming = allUpcoming.slice(0, 3);
  async function complete(itemId: string) {
    if (!supabase) return;
    const { error: saveError } = await supabase.from('planner_items').update({ status: 'completed' }).eq('id', itemId);
    if (saveError) return;
    setItems((current) => current.map((item) => item.id === itemId ? { ...item, status: 'completed' } : item));
    const item = items.find((entry) => entry.id === itemId); if (item) await scheduleLocalReminders({ ...item, status: 'completed' });
  }
  if (loading) return <Screen><Loading /></Screen>;

  const firstName = name.split(' ')[0];
  const focus = overdue[0] ?? today[0] ?? upcoming[0];
  const headline = overdue.length
    ? `${overdue.length} overdue ${overdue.length > 1 ? 'deadlines need' : 'deadline needs'} your attention`
    : today.length ? `${today.length} thing${today.length > 1 ? 's' : ''} due today`
    : upcoming.length ? 'You’re all caught up for today'
    : items.length ? 'Nothing on your plate. Enjoy it.' : 'Let’s add your first deadline';

  return <Screen overlay={<Fab accessibilityLabel="Add deadline" onPress={() => router.push('/item/new')} />}>
    <View style={{ gap: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Eyebrow>{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone }).format(new Date())}</Eyebrow>
          <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8 }}>{greeting(timezone)}{firstName ? `,\n${firstName}` : ''}</Text>
        </View>
        <IconButton icon="notifications-outline" accessibilityLabel={unread ? 'Notifications, unread' : 'Notifications'} badge={unread} onPress={() => router.push('/notifications')} />
      </View>

      {offline ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.amberSoft, borderRadius: 14, padding: 12 }}><Icon name="cloud-offline-outline" size={18} color={colors.amber} /><Text style={{ color: colors.ink, flex: 1, fontSize: 14 }}>You’re offline. Showing your last saved planner.</Text></View> : null}
      {error ? <Card><Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text><Button title="Try again" icon="refresh" onPress={() => void refresh()} variant="secondary" /></Card> : null}

      <View style={{ backgroundColor: colors.primary, borderRadius: 26, padding: 20, gap: 16, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: colors.overlay }} />
        <View style={{ position: 'absolute', right: 30, top: 60, width: 70, height: 70, borderRadius: 35, backgroundColor: colors.overlay }} />
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="sparkles" size={14} color={colors.lime} /><Text style={{ color: colors.lime, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}>YOUR DAY</Text></View>
          <Text style={{ color: '#FFFFFF', fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.4 }}>{headline}</Text>
          {focus ? <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>Next up: {focus.title}</Text> : null}
        </View>
        {items.length ? <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat value={overdue.length} label="Overdue" tone={overdue.length ? '#FFB4A3' : '#FFFFFF'} onPress={() => router.push('/(tabs)/planner')} />
          <Stat value={today.length} label="Today" tone="#FFFFFF" onPress={() => router.push('/(tabs)/planner')} />
          <Stat value={allUpcoming.length} label="Upcoming" tone={colors.lime} onPress={() => router.push('/(tabs)/planner')} />
        </View> : <Pressable accessibilityRole="button" onPress={() => { tap('medium'); router.push('/item/new'); }} style={({ pressed }) => [{ backgroundColor: colors.lime, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.85 : 1 }]}>
          <Icon name="add-circle" size={20} color="#1F4D36" /><Text style={{ color: '#1F4D36', fontWeight: '700', fontSize: 16 }}>Add your first deadline</Text>
        </Pressable>}
      </View>

      {overdue.length > 0 ? <View style={{ gap: 10, marginTop: 6 }}>
        <SectionHeader title="Overdue" count={overdue.length} />
        {overdue.map((item) => <ItemCard key={`${item.id}-${item.due_on}`} item={item} timezone={timezone} onComplete={(entry) => void complete(entry.id)} />)}
      </View> : null}

      <View style={{ gap: 10, marginTop: 6 }}>
        <SectionHeader title="Due today" count={today.length || undefined} />
        {today.length ? today.map((item) => <ItemCard key={`${item.id}-${item.due_on}`} item={item} timezone={timezone} onComplete={(entry) => void complete(entry.id)} />)
          : <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}><View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}><Icon name="checkmark-done" size={22} color={colors.green} /></View><View style={{ flex: 1, gap: 2 }}><Text style={{ color: colors.ink, fontWeight: '600', fontSize: 16 }}>Nothing due today</Text><Text style={{ color: colors.muted, fontSize: 13 }}>Enjoy the breathing room.</Text></View></Card>}
      </View>

      <View style={{ gap: 10, marginTop: 6 }}>
        <SectionHeader title="Coming up" action="See all" onAction={() => router.push('/(tabs)/planner')} />
        {upcoming.length ? upcoming.map((item) => <ItemCard key={`${item.id}-${item.due_on}`} item={item} timezone={timezone} />)
          : <EmptyState icon={items.length ? 'leaf-outline' : 'calendar-clear-outline'} title={items.length ? 'No upcoming deadlines' : 'Your planner starts here'} body={items.length ? 'You’re caught up for now.' : 'Keep assignments, fees, exams, and applications together in one place.'} />}
      </View>
    </View>
  </Screen>;
}
