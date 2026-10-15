> APK 1.3.0 memakai Supabase yang sudah terpasang. Baca [panduan Supabase](../docs/SUPABASE.md). Dokumen di bawah menjelaskan backend Cloudflare alternatif.

# JCuki shared scheduling API

This folder is a standalone Cloudflare Worker with a D1 database. It is independent of the older ChatGPT Sites preview. The mobile app can run its labelled local demo immediately; real multiuser scheduling requires deploying this backend and setting `EXPO_PUBLIC_API_URL` in the mobile app.

## Deployment

From this folder:

```powershell
npm install
npx wrangler login
npx wrangler d1 create jcuki
```

Copy the returned D1 `database_id` into `wrangler.jsonc`, replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`. Review `ALLOWED_ORIGINS`: allow your exact HTTPS web preview origin if needed. Native Android/iOS requests do not use browser CORS. The rate limiter namespace `827913` must be unique within your account if another Worker uses the same namespace.

```powershell
npm run migrate:remote
npm run deploy
```

Set the deployed Worker origin in the app root `.env`:

```text
EXPO_PUBLIC_API_URL=https://jcuki-api.YOUR-SUBDOMAIN.workers.dev
```

Restart Expo after changing environment variables. This URL is public configuration, not a secret. Do not put any Cloudflare API token into the app, Expo public variables, or Git.

For local backend development:

```powershell
npm run migrate:local
npm run dev
```

The Android emulator can use `http://10.0.2.2:8787`; iOS simulator can use `http://localhost:8787`. Physical devices need a reachable HTTPS development endpoint. The client rejects plaintext remote origins.

## Identity and privacy

The native client generates a random 256-bit device secret and stores it in Expo SecureStore (web preview uses separate local browser storage). The API receives it as `Authorization: Bearer <64 lowercase hex characters>` over HTTPS. Only its SHA-256 digest is persisted as the member ID. Each install/browser is its own identity. Nicknames are display names and cannot be used to impersonate another identity.

This release has no password login, account recovery or automatic identity transfer between devices. Clearing application data/uninstalling may lose access. A production rollout needing recoverable accounts should integrate an identity provider before store distribution.

Group access requires membership. A random 12-character code grants membership when entered deliberately. Share it only with intended members. Groups and users are each limited to 50 memberships, enforced within SQLite writes. Group members can view each other's availability and profile photos, propose events, and respond independently. Only an event creator can cancel that event.

Profile photos accept JPEG/PNG only, up to 192 KiB decoded and 1024×1024 pixels. The app should resize/crop with Expo ImageManipulator before upload. Photos are served only to their owner or users sharing a group, with `Cache-Control: private, no-store`. React Native Image requests must include the device Authorization header, obtainable through `client.avatarHeaders()`. No arbitrary external avatar URL is accepted.

Requests are limited per device through the Worker rate limiting binding. Registration bursts also have a secondary network key. The backend fails closed if D1 or the limiter binding is missing. Before wider public signup, add abuse controls, account recovery and a documented retention policy appropriate to your deployment.

## API

All paths below are prefixed with `/api`. GET `/health` is public.

