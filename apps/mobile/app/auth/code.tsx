import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View, useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Icon, IconButton, Screen, colors, tap } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { canResendCode, EMAIL_OTP_LENGTH, GENERIC_CODE_SENT_MESSAGE, isValidEmailOtp, INVALID_OR_EXPIRED_CODE_MESSAGE, OtpRequestError, OTP_REQUEST_FAILURE_MESSAGES } from '@dueday/shared';

const rawCooldown = Number(process.env.EXPO_PUBLIC_AUTH_RESEND_COOLDOWN_SECONDS ?? 60);
const cooldown = Number.isFinite(rawCooldown) ? Math.min(600, Math.max(30, Math.floor(rawCooldown))) : 60;

function CodeBoxes({ value, length, onChange, disabled, error }: { value: string; length: number; onChange(v: string): void; disabled: boolean; error: boolean }) {
  useColorScheme();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(true);
  const half = Math.ceil(length / 2);
  return <Pressable accessibilityRole="none" onPress={() => input.current?.focus()} style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
    {Array.from({ length }, (_, i) => {
      const active = focused && i === Math.min(value.length, length - 1);
      const filled = Boolean(value[i]);
      return <View key={i} style={{ flex: 1, maxWidth: 46, height: 58, marginRight: i === half - 1 ? 10 : 0, borderRadius: 14, borderWidth: active ? 2 : 1, borderColor: error ? colors.red : active ? colors.accent : filled ? colors.accent + '66' : colors.line, backgroundColor: filled ? colors.soft : colors.card, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '700' }}>{value[i] ?? ''}</Text>
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
    try { await verifyCode(email, value); tap('success'); router.replace('/'); }
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

  return <Screen><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, gap: 28, minHeight: 560 }}>
    <IconButton icon="chevron-back" accessibilityLabel="Use a different email" onPress={() => router.replace('/auth/sign-in')} style={{ alignSelf: 'flex-start' }} />
    <View>
      <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}><Icon name="mail-open-outline" size={28} color={colors.accent} /></View>
      <Text accessibilityRole="header" style={{ color: colors.ink, fontWeight: '800', fontSize: 32, letterSpacing: -1 }}>Check your email</Text>
      <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10 }}>Enter the {codeLength}-digit code we sent to{'\n'}<Text style={{ color: colors.ink, fontWeight: '600' }}>{email}</Text></Text>
    </View>
    <View style={{ gap: 18 }}>
      <CodeBoxes value={code} length={codeLength} disabled={busy} error={Boolean(error)} onChange={(next) => { setCode(next); setError(''); if (next.length === codeLength) void submit(next); }} />
      {error ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name="alert-circle" size={16} color={colors.red} /><Text accessibilityRole="alert" style={{ color: colors.red, textAlign: 'center', fontSize: 14 }}>{error}</Text></View> : null}
      {notice ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name="checkmark-circle" size={16} color={colors.green} /><Text style={{ color: colors.green, textAlign: 'center', fontSize: 14 }}>{notice}</Text></View> : null}
      {busy ? <ActivityIndicator color={colors.accent} /> : null}
      <Button title={busy ? 'Checking…' : 'Verify and continue'} onPress={() => void submit()} disabled={busy || code.length !== codeLength} />
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={{ color: colors.muted, fontSize: 14 }}>Didn’t get it? Check your spam folder, or</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !canResendCode(remaining) }} disabled={busy || !canResendCode(remaining)} onPress={() => { tap(); void resend(); }} style={{ padding: 8 }}>
          <Text style={{ color: remaining || busy ? colors.faint : colors.accent, fontWeight: '700', fontSize: 15 }}>{remaining ? `Resend code in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : 'Send a new code'}</Text>
        </Pressable>
      </View>
    </View>
  </KeyboardAvoidingView></Screen>;
}
