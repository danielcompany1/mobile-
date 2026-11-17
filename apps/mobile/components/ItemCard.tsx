import React from 'react';
import { Pressable, Text, View , useColorScheme} from 'react-native';
import { router } from 'expo-router';
import { deadlineState, formatDeadline, CATEGORY_LABELS, type PlannerItem } from '@dueday/shared';
import { Card, colors, ui } from './ui';

export function ItemCard({ item, timezone, onComplete }: { item: PlannerItem; timezone?: string; onComplete?: (item: PlannerItem) => void }) {
  useColorScheme();
  const zone = timezone ?? item.timezone;
  const state = deadlineState(item.due_on, new Date(), zone, item.status === 'completed');
  const label = state === 'overdue' ? 'Overdue' : state === 'today' ? 'Due today' : item.status === 'completed' ? 'Completed' : 'Upcoming';
  return <Card style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, ${label}, ${formatDeadline(item.due_on, item.due_time, zone)}`} onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id, ...(item.recurrence_rule ? { occurrence: item.due_on } : {}) } })} style={({ pressed }) => [{ padding: 16, opacity: pressed ? 0.75 : 1 }]}>
      <View style={ui.row}><Text numberOfLines={2} style={{ flex: 1, color: colors.ink, fontSize: 16, lineHeight: 21, fontWeight: '800' }}>{item.title}</Text><Text style={{ color: state === 'overdue' ? colors.red : state === 'today' ? colors.green : colors.muted, fontSize: 12, fontWeight: '800' }}>{label}</Text></View>
      <Text style={[ui.small, { marginTop: 8 }]}>{CATEGORY_LABELS[item.category]} · {formatDeadline(item.due_on, item.due_time, zone)}</Text>
    </Pressable>
    {onComplete && item.status === 'open' && !item.recurrence_rule ? <Pressable accessibilityRole="button" accessibilityLabel={`Mark ${item.title} complete`} onPress={() => onComplete(item)} style={{ paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.line }}><Text style={{ color: colors.green, fontSize: 13, fontWeight: '700' }}>○  Mark complete</Text></Pressable> : null}
  </Card>;
}
