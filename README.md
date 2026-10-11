# JCuki

**Develop by Terrence**

A native React Native / Expo app for friends with unpredictable shifts and different time zones. Android **13+ (API33)** and iPhone **iOS16.4+**. This repository contains native screens and native services, not the earlier PWA.

## Included

- Welcome/profile editor with nickname and system-gallery photo selection.
- Dashboard, weekly availability, overlapping free-time suggestions, group invitations, RSVP and confirmed plans.
- Indonesian/English, light/dark/system appearance, automatic or chosen IANA time zone, 24-hour/AM/PM. Berlin daylight-saving transitions are handled explicitly.
- Pagination: four cards per page in the UI; cursor pagination in the shared API, including previous plans.
- Weekly local reminders and accepted-plan reminders with the original **JCuki Chime**. Permission is requested after a user action. Android channels and bundled iOS sound are configured.
- Android home-screen widget and iOS WidgetKit extension, gallery image cropping/compression, calendar .ics export, and an uninstall entry leading to the operating system's removal flow.
- Minimum48×48 touch targets,20px page padding, bottom primary actions, instant press feedback, accessible labels, text scaling, reduced-motion loading skeletons and solid indigo accent.
- Cloudflare Worker + D1 shared backend in `backend/`, including real membership checks, private photos, rate limiting and server pagination.

## Run

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm start
```

Scan the Expo QR code for a quick screen preview. A standalone native build is needed for the custom notification sound and home-screen widgets. `npm run android` requires an Android SDK; `npm run ios` requires macOS and Xcode26.4+.

For browser layout review, `npm run web` runs the same React Native screens. Browser preview cannot verify native widgets or OS notification sound.

## APK / iPhone

Push to `main` starts GitHub Actions and builds a standalone Android preview APK. Open **Actions → JCuki mobile build → successful run → Artifacts → JCuki-Android13-preview**, unzip and install the APK on Android13+. This preview uses the Expo template debug signing key; it is for testing. Production Play Store publishing needs a private release key. See [build instructions](docs/BUILD.md).

The optional manual workflow can compile an unsigned iOS Simulator app. A physical iPhone build needs an Apple Developer account, device provisioning and EAS/Xcode signing; Android APKs cannot be installed on iPhone. `eas.json` includes preview, simulator and production profiles.

## Shared schedules

Without a configured server, **Explore a demo** uses clearly labelled sample members on this device. It does not connect real friends. Deploy `backend/` following [backend instructions](backend/README.md), then set `EXPO_PUBLIC_API_URL` (or the GitHub repository variable of the same name) before building. The preview also accepts the HTTPS address in Settings → Group connection.

Create a group, share its code, and have friends enter it from their own installed app. Each device has a private random identity. This first version does not provide account recovery across devices or server-push updates; schedules refresh on foreground/pull-to-refresh. Local reminders reflect the plans last synchronized, including previously viewed groups. Reinstalling/resetting device storage can lose membership access. Add recoverable account sign-in before wider distribution.

Explicit-zone Android weekly reminders are scheduled12weeks ahead and refreshed when the app is opened. Device-zone reminders repeat weekly. Remote changes made while the app is closed require a refresh to update local reminders. Notification delivery depends on operating-system settings.

## Validation and remaining device checks

Behavior tests cover three independent users, private group access, photo limits, pagination, timezone/DST conversion, overlap matching, device identity, persistence ordering, translation completeness and sound-file properties. Expo compatibility, TypeScript, ESLint and production JavaScript bundling are checked before push. Native gallery permissions, chime playback, widget installation and real-device accessibility still need Android/iPhone device QA.

The Expo57 dependency tree retains development-tool audit findings; the malformed-URI decoder used by routing is pinned to its patched0.5.0 version. Do not force an unsupported Expo major upgrade using `npm audit fix --force`.
