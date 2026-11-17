# Local setup

## Requirements

- Node.js 22 LTS or newer compatible with the current Next.js and Expo SDK releases.
- pnpm 10.12.1. The commands below use `npx` so a global pnpm or Corepack installation is optional.
- Supabase CLI for local database work; Expo/EAS CLI for device builds.
- Xcode and an iOS device for iOS native checks; Android Studio and a physical Android device for Android native checks.

Version references were checked against the [Expo SDK reference](https://docs.expo.dev/versions/latest/), [Expo Router](https://docs.expo.dev/router/introduction/), [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/), [Supabase React Native auth](https://supabase.com/docs/guides/auth/quickstarts/react-native), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Resend SMTP](https://resend.com/changelog/smtp-service), and [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation). This repository pins the compatible Expo SDK 58 family for mobile.

## Install and database

```sh
npx --yes pnpm@10.12.1 install
supabase start
supabase db reset
supabase test db
```

Run the install command from the repository root. It installs mobile, web, API, and shared-package dependencies together. The root folder is a workspace; the Expo project itself is in `apps/mobile`.

The reset applies `supabase/migrations`; `supabase test db` runs the pgTAP ownership and reminder suites. For a hosted project, create/link the project and use `supabase db push` after reviewing the migration. Keep project credentials out of this repository.

In Supabase Auth, set the site URL to the deployed web origin. Add the development web callback and the deployed `/auth/callback` URL to the allowed redirect URLs. Enable email sign-up. The clients show the same generic sent message for new and returning sign-in addresses.

## Configure sign-in emails as codes

`signInWithOtp` can send either a link or a code depending on the Supabase email template. DueDay expects an eight-digit code. If an email arrives with a sign-in link, update the templates in the Supabase project used by the app.

For hosted Free projects created on or after June 3, 2026, Supabase locks email-template editing while its default SMTP service is in use. Configure custom SMTP first using the Resend setup below; a paid plan (Pro or higher) also permits template editing with the default service. Older Free projects retain their existing template access. See [Supabase's template customization policy](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier). Changing the client API call or OTP length does not replace the email's link with a code; Supabase's [email OTP instructions](https://supabase.com/docs/guides/auth/auth-email-passwordless#enabling-email-otp) require the token template.

For a hosted project:

1. Open the intended project in **Supabase Dashboard → Authentication → Email Templates** (under **Emails → Templates** in some dashboard layouts).
2. Open **Magic Link** (also called **Magic link or OTP**). Set the subject to **Your DueDay sign-in code**. Replace the entire HTML body with the contents of [`supabase/templates/sign-in.html`](../supabase/templates/sign-in.html), then save.
3. Open **Confirm signup**. Set the same subject and HTML body, then save. This covers the first-time account flow as well as returning sign-in.
4. In the project's **Authentication → Email** provider settings, set **Email OTP length** to **8** and review **Email OTP expiration** and the send-rate limit. The app's entry fields accept eight digits through the shared `EMAIL_OTP_LENGTH` constant; the local project uses a 600-second expiry. Keep hosted values and client resend countdowns aligned with the intended configuration.
5. Request a fresh code from DueDay after the resend countdown. Confirm that the new email contains the code and that entering it in DueDay completes sign-in. Verify both a new address and a returning account when checking the release.

The sign-in template renders `{{ .Token }}` and has no sign-in hyperlink or `{{ .ConfirmationURL }}`. Keep Supabase's confirmation link in the separate **Change Email Address** template, which the Settings email-change flow uses.

`supabase/config.toml` configures both local template sections, `auth.email.template.magic_link` and `auth.email.template.confirmation`, to use the checked-in HTML file. Those settings apply to the local Supabase stack; editing the file or running `supabase db push` does **not** update a hosted project's email templates. After changing local templates/configuration, run `supabase stop` and then `supabase start`; inspect locally generated messages in Mailpit.

See Supabase's official [email template guide](https://supabase.com/docs/guides/auth/auth-email-templates), [local template configuration](https://supabase.com/docs/guides/local-development/customizing-email-templates), and [OTP length setting](https://supabase.com/docs/guides/local-development/cli/config#auth.email.otp_length).

## Authentication email through Resend SMTP

For sending codes to students, verify a sending domain in Resend and use its SMTP credentials in **Supabase Dashboard → Authentication → SMTP Settings**:

- Host: `smtp.resend.com`
- Port: `465` with SSL (or Resend's supported TLS port)
- Username: `resend`
- Password: a Resend API key with sending access
- Sender: a verified address on your domain

For an optional test of the locally running app against hosted Supabase before verifying a domain, use `onboarding@resend.dev` as the sender with the same SMTP settings. Send only to the email address associated with your Resend account: Resend restricts its testing domain to that recipient. Replace this sender with an address on your verified domain before inviting students or testing other addresses. See Resend's [SMTP settings and test-sender example](https://resend.com/docs/send-with-smtp) and [testing-domain recipient restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain). A local Supabase stack can continue to use Mailpit without configuring Resend.

Supabase's built-in mail service is for development/testing; configure custom SMTP before production. The Resend API key used for SMTP belongs in the Supabase dashboard, never in the app. A separate `RESEND_API_KEY` in the API service is optional and is only for non-auth mail.

## Environment files

Copy each example into the matching ignored local file and fill in values from your own project:

```sh
cp apps/mobile/.env.example apps/mobile/.env.local
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Edit the copied `.env.local` / `.env` files. The `.env.example` files are templates and are not loaded by the apps; keep placeholder values in those templates. The local files are ignored by Git.

- Mobile and web receive only the Supabase URL and **publishable** key.
- API needs `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, the server-only `SUPABASE_SERVICE_ROLE_KEY`, and a random `NOTIFICATION_CRON_SECRET` of at least 24 characters.
- `WEB_ORIGIN` must match the web app origin. For mobile testing on a phone, use the computer's LAN address for `EXPO_PUBLIC_API_URL`, not `localhost`.
- Replace placeholder bundle/package identifiers in `apps/mobile/app.json` with identifiers owned by you. Run `eas project:init`, then set the resulting project ID in `EXPO_PUBLIC_EAS_PROJECT_ID` and the Expo app config's `extra.eas.projectId` before building.
- Set `EXPO_PUBLIC_WEB_URL` to the deployed web origin so mobile legal/help links work.

Do not commit local environment files, service-role keys, Apple credentials, Google service-account JSON, or signing keys. `.gitignore` excludes common local secret files.

## Run the apps

```sh
npx --yes pnpm@10.12.1 dev:api
npx --yes pnpm@10.12.1 dev:web
npx --yes pnpm@10.12.1 dev:mobile
```

Start each command from the repository root in its own terminal after installing dependencies. These scripts build the shared package automatically, then start the selected app in its own folder. If pnpm is installed globally, `pnpm dev:mobile` and the equivalent web/API commands also work. For a physical phone, update mobile API and web URLs to LAN-accessible/deployed addresses. The API's CORS origin is intentionally configured to one web origin; native requests do not rely on browser CORS.

If Expo reports that it cannot determine the SDK version after running `npx expo start` in the root, use `npx --yes pnpm@10.12.1 dev:mobile` instead. After installing dependencies and building the shared package, you can also run Expo directly with `cd apps/mobile` followed by `npx expo start`.

For Expo Go on a physical iPhone, sign into the same Expo account in the terminal and in Expo Go. This Expo account is separate from your DueDay email sign-in. From the repository root, run:

```sh
npx --yes pnpm@10.12.1 --filter @dueday/mobile exec expo login
npx --yes pnpm@10.12.1 --filter @dueday/mobile exec expo whoami
```

In Expo Go, open the account icon and sign into that same account. Restart the development server with `npx --yes pnpm@10.12.1 dev:mobile` and scan the QR code again. See [Expo's sign-in troubleshooting guide](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/).

## Durable reminder dispatcher

Deploy `apps/api` as a persistent HTTPS service with its private environment variables. Configure the hosting provider's cron/scheduler to call the internal dispatch endpoint every minute using the same `NOTIFICATION_CRON_SECRET`. The endpoint is rate-limited and requires the bearer secret. Postgres stores pending jobs, so the schedule remains available across API restarts.

Configure EAS project credentials and push credentials through EAS. Use a development build on a real iOS/Android device to test remote push; local notification behavior, permission denial, token removal, deep links, quiet hours, and item edits should also be checked. Expo Go is not sufficient for production-like push testing. Calendar export uses the operating system's event editor for a selected item and does not read personal calendar data.

## Tests and builds

```sh
pnpm test
pnpm typecheck
pnpm --filter @dueday/shared build
pnpm --filter @dueday/web build
pnpm --filter @dueday/api build
```

Run `supabase test db` for the pgTAP ownership and scheduled-reminder suites. Build the mobile development/preview/production profiles with `eas build --profile development|preview|production --platform ios|android`. Review `apps/mobile/eas.json` submission placeholders before using `eas submit`.

## OTP and notification operations

The `EXPO_PUBLIC_AUTH_RESEND_COOLDOWN_SECONDS` and `NEXT_PUBLIC_AUTH_RESEND_COOLDOWN_SECONDS` values are presentation countdowns. Keep them aligned with Supabase Auth's configured rate limit; Supabase remains the enforcement point. `otp_expiry` and `otp_length` are configured in `supabase/config.toml` for local Supabase and should match the hosted Auth settings and email template.

`notification_jobs` stores due times in UTC; each item preserves its local zone. Failed jobs stop retrying after eight attempts. Monitor job status and Expo ticket errors, especially `DeviceNotRegistered`; the worker removes invalid tokens. Do not promise that a push notification will arrive or be displayed.