| Method | Path                                                 | Body / result                                                                                |
| ------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| PUT    | `/me`                                                | `{nickname,zone}` → Profile; provisions the current device                                   |
| GET    | `/me`                                                | Profile                                                                                      |
| PUT    | `/me/avatar`                                         | `{base64,mime}` → Profile                                                                    |
| DELETE | `/me/avatar`                                         | Removes photo → Profile                                                                      |
| GET    | `/avatars/:memberId`                                 | Private JPEG/PNG; owner/shared group members only                                            |
| PUT    | `/me/push`                                           | `{token,language,sound,zone}` → `{ok,deliveryEnabled}`; current device only                  |
| DELETE | `/me/push`                                           | Disable activity push for this device                                                        |
| GET    | `/groups/:id/activity?limit=20&cursor=…`             | `{items:Activity[],nextCursor}`; membership required                                         |
| GET    | `/groups?limit=20&cursor=…`                          | `{items:GroupSummary[],nextCursor}`                                                          |
| POST   | `/groups`                                            | `{name}` → GroupSummary                                                                      |
| POST   | `/join`                                              | `{code}` → GroupSummary                                                                      |
| GET    | `/groups/:id`                                        | Group with members and first 20 upcoming events                                              |
| PUT    | `/groups/:id/availability`                           | `{slots:[{id,start,end,status}]}`                                                            |
| PUT    | `/groups/:id/days-off`                               | `{daysOff:[{date,zone}],slots?:[]}` → `{daysOff}` with server-issued confirmation timestamps |
| GET    | `/groups/:id/events?view=upcoming&limit=20&cursor=…` | `{items:Event[],nextCursor}`; `view` can be `upcoming`, `history`, `all`                     |
| POST   | `/groups/:id/events`                                 | `{title,start,end,minimum}` → Event                                                          |
| PUT    | `/groups/:id/events/:eventId/response`               | `{value:'yes'                                                                                | 'maybe' | 'no'}` |
| DELETE | `/groups/:id/events/:eventId`                        | Cancels event                                                                                |

Use UTC ISO timestamps, e.g. `2026-10-12T13:00:00.000Z`. The app converts local wall time using IANA zones such as `Europe/Berlin` or `Asia/Jakarta`. This accounts for CET/CEST transitions. Skipped and ambiguous DST times require the user to select a different local hour; the app does not silently shift the intended time.

Apply **all three migrations**, including `0002_confirmed_days_off.sql` and `0003_activity_push.sql`, before deploying this version. An explicit day off uses `YYYY-MM-DD` and its original IANA zone, so a 25-hour daylight-saving day remains valid without a mandatory time interval. Availability updates never confirm a day implicitly. Only the authenticated member can update their own days. New past dates, invalid dates/zones, and duplicate dates are rejected. Confirmation timestamps are issued by the server; unchanged confirmations retain theirs. Optional hours can be updated atomically with cancellation.

Pagination is keyset based in SQL, scoped to the authenticated member/group/view, with a limit between 1 and 50. `getGroup()` returns `eventsNextCursor`; use `listEvents()` to continue the upcoming event collection. Event history needs its separate `view:'history'` request. Do not concatenate pages from different views.

## Notification scope

Activity push is implemented with authenticated device registration, an atomic activity/outbox transaction, Expo Push Service delivery, retry, receipts and a cron every minute. `PUSH_ENABLED` defaults to `"false"`; turn it on only after the Expo/Firebase/APNs configuration in [the notification guide](../docs/NOTIFICATIONS.md). Never store FCM service-account or APNs credentials in the app. Optional `EXPO_PUSH_ACCESS_TOKEN` is a Worker secret. No-op schedule/response writes do not create new activity. The sender is excluded, and current membership/opt-out is checked again immediately before sending.

Weekly reminders and reminders for synchronized accepted plans remain local OS schedules. Activity push does not execute a full schedule refresh while the app is closed. The client polls its active group every 30 seconds while open as a fallback. Do not describe polling as background delivery. This repo prepares the integration; real provider delivery needs configured native builds and device QA.

`activities` retains group-scoped history; `push_outbox` tracks pending/sending/ticket/delivered/failed/skipped jobs. There is no automatic retention cleanup. Apply a deployment-appropriate retention policy before broad use. A successful receipt is provider acceptance, not read confirmation. Delivery can be delayed or duplicated when a response is lost.

## Validation

Run from the app root with Node.js 24+:

```powershell
node --test tests/domain.test.mjs tests/backend.test.mjs tests/api-client.test.mjs tests/activity-push.test.mjs
```

The backend tests run the actual migration and actual parameterized SQL against Node's in-memory SQLite through a D1-shaped binding. They cover three independent identities, invitation/membership isolation, separate responses, cancellation ownership, server pagination, private bounded avatars, origin checks and invalid date rejection. Deployment to a real Cloudflare account still needs a smoke test after migrations.

Official configuration references: [D1 Worker API](https://developers.cloudflare.com/d1/worker-api/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/), [Workers rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

Develop by Terrence
