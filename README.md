# DueDay

DueDay is a private student deadline planner for iOS, Android, and web. Students can capture deadlines, break work into checklist steps, see what needs attention, and choose reminders in the deadline's time zone.

## Project status

This repository contains the app foundation and end-to-end product flows with placeholder service configuration. It is not connected to a Supabase project, an Expo/EAS project, or a store account, and it has not been submitted to either store. Replace the example app identifiers, review the draft legal pages, and complete the physical-device checks before release.

## Structure

- `apps/mobile` — Expo, React Native, and Expo Router client.
- `apps/web` — responsive Next.js companion and public pages.
- `apps/api` — Express endpoints and durable notification-job dispatcher.
- `packages/shared` — common types, date/time-zone logic, OTP helpers, and quiet-hours logic.
- `supabase/migrations` — database schema, ownership constraints, RLS, and reminder scheduling.
- `supabase/tests` — pgTAP tests for RLS and reminder scheduling.
- `docs` — setup, architecture, and release checks.

## Start here

To launch the mobile app, run these commands from this repository's root folder:

```sh
npx --yes pnpm@10.12.1 install
npx --yes pnpm@10.12.1 dev:mobile
```

These commands work without a global pnpm installation. The launch script builds the shared package and starts Expo in `apps/mobile`, where the Expo app and SDK dependency live. A plain `npm install` at the root only installs the root development tools; use the workspace install command above to install the apps as well.

1. Follow [the setup guide](docs/SETUP.md) to configure Supabase Auth/SMTP, environment files, and the notification dispatcher.
2. Review [the architecture notes](docs/ARCHITECTURE.md) and [release checklist](docs/RELEASE_CHECKLIST.md).
3. Run `npx --yes pnpm@10.12.1 test` and `npx --yes pnpm@10.12.1 typecheck`.

Mobile push and calendar integrations require a development build on a physical device; Expo Go is not a production-like test environment. Store submission remains a separate human-controlled step.
