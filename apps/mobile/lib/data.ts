import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { Application, PlannerItem } from '@dueday/shared';

export async function loadItems(userId: string): Promise<{ items: PlannerItem[]; offline: boolean }> {
  const key = `dueday-cache:items:${userId}`;
  if (!supabase) return { items: [], offline: false };
  const { data, error } = await supabase.from('planner_items').select('*').order('due_on').order('due_time').limit(500);
  if (!error && data) {
    await AsyncStorage.setItem(key, JSON.stringify(data));
    return { items: data as PlannerItem[], offline: false };
  }
  const cached = await AsyncStorage.getItem(key);
  return { items: cached ? JSON.parse(cached) as PlannerItem[] : [], offline: true };
}

export async function loadApplications(): Promise<Application[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('applications').select('*').order('deadline', { ascending: true, nullsFirst: false });
  if (error) throw new Error('Applications could not be loaded. Check your connection and try again.');
  return (data ?? []) as Application[];
}
