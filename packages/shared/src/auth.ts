export function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }

export function isValidEmail(email: string): boolean { return /^\S+@\S+\.\S+$/.test(normalizeEmail(email)); }

export const EMAIL_OTP_LENGTH = 8;

export function isValidEmailOtp(code: string, length: number = EMAIL_OTP_LENGTH): boolean {
  return new RegExp(`^\\d{${length}}$`).test(code.trim());
}

export function canResendCode(secondsRemaining: number): boolean {
  return Number.isFinite(secondsRemaining) && secondsRemaining <= 0;
}

export const INVALID_OR_EXPIRED_CODE_MESSAGE = 'That code may be incorrect or expired. Check it and try again.';
export const GENERIC_CODE_SENT_MESSAGE = 'If this address can receive a code, a new one is on its way.';

export type OtpRequestFailureKind = 'network' | 'rate_limited' | 'email_service' | 'request_failed';
export interface OtpRequestFailure {
  kind: OtpRequestFailureKind;
  message: string;
  diagnostic: { code: string | null; status: number | null };
}

export const OTP_REQUEST_FAILURE_MESSAGES: Record<OtpRequestFailureKind, string> = {
  network: 'We could not reach the sign-in service. Check your connection and try again.',
  rate_limited: 'Too many code requests. Wait a few minutes before trying again.',
  email_service: 'The sign-in email service is unavailable right now. Please try again later.',
  request_failed: 'We could not request a code right now. Please try again shortly.',
};

// Only recognized Auth codes and numeric status reach development diagnostics.
// Upstream messages can contain recipient details and must never be displayed or logged.
const otpRequestCodes = new Set([
  'bad_json', 'bad_jwt', 'captcha_failed', 'conflict', 'email_address_invalid',
  'email_address_not_authorized', 'email_exists', 'email_not_confirmed',
  'email_provider_disabled', 'hook_payload_invalid_content_type', 'hook_payload_over_size_limit',
  'hook_timeout', 'hook_timeout_after_retry', 'invalid_credentials', 'no_authorization',
  'otp_disabled', 'over_email_send_rate_limit', 'over_request_rate_limit', 'request_timeout',
  'signup_disabled', 'unexpected_failure', 'user_already_exists', 'user_banned',
  'user_not_found', 'validation_failed',
]);

export function getOtpRequestFailure(error: unknown): OtpRequestFailure {
  const candidate = error !== null && typeof error === 'object' ? error as Record<string, unknown> : {};
  const code = typeof candidate.code === 'string' && otpRequestCodes.has(candidate.code) ? candidate.code : null;
  const status = typeof candidate.status === 'number' && Number.isInteger(candidate.status)
    && candidate.status >= 0 && candidate.status <= 599 ? candidate.status : null;
  let kind: OtpRequestFailureKind = 'request_failed';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429) {
    kind = 'rate_limited';
  } else if (code === 'request_timeout') {
    kind = 'network';
  } else if (code === 'email_address_not_authorized' || code === 'email_provider_disabled'
    || code === 'otp_disabled' || (status !== null && status >= 500)) {
    kind = 'email_service';
  } else if (status === 0 || status === 408
    || (status === null && (candidate.name === 'AuthRetryableFetchError'
      || candidate.name === 'TypeError' || candidate.name === 'AbortError'))) {
    kind = 'network';
  }
  return { kind, message: OTP_REQUEST_FAILURE_MESSAGES[kind], diagnostic: { code, status } };
}

export class OtpRequestError extends Error {
  readonly kind: OtpRequestFailureKind;
  constructor(failure: OtpRequestFailure) {
    super(failure.message);
    this.name = 'OtpRequestError';
    this.kind = failure.kind;
  }
}
