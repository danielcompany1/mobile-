import React from 'react';
import { ActivityIndicator, Appearance, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View, type StyleProp, type TextInputProps, type ViewProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { ItemCategory } from '@dueday/shared';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

const themes = {
  light: {
    ink: '#0F1A14', muted: '#6B7A70', faint: '#9AA69E',
    green: '#2E6B4C', accent: '#2E6B4C', primary: '#1F4D36', primaryInk: '#FFFFFF',
    lime: '#C9F27B', canvas: '#F5F6F2', card: '#FFFFFF', soft: '#EBF1EC', line: '#E6EAE5',
    red: '#C2412D', redSoft: '#FDECE8', amber: '#B7791F', amberSoft: '#FDF3E1', cream: '#FBFCF8',
    shadow: '#0F1A14', overlay: 'rgba(255,255,255,0.14)',
  },
  dark: {
    ink: '#EEF4EF', muted: '#9DACA2', faint: '#6E7D73',
    green: '#8FD3A8', accent: '#8FD3A8', primary: '#2B6A4A', primaryInk: '#FFFFFF',
    lime: '#C9F27B', canvas: '#0C1310', card: '#16201B', soft: '#1F2D25', line: '#26352C',
    red: '#F39A86', redSoft: '#3A211C', amber: '#F2C46D', amberSoft: '#3A2E17', cream: '#121B16',
    shadow: '#000000', overlay: 'rgba(255,255,255,0.10)',
  },
};
export const colors = new Proxy(themes.light, { get: (target, key) => {
  const theme = themes[Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'];
  return typeof key === 'string' && key in theme ? theme[key as keyof typeof theme] : Reflect.get(target, key);
} });
const isDark = () => Appearance.getColorScheme() === 'dark';

/** Each category gets its own color and icon so lists scan at a glance. */
const categoryStyles: Record<ItemCategory, { icon: IconName; light: [string, string]; dark: [string, string] }> = {
  assignment: { icon: 'document-text', light: ['#2563EB', '#E8F0FE'], dark: ['#8AB4FF', '#1A2A45'] },
  exam: { icon: 'school', light: ['#7C3AED', '#F1EAFE'], dark: ['#C4A5FF', '#2C2045'] },
  school_event: { icon: 'calendar', light: ['#0E8A7E', '#E2F6F3'], dark: ['#6FDCCF', '#14332F'] },
  fee: { icon: 'card', light: ['#B45309', '#FDF1E3'], dark: ['#F6C27A', '#3A2A16'] },
  scholarship: { icon: 'ribbon', light: ['#2E6B4C', '#E7F3EB'], dark: ['#8FD3A8', '#173326'] },
  internship_job: { icon: 'briefcase', light: ['#4338CA', '#ECEBFD'], dark: ['#A5A1FF', '#232245'] },
  personal: { icon: 'person', light: ['#DB2777', '#FCE8F1'], dark: ['#F79AC4', '#3D1C2C'] },
};
export function categoryTone(category: ItemCategory) {
  const entry = categoryStyles[category] ?? categoryStyles.personal;
  const [fg, bg] = isDark() ? entry.dark : entry.light;
  return { icon: entry.icon, fg, bg };
}

export function tap(style: 'light' | 'medium' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (style === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else void Haptics.impactAsync(style === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export const shadow = (level: 1 | 2 = 1): ViewStyle => Platform.select<ViewStyle>({
  web: { boxShadow: level === 1 ? '0 1px 2px rgba(15,26,20,0.04), 0 4px 14px rgba(15,26,20,0.05)' : '0 2px 6px rgba(15,26,20,0.06), 0 12px 32px rgba(15,26,20,0.10)' } as ViewStyle,
  android: { elevation: level === 1 ? 1 : 4 },
  default: { shadowColor: colors.shadow, shadowOpacity: isDark() ? 0.4 : level === 1 ? 0.05 : 0.1, shadowRadius: level === 1 ? 10 : 22, shadowOffset: { width: 0, height: level === 1 ? 3 : 10 } },
})!;

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  useColorScheme();
  return <Ionicons name={name} size={size} color={color ?? colors.ink} />;
}

export function Screen({ children, scroll = true, overlay }: React.PropsWithChildren<{ scroll?: boolean; overlay?: React.ReactNode }>) {
  useColorScheme();
  return <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: colors.canvas }]}><View style={styles.page}>{scroll ? <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, overlay ? { paddingBottom: 110 } : null]}>{children}</ScrollView> : children}{overlay}</View></SafeAreaView>;
}

