import React, { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Redirect } from 'expo-router';
import { Loading } from '../components/ui';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export default function Index() {
  useColorScheme();
  const { session, loading } = useAuth();
  const [destination, setDestination] = useState<string | null>(null);
  useEffect(() => {
    if (loading) return;
    if (!session) { setDestination('/auth/sign-in'); return; }
    if (!supabase) { setDestination('/auth/sign-in'); return; }
    let active = true;
    // Only send people to onboarding when we know the profile is incomplete. If the lookup
    // fails (e.g. offline), open the app so cached planner data stays reachable.
    supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle().then(
      ({ data, error }) => { if (active) setDestination(error || data?.full_name ? '/(tabs)/today' : '/onboarding'); },
      () => { if (active) setDestination('/(tabs)/today'); },
    );
    return () => { active = false; };
  }, [session, loading]);
  if (!destination) return <Loading />;
  return <Redirect href={destination as never} />;
}
