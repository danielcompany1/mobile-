import 'dotenv/config';
import { z } from 'zod';

const optional = z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().optional());

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: optional,
  RESEND_FROM_EMAIL: optional,
  RESEND_REPLY_TO: optional,
  SMTP_HOST: optional,
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: optional,
  SMTP_PASS: optional,
  SMTP_FROM: optional,
  NOTIFICATION_CRON_SECRET: z.string().min(24),
});

export const env = schema.parse(process.env);

/** WEB_ORIGIN may list several origins separated by commas (e.g. local + production). */
export const webOrigins = env.WEB_ORIGIN.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
