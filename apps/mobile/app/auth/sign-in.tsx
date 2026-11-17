import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View , useColorScheme} from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Eyebrow, Field, Screen, colors, ui } from '../../components/ui';
import { isValidEmail, normalizeEmail, PRODUCT_NAME, PRODUCT_TAGLINE } from '@dueday/shared';
import { useAuth } from '../../lib/auth';

export default function SignIn() {
  useColorScheme();
  const { sendCode, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) { setError('Enter a valid email address.'); return; }
    setError(''); setBusy(true);
    try {
      await sendCode(normalized);
      router.push({ pathname: '/auth/code', params: { email: normalized } });
    } catch (e) { setError(e instanceof Error ? e.message : 'We could not send a code. Try again.'); }
    finally { setBusy(false); }
  }
  return <Screen><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center' }}>
    <View style={{ gap: 28 }}>
      <View><View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}><Text style={{ fontSize: 27 }}>✓</Text></View><Eyebrow>Welcome to {PRODUCT_NAME}</Eyebrow><Text accessibilityRole="header" style={{ color: colors.ink, fontWeight: '800', fontSize: 37, letterSpacing: -1.4, lineHeight: 43 }}>Your deadlines,{ '\n' }in one calm place.</Text><Text style={[ui.body, { color: colors.muted, marginTop: 13 }]}>{PRODUCT_TAGLINE} Save assignments, applications, exams, and the small steps that get them done.</Text></View>
      <Card><Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@school.edu" keyboardType="email-address" autoCapitalize="none" autoComplete="email" returnKeyType="send" onSubmitEditing={submit} />
        {error ? <Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text> : null}
        {!configured ? <Text style={ui.small}>Sign-in is ready once Supabase is connected. Set the mobile environment values in the setup guide.</Text> : null}
        <Button title={busy ? 'Sending code…' : 'Continue with email'} onPress={submit} disabled={busy} />
        <Text style={[ui.small, { textAlign: 'center' }]}>We’ll email you a one-time code. No password needed.</Text>
      </Card>
    </View>
  </KeyboardAvoidingView></Screen>;
}
