'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { APPLICATION_STATUS_LABELS, type Application, type ApplicationStatus } from '@dueday/shared';
import { supabase } from '@/lib/supabase';

const statuses = Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[];
interface Step { id: string; title: string; is_complete: boolean; position: number }
function ApplicationSteps({ applicationId }: { applicationId: string }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { void supabase?.from('application_steps').select('*').eq('application_id', applicationId).order('position').then(({ data }) => { setSteps((data ?? []) as Step[]); }); }, [applicationId]);
  async function add() {
    if (!title.trim()) return;
    const { data, error: insertError } = await supabase!.from('application_steps').insert({ application_id: applicationId, title: title.trim(), position: steps.length }).select('*').single();
    if (insertError || !data) { setError('Could not add the step. Try again.'); return; }
    setSteps((all) => [...all, data as Step]); setTitle(''); setError('');
  }
  async function toggle(step: Step) {
    const { error: updateError } = await supabase!.from('application_steps').update({ is_complete: !step.is_complete }).eq('id', step.id);
    if (updateError) { setError('Could not update the step.'); return; }
    setSteps((all) => all.map((value) => value.id === step.id ? { ...value, is_complete: !value.is_complete } : value));
  }
  return <div className="applicationSteps"><div className="stepHeading"><b>Next steps</b><span>{steps.filter((item) => item.is_complete).length}/{steps.length} done</span></div>{steps.map((step) => <label className="stepRow" key={step.id}><input type="checkbox" checked={step.is_complete} onChange={() => void toggle(step)} /><span className={step.is_complete ? 'doneText' : ''}>{step.title}</span></label>)}<form className="addStep" onSubmit={(event) => { event.preventDefault(); void add(); }}><input aria-label="Add application step" placeholder="Add a step" value={title} onChange={(e) => setTitle(e.target.value)} /><button className="button secondary smallButton">Add step</button></form>{error ? <small className="errorMessage">{error}</small> : null}</div>;
}

function ApplicationForm({ initial, onCancel, onSaved }: { initial?: Application; onCancel: () => void; onSaved: () => void }) {
  const [organization, setOrganization] = useState(initial?.organization ?? '');
  const [opportunity, setOpportunity] = useState(initial?.opportunity_name ?? '');
  const [deadline, setDeadline] = useState(initial?.deadline ?? '');
  const [status, setStatus] = useState<ApplicationStatus>(initial?.status ?? 'planning');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!organization.trim() || !opportunity.trim()) { setError('Add the organization and opportunity name.'); return; }
    setSaving(true); setError('');
    const value = { organization: organization.trim(), opportunity_name: opportunity.trim(), deadline: deadline || null, status, notes: notes.trim() || null };
    const result = initial ? await supabase!.from('applications').update(value).eq('id', initial.id) : await supabase!.from('applications').insert(value);
    setSaving(false);
    if (result.error) { setError('We could not save this application. Try again.'); return; }
    onSaved();
  }
  return <form className="deadlineForm" onSubmit={(event) => void save(event)}><div className="formHeading"><div><b>{initial ? 'Edit application' : 'Track an opportunity'}</b><p>Scholarships, internships, and jobs each get their own progress.</p></div><button type="button" className="iconButton" aria-label="Close" onClick={onCancel}>×</button></div><div className="formGrid"><label>Organization<input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Northstar Foundation" required maxLength={160} /></label><label>Opportunity<input value={opportunity} onChange={(e) => setOpportunity(e.target.value)} placeholder="Community Impact Scholarship" required maxLength={160} /></label><label>Deadline<input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label><label>Status<select value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus)}>{statuses.map((entry) => <option key={entry} value={entry}>{APPLICATION_STATUS_LABELS[entry]}</option>)}</select></label><label className="wide">Notes<textarea rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="A private note for yourself" /></label></div><div className="privacyHint">Keep identity documents outside DueDay. Your optional notes stay private to your account.</div>{error ? <p role="alert" className="errorMessage">{error}</p> : null}<div className="formActions"><button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Save application'}</button><button type="button" className="button secondary" onClick={onCancel}>Cancel</button></div></form>;
}

