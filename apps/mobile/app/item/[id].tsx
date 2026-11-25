import React, { useCallback, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View, useColorScheme } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORY_LABELS, dueInstant, formatDeadline, type ChecklistStep, type PlannerItem } from '@dueday/shared';
import { BackButton, Button, Card, Eyebrow, Heading, Loading, Screen, colors, ui } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { scheduleLocalReminders } from '../../lib/notifications';
import { showAlert } from '../../lib/dialogs';

const CALENDAR_EXPORT_KEY = 'dueday-calendar-export-enabled';

/** 1500 → "1d 1h", 90 → "1h 30m" (previously rendered fractional days such as "1.0416666666666667d"). */
function formatOffset(minutes: number) {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', mins ? `${mins}m` : ''].filter(Boolean).join(' ') || '0m';
}

export default function ItemDetail() {
  useColorScheme();
  const { id, occurrence } = useLocalSearchParams<{ id: string; occurrence?: string }>();
  const { session } = useAuth();
  const [item, setItem] = useState<PlannerItem | null>(null);
  const [steps, setSteps] = useState<ChecklistStep[]>([]);
  const [newStep, setNewStep] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [calendarExportEnabled, setCalendarExportEnabled] = useState(false);
  const load = useCallback(async () => {
    if (!supabase || !id) { setError('This item is unavailable.'); setLoading(false); return; }
    const [itemResult, stepResult] = await Promise.all([
      supabase.from('planner_items').select('*').eq('id', id).single(),
      supabase.from('planner_checklist_steps').select('*').eq('item_id', id).order('position'),
    ]);
    if (itemResult.error || !itemResult.data) setError('This deadline could not be found.');
    else {
      const loaded = itemResult.data as PlannerItem;
      setItem(occurrence && loaded.recurrence_rule ? { ...loaded, due_on: occurrence } : loaded);
    }
    if (stepResult.data) setSteps(stepResult.data as ChecklistStep[]);
    setLoading(false);
  }, [id]);
  useFocusEffect(useCallback(() => {
    void load();
    void AsyncStorage.getItem(CALENDAR_EXPORT_KEY).then((value) => setCalendarExportEnabled(value === 'true'));
  }, [load]));

  async function toggleStep(step: ChecklistStep) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from('planner_checklist_steps').update({ is_complete: !step.is_complete }).eq('id', step.id);
    if (updateError) { setError('That step could not be updated.'); return; }
    setSteps((current) => current.map((entry) => entry.id === step.id ? { ...entry, is_complete: !entry.is_complete } : entry));
  }
  async function addStep() {
    if (!newStep.trim() || !supabase || !session || !id) return;
    const { data, error: insertError } = await supabase.from('planner_checklist_steps').insert({ item_id: id, title: newStep.trim(), position: steps.length }).select('*').single();
    if (insertError || !data) { setError('We could not add that step. Try again.'); return; }
    setSteps((current) => [...current, data as ChecklistStep]); setNewStep(''); setError('');
  }
  async function markComplete() {
    if (!item || !supabase) return;
    setBusy(true); const nextStatus = item.status === 'completed' ? 'open' : 'completed';
    const { error: updateError } = await supabase.from('planner_items').update({ status: nextStatus }).eq('id', item.id);
    setBusy(false);
    if (updateError) { setError('We could not update this deadline.'); return; }
    const next = { ...item, status: nextStatus } as PlannerItem; setItem(next); await scheduleLocalReminders(next);
  }
  function remove() {
    if (!item || !supabase) return;
    showAlert('Delete this deadline?', 'This also removes its checklist and scheduled reminders.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Delete deadline', style: 'destructive', onPress: () => { void (async () => {
        const { error: deleteError } = await supabase!.from('planner_items').delete().eq('id', item.id);
        if (deleteError) { setError('We could not delete this deadline.'); return; }
        await scheduleLocalReminders({ ...item, status: 'completed' }); router.replace('/(tabs)/planner');
      })(); } },
    ]);
  }
  async function addToDeviceCalendar() {
    if (!item) return;
    if (Platform.OS === 'web') return;
    showAlert('Add this deadline?', 'Your device calendar will open so you can review and save this event. DueDay does not read or import your calendar.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Continue', onPress: () => { void (async () => {
        try {
          const Calendar = await import('expo-calendar/legacy');
          const start = item.all_day ? new Date(`${item.due_on}T00:00:00`) : dueInstant(item.due_on, item.due_time, item.timezone);
          const end = item.all_day
            ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)
            : new Date(start.getTime() + 60 * 60_000);
          const result = await Calendar.createEventInCalendarAsync({ title: item.title, startDate: start, endDate: end, allDay: item.all_day, timeZone: item.timezone });
          if (result.action === 'saved') showAlert('Calendar event saved', 'Your deadline is also still in DueDay.');
          else showAlert('Calendar editor closed', 'Your deadline is still in DueDay. On Android, the calendar app does not report whether an event draft was saved or discarded.');
        } catch { showAlert('Could not open the calendar', 'This deadline remains saved in DueDay.'); }
      })(); } },
    ]);
  }
  if (loading) return <Screen><Loading /></Screen>;
  if (!item) return <Screen><View style={{ gap: 16 }}><Eyebrow>DEADLINE</Eyebrow><Heading>{error || 'This item is unavailable.'}</Heading><Button title="Back to planner" onPress={() => router.back()} /></View></Screen>;
  return <Screen><View style={{ gap: 16 }}><BackButton label="Back" />
    <View style={ui.row}><Eyebrow>{CATEGORY_LABELS[item.category].toUpperCase()}</Eyebrow><Text style={{ color: item.status === 'completed' ? colors.green : item.priority === 'high' ? colors.red : colors.muted, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>{item.status === 'completed' ? 'Completed' : `${item.priority} priority`}</Text></View>
    <Heading subtitle={formatDeadline(item.due_on, item.due_time, item.timezone)}>{item.title}</Heading>
    <Card><Text style={{ color: colors.ink, fontWeight: '800', fontSize: 16 }}>Deadline details</Text><Text style={ui.body}>{item.all_day ? 'All day' : `At ${item.due_time} · ${item.timezone}`}</Text><Text style={ui.small}>Reminders: {item.reminders.length ? item.reminders.map(formatOffset).join(', ') : 'None'}</Text>{item.recurrence_rule ? <Text style={ui.small}>Repeats weekly for 16 weeks</Text> : null}{item.notes ? <Text style={ui.body}>{item.notes}</Text> : <Text style={ui.small}>No notes added.</Text>}</Card>
    <Card><View style={ui.row}><Text style={{ color: colors.ink, fontWeight: '800', fontSize: 16 }}>Checklist</Text><Text style={ui.small}>{steps.filter((step) => step.is_complete).length}/{steps.length} done</Text></View>
      {steps.map((step) => <Pressable key={step.id} accessibilityRole="checkbox" accessibilityState={{ checked: step.is_complete }} onPress={() => void toggleStep(step)} style={[ui.row, { justifyContent: 'flex-start', paddingVertical: 7 }]}><Text style={{ fontSize: 19, color: colors.green }}>{step.is_complete ? '☑' : '□'}</Text><Text style={{ color: step.is_complete ? colors.muted : colors.ink, flex: 1, textDecorationLine: step.is_complete ? 'line-through' : 'none' }}>{step.title}</Text></Pressable>)}
      <View style={ui.row}><TextInput accessibilityLabel="New checklist step" value={newStep} onChangeText={setNewStep} placeholder="Add a step" placeholderTextColor={colors.muted} onSubmitEditing={() => void addStep()} returnKeyType="done" style={{ flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 12, color: colors.ink, backgroundColor: colors.card }} /><Button title="Add" variant="secondary" onPress={() => void addStep()} /></View>
    </Card>
    {error ? <Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text> : null}
    {!item.recurrence_rule ? <Button title={item.status === 'completed' ? 'Reopen deadline' : busy ? 'Saving…' : 'Mark complete'} variant="secondary" onPress={() => void markComplete()} disabled={busy} /> : <Text style={ui.small}>This is one class in a 16-week series. Use Edit to change the whole series.</Text>}
    {Platform.OS === 'web' ? <Text style={ui.small}>Device calendar export is available in the iOS and Android apps. Your in-app planner remains available here.</Text> : calendarExportEnabled ? <Button title="Add to device calendar" variant="secondary" onPress={() => void addToDeviceCalendar()} /> : <Button title="Enable calendar export in Settings" variant="secondary" onPress={() => router.push('/(tabs)/settings')} />}
    <View style={ui.row}><View style={{ flex: 1 }}><Button title="Edit" onPress={() => router.push({ pathname: '/item/new', params: { id: item.id } })} /></View><View style={{ flex: 1 }}><Button title="Delete" variant="danger" onPress={remove} /></View></View>
  </View></Screen>;
}
