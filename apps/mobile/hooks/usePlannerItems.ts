import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { loadItems } from '../lib/data';
import type { PlannerItem } from '@dueday/shared';

export function usePlannerItems() {
  const { session } = useAuth();
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!session?.user.id) { setItems([]); setLoading(false); return; }
    setError('');
    try { const result = await loadItems(session.user.id); setItems(result.items); setOffline(result.offline); }
    catch { setError('Your planner could not load. Check your connection and try again.'); }
    finally { setLoading(false); }
  }, [session?.user.id]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return { items, setItems, loading, offline, error, refresh };
}
