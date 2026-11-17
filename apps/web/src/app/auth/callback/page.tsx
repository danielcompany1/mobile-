'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Confirming your email change…');
  useEffect(() => {
    let active = true;
    void supabase?.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.session) { setMessage('The confirmation could not be completed. Sign in and check your email settings.'); return; }
      router.replace('/app/settings');
    }).catch(() => { if (active) setMessage('The confirmation could not be completed. Sign in and check your email settings.'); });
    return () => { active = false; };
  }, [router]);
  return <main className="authPage"><div className="authCard"><div className="eyebrow">ACCOUNT SETTINGS</div><h1>One quick check.</h1><p role="status">{message}</p><a className="button secondary" href="/sign-in">Back to sign in</a></div></main>;
}
