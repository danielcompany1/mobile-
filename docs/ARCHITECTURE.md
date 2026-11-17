# Architecture

## Responsibilities

- **Supabase Auth and Postgres** are the source of truth for accounts, planner records, application tracking, reminder preferences, and in-app notifications.
- **Mobile and web** use the Supabase publishable key and the signed-in user's access token. Row Level Security scopes every user table. Owner columns default to `auth.uid()` so client inserts do not send an `owner_id`; linked checklist, course, and notification records also have same-owner foreign keys.
- **Express** verifies bearer tokens with Supabase Auth, then uses the service-role key only for push-token operations, account deletion, and notification dispatch. The service role is never placed in a client environment file.
- **Notification jobs** are persisted in Postgres. Item insert/update/delete triggers schedule, reschedule, or cancel future work. A dispatcher claims due jobs with `FOR UPDATE SKIP LOCKED`, records attempts, and retries temporary delivery failures with bounded backoff.
- **Resend** has two distinct roles: its SMTP service sends Supabase authentication codes, and the optional server helper can send non-authentication email. The digest helper is not wired to a public route.
- **The in-app planner** works independently of device-calendar access. Device-calendar export is an explicit per-device opt-in and per-item action that opens the operating system's event editor. Neither client reads or imports personal calendar events.

## Dates and recurring events

Planner dates are stored as a local calendar date plus optional local wall-clock time and IANA time zone. Shared TypeScript helpers convert a local time to an instant, reject nonexistent times during a daylight-saving gap, and choose the earlier instant for an ambiguous fall-back time. The database stores due instants in `timestamptz`. Weekly recurrence is limited to school events and represented by a bounded rule; clients and the dispatcher expand the occurrences.

Quiet-hour logic uses the user's configured time zone. If the quiet period ends during a daylight-saving gap, the next valid local minute is used. Server and device reminders use general lock-screen copy; private notes and item titles are not sent in push text.

## Delivery limits

The worker is designed for durable scheduling and retryable dispatch, not guaranteed notification delivery. Expo push acceptance is not proof of device display. Accepted tickets are recorded so later retries skip known successful devices; a process or network failure between Expo acceptance and the database write can still result in a duplicate attempt.

Deploy a scheduler that calls `POST /internal/notifications/dispatch` at least once per minute with `Authorization: Bearer <NOTIFICATION_CRON_SECRET>`. Do not depend on a sleeping in-process timer. Monitor the endpoint and `notification_delivery_log`, and keep a way to replay jobs that reach `failed` after the retry limit.

## Privacy and deletion

Clients can export account-owned rows and request deletion from the app. Express deletes the Supabase Auth user; database foreign-key cascades remove that user's profile, planner data, application records, devices, and notification history. The external account-deletion page explains the same route for store policy pages. Privacy and terms copy is a draft and must be reviewed with a real contact address and the deployed retention/support practices before release.
