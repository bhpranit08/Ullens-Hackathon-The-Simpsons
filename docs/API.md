# TrailGuard API

All routes are under `/api`. Protected requests require `Authorization: Bearer <JWT>`. Errors return `{ message }` with an appropriate HTTP status. Dates are ISO strings. Mongo identifiers are returned as `id`.

## Authentication

- `POST /auth/register`: name, email, password → token/user; queues verification.
- `POST /auth/login`: email, password → token/user.
- `GET /auth/me`: user and notification configuration.
- `PATCH /auth/profile`: name → updated user.
- `POST /auth/logout`: invalidates all this user's current JWTs and removes registered push devices.
- `POST /auth/resend-verification`: queues fresh verification link.
- `POST /auth/verify`: token → verified user.
- `POST /auth/forgot-password`: email → generic confirmation.
- `POST /auth/reset-password`: token, password → confirmation; invalidates existing JWTs.

Verification is required to invite/accept contacts, create sessions, or submit hazards.

## Contacts

- `GET /contacts` → `{ contacts, invitations }`.
- `POST /contacts`: email, optional name → pending contact/invitation.
- `POST /contacts/:id/accept` or `/decline`: verified recipient only.
- `DELETE /contacts/:id`: owner or accepted recipient; requires no ongoing shared session.

Status: pending, accepted, declined, removed. Registering an invited email never grants session access automatically.

## Sessions

- `GET /sessions`: latest 100 owned/shared sessions.
- `POST /sessions`: activityType (Cycling/Running/Trekking), title, expectedEndTime, checkInMinutes (1–240), contactId, trackingMode (live/demo), sharingConsent=true, location for live mode.
- `GET /sessions/:id`: detail, timeline, last known position, latest 500 location history points, and delivery status.
- Athlete-only `POST /sessions/:id/check-in`, `/sos`, `/complete`, `/simulate-miss`. Simulation requires demo mode.
- Contact-only `POST /sessions/:id/acknowledge`.
- Athlete-only `PATCH /sessions/:id`: expectedEndTime.
- Athlete-only `POST /sessions/:id/location`: `{ location: { lat, lng, accuracy?, observedAt, source, pingId } }`. Source is gps/browser/simulated and must match mode. Identifiers deduplicate uploads.

Session statuses: active, alerting, sos, completed. Completed is terminal. One unfinished session per athlete. Alert acknowledgement does not reset the session. Both missed-check-in and overdue-finish alerts are evaluated by the worker. Extend expected finish before checking in if it has passed.

## Hazards

- `GET /hazards?category=Road&recent=7d` → `{ hazards }`; categories Traffic/Road/Weather/Wildlife/Other, recency 24h/7d/30d or omitted for all time.
- `POST /hazards`: category, severity (low/medium/high), description (1–500 chars), location {lat,lng}.

## Notifications

- `GET /notifications/settings`: mode, emailConfigured, pushConfigured.
- `POST /notifications/devices`: Expo token, platform → register current user's device.
- `DELETE /notifications/devices`: token → remove current user's device.
- `GET /notifications/mail-preview`: current account's local mailbox; available only with MAIL_MODE=preview outside production.

Delivery states: pending, processing, accepted (provider accepted, not recipient confirmed), receipt_ok (Expo service receipt), failed, cancelled, preview (not sent).

`GET /health` is public. Coordinates and timelines always require owner or accepted-contact authorization.

