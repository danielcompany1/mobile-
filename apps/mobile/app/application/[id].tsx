import React, { useCallback, useState } from 'react';
import { Pressable, Text, TextInput, View, useColorScheme } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { APPLICATION_STATUS_LABELS, type Application, type ApplicationStatus, type ChecklistStep } from '@dueday/shared';
import { Button, Card, Eyebrow, Heading, Loading, Screen, colors, ui } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { showAlert } from '../../lib/dialogs';

const statuses = Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[];
export default function ApplicationDetail() {
  useColorScheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [app, setApp] = useState<Application | null>(null);
  const [steps, setSteps] = useState<ChecklistStep[]>([]);
  const [stepName, setStepName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Applications are not configured yet.'); return; }
    const [a, s] = await Promise.all([supabase.from('applications').select('*').eq('id', id).single(), supabase.from('application_steps').select('*').eq('application_id', id).order('position')]);
    if (a.error || !a.data) setError('This application could not be found.'); else setApp(a.data as Application);
    if (s.data) setSteps(s.data as ChecklistStep[]); setLoading(false);
  }, [id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  async function changeStatus(next: ApplicationStatus) {
    if (!supabase || !app) return;
    const { error: updateError } = await supabase.from('applications').update({ status: next }).eq('id', app.id);
    if (updateError) { setError('We could not update the status.'); return; }
    setApp({ ...app, status: next });
  }
  async function addStep() {
    if (!stepName.trim() || !supabase || !session || !app) return;
    const { data, error: insertError } = await supabase.from('application_steps').insert({ application_id: app.id, title: stepName.trim(), position: steps.length }).select('*').single();
    if (insertError || !data) { setError('We could not add that step.'); return; }
    setSteps((all) => [...all, data as ChecklistStep]); setStepName('');
  }
  async function toggleStep(step: ChecklistStep) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from('application_steps').update({ is_complete: !step.is_complete }).eq('id', step.id);
    if (updateError) { setError('We could not update that step.'); return; }
    setSteps((all) => all.map((entry) => entry.id === step.id ? { ...entry, is_complete: !step.is_complete } : entry));
  }
  function remove() {
    if (!app || !supabase) return;
    showAlert('Delete this application?', 'This also removes its checklist steps.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { void supabase!.from('applications').delete().eq('id', app.id).then(({ error: removeError }) => { if (removeError) setError('We could not delete this application.'); else router.replace('/(tabs)/applications'); }); } }]);
  }
  if (loading) return <Screen><Loading /></Screen>;
  if (!app) return <Screen><Heading>{error || 'Application unavailable'}</Heading><Button title="Back to applications" onPress={() => router.back()} /></Screen>;
  return <Screen><View style={{ gap: 16 }}><Pressable accessibilityRole="button" onPress={() => router.back()} style={{ paddingVertical: 5 }}><Text style={ui.action}>‹  Applications</Text></Pressable><Eyebrow>{APPLICATION_STATUS_LABELS[app.status].toUpperCase()}</Eyebrow><Heading subtitle={app.organization}>{app.opportunity_name}</Heading>
    <Card><Text style={{ color: colors.ink, fontWeight: '800' }}>Deadline</Text><Text style={ui.body}>{app.deadline ? new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${app.deadline}T00:00:00Z`)) : 'No deadline set'}</Text>{app.notes ? <Text style={ui.body}>{app.notes}</Text> : null}<Button title="Edit application" variant="secondary" onPress={() => router.push({ pathname: '/application/new', params: { id: app.id } })} /></Card>
    <Card><Text style={{ color: colors.ink, fontWeight: '800', fontSize: 16 }}>Progress</Text><View style={ui.wrap}>{statuses.map((status) => <Pressable key={status} accessibilityRole="button" accessibilityState={{ selected: app.status === status }} onPress={() => void changeStatus(status)} style={{ padding: 9, backgroundColor: app.status === status ? colors.soft : colors.card, borderRadius: 12 }}><Text style={{ color: app.status === status ? colors.green : colors.muted, fontSize: 12, fontWeight: '700' }}>{APPLICATION_STATUS_LABELS[status]}</Text></Pressable>)}</View></Card>
    <Card><View style={ui.row}><Text style={{ color: colors.ink, fontWeight: '800', fontSize: 16 }}>Next steps</Text><Text style={ui.small}>{steps.filter((step) => step.is_complete).length}/{steps.length} done</Text></View>{steps.map((step) => <Pressable key={step.id} accessibilityRole="checkbox" accessibilityState={{ checked: step.is_complete }} onPress={() => void toggleStep(step)} style={[ui.row, { justifyContent: 'flex-start', paddingVertical: 7 }]}><Text style={{ color: colors.green, fontSize: 18 }}>{step.is_complete ? '☑' : '□'}</Text><Text style={{ flex: 1, color: step.is_complete ? colors.muted : colors.ink, textDecorationLine: step.is_complete ? 'line-through' : 'none' }}>{step.title}</Text></Pressable>)}<View style={ui.row}><TextInput accessibilityLabel="New application step" value={stepName} onChangeText={setStepName} onSubmitEditing={() => void addStep()} placeholder="Add a step" placeholderTextColor={colors.muted} returnKeyType="done" style={{ flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 12, color: colors.ink }} /><Button title="Add" variant="secondary" onPress={() => void addStep()} /></View></Card>
    {error ? <Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text> : null}<Button title="Delete application" variant="danger" onPress={remove} />
  </View></Screen>;
}
