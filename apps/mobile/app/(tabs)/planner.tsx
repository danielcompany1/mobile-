import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { CATEGORY_LABELS, ITEM_CATEGORIES, localDateAt, weeklyOccurrences, type ItemCategory } from '@dueday/shared';
import { Button, Card, Chip, EmptyState, Eyebrow, Fab, Heading, Icon, Loading, Screen, Segmented, categoryTone, colors, tap } from '../../components/ui';
import { ItemCard } from '../../components/ItemCard';
import { usePlannerItems } from '../../hooks/usePlannerItems';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

const monthStamp = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
const dateStamp = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
function shiftMonth(month: Date, amount: number) { return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + amount, 1)); }

const SHORT_LABELS: Record<ItemCategory, string> = { assignment: 'Assignments', exam: 'Exams', school_event: 'Events', fee: 'Fees', scholarship: 'Scholarships', internship_job: 'Jobs', personal: 'Personal' };

export default function Planner() {
  useColorScheme();
  const { session } = useAuth();
  const { items, loading, offline, refresh } = usePlannerItems();
  const [month, setMonth] = useState(() => new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [todayStamp, setTodayStamp] = useState(dateStamp(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))));
  const [selected, setSelected] = useState(todayStamp);
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [category, setCategory] = useState<ItemCategory | 'all'>('all');
  const [weekStart, setWeekStart] = useState(1);
  useEffect(() => {
    if (session && supabase) supabase.from('profiles').select('week_starts_on,timezone').eq('id', session.user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setWeekStart(data.week_starts_on ?? 1);
      if (data.timezone) {
        const today = localDateAt(new Date(), data.timezone);
        setTodayStamp(today);
        setSelected(today);
        setMonth(new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1)));
      }
    });
  }, [session?.user.id]);
  const stamp = monthStamp(month);
  const monthStart = `${stamp}-01`;
  const monthEnd = dateStamp(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)));
  const filtered = weeklyOccurrences(items, monthStart, monthEnd).filter((item) => category === 'all' || item.category === category);
  const eventDays = useMemo(() => {
    const map = new Map<string, ItemCategory[]>();
    for (const item of filtered) map.set(item.due_on, [...(map.get(item.due_on) ?? []), item.category]);
    return map;
  }, [filtered]);
  const monthCells = useMemo(() => {
    const start = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
    const offset = (start.getUTCDay() - weekStart + 7) % 7;
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1 - offset + index));
      return { date: dateStamp(date), day: date.getUTCDate(), current: date.getUTCMonth() === month.getUTCMonth() };
    });
  }, [month, weekStart]);
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdays = [...weekdayNames.slice(weekStart), ...weekdayNames.slice(0, weekStart)];
  const visible = view === 'agenda' ? filtered : filtered.filter((item) => item.due_on === selected);
  const monthTitle = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(month);
  const goToday = () => { setSelected(todayStamp); setMonth(new Date(Date.UTC(Number(todayStamp.slice(0, 4)), Number(todayStamp.slice(5, 7)) - 1, 1))); };

  const monthNav = <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
    <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 }}>{monthTitle}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {selected !== todayStamp || monthStamp(month) !== todayStamp.slice(0, 7) ? <Pressable accessibilityRole="button" onPress={() => { tap(); goToday(); }} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.soft, marginRight: 4 }}><Text style={{ color: colors.accent, fontWeight: '600', fontSize: 13 }}>Today</Text></Pressable> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={6} onPress={() => { tap(); setMonth((value) => shiftMonth(value, -1)); }} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}><Icon name="chevron-back" size={20} color={colors.ink} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={6} onPress={() => { tap(); setMonth((value) => shiftMonth(value, 1)); }} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}><Icon name="chevron-forward" size={20} color={colors.ink} /></Pressable>
    </View>
  </View>;

  return <Screen overlay={<Fab accessibilityLabel="Add deadline" onPress={() => router.push('/item/new')} />}><View style={{ gap: 16 }}>
    <View><Eyebrow>Your deadlines</Eyebrow><Heading>Planner</Heading></View>
    {offline ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="cloud-offline-outline" size={15} color={colors.muted} /><Text style={{ color: colors.muted, fontSize: 13 }}>Offline · showing saved planner data</Text></View> : null}
    <Segmented value={view} onChange={setView} options={[{ value: 'month', label: 'Month' }, { value: 'agenda', label: 'Agenda' }]} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
      <Chip label="All" selected={category === 'all'} onPress={() => setCategory('all')} />
      {ITEM_CATEGORIES.map((entry) => <Chip key={entry} label={SHORT_LABELS[entry]} icon={categoryTone(entry).icon} selected={category === entry} onPress={() => setCategory(entry)} />)}
    </ScrollView>

    {view === 'month' ? <Card style={{ padding: 14, gap: 8 }}>
      {monthNav}
      <View style={{ flexDirection: 'row', marginTop: 4 }}>{weekdays.map((day, index) => <Text key={`${day}-${index}`} style={{ width: `${100 / 7}%`, textAlign: 'center', color: colors.faint, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>{day}</Text>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{monthCells.map((cell) => {
        const isSelected = cell.date === selected;
        const isToday = cell.date === todayStamp;
        const dots = eventDays.get(cell.date) ?? [];
        return <Pressable key={cell.date} accessibilityRole="button" accessibilityLabel={`${cell.date}${dots.length ? `, ${dots.length} deadline${dots.length > 1 ? 's' : ''}` : ''}`} accessibilityState={{ selected: isSelected }}
          onPress={() => { tap(); setSelected(cell.date); if (!cell.current) setMonth(new Date(Date.UTC(Number(cell.date.slice(0, 4)), Number(cell.date.slice(5, 7)) - 1, 1))); }}
          style={{ width: `${100 / 7}%`, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: isSelected ? colors.ink : 'transparent', borderWidth: isToday && !isSelected ? 1.5 : 0, borderColor: colors.accent }}>
            <Text style={{ color: isSelected ? colors.canvas : isToday ? colors.accent : cell.current ? colors.ink : colors.faint, fontWeight: isSelected || isToday ? '700' : '500', fontSize: 15 }}>{cell.day}</Text>
          </View>
          {dots.length ? <View style={{ position: 'absolute', bottom: 2, flexDirection: 'row', gap: 2 }}>{[...new Set(dots)].slice(0, 3).map((c) => <View key={c} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: categoryTone(c).fg }} />)}</View> : null}
        </Pressable>;
      })}</View>
    </Card> : <View style={{ paddingHorizontal: 2 }}>{monthNav}</View>}

    {loading ? <Loading /> : visible.length ? <View style={{ gap: 10, marginTop: 4 }}>
      {view === 'month' ? <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '700' }}>{selected === todayStamp ? 'Today' : new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${selected}T00:00:00Z`))}</Text> : null}
      {visible.map((item) => <ItemCard key={`${item.id}-${item.due_on}`} item={item} />)}
    </View> : <EmptyState icon={items.length ? 'calendar-clear-outline' : 'calendar-outline'}
      title={items.length ? view === 'month' ? 'Nothing on this day' : 'No deadlines this month' : 'Your calendar is open'}
      body={items.length ? 'Pick another day or change the filter.' : 'Add a deadline and it shows up here automatically.'}
      action={items.length ? (category !== 'all' ? 'Show all categories' : undefined) : 'Add a deadline'}
      onAction={() => items.length ? setCategory('all') : router.push('/item/new')} />}
    {!loading && !visible.length && items.length ? <Button title="Refresh" icon="refresh" variant="quiet" onPress={() => void refresh()} /> : null}
  </View></Screen>;
}
