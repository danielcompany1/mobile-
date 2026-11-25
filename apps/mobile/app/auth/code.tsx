import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View, useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Eyebrow, Screen, colors, ui } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { canResendCode, EMAIL_OTP_LENGTH, GENERIC_CODE_SENT_MESSAGE, isValidEmailOtp, INVALID_OR_EXPIRED_CODE_MESSAGE, OtpRequestError, OTP_REQUEST_FAILURE_MESSAGES } from '@dueday/shared';

const rawCooldown = Number(process.env.EXPO_PUBLIC_AUTH_RESEND_COOLDOWN_SECONDS ?? 60);
const cooldown = Number.isFinite(rawCooldown) ? Math.min(600, Math.max(30, Math.floor(rawCooldown))) : 60;

function CodeBoxes({ value, length, onChange, disabled }: { value: string; length: number; onChange(v: string): void; disabled: boolean }) {
  useColorScheme();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(true);
  const half = Math.ceil(length / 2);
  return <Pressable accessibilityRole="none" onPress={() => input.current?.focus()} style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
    {Array.from({ length }, (_, i) => {
      const active = focused && i === Math.min(value.length, length - 1);
      const filled = Boolean(value[i]);
      return <View key={i} style={{ flex: 1, maxWidth: 44, height: 54, marginRight: i === half - 1 ? 8 : 0, borderRadius: 12, borderWidth: active ? 2 : 1.5, borderColor: active ? colors.accent : filled ? colors.accent + '88' : colors.line, backgroundColor: filled ? colors.soft : colors.card, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '800' }}>{value[i] ?? ''}</Text>
      </View>;
    })}
    <TextInput
      ref={input}
      value={value}
      onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      editable={!disabled}
      autoFocus
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
      maxLength={length}
      caretHidden
      accessibilityLabel={`${length}-digit code`}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.011, color: 'transparent' }}
    />
  </Pressable>;
}

export default function VerifyCode() {
  useColorScheme();
  const params = useLocalSearchParams<{ email: string; length?: string }>();
  const email = String(params.email ?? '');
  const parsedLength = Number(params.length);
  const [codeLength, setCodeLength] = useState(parsedLength >= 6 && parsedLength <= 10 ? parsedLength : EMAIL_OTP_LENGTH);
  const { verifyCode, sendCode } = useAuth();
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(cooldown);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { if (remaining <= 0) return; const timer = setTimeout(() => setRemaining((n) => n - 1), 1000); return () => clearTimeout(timer); }, [remaining]);

  async function submit(value = code) {
    if (!isValidEmailOtp(value, codeLength)) { setError(`Enter the ${codeLength}-digit code from your email.`); return; }
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await verifyCode(email, value); router.replace('/'); }
    catch (reason) {
      setCode('');
      setError(reason instanceof Error && reason.message === 'AUTH_NETWORK_ERROR' ? 'We could not reach the sign-in service. Check your connection and try again.' : INVALID_OR_EXPIRED_CODE_MESSAGE);
    }
    finally { setBusy(false); }
  }

  async function resend() {
    if (!canResendCode(remaining) || busy) return;
    setBusy(true); setError(''); setNotice('');
    try { setCodeLength(await sendCode(email)); setRemaining(cooldown); setNotice(GENERIC_CODE_SENT_MESSAGE); setCode(''); }
    catch (reason) {
      setError(reason instanceof OtpRequestError ? reason.message : OTP_REQUEST_FAILURE_MESSAGES.request_failed);
      if (reason instanceof OtpRequestError && reason.kind === 'rate_limited') setRemaining(cooldown);
    }
    finally { setBusy(false); }
  }

  return <Screen><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', gap: 24, minHeight: 560 }}>
    <View>
      <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}><Text style={{ fontSize: 24, color: colors.lime }}>✉</Text></View>
      <Eyebrow>Check your inbox</Eyebrow>
      <Text accessibilityRole="header" style={{ color: colors.ink, fontWeight: '800', fontSize: 34, letterSpacing: -1.2 }}>Enter your code</Text>
      <Text style={[ui.body, { color: colors.muted, marginTop: 10 }]}>We sent a {codeLength}-digit code to <Text style={{ color: colors.ink, fontWeight: '700' }}>{email}</Text>. It can take a minute — check spam too.</Text>
    </View>
    <Card style={{ gap: 16, paddingVertical: 22 }}>
      <CodeBoxes value={code} length={codeLength} disabled={busy} onChange={(next) => { setCode(next); setError(''); if (next.length === codeLength) void submit(next); }} />
      {error ? <Text accessibilityRole="alert" style={{ color: colors.red, textAlign: 'center' }}>{error}</Text> : null}
      {notice ? <Text accessibilityRole="text" style={{ color: colors.accent, textAlign: 'center' }}>{notice}</Text> : null}
      {busy ? <View style={{ alignItems: 'center' }}><ActivityIndicator color={colors.accent} /></View> : null}
      <Button title={busy ? 'Checking…' : 'Verify and continue'} onPress={() => void submit()} disabled={busy || code.length !== codeLength} />
      <View style={ui.row}>
        <Text style={ui.small}>Didn’t get it?</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !canResendCode(remaining) }} disabled={busy || !canResendCode(remaining)} onPress={() => void resend()} style={{ padding: 8 }}>
          <Text style={{ color: remaining || busy ? colors.muted : colors.accent, fontWeight: '700' }}>{remaining ? `Resend in ${remaining}s` : 'Send a new code'}</Text>
        </Pressable>
      </View>
    </Card>
    <Text accessibilityRole="button" onPress={() => router.replace('/auth/sign-in')} style={{ color: colors.accent, fontWeight: '700', textAlign: 'center', padding: 10 }}>Use a different email</Text>
  </KeyboardAvoidingView></Screen>;
}