export function ApplicationsClient() {
  const [apps, setApps] = useState<Application[]>([]);
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');
  const [editing, setEditing] = useState<Application | null | 'new'>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    const { data, error: queryError } = await supabase!.from('applications').select('*').order('deadline', { ascending: true, nullsFirst: false });
    if (queryError) setError('Applications could not load. Check your connection and try again.'); else { setApps((data ?? []) as Application[]); setError(''); }
    setLoading(false);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const visible = apps.filter((app) => filter === 'all' || app.status === filter);
  return <div className="pageStack"><div className="pageHeader"><div><div className="eyebrow">OPPORTUNITY TRACKER</div><h1>Applications</h1><p>Move scholarships, internships, and jobs forward, one step at a time.</p></div><button className="button primary" onClick={() => setEditing('new')}>＋ Add opportunity</button></div>
    <div className="chips statusFilters"><button className={`choiceChip ${filter === 'all' ? 'selected' : ''}`} onClick={() => setFilter('all')}>All · {apps.length}</button>{statuses.map((entry) => <button className={`choiceChip ${filter === entry ? 'selected' : ''}`} key={entry} onClick={() => setFilter(entry)}>{APPLICATION_STATUS_LABELS[entry]}</button>)}</div>
    {editing ? <ApplicationForm initial={editing === 'new' ? undefined : editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); void refresh(); }} /> : null}
    {error ? <p role="alert" className="errorMessage">{error} <button className="textButton" onClick={() => void refresh()}>Try again</button></p> : null}
    {loading ? <section className="listPanel emptyState"><span className="spinner" />Loading applications…</section> : visible.length ? <div className="applicationGrid">{visible.map((app) => <article className="applicationCard" key={app.id}><div className="applicationCardTop"><div><div className="eyebrow smallEyebrow">{app.organization}</div><h2>{app.opportunity_name}</h2></div><button className="iconButton" aria-label={`Edit ${app.opportunity_name}`} onClick={() => setEditing(app)}>✎</button></div><div className="applicationMeta"><span className={`statusPill ${app.status}`}>{APPLICATION_STATUS_LABELS[app.status]}</span><span>{app.deadline ? `Due ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${app.deadline}T00:00:00Z`))}` : 'No deadline'}</span></div>{app.notes ? <p className="applicationNotes">{app.notes}</p> : null}<ApplicationSteps applicationId={app.id} /><div className="applicationCardActions"><label>Status<select aria-label={`Status for ${app.opportunity_name}`} value={app.status} onChange={async (e) => { const next = e.target.value as ApplicationStatus; const { error: updateError } = await supabase!.from('applications').update({ status: next }).eq('id', app.id); if (updateError) setError('Could not update application status.'); else setApps((all) => all.map((value) => value.id === app.id ? { ...value, status: next } : value)); }}>{statuses.map((entry) => <option key={entry} value={entry}>{APPLICATION_STATUS_LABELS[entry]}</option>)}</select></label><button className="textButton deleteLink" onClick={async () => { if (!window.confirm(`Delete “${app.opportunity_name}” and its checklist?`)) return; const { error: deleteError } = await supabase!.from('applications').delete().eq('id', app.id); if (deleteError) setError('Could not delete the application.'); else setApps((all) => all.filter((entry) => entry.id !== app.id)); }}>Delete</button></div></article>)}</div> : <section className="listPanel emptyState"><div className="emptyIcon">↗</div><h3>{apps.length ? 'No opportunities in this status' : 'Keep each opportunity moving'}</h3><p>{apps.length ? 'Pick a different status to see the rest of your applications.' : 'Add a scholarship, internship, or job and track its next steps.'}</p><button className="button secondary" onClick={() => apps.length ? setFilter('all') : setEditing('new')}>{apps.length ? 'Show all statuses' : 'Add an application'}</button></section>}
  </div>;
}
