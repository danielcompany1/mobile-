import { Resend } from 'resend';
import { env } from './env.js';

/** Optional non-auth email. Auth codes are sent by Supabase Auth through its SMTP configuration. */
export async function sendWeeklyDigest(to: string, firstName: string, upcomingCount: number) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) throw new Error('Optional digest email is not configured.');
  const resend = new Resend(env.RESEND_API_KEY);
  return resend.emails.send({
    from: env.RESEND_FROM_EMAIL, to,
    subject: 'Your week in DueDay',
    text: `Hi ${firstName || 'there'}, you have ${upcomingCount} upcoming deadlines. Open DueDay to review your week.`,
  });
}
