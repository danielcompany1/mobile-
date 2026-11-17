import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/auth';
import { colors } from '../components/ui';
import NotificationLinking from '../components/NotificationLinking';

export default function RootLayout() {
  useColorScheme();
  return <SafeAreaProvider><AuthProvider><NotificationLinking /><StatusBar style="auto" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} /></AuthProvider></SafeAreaProvider>;
}
