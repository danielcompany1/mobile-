import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@dueday/shared';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/** Splits an 8-digit code as "1234 5678" so it is easier to read and type. */
function groupCode(code: string): string {
  return code.length >= 6 ? `${code.slice(0, Math.ceil(code.length / 2))} ${code.slice(Math.ceil(code.length / 2))}` : code;
}

export function renderSignInEmail(code: string, isNewUser: boolean) {
  const safeCode = escapeHtml(code);
  const grouped = escapeHtml(groupCode(code));
  const heading = isNewUser ? `Welcome to ${PRODUCT_NAME}` : 'Your sign-in code';
  const intro = isNewUser
    ? 'You’re one step away from a calmer semester. Enter this code to create your account:'
    : `Enter this code in ${PRODUCT_NAME} to finish signing in:`;
  const subject = `${code} is your ${PRODUCT_NAME} code`;

  const text = [
    `${heading}`,
    '',
    intro,
    '',
    `    ${groupCode(code)}`,
    '',
    'This code works once and expires soon. Never share it with anyone, including people who say they work for DueDay.',
    '',
    'If you didn’t request this, you can safely ignore this email.',
    '',
    `${PRODUCT_NAME} · ${PRODUCT_TAGLINE}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(subject)}</title>
<style>
  @media (prefers-color-scheme: dark) {
    .bg { background:#0e1611 !important; }
    .card { background:#1a2820 !important; border-color:#2c3d32 !important; }
    .ink { color:#edf3ee !important; }
    .muted { color:#a7b4aa !important; }
    .codebox { background:#24372a !important; border-color:#3b5543 !important; }
    .code { color:#d8ee8f !important; }
    .divider { border-color:#2c3d32 !important; }
  }
  @media (max-width: 520px) {
    .pad { padding:32px 22px !important; }
    .code { font-size:34px !important; letter-spacing:5px !important; }
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:#f1f3ec;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${grouped} is your ${PRODUCT_NAME} code. It expires soon.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg" style="background:#f1f3ec;">
  <tr><td align="center" style="padding:40px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;">
      <tr><td style="padding:0 6px 22px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:40px;height:40px;border-radius:13px;background:#345b43;color:#d8ee8f;font:700 21px/40px Arial,Helvetica,sans-serif;text-align:center;">&#10003;</td>
          <td class="ink" style="padding-left:11px;font:800 19px Arial,Helvetica,sans-serif;color:#15241d;letter-spacing:-0.4px;">${PRODUCT_NAME}</td>
        </tr></table>
      </td></tr>
      <tr><td class="card" style="background:#ffffff;border:1px solid #e3e8df;border-radius:24px;overflow:hidden;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="height:6px;background:#345b43;background-image:linear-gradient(90deg,#345b43,#7fa66b,#d8ee8f);font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td class="pad" style="padding:40px 40px 34px;font-family:Arial,Helvetica,sans-serif;">
            <p class="muted" style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:1.8px;color:#345b43;text-transform:uppercase;">${isNewUser ? 'Create your account' : 'Secure sign-in'}</p>
            <h1 class="ink" style="margin:0 0 14px;font-size:28px;line-height:1.2;letter-spacing:-0.8px;color:#15241d;">${escapeHtml(heading)}</h1>
            <p class="muted" style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#5d6d62;">${escapeHtml(intro)}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td class="codebox" align="center" style="padding:24px 10px;background:#f2f7ec;border:1px dashed #b9d09f;border-radius:18px;">
                <div class="code" style="font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:40px;font-weight:700;letter-spacing:8px;color:#244b36;white-space:nowrap;" aria-label="${safeCode.split('').join(' ')}">${grouped}</div>
                <div class="muted" style="margin-top:10px;font-size:12px;color:#6c7b70;">Works once &middot; expires soon</div>
              </td>
            </tr></table>
            <p class="muted" style="margin:28px 0 0;font-size:13px;line-height:1.65;color:#5d6d62;">
              <strong class="ink" style="color:#15241d;">Keep it private.</strong> ${PRODUCT_NAME} will never ask you for this code by phone, text, or email.
            </p>
            <hr class="divider" style="border:0;border-top:1px solid #edf0eb;margin:26px 0 18px;">
            <p class="muted" style="margin:0;font-size:12px;line-height:1.6;color:#86928a;">Didn’t request this? You can safely ignore this email &mdash; no one can sign in without the code.</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" class="muted" style="padding:22px 10px 0;font:12px/1.6 Arial,Helvetica,sans-serif;color:#86928a;">
        ${PRODUCT_NAME} &middot; ${escapeHtml(PRODUCT_TAGLINE)}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { subject, html, text };
}
