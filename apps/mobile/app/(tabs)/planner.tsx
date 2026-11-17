import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View , useColorScheme} from 'react-native';
import { router } from 'expo-router';
import { CATEGORY_LABELS, ITEM_CATEGORIES, localDateAt, weeklyOccurrences, type ItemCategory } from '@dueday/shared';
import { Button, Card, Eyebrow, Heading, Loading, Screen, colors, ui } from '../../components/ui';
import { ItemCard } from '../../components/ItemCard';
import { usePlannerItems } from '../../hooks/usePlannerItems';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

const monthStamp = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
const dateStamp = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
function shiftMonth(month: Date, amount: number) { return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + amount, 1)); }

export default function Planner() {
  useColorScheme();
  const { session } = useAuth();
  const { items, loading, offline, refresh } = usePlannerItems();
  const [month, setMonth] = useState(() => new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [selected, setSelected] = useState(dateStamp(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))));
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [category, setCategory] = useState<ItemCategory | 'all'>('all');
  const [weekStart, setWeekStart] = useState(1);
  useEffect(() => {
    if (session && supabase) supabase.from('profiles').select('week_starts_on,timezone').eq('id', session.user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setWeekStart(data.week_starts_on ?? 1);
      if (data.timezone) {
        const today = localDateAt(new Date(), data.timezone);
        setSelected(today);
        setMonth(new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1)));
      }
    });
  }, [session?.user.id]);
  const stamp = monthStamp(month);
  const monthStart = `${stamp}-01`;
  const monthEnd = dateStamp(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)));
  const filtered = weeklyOccurrences(items, monthStart, monthEnd).filter((item) => category === 'all' || item.category === category);
  const eventDays = useMemo(() => new Set(filtered.map((item) => item.due_on)), [filtered]);
  const monthCells = useMemo(() => {
    const start = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
    const offset = (start.getUTCDay() - weekStart + 7) % 7;
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1 - offset + index));
      return { date: dateStamp(date), day: date.getUTCDate(), current: date.getUTCMonth() === month.getUTCMonth() };
    });
  }, [month, weekStart]);
  const weekdayNames = ['S','M','T','W','T','F','S'];
  const weekdays = [...weekdayNames.slice(weekStart), ...weekdayNames.slice(0, weekStart)];
  const visible = view === 'agenda' ? filtered : filtered.filter((item) => item.due_on === selected);
  return <Screen><View style={{ gap: 16 }}>
    <View style={ui.row}><View><Eyebrow>YOUR DEADLINES</Eyebrow><Heading subtitle="See the month, then focus on one day.">Planner</Heading></View><Button title="＋ Add" onPress={() => router.push('/item/new')} /></View>
    {offline ? <Text style={{ color: colors.muted }}>Offline · showing saved planner data</Text> : null}
    <View style={[ui.row, { justifyContent: 'flex-start' }]}>{(['month', 'agenda'] as const).map((option) => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: view === option }} onPress={() => setView(option)} style={{ paddingVertical: 9, paddingHorizontal: 15, borderRadius: 13, backgroundColor: view === option ? colors.green : colors.soft }}><Text style={{ color: view === option ? '#FFFFFF' : colors.green, fontWeight: '700' }}>{option === 'month' ? 'Month' : 'Agenda'}</Text></Pressable>)}</View>
    <View style={ui.wrap}>{(['all', ...ITEM_CATEGORIES] as const).map((entry) => <Pressable key={entry} accessibilityRole="button" accessibilityState={{ selected: category === entry }} onPress={() => setCategory(entry)} style={{ borderRadius: 20, borderWidth: 1, borderColor: category === entry ? colors.green : colors.line, backgroundColor: category === entry ? colors.soft : colors.card, paddingVertical: 7, paddingHorizontal: 11 }}><Text style={{ color: category === entry ? colors.green : colors.muted, fontSize: 12, fontWeight: '700' }}>{entry === 'all' ? 'All' : CATEGORY_LABELS[entry]}</Text></Pressable>)}</View>
    {view === 'month' ? <Card style={{ padding: 13, gap: 13 }}><View style={ui.row}><Pressable accessibilityLabel="Previous month" onPress={() => setMonth((value) => shiftMonth(value, -1))} style={{ padding: 9 }}><Text style={ui.action}>‹</Text></Pressable><Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 17, fontWeight: '800' }}>{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(month)}</Text><Pressable accessibilityLabel="Next month" onPress={() => setMonth((value) => shiftMonth(value, 1))} style={{ padding: 9 }}><Text style={ui.action}>›</Text></Pressable></View>
      <View style={{ flexDirection: 'row' }}>{weekdays.map((day, index) => <Text key={`${day}-${index}`} style={{ width: `${100 / 7}%`, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '700', paddingVertical: 6 }}>{day}</Text>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{monthCells.map((cell) => <Pressable key={cell.date} accessibilityRole="button" accessibilityLabel={`${cell.date}${eventDays.has(cell.date) ? ', has deadlines' : ''}`} accessibilityState={{ selected: cell.date === selected }} onPress={() => { setSelected(cell.date); if (!cell.current) setMonth(new Date(Date.UTC(Number(cell.date.slice(0, 4)), Number(cell.date.slice(5, 7)) - 1, 1))); }} style={{ width: `${100 / 7}%`, height: 46, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: cell.date === selected ? colors.green : 'transparent' }}><Text style={{ color: cell.date === selected ? '#FFFFFF' : cell.current ? colors.ink : colors.muted, fontWeight: cell.date === selected ? '800' : '500' }}>{cell.day}</Text></View>{eventDays.has(cell.date) ? <View style={{ position: 'absolute', bottom: 1, width: 4, height: 4, borderRadius: 2, backgroundColor: cell.date === selected ? colors.lime : colors.green }} /> : null}</Pressable>)}</View>
    </Card> : <View style={ui.row}><Pressable accessibilityLabel="Previous month" onPress={() => setMonth((value) => shiftMonth(value, -1))}><Text style={ui.action}>‹ Previous</Text></Pressable><Text style={{ fontWeight: '800', color: colors.ink }}>{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(month)}</Text><Pressable accessibilityLabel="Next month" onPress={() => setMonth((value) => shiftMonth(value, 1))}><Text style={ui.action}>Next ›</Text></Pressable></View>}
    {loading ? <Loading /> : visible.length ? <View style={ui.section}>{view === 'month' ? <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800' }}>{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${selected}T00:00:00Z`))}</Text> : null}{visible.map((item) => <ItemCard key={`${item.id}-${item.due_on}`} item={item} />)}</View> : <Card><Text style={{ fontWeight: '800', color: colors.ink }}>{items.length ? view === 'month' ? 'No deadlines on this date' : 'No deadlines this month' : 'Your calendar is open'}</Text><Text style={ui.small}>{items.length ? 'Choose another day or adjust the category filters.' : 'Your in-app calendar works without connecting your phone calendar.'}</Text><Button title={items.length ? 'Show all categories' : 'Add a deadline'} variant="secondary" onPress={() => items.length ? setCategory('all') : router.push('/item/new')} /></Card>}
    {!loading && !visible.length && items.length ? <Button title="Refresh planner" variant="quiet" onPress={() => void refresh()} /> : null}
  </View></Screen>;
}
