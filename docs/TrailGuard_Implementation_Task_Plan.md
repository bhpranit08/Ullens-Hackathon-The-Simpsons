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

## Implementation Progress (feature/auth-pages branch)

### Auth & Onboarding
- **Login Screen UI/UX Overhaul**: Completely redesigned with the new premium blue theme, proper form validation, keyboard safety, and loading states. Kept existing API integration untouched.
- **Create Account Screen UI/UX Overhaul**: Redesigned to match the Login experience with polished placeholders and validation. Uses existing registration API.
- **Bug Fix — Port Conflict**: Discovered Apple AirPlay Receiver was hijacking port 5000. Changed backend to port 5001. Updated `auth.tsx` and both `.env` files.
- **Branding**: Updated login and register screens to show "TRAILGUARD" instead of "APP NAME".
- **Navigation Error Fix**: Fixed "Cannot update ForwardRef(NavigationContainerInner) while rendering LoginScreen" by replacing render-time `router.replace()` with declarative `<Redirect>` component in both login.tsx and register.tsx.

### Navigation & Layout
- **Bottom Tab Navigation**: Restructured the app into a `(tabs)` group with Expo Router tab navigation: Home, Hazards, Contacts, History. Removed old root-level duplicate screens.
- **Settings Route**: Added `/settings` as a modal-presentation Stack screen in the root layout.

### Home Dashboard (`(tabs)/index.tsx`)
- **Dashboard UI/UX Overhaul**: Rebuilt to immediately communicate safety status (green indicator), clear "Start Activity" primary action, and quick access cards. Redirects unauthenticated users to login.
- **"Sharing With You" Section**: When trusted contacts exist, the home screen shows a live-location card for the first contact with an embedded `react-native-maps` MapView, a pulsing red LIVE badge, and simulated GPS coordinates.
- **Recent Activity Folder Cards**: Recent activities now display as folder-style cards with an "Activity Folder" tag badge, improved card shadows, and rounded corners.
- **Profile → Settings Navigation**: Tapping the avatar now navigates to the full Settings page instead of opening a small popup.

### Safety Sessions
- **Start Safety Session UI** (`start.tsx`): Activity selection with beautiful blue cards, session details form, and Demo Mode label.
- **Active Safety Session UI** (`session/active.tsx`): Robust timer/countdown, "I AM SAFE" check-in button, real device GPS location on a live `react-native-maps` MapView with polyline path tracking, and a distinct SOS button.
- **End Session Screen** (`session/end.tsx`): Post-session form collecting description, notes, and photos. Saves completed session data to history.
- **Photo Uploads**: Integrated `expo-image-picker` in the End Session screen — users can select multiple photos from their library, see thumbnails, remove individual photos, and save them with the activity history.

### Activity History & Timeline (`(tabs)/timeline.tsx`)
- **Events Tab**: Vertical event timeline using blue-themed dots and connecting lines with tap-to-navigate to activity details.
- **Recent Tab (Folder View)**: New folder-style card layout showing activities as browseable cards with date, title, subtitle, and "Activity Folder" badge. Each card navigates to the full activity detail view.
- **Activity Details Page** (`activity/[id].tsx`): Full detail view showing activity name, type, status badge, duration, date/time stats, description, notes, photos (horizontal scrolling gallery), and an updates/check-ins timeline.

### Hazard Map (`(tabs)/map.tsx`)
- **Interactive Map**: Full `react-native-maps` MapView with user's real GPS location.
- **Tap-to-Report Hazards**: Tap anywhere on the map to place a blue temporary marker. Selected coordinates auto-fill into the hazard report form.
- **Hazard Report Modal**: Bottom-sheet modal with title, description, severity picker (low/medium/high with color coding), location preview, and submit flow with success feedback.
- **View & Remove Hazards**: Tapping any existing hazard marker opens a detailed modal showing the hazard's information, severity color coding, and a destructive button to remove it.
- **Animations**: The "Report Hazard" Floating Action Button features a fluid entrance animation using `Animated.spring`.
- **Persistent Hazards**: Created `hazardsService.ts` — reported hazards are saved to device secure storage and persist across app restarts and tab switches. Hazard markers are color-coded by severity (red/yellow/green).

### Trusted Contacts (`(tabs)/contacts.tsx`)
- **Contacts Service** (`contactsService.ts`): Local secure storage service for CRUD operations on trusted contacts (add, list, remove).
- **Add Contact Modal**: Bottom-sheet form to add a contact by name and email, saved to persistent storage.
- **Remove Contact**: Each contact card now has a red × button to delete the contact.
- **Live Data**: Contacts persist across app sessions using `expo-secure-store`.

### Settings & Profile (`settings.tsx`)
- **Full Settings Page**: Replaces the old tiny avatar popup with a proper full-screen settings page (presented as a modal).
- **Profile Section**: Large avatar with camera overlay for uploading a profile photo via `expo-image-picker`.
- **Change Password**: Modal form with current password, new password, confirm password fields and validation (min 8 chars, match check).
- **Change Email**: Modal form showing current email and accepting a new email with validation.
- **Upload Profile Photo**: Opens device image picker with 1:1 crop.
- **Preferences**: Notifications and Privacy & Safety setting rows (ready for backend hookup).
- **About**: App version display and Terms of Service link.
- **Sign Out**: Red destructive button with confirmation alert dialog.

### Data Layer
- **History Service** (`history.ts`): Local secure storage for activity history with full CRUD — `addHistoryEvent`, `getHistoryEvents`, `updateHistoryEvent`, `getHistoryEvent`. Schema includes id, title, subtitle, type, date, duration, description, notes, photos, updates array, and active status.
- **Contacts Service** (`contactsService.ts`): Secure storage for trusted contacts with `getContacts`, `addContact`, `removeContact`.
- **Hazards Service** (`hazardsService.ts`): Secure storage for community hazard reports with `getHazards`, `addHazard`.

### Empty States & Polish
- All screens (Home, Hazards, Contacts, History) show beautiful, informative empty states when no data exists.
- Removed all mock/hardcoded data — everything is driven by real user actions.
- Consistent blue-themed design system across all screens.

## MVP Boundaries (Remaining: Backend Left)

The frontend mobile application MVP is complete. All core flows (auth, safety sessions, hazards, contacts, history, profile) are fully functional using simulated local persistence (`expo-secure-store`). 

**The following features require the remaining backend implementation ("Backend Left"):**

1. **API Integration**: Hooking up the existing local data services (`history.ts`, `contactsService.ts`, `hazardsService.ts`, `profileService.ts`) to real backend endpoints.
2. **Notifications**: SMS/email delivery and push notifications for check-ins and SOS alerts.
3. **Live Web Sockets**: Real-time location sharing between trusted contacts (currently simulated with interval updates).
4. **Background Location**: Background GPS tracking when the app is minimized (currently only tracks in foreground).
5. **App Store Readiness**: Map API-key setup for production builds.
6. **External APIs**: Emergency-service integrations.

