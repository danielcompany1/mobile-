'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { canResendCode, EMAIL_OTP_LENGTH, GENERIC_CODE_SENT_MESSAGE, getOtpRequestFailure, isValidEmail, isValidEmailOtp, normalizeEmail, INVALID_OR_EXPIRED_CODE_MESSAGE, requestEmailCodeFromApi } from '@dueday/shared';

const rawCooldown = Number(process.env.NEXT_PUBLIC_AUTH_RESEND_COOLDOWN_SECONDS ?? 60);
const cooldown = Number.isFinite(rawCooldown) ? Math.min(600, Math.max(30, Math.floor(rawCooldown))) : 60;
const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function requestCode(email: string): Promise<number> {
  if (API_URL) {
    try { return (await requestEmailCodeFromApi(API_URL, email)).codeLength; }
    catch (reason) {
      // If the API is unreachable, fall back to Supabase's own mailer.
      if (!(reason && typeof reason === 'object' && (reason as { status?: number }).status === 0)) throw reason;
    }
  }
  if (!supabase) throw new Error('not_configured');
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
  return EMAIL_OTP_LENGTH;
}

function CodeBoxes({ value, length, onChange, onComplete, disabled }: { value: string; length: number; onChange(v: string): void; onComplete(v: string): void; disabled: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(true);
  useEffect(() => { ref.current?.focus(); }, []);
  return <div className="codeBoxes" onClick={() => ref.current?.focus()}>
    <input ref={ref} className="codeInput" aria-label={`${length}-digit code`} inputMode="numeric" autoComplete="one-time-code" pattern="\d*" maxLength={length} value={value} disabled={disabled}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onChange={(event) => { const next = event.target.value.replace(/\D/g, '').slice(0, length); onChange(next); if (next.length === length) onComplete(next); }} />
    {Array.from({ length }, (_, i) => <span key={i} aria-hidden="true" className={`codeBox${value[i] ? ' filled' : ''}${focused && i === Math.min(value.length, length - 1) ? ' active' : ''}${i === Math.ceil(length / 2) - 1 ? ' gap' : ''}`}>{value[i] ?? ''}</span>)}
  </div>;
}

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeLength, setCodeLength] = useState(EMAIL_OTP_LENGTH);
  const [sent, setSent] = useState(false);
  const [remaining, setRemaining] = useState(cooldown);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { if (!sent || remaining <= 0) return; const timer = window.setTimeout(() => setRemaining((n) => n - 1), 1000); return () => window.clearTimeout(timer); }, [sent, remaining]);

  async function send() {
    const value = normalizeEmail(email);
    if (!isValidEmail(value)) { setError('Enter a valid email address.'); return; }
    if (!supabase) { setError('Connect Supabase using the setup guide before sending a code.'); return; }
    if (sent && !canResendCode(remaining)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      setCodeLength(await requestCode(value));
      setEmail(value); setCode(''); setRemaining(cooldown);
      setNotice(sent ? GENERIC_CODE_SENT_MESSAGE : ''); setSent(true);
    } catch (reason) {
      const failure = getOtpRequestFailure(reason);
      if (process.env.NODE_ENV === 'development') console.warn('otp_request_failed', failure.diagnostic);
      setError(failure.message);
      if (failure.kind === 'rate_limited' && sent) setRemaining(cooldown);
    }
    finally { setBusy(false); }
  }

  async function verify(value = code) {
    if (!isValidEmailOtp(value, codeLength)) { setError(`Enter the ${codeLength}-digit code from your email.`); return; }
    if (!supabase || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { error: authError } = await supabase.auth.verifyOtp({ email, token: value, type: 'email' });
      if (authError) { setCode(''); setError(authError.status ? INVALID_OR_EXPIRED_CODE_MESSAGE : 'We could not reach the sign-in service. Check your connection and try again.'); return; }
      router.replace('/app');
    } catch { setError('We could not verify that code. Check your connection and try again.'); }
    finally { setBusy(false); }
  }

  return <div className="authCard">
    <div className="authIcon" aria-hidden="true">{sent ? '✉' : '✓'}</div>
    <div className="eyebrow">{sent ? 'CHECK YOUR INBOX' : 'A CALMER WAY TO STAY ON TOP'}</div>
    <h1>{sent ? 'Enter your code' : 'Your deadlines, in one calm place.'}</h1>
    <p>{sent ? <>We sent a {codeLength}-digit code to <b className="emailChip">{email}</b>. It may take a minute to arrive — check spam too.</> : 'Save assignments, exams, fees, and applications, then give each one a next step.'}</p>
    {!sent
      ? <form onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@school.edu" autoComplete="email" autoFocus required /></label>
          <button className="button primary full" disabled={busy}>{busy ? <><span className="spinner light" /> Sending code…</> : 'Continue with email →'}</button>
        </form>
      : <form onSubmit={(event) => { event.preventDefault(); void verify(); }}>
          <CodeBoxes value={code} length={codeLength} disabled={busy} onChange={(v) => { setCode(v); setError(''); }} onComplete={(v) => void verify(v)} />
          <button className="button primary full" disabled={busy || code.length !== codeLength}>{busy ? <><span className="spinner light" /> Checking…</> : 'Verify and continue'}</button>
          <div className="authLinks">
            <button type="button" className="textButton" disabled={!canResendCode(remaining) || busy} onClick={() => void send()}>{remaining > 0 ? `Resend code in ${remaining}s` : 'Send a new code'}</button>
            <button type="button" className="textButton" onClick={() => { setSent(false); setCode(''); setError(''); setNotice(''); }}>Change email</button>
          </div>
        </form>}
    {notice ? <div role="status" className="successMessage">{notice}</div> : null}
    {error ? <div role="alert" className="errorMessage">{error}</div> : null}
    {!isSupabaseConfigured ? <p className="setupHint">Supabase connection values are placeholders until you add your project settings.</p> : null}
    <div className="finePrint">🔒 No passwords. Your planner stays private to your account.</div>
  </div>;
}
