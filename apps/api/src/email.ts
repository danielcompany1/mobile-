import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { env } from './env.js';
import { renderSignInEmail } from './otp-email.js';

/**
 * Two delivery options:
 *  - SMTP (e.g. Gmail + app password): used when SMTP_HOST/SMTP_USER/SMTP_PASS are set.
 *    Delivers to any recipient without owning a domain (Gmail allows ~500/day).
 *  - Resend: used otherwise. Needs a verified domain to send to anyone but the account owner.
 */
const smtp = env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS.replace(/\s+/g, '') },
    })
  : null;
const resend = !smtp && env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const fromAddress = smtp ? (env.SMTP_FROM ?? `DueDay <${env.SMTP_USER}>`) : env.RESEND_FROM_EMAIL;

export const isEmailConfigured = Boolean((smtp || resend) && fromAddress);
export const emailProvider = smtp ? 'smtp' : resend ? 'resend' : 'none';

interface Message { to: string; subject: string; html?: string; text: string; headers?: Record<string, string> }

async function deliver(message: Message) {
  if (!fromAddress) throw new Error('email_not_configured');
  const replyTo = env.RESEND_REPLY_TO;
  if (smtp) {
    await smtp.sendMail({ from: fromAddress, ...message, ...(replyTo ? { replyTo } : {}) });
    return;
  }
  if (!resend) throw new Error('email_not_configured');
  const { error } = await resend.emails.send({ from: fromAddress, ...message, ...(replyTo ? { replyTo } : {}) });
  if (error) {
    const e = new Error(error.message);
    e.name = error.name;
    throw e;
  }
}

/** Sends a sign-in code. Throws on failure; callers must not leak details to clients. */
export async function sendSignInCode(to: string, code: string, isNewUser: boolean) {
  const { subject, html, text } = renderSignInEmail(code, isNewUser);
  try {
    // X-Entity-Ref-ID stops Gmail threading separate codes together.
    await deliver({ to, subject, html, text, headers: { 'X-Entity-Ref-ID': `${Date.now()}` } });
  } catch (error) {
    // Log the provider's reason (never the code). Resend's testing-sender restriction shows up here.
    const reason = error instanceof Error ? `${error.name}: ${error.message.replace(/[^\s@]+@[^\s@]+/g, '<email>')}` : 'unknown';
    console.error(`signin_email_failed [${emailProvider}]`, reason);
    throw new Error('email_send_failed');
  }
}

/** Optional non-auth email. */
export async function sendWeeklyDigest(to: string, firstName: string, upcomingCount: number) {
  return deliver({
    to, subject: 'Your week in DueDay',
    text: `Hi ${firstName || 'there'}, you have ${upcomingCount} upcoming deadlines. Open DueDay to review your week.`,
  });
}
