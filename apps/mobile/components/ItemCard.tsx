import React from 'react';
import { Pressable, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { deadlineState, formatDeadline, CATEGORY_LABELS, type PlannerItem } from '@dueday/shared';
import { Card, Icon, categoryTone, colors, tap } from './ui';

export function ItemCard({ item, timezone, onComplete }: { item: PlannerItem; timezone?: string; onComplete?: (item: PlannerItem) => void }) {
  useColorScheme();
  const zone = timezone ?? item.timezone;
  const done = item.status === 'completed';
  const state = deadlineState(item.due_on, new Date(), zone, done);
  // Display the due time in the item's own zone: it was validated there on save, while the
  // viewer's zone may not contain that wall-clock time (DST gap) and would throw.
  const dueLabel = formatDeadline(item.due_on, item.due_time, item.timezone);
  const label = state === 'overdue' ? 'Overdue' : state === 'today' ? 'Today' : done ? 'Done' : 'Upcoming';
  const pill = state === 'overdue' ? { fg: colors.red, bg: colors.redSoft } : state === 'today' ? { fg: colors.amber, bg: colors.amberSoft } : done ? { fg: colors.green, bg: colors.soft } : null;
  const tone = categoryTone(item.category);
  const canComplete = Boolean(onComplete) && item.status === 'open' && !item.recurrence_rule;

  return <Card style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, ${label}, ${dueLabel}`}
        onPress={() => { tap(); router.push({ pathname: '/item/[id]', params: { id: item.id, ...(item.recurrence_rule ? { occurrence: item.due_on } : {}) } }); }}
        style={({ pressed }) => [{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingLeft: 15, paddingRight: canComplete ? 6 : 15, opacity: pressed ? 0.7 : 1 }]}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={tone.icon} size={21} color={tone.fg} />
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text numberOfLines={2} style={{ color: done ? colors.muted : colors.ink, fontSize: 16, lineHeight: 21, fontWeight: '600', textDecorationLine: done ? 'line-through' : 'none' }}>{item.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {pill ? <View style={{ backgroundColor: pill.bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}><Text style={{ color: pill.fg, fontSize: 11, fontWeight: '700' }}>{label}</Text></View> : null}
            <Icon name="time-outline" size={13} color={colors.muted} />
            <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 13, flexShrink: 1 }}>{dueLabel}</Text>
          </View>
          <Text numberOfLines={1} style={{ color: colors.faint, fontSize: 12 }}>{CATEGORY_LABELS[item.category]}{item.recurrence_rule ? '  ·  Repeats weekly' : ''}</Text>
        </View>
        {!canComplete ? <Icon name="chevron-forward" size={18} color={colors.faint} /> : null}
      </Pressable>
      {canComplete ? <Pressable accessibilityRole="button" accessibilityLabel={`Mark ${item.title} complete`} hitSlop={8}
        onPress={() => { tap('success'); onComplete!(item); }}
        style={({ pressed }) => [{ paddingHorizontal: 16, paddingVertical: 18, opacity: pressed ? 0.6 : 1 }]}>
        {({ pressed }) => <Icon name={pressed ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={pressed ? colors.green : colors.faint} />}
      </Pressable> : null}
    </View>
  </Card>;
}
