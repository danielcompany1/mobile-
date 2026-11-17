import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Eyebrow, Field, Screen, colors, ui } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { canResendCode, EMAIL_OTP_LENGTH, GENERIC_CODE_SENT_MESSAGE, isValidEmailOtp, INVALID_OR_EXPIRED_CODE_MESSAGE, OtpRequestError, OTP_REQUEST_FAILURE_MESSAGES } from '@dueday/shared';

const rawCooldown = Number(process.env.EXPO_PUBLIC_AUTH_RESEND_COOLDOWN_SECONDS ?? 60);
const cooldown = Number.isFinite(rawCooldown) ? Math.min(600, Math.max(30, Math.floor(rawCooldown))) : 60;
export default function VerifyCode() {
  useColorScheme();
  const { email: emailParam } = useLocalSearchParams<{ email: string }>();
  const email = String(emailParam ?? '');
  const { verifyCode, sendCode } = useAuth();
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(cooldown);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { if (remaining <= 0) return; const timer = setTimeout(() => setRemaining((n) => n - 1), 1000); return () => clearTimeout(timer); }, [remaining]);
  async function submit() {
    if (!isValidEmailOtp(code)) { setError(`Enter the ${EMAIL_OTP_LENGTH}-digit code from your email.`); return; }
    setBusy(true); setError(''); setNotice('');
    try { await verifyCode(email, code); router.replace('/'); }
    catch (reason) { setError(reason instanceof Error && reason.message === 'AUTH_NETWORK_ERROR' ? 'We could not reach the sign-in service. Check your connection and try again.' : INVALID_OR_EXPIRED_CODE_MESSAGE); }
    finally { setBusy(false); }
  }
  async function resend() {
    if (!canResendCode(remaining)) return;
    setBusy(true); setError(''); setNotice('');
    try { await sendCode(email); setRemaining(cooldown); setNotice(GENERIC_CODE_SENT_MESSAGE); setCode(''); }
    catch (reason) {
      setError(reason instanceof OtpRequestError ? reason.message : OTP_REQUEST_FAILURE_MESSAGES.request_failed);
      if (reason instanceof OtpRequestError && reason.kind === 'rate_limited') setRemaining(cooldown);
    }
    finally { setBusy(false); }
  }
  return <Screen><View style={{ flex: 1, justifyContent: 'center', gap: 22 }}>
    <View><Eyebrow>Check your inbox</Eyebrow><Text accessibilityRole="header" style={{ color: colors.ink, fontWeight: '800', fontSize: 32 }}>Enter your code</Text><Text style={[ui.body, { color: colors.muted, marginTop: 8 }]}>We sent an {EMAIL_OTP_LENGTH}-digit sign-in code to {email}.</Text></View>
    <Card><Field label={`${EMAIL_OTP_LENGTH}-digit code`} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, EMAIL_OTP_LENGTH))} placeholder={'0'.repeat(EMAIL_OTP_LENGTH)} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={EMAIL_OTP_LENGTH} autoFocus />
      {error ? <Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text> : null}{notice ? <Text accessibilityRole="status" style={{ color: colors.green }}>{notice}</Text> : null}
      <Button title={busy ? 'Checking…' : 'Verify and continue'} onPress={submit} disabled={busy} />
      <View style={ui.row}><Text style={ui.small}>Didn’t get a code?</Text><Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !canResendCode(remaining) }} disabled={busy || !canResendCode(remaining)} onPress={() => void resend()} style={{ padding: 8 }}><Text style={{ color: remaining || busy ? colors.muted : colors.green, fontWeight: '700' }}>{remaining ? `Resend in ${remaining}s` : 'Send a new code'}</Text></Pressable></View>
      <Text style={ui.small}>Codes expire. If this one has expired, request a new code above.</Text>
    </Card>
    <Text accessibilityRole="button" onPress={() => router.replace('/auth/sign-in')} style={{ color: colors.green, fontWeight: '700', textAlign: 'center', padding: 10 }}>Use a different email</Text>
  </View></Screen>;
}
