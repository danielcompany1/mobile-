import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View, useColorScheme } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { APPLICATION_STATUS_LABELS, type Application, type ApplicationStatus } from '@dueday/shared';
import { Button, Card, Chip, EmptyState, Eyebrow, Fab, Heading, Icon, Loading, Screen, colors, tap, type IconName } from '../../components/ui';
import { supabase } from '../../lib/supabase';

const statuses: Array<ApplicationStatus | 'all'> = ['all', 'planning', 'in_progress', 'submitted', 'interview', 'accepted', 'rejected'];
const statusStyle: Record<ApplicationStatus, { icon: IconName; light: [string, string]; dark: [string, string] }> = {
  planning: { icon: 'bulb-outline', light: ['#6B7A70', '#EEF1EE'], dark: ['#B5C2B9', '#24302A'] },
  in_progress: { icon: 'create-outline', light: ['#2563EB', '#E8F0FE'], dark: ['#8AB4FF', '#1A2A45'] },
  submitted: { icon: 'paper-plane-outline', light: ['#7C3AED', '#F1EAFE'], dark: ['#C4A5FF', '#2C2045'] },
  interview: { icon: 'chatbubbles-outline', light: ['#B45309', '#FDF1E3'], dark: ['#F6C27A', '#3A2A16'] },
  accepted: { icon: 'trophy-outline', light: ['#2E6B4C', '#E7F3EB'], dark: ['#8FD3A8', '#173326'] },
  rejected: { icon: 'close-circle-outline', light: ['#C2412D', '#FDECE8'], dark: ['#F39A86', '#3A211C'] },
};
const tone = (status: ApplicationStatus, dark: boolean) => { const s = statusStyle[status]; const [fg, bg] = dark ? s.dark : s.light; return { icon: s.icon, fg, bg }; };

export default function Applications() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
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
  const active = applications.filter((app) => !['accepted', 'rejected'].includes(app.status)).length;

  return <Screen overlay={<Fab accessibilityLabel="Add application" onPress={() => router.push('/application/new')} />}><View style={{ gap: 16 }}>
    <View><Eyebrow>Opportunities</Eyebrow><Heading subtitle={applications.length ? `${active} active · ${applications.length} total` : 'Scholarships, internships, and jobs in one place.'}>Applications</Heading></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
      {statuses.map((value) => <Chip key={value} label={value === 'all' ? 'All' : APPLICATION_STATUS_LABELS[value]} selected={status === value} onPress={() => setStatus(value)} />)}
    </ScrollView>
    {error ? <Card><Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text><Button title="Try again" icon="refresh" variant="secondary" onPress={() => void refresh()} /></Card> : null}
    {loading ? <Loading /> : visible.length ? <View style={{ gap: 10 }}>{visible.map((app) => {
      const t = tone(app.status, dark);
      return <Pressable key={app.id} accessibilityRole="button" accessibilityLabel={`${app.opportunity_name} at ${app.organization}, ${APPLICATION_STATUS_LABELS[app.status]}`}
        onPress={() => { tap(); router.push({ pathname: '/application/[id]', params: { id: app.id } }); }} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 15 }}>
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: t.fg, fontSize: 19, fontWeight: '800' }}>{(app.organization || app.opportunity_name).trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 16, fontWeight: '600' }}>{app.opportunity_name}</Text>
            <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 13 }}>{app.organization}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bg, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 }}><Icon name={t.icon} size={12} color={t.fg} /><Text style={{ color: t.fg, fontSize: 11, fontWeight: '700' }}>{APPLICATION_STATUS_LABELS[app.status]}</Text></View>
              <Text style={{ color: colors.faint, fontSize: 12 }}>{app.deadline ? `Due ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${app.deadline}T00:00:00Z`))}` : 'No deadline'}</Text>
            </View>
          </View>
          <Icon name="chevron-forward" size={18} color={colors.faint} />
        </Card>
      </Pressable>;
    })}</View> : <EmptyState icon="briefcase-outline" title={applications.length ? 'Nothing in this stage' : 'Track your next opportunity'}
      body={applications.length ? 'Choose another status to see the rest of your list.' : 'Add scholarships, internships, and jobs with private notes and next steps.'}
      action={applications.length ? 'Show all' : 'Add an application'} onAction={() => applications.length ? setStatus('all') : router.push('/application/new')} />}
  </View></Screen>;
}
