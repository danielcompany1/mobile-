import React from 'react';
import { ActivityIndicator, Appearance, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View, type TextInputProps, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const themes = {
  light: { ink: '#15241D', muted: '#66756B', green: '#345B43', accent: '#345B43', primary: '#345B43', lime: '#D8EE8F', canvas: '#F4F5F0', card: '#FFFFFF', soft: '#EAF0E7', line: '#E5E9E1', red: '#B94E3B', cream: '#FBFCF8' },
  dark: { ink: '#EDF3EE', muted: '#A5B3A8', green: '#A5D2A6', accent: '#A5D2A6', primary: '#345B43', lime: '#D8EE8F', canvas: '#111B15', card: '#1C2A21', soft: '#27392D', line: '#33443A', red: '#F09B84', cream: '#17231B' },
};
export const colors = new Proxy(themes.light, { get: (target, key) => {
  const theme = themes[Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'];
  return typeof key === 'string' && key in theme ? theme[key as keyof typeof theme] : Reflect.get(target, key);
} });

export function Screen({ children, scroll = true }: React.PropsWithChildren<{ scroll?: boolean }>) {
  useColorScheme();
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}><View style={styles.page}>{scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>{children}</ScrollView> : children}</View></SafeAreaView>;
}
export function Eyebrow({ children }: React.PropsWithChildren) { useColorScheme(); return <Text style={[styles.eyebrow, { color: colors.accent }]}>{children}</Text>; }
export function Heading({ children, subtitle }: React.PropsWithChildren<{ subtitle?: string }>) { useColorScheme(); return <View style={styles.heading}><Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{children}</Text>{subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}</View>; }
export function Card({ children, style, ...props }: React.PropsWithChildren<ViewProps>) { useColorScheme(); return <View {...props} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }, style]}>{children}</View>; }
export function Button({ title, onPress, variant = 'primary', disabled, accessibilityLabel }: { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; disabled?: boolean; accessibilityLabel?: string }) {
  useColorScheme();
  const buttonTone = variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.soft : variant === 'danger' ? (Appearance.getColorScheme() === 'dark' ? '#422923' : '#FFF0EC') : 'transparent';
  const textTone = variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? colors.red : colors.accent;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: buttonTone }, pressed && !disabled && styles.pressed, disabled && styles.disabled]}><Text style={[styles.buttonText, { color: textTone }]}>{title}</Text></Pressable>;
}
export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  useColorScheme();
  return <View style={styles.field}><Text style={[styles.label, { color: colors.ink }]}>{label}</Text><TextInput placeholderTextColor={colors.muted} accessibilityLabel={label} style={[styles.input, { borderColor: colors.line, color: colors.ink, backgroundColor: colors.card }]} {...props} />{hint ? <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text> : null}</View>;
}
export function Loading() { useColorScheme(); return <View style={styles.loading}><ActivityIndicator color={colors.accent} /><Text style={[styles.subtitle, { color: colors.muted }]}>Getting things ready…</Text></View>; }
export const ui = {
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 } as const,
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as const,
  section: { gap: 12, marginTop: 24 } as const,
  get body() { return { color: colors.ink, fontSize: 15, lineHeight: 22 } as const; },
  get small() { return { color: colors.muted, fontSize: 12 } as const; },
  get action() { return { color: colors.accent, fontWeight: '700', fontSize: 14 } as const; },
  get separator() { return { height: 1, backgroundColor: colors.line, marginVertical: 12 } as const; },
};
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.canvas }, page: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }, content: { padding: 22, paddingBottom: 48 }, heading: { gap: 7, marginBottom: 20 }, title: { fontSize: 31, lineHeight: 37, fontWeight: '800', color: colors.ink, letterSpacing: -0.7 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 21 }, eyebrow: { color: colors.accent, letterSpacing: 1.5, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 10 }, card: { backgroundColor: colors.card, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: colors.line, gap: 12 }, button: { minHeight: 52, borderRadius: 15, paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' }, buttonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' }, pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] }, disabled: { opacity: 0.45 }, field: { gap: 7, marginBottom: 15 }, label: { color: colors.ink, fontSize: 13, fontWeight: '700' }, input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, color: colors.ink, backgroundColor: colors.card, fontSize: 15 }, hint: { color: colors.muted, fontSize: 12, lineHeight: 17 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 } });
