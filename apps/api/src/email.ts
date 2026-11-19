import { Resend } from 'resend';
import { env } from './env.js';
import { renderSignInEmail } from './otp-email.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export const isEmailConfigured = Boolean(resend && env.RESEND_FROM_EMAIL);

/** Sends a sign-in code. Throws on failure; callers must not leak details to clients. */
export async function sendSignInCode(to: string, code: string, isNewUser: boolean) {
  if (!resend || !env.RESEND_FROM_EMAIL) throw new Error('email_not_configured');
  const { subject, html, text } = renderSignInEmail(code, isNewUser);
  const { error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject,
    html,
    text,
    ...(env.RESEND_REPLY_TO ? { replyTo: env.RESEND_REPLY_TO } : {}),
    headers: { 'X-Entity-Ref-ID': `${Date.now()}` }, // stops Gmail threading separate codes together
  });
  if (error) {
    // Log only the error class/name — never the recipient or code.
    console.error('signin_email_failed', error.name);
    throw new Error('email_send_failed');
  }
}

/** Optional non-auth email. */
export async function sendWeeklyDigest(to: string, firstName: string, upcomingCount: number) {
  if (!resend || !env.RESEND_FROM_EMAIL) throw new Error('Optional digest email is not configured.');
  return resend.emails.send({
    from: env.RESEND_FROM_EMAIL, to,
    subject: 'Your week in DueDay',
    text: `Hi ${firstName || 'there'}, you have ${upcomingCount} upcoming deadlines. Open DueDay to review your week.`,
  });
}
