'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWebAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { isValidEmail, isValidTimeZone, normalizeEmail } from '@dueday/shared';

export function SettingsClient() {
  const { session } = useWebAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [school, setSchool] = useState('');
  const [term, setTerm] = useState('');
  const [week, setWeek] = useState('1');
  const [enabled, setEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Track the tone explicitly instead of guessing it from words in the message.
  const [message, setMessageState] = useState({ text: '', error: false });
  const setMessage = (text: string) => setMessageState({ text, error: false });
  const setFailure = (text: string) => setMessageState({ text, error: true });
  const load = useCallback(async () => {
    if (!session || !supabase) return;
    const [profile, prefs] = await Promise.all([supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(), supabase.from('notification_preferences').select('*').eq('owner_id', session.user.id).maybeSingle()]);
    if (profile.data) { setName(profile.data.full_name ?? ''); setTimezone(profile.data.timezone ?? timezone); setSchool(profile.data.school ?? ''); setTerm(profile.data.current_term ?? ''); setWeek(String(profile.data.week_starts_on ?? 1)); }
    if (prefs.data) { setEnabled(prefs.data.enabled); setPushEnabled(prefs.data.push_enabled); setQuiet(prefs.data.quiet_hours_enabled); setQuietStart(prefs.data.quiet_start.slice(0, 5)); setQuietEnd(prefs.data.quiet_end.slice(0, 5)); }
    setLoading(false);
  }, [session?.user.id]);
  useEffect(() => { void load(); }, [load]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!session || !supabase) return;
    if (!name.trim() || !['0', '1'].includes(week)) { setFailure('Check your name and preferred week start.'); return; }
    if (!isValidTimeZone(timezone.trim())) { setFailure('Enter a valid IANA time zone, such as America/Chicago.'); return; }
    if (quiet && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(quietStart) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(quietEnd))) { setFailure('Enter quiet hours in 24-hour format.'); return; }
    setSaving(true); setMessage('');
    const [profile, prefs] = await Promise.all([
      supabase.from('profiles').update({ full_name: name.trim(), timezone: timezone.trim() || 'UTC', school: school.trim() || null, current_term: term.trim() || null, week_starts_on: Number(week) }).eq('id', session.user.id),
      supabase.from('notification_preferences').update({ enabled, push_enabled: pushEnabled, quiet_hours_enabled: quiet, quiet_start: quietStart, quiet_end: quietEnd, timezone: timezone.trim() || 'UTC' }).eq('owner_id', session.user.id),
    ]);
    setSaving(false);
    if (profile.error || prefs.error) setFailure('Settings could not be saved. Try again.'); else setMessage('Your settings are saved.');
  }
  async function exportData() {
    if (!supabase) return;
    const tables = ['profiles', 'academic_terms', 'courses', 'planner_items', 'planner_checklist_steps', 'applications', 'application_steps', 'notification_preferences', 'in_app_notifications'];
    const responses = await Promise.all(tables.map((table) => supabase!.from(table).select('*')));
    const failure = responses.find((response) => response.error);
    if (failure) { setFailure('We could not export your data. Check your connection and try again.'); return; }
    const payload = Object.fromEntries(tables.map((table, index) => [table, responses[index]!.data]));
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data: payload }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'dueday-data-export.json';
    // Firefox needs the link in the document, and revoking synchronously can cancel the download.
    document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Your export is ready.');
  }
  async function requestEmailChange() {
    const normalized = normalizeEmail(newEmail);
    if (!isValidEmail(normalized)) { setFailure('Check the new email address format and try again.'); return; }
    if (!supabase || normalized === session?.user.email?.toLowerCase()) { setFailure('Check that the new address is different from your current one.'); return; }
    setSaving(true); setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ email: normalized }, { emailRedirectTo: `${window.location.origin}/auth/callback` });
      if (error) { setFailure('We could not start the email change. Check the address and try again.'); return; }
      setNewEmail(''); setMessage('If the address can be used, Supabase sent confirmation instructions. Your current sign-in email stays active until you confirm.');
    } catch { setFailure('We could not start the email change. Check your connection and try again.'); }
    finally { setSaving(false); }
  }
  async function deleteAccount() {
    if (!session || !window.confirm('Permanently delete your DueDay account and its planner data? This cannot be undone.')) return;
    const api = process.env.NEXT_PUBLIC_API_URL;
    if (!api) { setFailure('Account deletion needs NEXT_PUBLIC_API_URL configured.'); return; }
    setSaving(true);
    try {
      const response = await fetch(`${api}/v1/account`, { method: 'DELETE', headers: { authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) { setFailure('Account deletion could not be completed. Try again later.'); return; }
    } catch { setFailure('Account deletion could not be completed. Check your connection and try again.'); return; }
    finally { setSaving(false); }
    // The account is already gone; a failed sign-out call must not be reported as a failed deletion.
    try { await supabase?.auth.signOut(); } catch { /* local session is cleared either way */ }
    router.replace('/sign-in');
  }

  return <div className="pageStack"><div className="pageHeader"><div><div className="eyebrow">PREFERENCES</div><h1>Settings</h1><p>Manage your details and how DueDay reaches you.</p></div></div>{loading ? <section className="listPanel emptyState"><span className="spinner" />Loading settings…</section> : <><form className="settingsGrid" onSubmit={(event) => void save(event)}><section className="settingsCard"><div className="sectionTitle"><h2>Profile</h2><p>Dates and week views use your time zone.</p></div><label>Name<input value={name} onChange={(e) => setName(e.target.value)} required /></label><label>Sign-in email<input value={session?.user.email ?? ''} readOnly /></label><label>Time zone<input value={timezone} onChange={(e) => setTimezone(e.target.value)} /></label><label>Week starts on<select value={week} onChange={(e) => setWeek(e.target.value)}><option value="0">Sunday</option><option value="1">Monday</option></select></label><label>School (optional)<input value={school} onChange={(e) => setSchool(e.target.value)} /></label><label>Current term (optional)<input value={term} onChange={(e) => setTerm(e.target.value)} /></label></section>
    <section className="settingsCard"><div className="sectionTitle"><h2>Change sign-in email</h2><p>Your current address stays active until you confirm the new one.</p></div><label>New email address<input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" /></label><button type="button" className="button secondary" onClick={() => void requestEmailChange()} disabled={saving}>Send confirmation</button></section>
    <section className="settingsCard"><div className="sectionTitle"><h2>Reminders</h2><p>Push notifications are supported by the mobile app. Your browser planner stays available either way.</p></div><label className="toggleRow"><span><b>Reminders</b><small>Allow DueDay to create reminder jobs and in-app alerts.</small></span><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /></label><label className="toggleRow"><span><b>Push on mobile devices</b><small>Manage device permission in mobile Settings.</small></span><input type="checkbox" checked={pushEnabled} onChange={(e) => setPushEnabled(e.target.checked)} /></label><label className="toggleRow"><span><b>Quiet hours</b><small>Defer remote push alerts during this window.</small></span><input type="checkbox" checked={quiet} onChange={(e) => setQuiet(e.target.checked)} /></label>{quiet ? <div className="settingsTwo"><label>Quiet starts<input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} /></label><label>Quiet ends<input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} /></label></div> : null}</section>
    <section className="settingsCard"><div className="sectionTitle"><h2>Calendar</h2><p>The in-app calendar is your main calendar. DueDay never reads your device calendar. On mobile, enable event export in Settings to open the system event editor for an item you choose.</p></div><a className="button secondary" href="/app/planner">Open your DueDay calendar</a></section>
    <section className="settingsCard"><div className="sectionTitle"><h2>Your data</h2><p>Export a copy or request permanent account deletion.</p></div><button type="button" className="button secondary" onClick={() => void exportData()}>Export my data</button><a className="textButton" href="/privacy">Read the privacy policy</a><a className="textButton" href="/terms">Read the terms</a><a className="textButton" href="/account-deletion">Account deletion information</a><button type="button" className="button danger" onClick={() => void deleteAccount()} disabled={saving}>Delete account</button></section>
    <div className="formActions"><button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button></div></form>{message.text ? <p role={message.error ? 'alert' : 'status'} className={message.error ? 'errorMessage' : 'successMessage'}>{message.text}</p> : null}</>}</div>;
}
