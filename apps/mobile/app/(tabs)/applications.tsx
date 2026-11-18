import React, { useCallback, useState } from 'react';
import { Pressable, Text, View , useColorScheme} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { APPLICATION_STATUS_LABELS, type Application, type ApplicationStatus } from '@dueday/shared';
import { Button, Card, Eyebrow, Heading, Loading, Screen, colors, ui } from '../../components/ui';
import { supabase } from '../../lib/supabase';

const statuses: Array<ApplicationStatus | 'all'> = ['all', 'planning', 'in_progress', 'submitted', 'interview', 'accepted', 'rejected'];
export default function Applications() {
  useColorScheme();
  const [applications, setApplications] = useState<Application[]>([]);
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!supabase) { setApplications([]); setLoading(false); return; }
    const { data, error: queryError } = await supabase.from('applications').select('*').order('deadline', { ascending: true, nullsFirst: false });
    if (queryError) setError('Your applications could not load. Check your connection and try again.');
    else { setApplications((data ?? []) as Application[]); setError(''); }
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const visible = applications.filter((app) => status === 'all' || app.status === status);
  return <Screen><View style={{ gap: 16 }}><View style={ui.row}><View style={{ flex: 1 }}><Eyebrow>OPPORTUNITIES</Eyebrow><Heading subtitle="Keep each application moving at its own pace.">Applications</Heading></View><Button title="＋ Add" onPress={() => router.push('/application/new')} /></View>
    <View style={ui.wrap}>{statuses.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: status === value }} onPress={() => setStatus(value)} style={{ paddingVertical: 8, paddingHorizontal: 11, borderRadius: 14, backgroundColor: status === value ? colors.soft : colors.card, borderWidth: 1, borderColor: status === value ? colors.green : colors.line }}><Text style={{ color: status === value ? colors.green : colors.muted, fontSize: 12, fontWeight: '700' }}>{value === 'all' ? 'All' : APPLICATION_STATUS_LABELS[value]}</Text></Pressable>)}</View>
    {error ? <Card><Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text><Button title="Try again" variant="secondary" onPress={() => void refresh()} /></Card> : null}
    {loading ? <Loading /> : visible.length ? visible.map((app) => <Pressable key={app.id} accessibilityRole="button" accessibilityLabel={`${app.opportunity_name} at ${app.organization}, ${APPLICATION_STATUS_LABELS[app.status]}`} onPress={() => router.push({ pathname: '/application/[id]', params: { id: app.id } })} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}><Card><View style={ui.row}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>{app.opportunity_name}</Text><Text style={ui.small}>{app.organization}</Text></View><Text style={{ color: colors.green, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>{APPLICATION_STATUS_LABELS[app.status]}</Text></View><View style={ui.row}><Text style={ui.small}>{app.deadline ? `Due ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${app.deadline}T00:00:00Z`))}` : 'No deadline yet'}</Text><Text style={ui.action}>Open  →</Text></View></Card></Pressable>) : <Card><Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800' }}>{applications.length ? 'No applications in this status' : 'A place for your next opportunity'}</Text><Text style={ui.small}>{applications.length ? 'Choose another status to see the rest of your list.' : 'Track scholarships, internships, and jobs with private notes and practical steps.'}</Text><Button title={applications.length ? 'Show all statuses' : 'Add an application'} variant="secondary" onPress={() => applications.length ? setStatus('all') : router.push('/application/new')} /></Card>}
  </View></Screen>;
}
