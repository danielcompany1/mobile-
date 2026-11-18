import React, { useEffect, useState } from 'react';
import { Pressable, Text, View , useColorScheme} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { APPLICATION_STATUS_LABELS, type Application, type ApplicationStatus } from '@dueday/shared';
import { Button, Card, Eyebrow, Field, Heading, Loading, Screen, colors, ui } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

const statuses = Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[];
export default function ApplicationForm() {
  useColorScheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const [organization, setOrganization] = useState('');
  const [opportunity, setOpportunity] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('planning');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!id) return;
    if (!supabase) { setLoading(false); return; }
    supabase.from('applications').select('*').eq('id', id).single().then(({ data, error: queryError }) => {
      if (queryError || !data) setError('This application could not be loaded.');
      else { const app = data as Application; setOrganization(app.organization); setOpportunity(app.opportunity_name); setDeadline(app.deadline ?? ''); setStatus(app.status); setNotes(app.notes ?? ''); }
      setLoading(false);
    });
  }, [id]);
  async function save() {
    if (!organization.trim() || !opportunity.trim()) { setError('Add the organization and opportunity name.'); return; }
    if (deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || new Date(`${deadline}T00:00:00Z`).toISOString().slice(0, 10) !== deadline)) { setError('Use a valid deadline in YYYY-MM-DD format.'); return; }
    if (!supabase || !session) { setError('Sign in again to save this application.'); return; }
    setSaving(true); setError('');
    const values = { organization: organization.trim(), opportunity_name: opportunity.trim(), deadline: deadline || null, status, notes: notes.trim() || null };
    const result = id ? await supabase.from('applications').update(values).eq('id', id).select('id').single() : await supabase.from('applications').insert(values).select('id').single();
    setSaving(false);
    if (result.error || !result.data) { setError('We could not save this application. Check your connection and try again.'); return; }
    router.replace({ pathname: '/application/[id]', params: { id: result.data.id } });
  }
  if (loading) return <Screen><Loading /></Screen>;
  return <Screen><View style={{ gap: 15 }}><Eyebrow>APPLICATION TRACKER</Eyebrow><Heading subtitle="Keep details private and the next step clear.">{id ? 'Edit application' : 'Add an application'}</Heading>
    <Card><Field label="Organization" value={organization} onChangeText={setOrganization} placeholder="Northstar Foundation" maxLength={160} /><Field label="Opportunity" value={opportunity} onChangeText={setOpportunity} placeholder="Community Impact Scholarship" maxLength={160} /><Field label="Deadline (optional)" value={deadline} onChangeText={setDeadline} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" hint="Use year-month-day." /><Text style={ui.small}>Status</Text><View style={ui.wrap}>{statuses.map((entry) => <Pressable key={entry} accessibilityRole="button" accessibilityState={{ selected: status === entry }} onPress={() => setStatus(entry)} style={{ paddingVertical: 9, paddingHorizontal: 11, backgroundColor: status === entry ? colors.soft : colors.card, borderRadius: 13 }}><Text style={{ color: status === entry ? colors.green : colors.muted, fontWeight: '700' }}>{APPLICATION_STATUS_LABELS[entry]}</Text></Pressable>)}</View><Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="A private note for yourself" multiline maxLength={2000} style={{ minHeight: 90, paddingTop: 13, textAlignVertical: 'top' }} /></Card>
    <Card style={{ backgroundColor: colors.soft }}><Text style={{ fontWeight: '800', color: colors.ink }}>Keep sensitive documents elsewhere</Text><Text style={ui.small}>DueDay stores your notes and checklist, not identity documents.</Text></Card>
    {error ? <Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text> : null}<Button title={saving ? 'Saving…' : 'Save application'} onPress={() => void save()} disabled={saving} /><Button title="Cancel" variant="quiet" onPress={() => router.back()} />
  </View></Screen>;
}
