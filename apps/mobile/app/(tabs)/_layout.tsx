import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, Icon, tap, type IconName } from '../../components/ui';

const icons: Record<string, [IconName, IconName]> = {
  today: ['sunny-outline', 'sunny'],
  planner: ['calendar-outline', 'calendar'],
  applications: ['briefcase-outline', 'briefcase'],
  settings: ['person-circle-outline', 'person-circle'],
};
export default function TabLayout() {
  useColorScheme();
  // A fixed height clips labels behind the iOS home indicator / Android gesture bar, so add the inset.
  const { bottom } = useSafeAreaInsets();
  return <Tabs
    screenListeners={{ tabPress: () => tap() }}
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.ink,
      tabBarInactiveTintColor: colors.faint,
      tabBarStyle: {
        height: 58 + Math.max(bottom, 10), paddingTop: 8, paddingBottom: Math.max(bottom, 10),
        backgroundColor: colors.card, borderTopColor: colors.line, borderTopWidth: Platform.OS === 'web' ? 1 : 0.5,
      },
      tabBarLabelStyle: { fontWeight: '600', fontSize: 11, marginTop: 2 },
      tabBarIcon: ({ color, focused }) => {
        const pair = icons[route.name];
        return <Icon name={pair ? pair[focused ? 1 : 0] : 'ellipse'} size={24} color={String(color)} />;
      },
    })}>
    <Tabs.Screen name="today" options={{ title: 'Today' }} />
    <Tabs.Screen name="planner" options={{ title: 'Planner' }} />
    <Tabs.Screen name="applications" options={{ title: 'Applications' }} />
    <Tabs.Screen name="settings" options={{ title: 'Account' }} />
  </Tabs>;
}
