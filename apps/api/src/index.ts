import { timingSafeEqual } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env, webOrigins } from './env.js';
import { requireUser } from './auth.js';
import { admin } from './supabase.js';
import { dispatchNotifications } from './push.js';
import { registerAuthRoutes } from './otp.js';
import { emailProvider } from './email.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: webOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['authorization', 'content-type'] }));
app.use(express.json({ limit: '32kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
const sensitiveLimit = rateLimit({ windowMs: 60 * 60_000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false });

app.get('/health', (_req, res) => res.json({ ok: true, service: 'dueday-api' }));

registerAuthRoutes(app);

app.put('/v1/push-devices', requireUser, async (req, res) => {
  const input = z.object({
    token: z.string().regex(/^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]+\]$/),
    platform: z.enum(['ios', 'android']), deviceName: z.string().max(100).optional(),
  }).safeParse(req.body);
  if (!input.success) return res.status(400).json({ error: 'Check the device notification details and try again.' });
  const { error } = await admin.from('push_devices').upsert({
    owner_id: req.userId!, expo_push_token: input.data.token, platform: input.data.platform,
    device_name: input.data.deviceName ?? null, last_seen_at: new Date().toISOString(),
  }, { onConflict: 'owner_id,expo_push_token' });
  if (error) return res.status(500).json({ error: 'We could not save this device yet. Try again later.' });
  return res.status(204).end();
});

app.delete('/v1/push-devices', requireUser, async (req, res) => {
  const token = z.string().safeParse(req.body?.token);
  if (!token.success) return res.status(400).json({ error: 'A device token is required.' });
  const { error } = await admin.from('push_devices').delete().eq('owner_id', req.userId!).eq('expo_push_token', token.data);
  if (error) return res.status(500).json({ error: 'We could not remove this device yet.' });
  return res.status(204).end();
});

app.delete('/v1/account', requireUser, sensitiveLimit, async (req, res) => {
  const { error } = await admin.auth.admin.deleteUser(req.userId!);
  if (error) return res.status(500).json({ error: 'Account deletion could not be completed. Please try again.' });
  return res.status(204).end();
});

app.post('/internal/notifications/dispatch', async (req, res) => {
  const authorization = req.header('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const expected = env.NOTIFICATION_CRON_SECRET;
  const suppliedBytes = Buffer.from(authorization);
  const expectedBytes = Buffer.from(expected);
  const matches = suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
  if (!matches) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    return res.json(await dispatchNotifications());
  } catch {
    return res.status(500).json({ error: 'Notification dispatch could not complete.' });
  }
});

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Do not log request bodies, access tokens, email codes, or student notes.
  console.error('request_failed', error instanceof Error ? error.name : 'unknown');
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(env.PORT, () => console.info(`DueDay API listening on ${env.PORT} (sign-in email via ${emailProvider})`));
