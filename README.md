# TrailGuard

A safety companion for cycling, running, and trekking. One Expo Router application runs on web, Android, and iOS; a modular Express API and MongoDB-backed worker manage safety sessions and alerts.

## Run locally

Requires Node 22.13 or newer, npm, and a running MongoDB instance.

1. In `backend`, run `npm install`. Copy `.env.example` to `.env` and replace `JWT_SECRET` with a random secret of at least 24 characters (for example, generate one with `openssl rand -hex 32`).
2. If you used the old prototype, run `npm run migrate` in `backend` once before starting this version. Back up your database first. Migration preserves accounts/history, requires renewed contact consent, labels old locations simulated, and closes older duplicate unfinished sessions with an explanatory timeline event.
3. Run `MAIL_MODE=preview npm run dev` in `backend` for a fully local workflow. The API starts its five-second deadline worker automatically.
4. In `mobile`, run `npm install`, copy `.env.example` to `.env`, and set `EXPO_PUBLIC_API_URL`.
5. Run `npm run web` in `mobile` and open the displayed localhost address. If Metro has cached the prototype, run `npx expo start --clear`.

The local preview mailbox is visible in Verify Email and Profile when `MAIL_MODE=preview`. Messages are persisted but **not sent**. It is disabled in production. Verification and reset tokens are never printed in server logs. Use separate browser profiles/incognito windows for athlete and contact accounts.

### Two-account walkthrough

Register the athlete → verify using the local mailbox → invite a contact by email → register/verify the contact in a second browser → accept the invitation in Contacts → return to the athlete → start a session.

Live mode requests your real location. Demo mode uses labelled Kathmandu coordinates and offers movement/missed-check-in controls. A contact can open ongoing sessions from Home and acknowledge alerts. The athlete can check in, extend expected finish, send SOS, and finish safely. Completed sessions appear in History. Map and Report Hazard support custom descriptions, map locations, categories, severity, and recency.

An acknowledgement does not clear the safety alert. A check-in clears it, unless the expected finish has passed; extend the finish or complete the activity in that case. Completed sessions cannot restart. Removing a contact is blocked until their shared activity finishes.

## Device API addresses

- Browser / iOS simulator: `http://localhost:5000/api`
- Android emulator: `http://10.0.2.2:5000/api`
- Physical phone: `http://YOUR_COMPUTER_LAN_IP:5000/api`

Phone and computer must share a network and the computer firewall must allow port 5000. API listens on all interfaces. Browser geolocation requires localhost or HTTPS. Local native HTTP behavior depends on the development build/platform; use an HTTPS development tunnel if required. Restart Expo after changing public environment variables.

## Native development builds

Expo Go cannot validate background location or remote push. Install the SDK-compatible dependencies, set your unique native application identifiers in `mobile/app.config.js`, and configure your Expo project ID.

From `mobile`:
```sh
npx eas-cli@latest build --profile development --platform android
# or --platform ios
npx expo start --dev-client
```

Configure Android Google Maps API credentials through `GOOGLE_MAPS_ANDROID_API_KEY` when creating native builds. iOS uses Apple Maps by default; `GOOGLE_MAPS_IOS_API_KEY` is available for Google Maps configuration. Provide the keys to the build environment, not source control.

Enable location permission, then use Profile → Enable background tracking. Android requires background permission and a foreground-service notification; iOS requires Always permission. Updates target approximately 30 seconds / 25 metres, but the OS controls actual timing. Force-closing an app, OS restrictions, or device power policies can stop updates. Session views show location age and accuracy. Up to 500 offline pings are retained for at most 24 hours and retried; old pings cannot overwrite newer coordinates. Finish/sign-out stops local tracking and clears queued data.

## Real alert delivery

### Email via Resend

Set `MAIL_MODE=resend`, `RESEND_API_KEY`, and `MAIL_FROM` (an approved sender/domain). Set `APP_URL` to the browser URL recipients can actually reach. Account verification, invitations, password reset, and safety alerts use the persistent email queue.

### Expo push

Configure EAS project ID, APNs/FCM credentials, and physical-device development builds. Set `EXPO_PUBLIC_EAS_PROJECT_ID` in the mobile environment and `PUSH_ENABLED=true` in the backend after setup. Set `EXPO_ACCESS_TOKEN` if Expo enhanced push security is enabled. Each contact enables push in Profile to register their device.

The backend evaluates check-in and expected-finish deadlines even with no app open. It retries failed jobs at increasing intervals (up to five attempts), recovers expired worker leases, cancels unsent alerts when resolved, and checks Expo push receipts. Provider acceptance does not confirm that a recipient saw an alert. Missing provider configuration and failures appear in session delivery status. Expo delivery is at-least-once; a provider timeout can cause a duplicate push even though alert and queue records are deduplicated.

The computer/API must remain running and reachable for live coordination. For a separate worker process, set `RUN_WORKER=false` on the API and run `npm run worker` with the same environment. Local process authentication rate limits must move to a shared store before multiple API instances are deployed.

## Structure

```text
backend/
  server.js                 configuration/startup/shutdown
  worker.js                 standalone worker entry
  src/app.js                exported Express application
  src/routes/               explicit domain endpoints
  src/controllers/          HTTP request/response handling
  src/models/               persistence and constraints
  src/middleware/           auth, validation, errors, rate limits
  src/services/             session transitions and mail queue
  src/worker.js             deadlines, delivery leases and receipts
  scripts/migrate.js        prototype compatibility migration
  tests/api.test.js         isolated MongoDB API integration checks
mobile/
  src/app/                  Expo Router auth, tabs and detail routes
  src/components/           shared UI and platform maps
  src/lib/                  typed API, tracking, offline queue and push
```

Existing JWTs from the prototype need a fresh login. Contacts must accept the new sharing relationship; existing history remains visible to owners.

## Checks

```sh
cd backend
npm test
cd ../mobile
npx tsc --noEmit
npx expo lint
npx expo export --platform web
npx expo export --platform android
npx expo export --platform ios
```

Integration tests use only their own `trailguard_test_<pid>` MongoDB database and remove it afterward. They do not touch `trailguard`.

Real-device acceptance requires two physical development builds and configured providers: verify mobile foreground/background tracking, denied permissions, phone lock/reopen, temporary API outage, push tap navigation, and actual email receipt. Successful bundles and mocked provider checks do not substitute for those device checks.

TrailGuard coordinates trusted contacts. It does not dispatch emergency services or guarantee continuous tracking or notification delivery.

