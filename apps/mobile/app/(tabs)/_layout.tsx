import React from 'react';
import { Tabs } from 'expo-router';
import { Text, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../components/ui';

const glyphs: Record<string, string> = { today: '◷', planner: '▦', applications: '↗', settings: '⚙' };
export default function TabLayout() {
  useColorScheme();
  // A fixed height clips labels behind the iOS home indicator / Android gesture bar, so add the inset.
  const { bottom } = useSafeAreaInsets();
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { height: 56 + Math.max(bottom, 8), paddingTop: 8, paddingBottom: Math.max(bottom, 8), backgroundColor: colors.card, borderTopColor: colors.line }, tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
    tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>{glyphs[route.name] ?? '•'}</Text>,
  })}>
    <Tabs.Screen name="today" options={{ title: 'Today' }} /><Tabs.Screen name="planner" options={{ title: 'Planner' }} /><Tabs.Screen name="applications" options={{ title: 'Applications' }} /><Tabs.Screen name="settings" options={{ title: 'Settings' }} />
  </Tabs>;
}
