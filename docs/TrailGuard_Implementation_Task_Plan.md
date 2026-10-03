# TrailGuard Implementation Task Plan

**MVP target:** Android and iOS Expo application with a local Express and
MongoDB API. The activity location and missed-check-in events are simulated
for the hackathon demo.

## Task 0 — Install and validate the stack

The `mobile` directory is already an Expo 57 React Native application; do not
reinitialise it.

### Required software

- Node.js and npm
- A locally running MongoDB server
- Expo Go on an Android or iOS device for development

Start MongoDB using the operating-system service after installing MongoDB, then
use `mongodb://127.0.0.1:27017/trailguard` as `MONGODB_URI`.

### Project dependencies

From `backend`:

```bash
npm install
```

This installs Express, Mongoose, CORS, dotenv, bcryptjs, jsonwebtoken, and
nodemon.

From `mobile`:

```bash
npm install
npx expo install react-native-maps expo-secure-store
```

`expo-location` is intentionally not installed. The MVP displays seeded,
simulated Kathmandu coordinates; real device and background tracking is a
post-hackathon feature.

Copy `backend/.env.example` to `backend/.env` and set a long, private
`JWT_SECRET`. Never commit `.env`.

### Task 0 verification

1. Start MongoDB.
2. Run `npm run dev` in `backend` and open `GET /api/health`.
3. Run `npx expo start` in `mobile` and launch Expo Go.
4. Confirm `react-native-maps` renders a map and a SecureStore read/write
   smoke check succeeds.

## Task 1 — Backend foundation and authentication

- Organise Express routes, models, and authentication middleware.
- Implement `POST /api/auth/register` and `POST /api/auth/login`.
- Hash passwords with bcryptjs; return `{ token, user }` and never return a
  password hash.
- Require `Authorization: Bearer <JWT>` for protected endpoints.

## Task 2 — Core data and safety-session APIs

- Add users, trusted contacts, safety sessions, session events/location pings,
  and hazard reports.
- Support trusted-contact CRUD, session creation/detail/history, check-ins,
  SOS, simulated missed check-ins, alert acknowledgement, and hazards.
- A safety session stores its activity, expected end time, check-in cadence and
  due time, owner, selected contact, current status, and last known location.
- Use `active`, `alerting`, `sos`, and `completed` as the only MVP states.

## Task 3 — Mobile app foundation and authentication

- Replace the Expo starter content with TrailGuard routing and branding.
- Add registration, login, authenticated API calls, logout, and JWT storage in
  Expo SecureStore.

## Task 4 — Start a safety session

- Collect activity type, title/route area, expected finish time, check-in
  interval, and a registered trusted contact selected by email.
- Create the session and route the athlete to its active view.

## Task 5 — Active-session safety loop

- Show current state, a check-in countdown, a clearly labelled simulated map
  location, and one-tap `I am safe` and `SOS` controls.
- Provide a demo control that misses the next check-in and creates an alert
  with a timestamp and last-known location.

## Task 6 — Trusted-contact response

- Show alerting sessions for the signed-in contact, including athlete,
  activity, last-known location/time, timeline, emergency guidance, and an
  acknowledgement action.

## Task 7 — Community hazard map

- Render hazards with `react-native-maps` markers.
- Filter by category and recency; accept category, severity, description, and
  coordinate reports. Photo upload is out of scope.

## Task 8 — QA and demo readiness

- Seed Aarav and Rohan accounts, a Kathmandu cycling route, and sample
  hazards.
- Verify registration/login failures, unauthorised requests, session creation,
  check-in reset, missed-check-in alert, SOS, contact acknowledgement, and
  hazard filtering.
- Rehearse: register/login → create session → check in → force alert → sign in
  as contact → acknowledge → report/view hazard.

## MVP boundaries

Contacts must already be registered TrailGuard users and are selected by
email. This MVP excludes SMS/email delivery, push notifications, real GPS or
background tracking, map API-key setup for app-store builds, photo upload, and
emergency-service integrations.
