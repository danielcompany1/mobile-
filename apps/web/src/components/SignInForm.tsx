'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { canResendCode, EMAIL_OTP_LENGTH, GENERIC_CODE_SENT_MESSAGE, getOtpRequestFailure, isValidEmail, isValidEmailOtp, normalizeEmail, INVALID_OR_EXPIRED_CODE_MESSAGE } from '@dueday/shared';

const rawCooldown = Number(process.env.NEXT_PUBLIC_AUTH_RESEND_COOLDOWN_SECONDS ?? 60);
const cooldown = Number.isFinite(rawCooldown) ? Math.min(600, Math.max(30, Math.floor(rawCooldown))) : 60;
export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
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
      const { error: authError } = await supabase.auth.signInWithOtp({ email: value, options: { shouldCreateUser: true } });
      if (authError) throw authError;
      setEmail(value); setSent(true); setRemaining(cooldown); setNotice(GENERIC_CODE_SENT_MESSAGE);
    } catch (reason) {
      const failure = getOtpRequestFailure(reason);
      if (process.env.NODE_ENV === 'development') console.warn('otp_request_failed', failure.diagnostic);
      setError(failure.message);
      if (failure.kind === 'rate_limited') setRemaining(cooldown);
    }
    finally { setBusy(false); }
  }
  async function verify() {
    if (!isValidEmailOtp(code)) { setError(`Enter the ${EMAIL_OTP_LENGTH}-digit code from your email.`); return; }
    if (!supabase) return;
    setBusy(true); setError('');
    try {
      const { error: authError } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: 'email' });
      if (authError) { setError(authError.status ? INVALID_OR_EXPIRED_CODE_MESSAGE : 'We could not reach the sign-in service. Check your connection and try again.'); return; }
      router.replace('/app');
    } catch { setError('We could not verify that code. Check your connection and try again.'); }
    finally { setBusy(false); }
  }
  return <div className="authCard"><div className="eyebrow">{sent ? 'CHECK YOUR INBOX' : 'A CALMER WAY TO STAY ON TOP'}</div><h1>{sent ? 'Enter your code' : 'Your deadlines, in one calm place.'}</h1><p>{sent ? `We sent a one-time code to ${email}.` : 'Save assignments, exams, fees, and applications, then give each one a next step.'}</p>
    {!sent ? <form onSubmit={(event) => { event.preventDefault(); void send(); }}><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@school.edu" autoComplete="email" required /></label><button className="button primary full" disabled={busy}>{busy ? 'Sending code…' : 'Continue with email'}</button></form> : <form onSubmit={(event) => { event.preventDefault(); void verify(); }}><label>{EMAIL_OTP_LENGTH}-digit code<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, EMAIL_OTP_LENGTH))} placeholder={'0'.repeat(EMAIL_OTP_LENGTH)} required maxLength={EMAIL_OTP_LENGTH} /></label><button className="button primary full" disabled={busy}>{busy ? 'Checking…' : 'Verify and continue'}</button><button type="button" className="textButton" disabled={!canResendCode(remaining) || busy} onClick={() => void send()}>{remaining ? `Resend in ${remaining}s` : 'Send a new code'}</button><button type="button" className="textButton" onClick={() => { setSent(false); setCode(''); setError(''); }}>Use a different email</button></form>}
    {notice ? <div role="status" className="successMessage">{notice}</div> : null}{error ? <div role="alert" className="errorMessage">{error}</div> : null}{!isSupabaseConfigured ? <p className="setupHint">Supabase connection values are placeholders until you add your project settings.</p> : null}<div className="finePrint">No passwords. Your planner stays private to your account.</div>
  </div>;
}
