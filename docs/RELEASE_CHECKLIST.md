# Release checklist

## App configuration

- [ ] Replace `com.example.dueday` with owned iOS and Android identifiers and confirm the identifiers are available in the store accounts.
- [ ] Create/link the EAS project and add its real project ID to app config and local/deployment environment.
- [ ] Confirm app name, version, icon, adaptive icon, splash assets, notification icon, deep-link scheme, and permission strings on native builds.
- [ ] Use EAS development builds for physical-device push/calendar checks. Verify notification tap routes to the correct planner item on both platforms.
- [ ] Configure Apple signing, App Store Connect, Play signing, and the Android service-account file in EAS/secret storage. Do not commit those credentials.

## Services and security

- [ ] Apply the migration to the intended Supabase project and run `supabase test db`.
- [ ] Confirm all user-data tables have RLS enabled, the anon/authenticated clients cannot access notification jobs/logs, and users cannot create cross-owner course/checklist references.
- [ ] Configure email OTP template, expiry/rate limits, verified Resend SMTP sender, and Supabase redirect URLs.
- [ ] Verify no service-role key, Resend key, cron secret, or store credential appears in a browser/mobile bundle or repository.
- [ ] Deploy the API over HTTPS, configure the minute scheduler for notification dispatch, monitor attempts, and verify restart/retry behavior.
- [ ] Test account export, in-app deletion, external deletion instructions, sign-out token removal, and deletion cascade on a non-production account.
- [ ] Review privacy and terms drafts with actual contact, retention, processor, and support details. Add production support/deletion URLs.

## Physical-device manual checks

- [ ] iOS and Android: new-account OTP, returning sign-in, invalid/expired code, resend countdown, resend/network failure, session restore, and sign-out.
- [ ] iOS and Android: onboarding permission explanation, notification granted/denied, local reminders, quiet hours, global off, per-device push off, app background/terminated state, tapped push deep link, and token removal.
- [ ] iOS and Android: calendar export is explicitly enabled in Settings and opens an event editor only for the selected deadline; canceling the editor leaves DueDay's internal planner usable, and no personal calendar event is read/imported.
- [ ] iOS and Android: date/time in multiple time zones, DST spring gap/fall ambiguity, item edits, completion, deletion, and weekly class recurrence/reminder scheduling.
- [ ] Keyboard and assistive technology: screen reader labels, large text, focus order, color contrast, reduced motion, and web keyboard-only form use.
- [ ] Slow/offline connection: cached mobile planner reads, clear save/load errors, reconnection, and no duplicate deadline/checklist submissions.

## Store forms

- Current checks (November 11, 2026): Apple lists Xcode 26/iOS 26 SDK for submissions; Google Play lists Android API 36 for new apps and updates. Verify again in the linked official requirement pages before upload because store policies change.
- [ ] Complete Apple's privacy nutrition labels, age rating, screenshots, support URL, privacy policy URL, and account-deletion disclosures.
- [ ] Complete Google Play Data Safety, target API, content rating, screenshots, support/privacy URLs, and account-deletion URL.
- [ ] Review store rules and target SDK requirements immediately before submission; they can change after this checklist was written.
- [ ] Build signed production artifacts, review release notes, and submit only after an explicit product-owner decision. No store submission or publishing has been performed from this repository.

Official requirement pages: [Apple upcoming requirements](https://developer.apple.com/news/upcoming-requirements/?id=04282026a) · [Google Play target API level](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-MZ)
