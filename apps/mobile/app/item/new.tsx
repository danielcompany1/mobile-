import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CATEGORY_LABELS, ITEM_CATEGORIES, dueInstant, isValidTimeZone, localDateAt, type ItemCategory, type PlannerItem, type Priority } from '@dueday/shared';
import { Button, Card, Eyebrow, Field, Heading, Loading, Screen, colors, ui } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { scheduleLocalReminders } from '../../lib/notifications';
import { showAlert } from '../../lib/dialogs';

const reminderOptions = [{ value: 10080, label: '1 week' }, { value: 1440, label: '1 day' }, { value: 60, label: '1 hour' }];
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value; }

export default function NewPlannerItem() {
  useColorScheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const itemId = params.id;
  const { session } = useAuth();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const [loading, setLoading] = useState(Boolean(itemId));
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItemCategory>('assignment');
  const [dueOn, setDueOn] = useState(localDateAt(new Date(), zone));
  const [dueTime, setDueTime] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [timezone, setTimezone] = useState(zone);
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [reminders, setReminders] = useState<number[]>([1440, 60]);
  const [customReminder, setCustomReminder] = useState('');
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    if (!itemId) {
      if (session) supabase.from('profiles').select('timezone').eq('id', session.user.id).maybeSingle().then(({ data }) => { if (data?.timezone) { setTimezone(data.timezone); setDueOn(localDateAt(new Date(), data.timezone)); } });
      return;
    }
    supabase.from('planner_items').select('*').eq('id', itemId).single().then(({ data, error: fetchError }) => {
      if (!data || fetchError) { setError('This deadline could not be loaded.'); setLoading(false); return; }
      const item = data as PlannerItem;
      setTitle(item.title); setCategory(item.category); setDueOn(item.due_on); setDueTime(item.due_time ?? ''); setAllDay(item.all_day); setTimezone(item.timezone); setNotes(item.notes ?? ''); setPriority(item.priority); setReminders(item.reminders); setRepeatWeekly(item.recurrence_rule?.frequency === 'weekly'); setLoading(false);
    });
  }, [itemId, session?.user.id]);

  function toggleReminder(value: number) {
    if (!reminders.includes(value) && reminders.length >= 8) { setError('Choose up to 8 reminders for one deadline.'); return; }
    setReminders((old) => old.includes(value) ? old.filter((entry) => entry !== value) : [...old, value].sort((a, b) => b - a));
  }
  function addCustomReminder() {
    const value = Number(customReminder);
    if (!Number.isInteger(value) || value < 1 || value > 10080) { setError('Custom reminders can be set from 1 to 10,080 minutes before the deadline.'); return; }
    if (!reminders.includes(value) && reminders.length >= 8) { setError('Choose up to 8 reminders for one deadline.'); return; }
    setReminders((old) => [...new Set([...old, value])].sort((a, b) => b - a)); setCustomReminder(''); setError('');
  }
  async function save() {
    setError('');
    if (!title.trim()) { setError('Add a short title.'); return; }
    if (!validDate(dueOn)) { setError('Use a valid date in YYYY-MM-DD format.'); return; }
    if (!isValidTimeZone(timezone.trim())) { setError('Enter a valid IANA time zone, such as America/Chicago.'); return; }
    if (!allDay && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime)) { setError('Enter a time in 24-hour format, such as 15:30.'); return; }
    try { dueInstant(dueOn, allDay ? null : dueTime, timezone); }
    catch (e) { setError(e instanceof Error ? e.message : 'Check the date, time, and time zone.'); return; }
    if (!supabase || !session) { setError('Sign in again to save this deadline.'); return; }
    setSaving(true);
    const draft = {
      title: title.trim(), category, due_on: dueOn,
      due_time: allDay ? null : dueTime, all_day: allDay, timezone: timezone.trim() || zone,
      notes: notes.trim() || null, priority, reminders,
      recurrence_rule: category === 'school_event' && repeatWeekly ? { frequency: 'weekly', count: 16 } : null,
    };
    const response = itemId
      ? await supabase.from('planner_items').update(draft).eq('id', itemId).select('*').single()
      : await supabase.from('planner_items').insert(draft).select('*').single();
    setSaving(false);
    if (response.error || !response.data) { setError('We could not save this deadline. Check your connection and try again.'); return; }
    try { await scheduleLocalReminders(response.data as PlannerItem); } catch { showAlert('Saved', 'Your deadline is saved. Device reminders are unavailable right now.'); }
    router.replace({ pathname: '/item/[id]', params: { id: response.data.id } });
  }

  if (loading) return <Screen><Loading /></Screen>;
  return <Screen><View style={{ gap: 15 }}><Eyebrow>{itemId ? 'EDIT DEADLINE' : 'NEW DEADLINE'}</Eyebrow><Heading subtitle="Keep the important details together. The essentials take a moment.">{itemId ? 'Edit item' : 'Add to your planner'}</Heading>
    <Card><Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Biology lab report" maxLength={160} returnKeyType="next" />
      <Text style={ui.small}>Category</Text><View style={ui.wrap}>{ITEM_CATEGORIES.map((entry) => <Pressable key={entry} accessibilityRole="button" accessibilityState={{ selected: category === entry }} onPress={() => { setCategory(entry); if (entry !== 'school_event') setRepeatWeekly(false); }} style={{ paddingHorizontal: 11, paddingVertical: 9, borderRadius: 13, backgroundColor: category === entry ? colors.soft : colors.card, borderWidth: 1, borderColor: category === entry ? colors.green : colors.line }}><Text style={{ color: category === entry ? colors.green : colors.muted, fontSize: 12, fontWeight: '700' }}>{CATEGORY_LABELS[entry]}</Text></Pressable>)}</View>
      <Field label="Due date" value={dueOn} onChangeText={setDueOn} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" hint="Use year-month-day, for example 2026-11-24." />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: allDay }} onPress={() => setAllDay((value) => !value)} style={[ui.row, { justifyContent: 'flex-start', paddingVertical: 8 }]}><Text style={{ fontSize: 18, color: colors.green }}>{allDay ? '☑' : '□'}</Text><Text style={{ color: colors.ink, fontWeight: '700' }}>All day</Text></Pressable>
      {!allDay ? <Field label="Due time" value={dueTime} onChangeText={setDueTime} placeholder="15:30" keyboardType="numbers-and-punctuation" hint="24-hour local time." /> : null}
      <Field label="Time zone" value={timezone} onChangeText={setTimezone} placeholder="America/Chicago" autoCapitalize="none" hint="This deadline stays at this local time when daylight-saving time changes." />
      <Text style={ui.small}>Priority</Text><View style={ui.wrap}>{(['low','normal','high'] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: priority === value }} onPress={() => setPriority(value)} style={{ borderRadius: 12, paddingVertical: 9, paddingHorizontal: 15, backgroundColor: priority === value ? colors.soft : colors.card }}><Text style={{ color: priority === value ? colors.green : colors.muted, fontWeight: '700', textTransform: 'capitalize' }}>{value}</Text></Pressable>)}</View>
      <Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Details you’ll want to remember" multiline maxLength={2000} style={{ minHeight: 88, paddingTop: 13, textAlignVertical: 'top' }} />
    </Card>
    <Card><Text style={{ color: colors.ink, fontWeight: '800', fontSize: 16 }}>Reminders</Text><Text style={ui.small}>In-app reminders stay private and won’t show your notes on the lock screen.</Text><View style={ui.wrap}>{reminderOptions.map(({ value, label }) => <Pressable key={value} accessibilityRole="checkbox" accessibilityState={{ checked: reminders.includes(value) }} onPress={() => toggleReminder(value)} style={{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: reminders.includes(value) ? colors.soft : colors.card, borderRadius: 13 }}><Text style={{ color: reminders.includes(value) ? colors.green : colors.muted, fontWeight: '700' }}>{reminders.includes(value) ? '✓ ' : ''}{label} before</Text></Pressable>)}</View><View style={ui.row}><View style={{ flex: 1 }}><Field label="Custom minutes before" value={customReminder} onChangeText={setCustomReminder} placeholder="e.g. 30" keyboardType="number-pad" /></View><Button title="Add" variant="secondary" onPress={addCustomReminder} /></View></Card>
    {category === 'school_event' ? <Card style={{ backgroundColor: colors.soft }}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: repeatWeekly }} onPress={() => setRepeatWeekly((value) => !value)} style={[ui.row, { justifyContent: 'flex-start' }]}><Text style={{ fontSize: 18, color: colors.green }}>{repeatWeekly ? '☑' : '□'}</Text><Text style={{ color: colors.ink, fontWeight: '700' }}>Repeat weekly for 16 weeks</Text></Pressable><Text style={ui.small}>Use this for a class or recurring school event. Other deadlines stay one-time.</Text></Card> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text> : null}<Button title={saving ? 'Saving…' : itemId ? 'Save changes' : 'Save deadline'} onPress={() => void save()} disabled={saving} /><Button title="Cancel" variant="quiet" onPress={() => router.back()} />
  </View></Screen>;
}
