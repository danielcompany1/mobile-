import test from 'node:test';
import assert from 'node:assert/strict';
import { canResendCode, EMAIL_OTP_LENGTH, GENERIC_CODE_SENT_MESSAGE, getOtpRequestFailure, INVALID_OR_EXPIRED_CODE_MESSAGE, isValidEmail, isValidEmailOtp, normalizeEmail, OtpRequestError, OTP_REQUEST_FAILURE_MESSAGES } from './auth.ts';

test('OTP email flow normalizes and validates addresses without account lookup', () => {
  assert.equal(normalizeEmail('  Student@School.EDU '), 'student@school.edu');
  assert.equal(isValidEmail('student@school.edu'), true);
  assert.equal(isValidEmail('not-an-email'), false);
});

test('OTP entry boundary accepts eight digits and rejects shorter, longer, or nonnumeric codes', () => {
  assert.equal(EMAIL_OTP_LENGTH, 8);
  assert.equal(isValidEmailOtp('12345678'), true);
  assert.equal(isValidEmailOtp('00000000'), true);
  assert.equal(isValidEmailOtp('123456'), false);
  assert.equal(isValidEmailOtp('1234567'), false);
  assert.equal(isValidEmailOtp('123456789'), false);
  assert.equal(isValidEmailOtp('1234a678'), false);
  assert.equal(isValidEmailOtp('1234 678'), false);
  assert.equal(isValidEmailOtp(' 12345678 '), true);
});

test('resend stays disabled until the server-configured cooldown ends', () => {
  assert.equal(canResendCode(1), false);
  assert.equal(canResendCode(0), true);
  assert.equal(canResendCode(-1), true);
  assert.equal(canResendCode(Number.NaN), false);
});

test('auth messages do not reveal whether an email has an account', () => {
  assert.equal(GENERIC_CODE_SENT_MESSAGE, 'If this address can receive a code, a new one is on its way.');
  assert.match(INVALID_OR_EXPIRED_CODE_MESSAGE, /incorrect or expired/);
});

test('OTP request throttling is recognized by stable Supabase codes or HTTP 429', () => {
  for (const error of [
    { code: 'over_email_send_rate_limit', status: 422 },
    { code: 'over_request_rate_limit', status: 429 },
    { status: 429 },
  ]) {
    const failure = getOtpRequestFailure(error);
    assert.equal(failure.kind, 'rate_limited');
    assert.equal(failure.message, OTP_REQUEST_FAILURE_MESSAGES.rate_limited);
  }
  assert.deepEqual(getOtpRequestFailure({ code: 'over_email_send_rate_limit', status: 422 }).diagnostic,
    { code: 'over_email_send_rate_limit', status: 422 });
});

test('OTP request network failures differ from email-service configuration or server failures', () => {
  for (const error of [new TypeError('Network details must not escape'),
    { name: 'AuthRetryableFetchError', status: 0 }, { code: 'request_timeout', status: 504 }]) {
    assert.equal(getOtpRequestFailure(error).kind, 'network');
  }
  for (const error of [{ code: 'email_address_not_authorized', status: 403 },
    { code: 'email_provider_disabled', status: 422 }, { code: 'otp_disabled', status: 422 },
    { code: 'unexpected_failure', status: 500 }, { name: 'AuthRetryableFetchError', status: 503 }]) {
    assert.equal(getOtpRequestFailure(error).kind, 'email_service');
  }
});

test('OTP request account-specific errors share generic text and discard upstream message details', () => {
  for (const code of ['email_exists', 'user_already_exists', 'user_not_found', 'user_banned', 'signup_disabled']) {
    const failure = getOtpRequestFailure({ code, status: 422, message: 'Private recipient and account details' });
    assert.equal(failure.kind, 'request_failed');
    assert.equal(failure.message, OTP_REQUEST_FAILURE_MESSAGES.request_failed);
    const safeError = new OtpRequestError(failure);
    assert.equal(safeError.message, failure.message);
    assert.equal(safeError.kind, 'request_failed');
    assert.equal(safeError.cause, undefined);
  }
});

test('OTP diagnostics contain only allowlisted Auth code and bounded numeric HTTP status', () => {
  const failure = getOtpRequestFailure({
    code: 'sb_secret_private_value', status: '429', email: 'private@example.test', token: '12345678',
    get message() { throw new Error('Upstream messages must not be accessed'); },
  });
  assert.deepEqual(failure.diagnostic, { code: null, status: null });
  assert.deepEqual(getOtpRequestFailure({ code: 'email_address_not_authorized', status: 403 }).diagnostic,
    { code: 'email_address_not_authorized', status: 403 });
  assert.deepEqual(getOtpRequestFailure({ code: 'unexpected_failure', status: 600 }).diagnostic,
    { code: 'unexpected_failure', status: null });
  assert.equal(getOtpRequestFailure(null).message, OTP_REQUEST_FAILURE_MESSAGES.request_failed);
});
