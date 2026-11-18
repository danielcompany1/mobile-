import type { PlannerItem } from '@dueday/shared';

// Browser reminders are stored in Supabase and shown in the in-app notification list.
// OS scheduling and Expo device tokens belong to the native mobile app.
export const PUSH_READY_MESSAGE = 'Notifications are ready on this device.';

export async function requestAndRegisterPush() {
  return 'Device push notifications are available in the iOS and Android apps. You can still see reminders inside DueDay.';
}

export async function unregisterPushToken() {}
export async function scheduleLocalReminders(_item: PlannerItem) {}
export async function rescheduleOpenItems() {}
export async function cancelAllLocalReminders() {}