export function BackButton({ label = 'Back' }: { label?: string }) {
  useColorScheme();
  return <IconButton icon="chevron-back" accessibilityLabel={label} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ alignSelf: 'flex-start' }} />;
}

/** Floating round action button that sits above the tab bar. */
export function Fab({ icon = 'add', onPress, accessibilityLabel }: { icon?: IconName; onPress: () => void; accessibilityLabel: string }) {
  useColorScheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={() => { tap('medium'); onPress(); }}
    style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary }, shadow(2), pressed && styles.pressed]}>
    <Icon name={icon} size={30} color={colors.primaryInk} />
  </Pressable>;
}
export function Eyebrow({ children }: React.PropsWithChildren) { useColorScheme(); return <Text style={[styles.eyebrow, { color: colors.muted }]}>{children}</Text>; }
export function Heading({ children, subtitle }: React.PropsWithChildren<{ subtitle?: string }>) { useColorScheme(); return <View style={styles.heading}><Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{children}</Text>{subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}</View>; }
export function Card({ children, style, ...props }: React.PropsWithChildren<ViewProps>) { useColorScheme(); return <View {...props} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }, shadow(1), style]}>{children}</View>; }

export function SectionHeader({ title, count, action, onAction }: { title: string; count?: string | number; action?: string; onAction?: () => void }) {
  useColorScheme();
  return <View style={[styles.sectionHeader]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 19, fontWeight: '700', letterSpacing: -0.3 }}>{title}</Text>
      {count !== undefined ? <View style={{ backgroundColor: colors.soft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>{count}</Text></View> : null}
    </View>
    {action && onAction ? <Pressable accessibilityRole="button" hitSlop={10} onPress={() => { tap(); onAction(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>{action}</Text><Icon name="chevron-forward" size={15} color={colors.accent} /></Pressable> : null}
  </View>;
}

export function Button({ title, onPress, variant = 'primary', disabled, accessibilityLabel, icon, compact }: { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; disabled?: boolean; accessibilityLabel?: string; icon?: IconName; compact?: boolean }) {
  useColorScheme();
  const buttonTone = variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.soft : variant === 'danger' ? colors.redSoft : 'transparent';
  const textTone = variant === 'primary' ? colors.primaryInk : variant === 'danger' ? colors.red : colors.accent;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled}
    onPress={() => { tap(variant === 'primary' ? 'medium' : 'light'); onPress(); }}
    style={({ pressed }) => [styles.button, compact && styles.compact, { backgroundColor: buttonTone }, variant === 'primary' && !disabled && shadow(1), pressed && !disabled && styles.pressed, disabled && styles.disabled]}>
    {icon ? <Icon name={icon} size={compact ? 17 : 19} color={textTone} /> : null}
    <Text style={[styles.buttonText, compact && { fontSize: 14 }, { color: textTone }]}>{title}</Text>
  </Pressable>;
}

export function IconButton({ icon, onPress, accessibilityLabel, badge, style }: { icon: IconName; onPress: () => void; accessibilityLabel: string; badge?: boolean; style?: StyleProp<ViewStyle> }) {
  useColorScheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={6} onPress={() => { tap(); onPress(); }}
    style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.card, borderColor: colors.line }, shadow(1), pressed && styles.pressed, style]}>
    <Icon name={icon} size={21} color={colors.ink} />
    {badge ? <View style={[styles.badge, { backgroundColor: colors.red, borderColor: colors.card }]} /> : null}
  </Pressable>;
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: IconName }) {
  useColorScheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { tap(); onPress(); }}
    style={({ pressed }) => [styles.chip, { backgroundColor: selected ? colors.ink : colors.card, borderColor: selected ? colors.ink : colors.line }, pressed && styles.pressed]}>
    {icon ? <Icon name={icon} size={14} color={selected ? colors.canvas : colors.muted} /> : null}
    <Text style={{ color: selected ? colors.canvas : colors.ink, fontSize: 13, fontWeight: '600' }}>{label}</Text>
  </Pressable>;
}

