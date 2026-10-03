# Implementation verification

## Passed

- Backend: 14 Node/MongoDB integration checks, against a process-specific temporary test database.
- Chromium: registration and verification, invitation before contact registration, explicit acceptance, session creation and authenticated reload, check-in, simulated movement and missed deadline, contact acknowledgement, resolution, completion/history, custom hazard map/report/filter, controlled live browser geolocation, API connection failure/recovery, queue cleanup, and mobile-width layout.
- TypeScript: `npx tsc --noEmit`.
- Expo lint: configured `npx expo lint`, no errors or warnings.
- Web static export and Android/iOS JavaScript/Hermes exports.
- Expo dependency compatibility check against the installed SDK 57 dependency map.
- Migration: tested twice on legacy fixtures; hashes and events retained, legacy contact access requires renewed consent.
- No unhandled browser runtime errors during the acceptance walkthrough.

The browser test uses local API/MongoDB services, preview email, a controlled browser location fixture, and placeholder map tiles. It exercises application behavior without claiming real GPS, provider delivery, or external map-service availability. Temporary test databases are removed after each run.

## Not available in this environment

- Physical Android/iOS development-build execution, screen-lock background updates, and native permission dialogs.
- Actual Resend email delivery: requires an approved sender and API key.
- Actual Expo/APNs/FCM push and provider receipts: requires project credentials and registered physical devices.
- App-store binary builds or submission.

These are external configuration/device checks, not results inferred from successful exports. See the root README for setup and the two-account physical-device acceptance scenario.

## Re-run

```sh
cd backend
npm test
cd ../mobile
npx tsc --noEmit
npx expo lint
npx expo export --platform web --output-dir /tmp/trailguard-web-rebuild
cd ../backend
npm run test:browser
```

The browser runner expects Chromium at `/usr/bin/chromium`; override `CHROMIUM_PATH` if needed. Set `WEB_EXPORT_DIR` to test another exported build.

Exports verify native bundles, not signed app binaries. The dependency check used the local Expo SDK compatibility map because network access was disabled.

