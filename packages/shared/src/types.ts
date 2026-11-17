export const ITEM_CATEGORIES = [
  'assignment', 'exam', 'school_event', 'fee', 'scholarship', 'internship_job', 'personal',
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
export type ItemStatus = 'open' | 'completed';
export type Priority = 'low' | 'normal' | 'high';
export type ApplicationStatus = 'planning' | 'in_progress' | 'submitted' | 'interview' | 'accepted' | 'rejected';

export interface PlannerItem {
  id: string;
  owner_id: string;
  title: string;
  category: ItemCategory;
  due_on: string;
  due_time: string | null;
  all_day: boolean;
  timezone: string;
  notes: string | null;
  priority: Priority;
  status: ItemStatus;
  reminders: number[];
  recurrence_rule: { frequency: 'weekly'; count: number } | null;
  created_at: string;
  updated_at: string;
}

export function weeklyOccurrences<T extends { due_on: string; recurrence_rule?: { frequency: 'weekly'; count: number } | null }>(items: T[], start: string, end: string): T[] {
  const result: T[] = [];
  for (const item of items) {
    const count = item.recurrence_rule?.frequency === 'weekly' ? Math.min(52, Math.max(1, item.recurrence_rule.count)) : 1;
    const startDay = Date.parse(`${item.due_on}T00:00:00Z`);
    for (let index = 0; index < count; index += 1) {
      const occurrence = new Date(startDay + index * 7 * 86_400_000).toISOString().slice(0, 10);
      if (occurrence >= start && occurrence <= end) result.push({ ...item, due_on: occurrence });
    }
  }
  return result.sort((a, b) => a.due_on.localeCompare(b.due_on));
}

export interface ChecklistStep {
  id: string;
  item_id: string;
  title: string;
  is_complete: boolean;
  position: number;
}

export interface Application {
  id: string;
  organization: string;
  opportunity_name: string;
  deadline: string | null;
  status: ApplicationStatus;
  notes: string | null;
  created_at: string;
}

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  assignment: 'Assignment', exam: 'Exam or quiz', school_event: 'Class or school event',
  fee: 'Fee or registration', scholarship: 'Scholarship', internship_job: 'Internship or job', personal: 'Personal',
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  planning: 'Planning', in_progress: 'In progress', submitted: 'Submitted', interview: 'Interview', accepted: 'Accepted', rejected: 'Rejected',
};
