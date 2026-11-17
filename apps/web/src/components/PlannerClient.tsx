'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { APPLICATION_STATUS_LABELS, CATEGORY_LABELS, ITEM_CATEGORIES, deadlineState, formatDeadline, localDateAt, type ItemCategory, type PlannerItem, type Priority, weeklyOccurrences } from '@dueday/shared';
import { useWebAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const emptyDraft = () => ({ title: '', category: 'assignment' as ItemCategory, due_on: localDateAt(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'), due_time: '', all_day: true, notes: '', priority: 'normal' as Priority, reminders: [1440, 60] });
function DeadlineRow({ item, refresh, timezone }: { item: PlannerItem; refresh: () => void; timezone: string }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <DeadlineForm initial={item} onSaved={() => { setEditing(false); refresh(); }} onCancel={() => setEditing(false)} timezone={timezone} />;
  const state = deadlineState(item.due_on, new Date(), timezone, item.status === 'completed');
  return <article className="deadlineRow"><button className={`checkButton ${item.status === 'completed' ? 'checked' : ''}`} aria-label={item.status === 'completed' ? `Reopen ${item.title}` : `Mark ${item.title} complete`} onClick={async () => { await supabase?.from('planner_items').update({ status: item.status === 'completed' ? 'open' : 'completed' }).eq('id', item.id); refresh(); }}>✓</button><div className="deadlineInfo"><div className="deadlineTop"><b>{item.title}</b><span className={`statusPill ${state}`}>{state === 'overdue' ? 'Overdue' : state === 'today' ? 'Due today' : item.status === 'completed' ? 'Completed' : 'Upcoming'}</span></div><span>{CATEGORY_LABELS[item.category]} · {formatDeadline(item.due_on, item.due_time, timezone)}</span>{item.notes ? <small>{item.notes}</small> : null}</div><button className="iconButton" aria-label={`Edit ${item.title}`} onClick={() => setEditing(true)}>✎</button><button className="iconButton" aria-label={`Delete ${item.title}`} onClick={async () => { if (window.confirm(`Delete “${item.title}” and its checklist?`)) { await supabase?.from('planner_items').delete().eq('id', item.id); refresh(); } }}>×</button></article>;
}
function DeadlineForm({ initial, onSaved, onCancel, timezone }: { initial?: PlannerItem; onSaved: () => void; onCancel: () => void; timezone: string }) {
  const { session } = useWebAuth();
  const [draft, setDraft] = useState(() => initial ? { title: initial.title, category: initial.category, due_on: initial.due_on, due_time: initial.due_time ?? '', all_day: initial.all_day, notes: initial.notes ?? '', priority: initial.priority, reminders: initial.reminders } : emptyDraft());
  const [repeatWeekly, setRepeatWeekly] = useState(initial?.recurrence_rule?.frequency === 'weekly');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) { setError('Add a title for this deadline.'); return; }
    if (!draft.due_on) { setError('Choose a due date.'); return; }
    if (!draft.all_day && !draft.due_time) { setError('Add a time or choose All day.'); return; }
    if (!supabase || !session) { setError('Sign in again to save this deadline.'); return; }
    setSaving(true); setError('');
    const value = { title: draft.title.trim(), category: draft.category, due_on: draft.due_on, due_time: draft.all_day ? null : draft.due_time, all_day: draft.all_day, timezone, notes: draft.notes.trim() || null, priority: draft.priority, reminders: draft.reminders, recurrence_rule: draft.category === 'school_event' && repeatWeekly ? { frequency: 'weekly', count: 16 } : null };
    const result = initial ? await supabase.from('planner_items').update(value).eq('id', initial.id) : await supabase.from('planner_items').insert(value);
    setSaving(false);
    if (result.error) { setError('We could not save this deadline. Check your connection and try again.'); return; }
    onSaved();
  }
  const toggleReminder = (minutes: number) => setDraft((current) => ({ ...current, reminders: current.reminders.includes(minutes) ? current.reminders.filter((value) => value !== minutes) : [...current.reminders, minutes] }));
  return <form className="deadlineForm" onSubmit={(event) => void save(event)}><div className="formHeading"><div><b>{initial ? 'Edit deadline' : 'Add a deadline'}</b><p>Capture the date, then choose a reminder that works for you.</p></div><button type="button" className="iconButton" onClick={onCancel} aria-label="Close form">×</button></div><div className="formGrid"><label className="wide">Title<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Biology lab report" maxLength={160} required /></label><label>Category<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ItemCategory })}>{ITEM_CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}</select></label><label>Priority<select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label><label>Due date<input type="date" value={draft.due_on} onChange={(e) => setDraft({ ...draft, due_on: e.target.value })} required /></label><label className="checkLabel"><input type="checkbox" checked={draft.all_day} onChange={(e) => setDraft({ ...draft, all_day: e.target.checked })} />All day</label>{!draft.all_day ? <label>Due time<input type="time" value={draft.due_time} onChange={(e) => setDraft({ ...draft, due_time: e.target.value })} /></label> : null}<label className="wide">Notes<textarea rows={3} maxLength={2000} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Details you’ll want to remember" /></label><div className="wide"><span className="formLabel">Remind me</span><div className="chips">{[[10080, '1 week'], [1440, '1 day'], [60, '1 hour']].map(([minute, label]) => <button type="button" key={minute} onClick={() => toggleReminder(Number(minute))} className={`choiceChip ${draft.reminders.includes(Number(minute)) ? 'selected' : ''}`}>{draft.reminders.includes(Number(minute)) ? '✓ ' : ''}{label} before</button>)}</div></div>{draft.category === 'school_event' ? <div className="wide repeatNotice"><label className="checkLabel"><input type="checkbox" checked={repeatWeekly} onChange={(e) => setRepeatWeekly(e.target.checked)} />Repeat weekly for 16 weeks</label><small>Recurring events are limited to class and school schedules.</small></div> : null}</div>{error ? <p className="errorMessage">{error}</p> : null}<div className="formActions"><button className="button primary" disabled={saving}>{saving ? 'Saving…' : initial ? 'Save changes' : 'Save deadline'}</button><button type="button" className="button secondary" onClick={onCancel}>Cancel</button></div></form>;
}

export function PlannerClient({ mode }: { mode: 'today' | 'planner' }) {
  const { session } = useWebAuth();
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<ItemCategory | 'all'>('all');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!supabase || !session) return;
    const [list, profile] = await Promise.all([supabase.from('planner_items').select('*').order('due_on').order('due_time').limit(500), supabase.from('profiles').select('full_name,timezone').eq('id', session.user.id).maybeSingle()]);
    if (list.error) setError('Your planner could not load. Check your connection and try again.'); else { setItems((list.data ?? []) as PlannerItem[]); setError(''); }
    setName(profile.data?.full_name ?? ''); if (profile.data?.timezone) setTimezone(profile.data.timezone); setLoading(false);
  }, [session?.user.id]);
  useEffect(() => { void refresh(); }, [refresh]);
  const today = localDateAt(new Date(), timezone);
  const horizon = new Date(Date.parse(`${today}T00:00:00Z`) + 112 * 86_400_000).toISOString().slice(0, 10);
  const occurrenceItems = weeklyOccurrences(items, mode === 'today' ? today : `${today.slice(0, 7)}-01`, mode === 'today' ? horizon : `${today.slice(0, 7)}-31`);
  const filtered = occurrenceItems.filter((item) => category === 'all' || item.category === category);
  const visible = mode === 'today' ? filtered.filter((item) => item.status === 'open').sort((a, b) => a.due_on.localeCompare(b.due_on)).slice(0, 8) : filtered;
  const overdueCount = mode === 'today' ? visible.filter((item) => deadlineState(item.due_on, new Date(), timezone) === 'overdue').length : 0;
  const counts = useMemo(() => ({ total: items.filter((item) => item.status === 'open').length, today: items.filter((item) => item.status === 'open' && item.due_on === today).length }), [items, today]);
  return <div className="pageStack"><div className="pageHeader"><div><div className="eyebrow">{mode === 'today' ? new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone }).format(new Date()).toUpperCase() : 'YOUR DEADLINES'}</div><h1>{mode === 'today' ? `Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}${name ? `, ${name.split(' ')[0]}` : ''}.` : 'Planner'}</h1><p>{mode === 'today' ? 'One clear place to see what needs your attention.' : 'Browse your deadlines and keep the next step close.'}</p></div><button className="button primary" onClick={() => setShowForm((value) => !value)}>＋ Add deadline</button></div>
    {mode === 'today' ? <section className="summaryStrip"><div><span>Open deadlines</span><b>{counts.total}</b></div><div><span>Due today</span><b>{counts.today}</b></div><div className="nextAction"><span>Next small step</span><b>{overdueCount ? `${overdueCount} overdue need a quick look` : visible[0]?.title ?? 'Add your first deadline'}</b></div></section> : null}
    {showForm ? <DeadlineForm timezone={timezone} onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); void refresh(); }} /> : null}
    {mode === 'planner' ? <div className="filterBar"><span>Filter by category</span><select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value as ItemCategory | 'all')}><option value="all">All categories</option>{ITEM_CATEGORIES.map((entry) => <option key={entry} value={entry}>{CATEGORY_LABELS[entry]}</option>)}</select><span className="weekLink">View: <Link href="/app/planner">Agenda</Link></span></div> : null}
    {error ? <div role="alert" className="errorMessage">{error} <button className="textButton" onClick={() => void refresh()}>Try again</button></div> : null}
    <section className="listPanel"><div className="listHeading"><div><h2>{mode === 'today' ? 'Your deadlines' : 'Agenda'}</h2><span>{mode === 'today' ? `${visible.length} items to keep in view` : `${visible.length} deadlines this month`}</span></div><Link href="/app/planner">Open planner ↗</Link></div>
      {loading ? <div className="emptyState"><span className="spinner" />Loading your deadlines…</div> : visible.length ? <div className="deadlineList">{visible.map((item) => <DeadlineRow key={`${item.id}-${item.due_on}`} item={item} refresh={() => void refresh()} timezone={timezone} />)}</div> : <div className="emptyState"><div className="emptyIcon">✓</div><h3>{items.length ? 'Nothing needs attention here' : 'Your planner starts with one deadline'}</h3><p>{items.length ? 'Try another category or come back later.' : 'Add an assignment, exam, school fee, or application deadline.'}</p><button className="button secondary" onClick={() => setShowForm(true)}>{items.length ? 'Show all categories' : 'Add your first deadline'}</button></div>}
    </section>
  </div>;
}
