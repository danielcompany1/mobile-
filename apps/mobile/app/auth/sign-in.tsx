import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Button, Field, Icon, Screen, colors, shadow, type IconName } from '../../components/ui';
import { isValidEmail, normalizeEmail, PRODUCT_NAME } from '@dueday/shared';
import { useAuth } from '../../lib/auth';

const perks: Array<{ icon: IconName; text: string }> = [
  { icon: 'calendar-outline', text: 'Every assignment, exam, and fee in one calendar' },
  { icon: 'notifications-outline', text: 'Reminders before things are due' },
  { icon: 'briefcase-outline', text: 'Track scholarships, internships, and jobs' },
];

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
      const codeLength = await sendCode(normalized);
      router.push({ pathname: '/auth/code', params: { email: normalized, length: String(codeLength) } });
    } catch (e) { setError(e instanceof Error ? e.message : 'We could not send a code. Try again.'); }
    finally { setBusy(false); }
  }
  return <Screen><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', minHeight: 600 }}>
    <View style={{ gap: 32 }}>
      <View>
        <View style={[{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }, shadow(2)]}>
          <Icon name="checkmark-done" size={32} color={colors.lime} />
        </View>
        <Text style={{ color: colors.accent, fontSize: 15, fontWeight: '700', marginBottom: 8 }}>{PRODUCT_NAME}</Text>
        <Text accessibilityRole="header" style={{ color: colors.ink, fontWeight: '800', fontSize: 36, letterSpacing: -1.2, lineHeight: 42 }}>Stay ahead of{'\n'}every deadline.</Text>
        <View style={{ gap: 12, marginTop: 22 }}>
          {perks.map((perk) => <View key={perk.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}><Icon name={perk.icon} size={17} color={colors.accent} /></View>
            <Text style={{ color: colors.ink, fontSize: 15, flex: 1 }}>{perk.text}</Text>
          </View>)}
        </View>
      </View>
      <View>
        <Field label="Email" value={email} onChangeText={(v) => { setEmail(v); if (error) setError(''); }} placeholder="you@school.edu" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="send" onSubmitEditing={submit} />
        {error ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: -4 }}><Icon name="alert-circle" size={16} color={colors.red} /><Text accessibilityRole="alert" style={{ color: colors.red, flex: 1, fontSize: 14 }}>{error}</Text></View> : null}
        {!configured ? <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>Sign-in is ready once Supabase is connected. Set the mobile environment values in the setup guide.</Text> : null}
        <Button title={busy ? 'Sending code…' : 'Continue'} icon={busy ? undefined : 'arrow-forward'} onPress={submit} disabled={busy} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          <Icon name="lock-closed-outline" size={14} color={colors.muted} />
          <Text style={{ color: colors.muted, fontSize: 13 }}>We’ll email you a one-time code. No password needed.</Text>
        </View>
      </View>
    </View>
  </KeyboardAvoidingView></Screen>;
}
