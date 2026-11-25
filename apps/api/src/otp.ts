import type { Express } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { isValidEmail, normalizeEmail } from '@dueday/shared';
import { admin } from './supabase.js';
import { isEmailConfigured, sendSignInCode } from './email.js';

/**
 * Email sign-in codes.
 *
 * The API asks Supabase Auth (service role) to mint a one-time code, then delivers it with a
 * branded email through Resend. The client verifies the code with `supabase.auth.verifyOtp`
 * exactly as before, so sessions and RLS are unchanged. This avoids depending on Supabase's
 * built-in mailer, which only delivers to project team members.
 */

const RESEND_COOLDOWN_MS = 45_000;
const MAX_PER_EMAIL_PER_HOUR = 6;
const recentSends = new Map<string, number[]>();

function checkEmailBudget(email: string): 'ok' | 'cooldown' | 'hourly' {
  const now = Date.now();
  const sends = (recentSends.get(email) ?? []).filter((t) => now - t < 60 * 60_000);
  recentSends.set(email, sends);
  const last = sends[sends.length - 1];
  if (last !== undefined && now - last < RESEND_COOLDOWN_MS) return 'cooldown';
  if (sends.length >= MAX_PER_EMAIL_PER_HOUR) return 'hourly';
  return 'ok';
}

function recordSend(email: string) {
  recentSends.get(email)?.push(Date.now()) ?? recentSends.set(email, [Date.now()]);
}

// Housekeeping so the map does not grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const [email, sends] of recentSends) if (sends.every((t) => now - t > 60 * 60_000)) recentSends.delete(email);
}, 10 * 60_000).unref();

const ipLimit = rateLimit({
  windowMs: 15 * 60_000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Too many code requests. Wait a few minutes before trying again.', code: 'over_request_rate_limit' },
});

export function registerAuthRoutes(app: Express) {
  app.post('/v1/auth/email-code', ipLimit, async (req, res) => {
    const parsed = z.object({ email: z.string().max(254) }).safeParse(req.body);
    const email = parsed.success ? normalizeEmail(parsed.data.email) : '';
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.', code: 'email_address_invalid' });
    if (!isEmailConfigured) return res.status(503).json({ error: 'The sign-in email service is not configured.', code: 'email_provider_disabled' });

    const budget = checkEmailBudget(email);
    if (budget !== 'ok') {
      const retryAfter = budget === 'cooldown' ? Math.ceil(RESEND_COOLDOWN_MS / 1000) : 15 * 60;
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many code requests. Wait a moment before trying again.', code: 'over_email_send_rate_limit', retryAfter });
    }

    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    const code = data?.properties?.email_otp;
    if (error || !code) {
      // Banned/blocked accounts get the same generic response so addresses cannot be probed.
      if (error && (error.code === 'user_banned' || error.status === 422 || error.status === 403)) {
        recordSend(email);
        return res.status(202).json({ ok: true, codeLength: 8 });
      }
      console.error('signin_code_generate_failed', error?.code ?? error?.status ?? 'no_code');
      return res.status(503).json({ error: 'We could not create a sign-in code right now.', code: 'unexpected_failure' });
    }

    try {
      await sendSignInCode(email, code, data.properties.verification_type === 'signup');
    } catch {
      return res.status(503).json({ error: 'The sign-in email service is unavailable right now.', code: 'email_provider_disabled' });
    }
    recordSend(email);
    return res.status(202).json({ ok: true, codeLength: code.length });
  });
}
