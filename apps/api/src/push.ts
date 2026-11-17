import { z } from 'zod';
import { quietHoursEnd, type QuietHours } from '@dueday/shared';
import { admin } from './supabase.js';

const expoEndpoint = 'https://exp.host/--/api/v2/push/send';
const expoResultSchema = z.object({ data: z.array(z.object({ status: z.string(), id: z.string().optional(), message: z.string().optional(), details: z.object({ error: z.string().optional() }).optional() })) });

interface Job { id: string; owner_id: string; item_id: string; attempts: number }
interface Device { id: string; expo_push_token: string }

async function record(job: Job, device: Device | null, outcome: string, ticket?: string, errorCode?: string) {
  const { error } = await admin.from('notification_delivery_log').insert({
    owner_id: job.owner_id, job_id: job.id, device_id: device?.id ?? null,
    outcome, expo_ticket_id: ticket ?? null, error_code: errorCode ?? null,
  });
  if (error && !(outcome === 'accepted_by_expo' && error.code === '23505')) throw new Error('Could not record notification delivery attempt.');
}

export async function dispatchNotifications(batchSize = 100) {
  const { data: jobs, error: claimError } = await admin.rpc('claim_notification_jobs', { batch_size: batchSize });
  if (claimError) throw new Error(`Could not claim notification jobs (${claimError.code ?? 'database'}).`);
  let accepted = 0;
  let deferred = 0;
  let failed = 0;

  for (const job of (jobs ?? []) as Job[]) {
    const [devicesResult, prefsResult] = await Promise.all([
      admin.from('push_devices').select('id,expo_push_token').eq('owner_id', job.owner_id),
      admin.from('notification_preferences').select('enabled,push_enabled,quiet_hours_enabled,quiet_start,quiet_end,timezone').eq('owner_id', job.owner_id).maybeSingle(),
    ]);
    if (devicesResult.error || prefsResult.error) {
      await admin.from('notification_jobs').update({ status: 'queued', claimed_at: null, available_at: new Date(Date.now() + 60_000).toISOString() }).eq('id', job.id);
      failed += 1;
      continue;
    }

    const prefs = prefsResult.data;
    if (!prefs?.enabled) {
      await record(job, null, 'reminders_disabled');
      await admin.from('notification_jobs').update({ status: 'sent', claimed_at: null }).eq('id', job.id);
      continue;
    }

    const quiet: QuietHours = {
      enabled: Boolean(prefs.quiet_hours_enabled), start: prefs.quiet_start, end: prefs.quiet_end, timezone: prefs.timezone,
    };
    const deferUntil = quietHoursEnd(new Date(), quiet);
    if (deferUntil) {
      await record(job, null, 'deferred_quiet_hours');
      await admin.from('notification_jobs').update({ status: 'queued', claimed_at: null, available_at: deferUntil.toISOString() }).eq('id', job.id);
      deferred += 1;
      continue;
    }

    await admin.from('in_app_notifications').upsert({
      owner_id: job.owner_id, job_id: job.id, item_id: job.item_id,
      title: 'Deadline reminder', body: 'A deadline is coming up. Open DueDay to see what needs attention.',
    }, { onConflict: 'job_id', ignoreDuplicates: true });
    if (!prefs.push_enabled) {
      await record(job, null, 'push_disabled');
      await admin.from('notification_jobs').update({ status: 'sent', claimed_at: null }).eq('id', job.id);
      continue;
    }

    const devices = (devicesResult.data ?? []) as Device[];
    if (devices.length === 0) {
      await record(job, null, 'no_push_device');
      await admin.from('notification_jobs').update({ status: 'sent', claimed_at: null }).eq('id', job.id);
      continue;
    }

    const { data: priorSuccesses } = await admin.from('notification_delivery_log').select('device_id').eq('job_id', job.id).eq('outcome', 'accepted_by_expo');
    const alreadyAccepted = new Set((priorSuccesses ?? []).map((entry) => entry.device_id));
    const pendingDevices = devices.filter((device) => !alreadyAccepted.has(device.id));
    if (pendingDevices.length === 0) {
      await admin.from('notification_jobs').update({ status: 'sent', claimed_at: null }).eq('id', job.id);
      continue;
    }

    let temporaryFailure = false;
    for (let start = 0; start < pendingDevices.length; start += 100) {
      const batch = pendingDevices.slice(start, start + 100);
      try {
        const response = await fetch(expoEndpoint, {
          method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', 'accept-encoding': 'gzip, deflate' },
          body: JSON.stringify(batch.map((device) => ({
            to: device.expo_push_token, sound: 'default', title: 'Deadline reminder',
            body: 'A deadline is coming up. Open DueDay to see what needs attention.',
            data: { itemId: job.item_id, notificationId: job.id }, channelId: 'deadlines', priority: 'high',
          }))),
        });
        if (!response.ok) throw new Error(`expo_http_${response.status}`);
        const results = expoResultSchema.parse(await response.json()).data;
        if (results.length !== batch.length) throw new Error('expo_ticket_count_mismatch');
        for (const [index, result] of results.entries()) {
          const device = batch[index]!;
          if (result.status === 'ok') {
            accepted += 1;
            await record(job, device, 'accepted_by_expo', result.id);
          } else {
            const code = result.details?.error ?? 'expo_push_error';
            await record(job, device, 'rejected_by_expo', undefined, code);
            if (code === 'DeviceNotRegistered') await admin.from('push_devices').delete().eq('id', device.id);
            else temporaryFailure = true;
          }
        }
      } catch (error) {
        temporaryFailure = true;
        for (const device of batch) await record(job, device, 'temporary_error', undefined, error instanceof Error ? error.message.slice(0, 80) : 'push_error');
      }
    }

    if (temporaryFailure && job.attempts < 8) {
      const seconds = Math.min(3600, 30 * (2 ** Math.max(0, job.attempts - 1)));
      await admin.from('notification_jobs').update({ status: 'queued', claimed_at: null, available_at: new Date(Date.now() + seconds * 1000).toISOString() }).eq('id', job.id);
      failed += 1;
    } else {
      await admin.from('notification_jobs').update({ status: temporaryFailure ? 'failed' : 'sent', claimed_at: null }).eq('id', job.id);
    }
  }
  return { jobs: (jobs ?? []).length, accepted, deferred, failed };
}