export function Segmented<T extends string>({ options, value, onChange }: { options: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void }) {
  useColorScheme();
  return <View style={[styles.segment, { backgroundColor: colors.soft }]}>
    {options.map((option) => {
      const active = option.value === value;
      return <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => { tap(); onChange(option.value); }}
        style={[styles.segmentItem, active && [{ backgroundColor: colors.card }, shadow(1)]]}>
        <Text style={{ color: active ? colors.ink : colors.muted, fontWeight: '600', fontSize: 14 }}>{option.label}</Text>
      </Pressable>;
    })}
  </View>;
}

export function EmptyState({ icon, title, body, action, onAction }: { icon: IconName; title: string; body: string; action?: string; onAction?: () => void }) {
  useColorScheme();
  return <Card style={{ alignItems: 'center', paddingVertical: 28, gap: 10 }}>
    <View style={[styles.emptyIcon, { backgroundColor: colors.soft }]}><Icon name={icon} size={26} color={colors.accent} /></View>
    <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
    <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 300 }}>{body}</Text>
    {action && onAction ? <View style={{ marginTop: 6, alignSelf: 'stretch' }}><Button title={action} variant="secondary" onPress={onAction} /></View> : null}
  </Card>;
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  useColorScheme();
  const [focused, setFocused] = React.useState(false);
  return <View style={styles.field}><Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
    <TextInput placeholderTextColor={colors.faint} accessibilityLabel={label} {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }} onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={[styles.input, { borderColor: focused ? colors.accent : colors.line, borderWidth: focused ? 1.5 : 1, color: colors.ink, backgroundColor: colors.cream }, props.style]} />
    {hint ? <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text> : null}</View>;
}
export function Loading() { useColorScheme(); return <View style={styles.loading}><ActivityIndicator color={colors.accent} /><Text style={[styles.subtitle, { color: colors.muted }]}>Getting things ready…</Text></View>; }
export const ui = {
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 } as const,
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as const,
  section: { gap: 10, marginTop: 22 } as const,
  get body() { return { color: colors.ink, fontSize: 15, lineHeight: 22 } as const; },
  get small() { return { color: colors.muted, fontSize: 13 } as const; },
  get action() { return { color: colors.accent, fontWeight: '600', fontSize: 14 } as const; },
  get separator() { return { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: 12 } as const; },
};
const styles = StyleSheet.create({
  safe: { flex: 1 }, page: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' }, content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48 },
  heading: { gap: 6, marginBottom: 4 }, title: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.9 }, subtitle: { fontSize: 15, lineHeight: 21 },
  eyebrow: { letterSpacing: 0.6, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  card: { borderRadius: 20, padding: 18, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  button: { minHeight: 54, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  compact: { minHeight: 42, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 9 },
  buttonText: { fontSize: 16, fontWeight: '700', letterSpacing: -0.1 }, pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] }, disabled: { opacity: 0.4 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  badge: { position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14 },
  segment: { flexDirection: 'row', borderRadius: 13, padding: 3 }, segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  fab: { position: 'absolute', right: 20, bottom: 22, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  field: { gap: 7, marginBottom: 14 }, label: { fontSize: 14, fontWeight: '600' },
  input: { minHeight: 52, borderRadius: 14, paddingHorizontal: 15, fontSize: 16 }, hint: { fontSize: 12, lineHeight: 17 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 40 },
});
