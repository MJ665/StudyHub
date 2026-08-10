# StudyBuddy — Android app (`apps/mobile`)

A **thin Expo React Native shell** that renders the deployed web app (`apps/web-next`)
in a WebView. The web app is the **single master codebase** — anything pushed there
appears in the app instantly (the app just loads the live URL). This shell only adds
the native value Google Play expects from a real app: push notifications, offline
handling, hardware-back navigation, pull-to-refresh, splash screen, file uploads,
and external-link handling.

You can add real native screens later without a rewrite: this uses **expo-router**, so
`app/index.tsx` is the WebView and any new `app/<name>.tsx` becomes a native screen.

## The app vs. the web homepage (the "balance")

The web app has a **marketing landing page at `/`** (for browsers, SEO, shared links). An
installed app should **not** open to a marketing brochure — that's poor UX and a common
Play Store rejection ("this is just a website"). So:

| Surface | Opens at | Marketing home? |
|---|---|---|
| Web browser / shared link | `/` (marketing landing) | ✅ yes |
| **This app** (WebView) | `EXPO_PUBLIC_ENTRY_PATH` = **`/dashboard`** | ❌ no |
| PWA ("Add to Home Screen") | `start_url` = `/dashboard` | ❌ no |

`/dashboard` is **auth-gated** — if there's no session it redirects to `/login`, so first
launch → login → dashboard, and later launches (persisted cookie) open straight in. The app
is a **focused product client**; `/` is the public front door. The WebView loads
`EXPO_PUBLIC_WEB_URL + EXPO_PUBLIC_ENTRY_PATH` (`app/index.tsx`, `app.config.ts extra.entryPath`).
Change the landing target by setting `EXPO_PUBLIC_ENTRY_PATH`.

## One-time setup

```bash
# from repo root (npm workspaces)
npm install
cd apps/mobile
npx expo install --fix     # aligns native package versions with the Expo SDK
cp .env.example .env        # then edit EXPO_PUBLIC_WEB_URL etc.
```

## Secrets & environment variables (read this first)

There are **three** places values live — nothing secret is ever committed:

| Where | Holds | Committed? |
|-------|-------|-----------|
| `apps/mobile/.env` (local only) | Values for `expo start` on your machine | ❌ gitignored |
| `eas.json` `env` | **Public** build values (`EXPO_PUBLIC_WEB_URL`, `EXPO_PUBLIC_ENTRY_PATH`) | ✅ (safe — not secret) |
| **EAS Environment Variables** | Anything you don't want in the repo (Sentry DSN, `SENTRY_AUTH_TOKEN`) | ❌ stored on Expo's servers |
| `google-services.json`, `play-service-account.json` | Firebase + Play credentials | ❌ gitignored |

> **Why this split:** anything starting with `EXPO_PUBLIC_` is **baked into the built APK**, so it is *not* a secret (a URL, the Sentry DSN). The only true secret is `SENTRY_AUTH_TOKEN` (used at build time to upload readable crash stack traces) — it stays out of git entirely.

**Variables:**

| Var | What | Secret? |
|-----|------|---------|
| `EXPO_PUBLIC_WEB_URL` | Web app URL the WebView loads. Prod is already in `eas.json`. For the Android **emulator** against a local web server use `http://10.0.2.2:3000`. | no |
| `EXPO_PUBLIC_ENTRY_PATH` | Path the app opens to (default `/dashboard`, auth-gated). | no |
| `EAS_PROJECT_ID` | From `eas init` (a UUID). | no |
| `GOOGLE_SERVICES_JSON` | Path to Firebase `google-services.json` (put the file at `apps/mobile/google-services.json`). | file is secret |
| `EXPO_PUBLIC_SENTRY_DSN` | Optional crash tracking (no-ops if unset). Public (ships in app). | no |
| `SENTRY_AUTH_TOKEN` | Optional — upload readable crash traces at build. | **YES** |

**Set the optional Sentry values on EAS (only if you want crash reports):**

```bash
cd apps/mobile
# public DSN → available to preview + production builds
eas env:create --scope project --name EXPO_PUBLIC_SENTRY_DSN \
  --value "https://<key>@o<org>.ingest.sentry.io/<project>" \
  --environment preview --environment production --visibility plaintext
# the real secret → sensitive, build-time only
eas env:create --scope project --name SENTRY_AUTH_TOKEN \
  --value "sntrys_...your token..." \
  --environment preview --environment production --visibility sensitive
```

Skip both and the app still builds and runs — it just won't report crashes.

## Run in development

```bash
# 1. Start the web app somewhere reachable (repo root):  npm run dev:next
# 2. Start the mobile app:
cd apps/mobile && npm start           # press "a" for Android emulator
```

The WebView loads `EXPO_PUBLIC_WEB_URL`. Login persists across restarts (DOM storage
+ cookies enabled). Android back navigates WebView history; airplane mode shows the
native offline screen; off-domain links open in the system browser.

## Push notifications (FCM)

Wired end-to-end:
- On login the injected bridge posts the auth token to the shell → the shell registers
  for an Expo push token and `POST`s it to the backend `POST /api/notifications/register-device`.
- Backend stores it (`device_tokens` table) and `send_push(user_id, title, body, url)`
  delivers via the Expo Push API (which routes to FCM on Android).
- Tapping a notification deep-links the WebView to the notification's `url`.

Requires the Firebase `google-services.json` (above) for production delivery.

## Error & crash tracking (Sentry)

`@sentry/react-native` is initialized in `app/_layout.tsx` (native crash + JS errors +
performance), with capture wired into the WebView `onError`/bridge and push registration.
Source maps upload on EAS builds via the `@sentry/react-native/expo` plugin + the metro
wrapper. Set `EXPO_PUBLIC_SENTRY_DSN` (same DSN as web/api) — it no-ops if unset.

## Ship to Google Play (one-shot approval checklist)

> **New to this? Follow [`LAUNCH.md`](./LAUNCH.md)** — a plain-English, step-by-step
> guide with the exact text to paste into each Play Console field. The list below
> is the quick technical reference.

```bash
npm i -g eas-cli
eas login
eas init                              # sets EAS_PROJECT_ID
eas build -p android --profile production   # produces an .aab
eas submit -p android --profile production  # or upload the .aab manually
```

Before submitting, in the Play Console:
- **Privacy policy URL** → `https://studybuddy.mj665.in/privacy`.
- **Account deletion (Data deletion URL)** → `https://studybuddy.mj665.in/privacy#account-deletion`
  (in-app: My Profile → Security → Delete account, which works inside the WebView).
- **Data safety form** — declare accurately (the app runs proctored exams that record
  webcam video + microphone audio and lets users upload files, so this is NOT a
  "usage only" app):
  - **Personal info**: Name, Email address — collected (account), *not* shared/sold.
  - **Photos & videos**: collected — proctoring **webcam video** + user uploads (KT
    docs, profile photo); uploaded to private S3.
  - **Audio**: collected — proctoring **microphone** recording during exams.
  - **Files & docs**: collected — KT document uploads.
  - **App activity / app info & performance**: collected — usage + crash/diagnostics
    (Sentry).
  - **Device or other IDs**: collected — FCM/Expo **push token**.
  - For every item: *Encrypted in transit* = Yes; *Data can be deleted* = Yes (see
    account deletion above); *Sold/shared with third parties* = No.
- **Prominent disclosure & permissions** → `CAMERA` + `RECORD_AUDIO` are for exam
  proctoring only. The exam **consent screen** in the web runner is the in-context
  disclosure shown *before* the camera/mic start — do not request these at launch.
- **App content / content rating** questionnaire; **target audience** (not children).
- **Store listing** → icon (auto from `assets/icon.png`), feature graphic, and phone
  screenshots (capture the navy UI running in the app: dashboard, an exam, KT chat).
- **Android App Links** → host `apps/web-next/public/.well-known/assetlinks.json` on the
  web domain and paste the **Play App Signing SHA-256** fingerprint into it (from Play
  Console → Setup → App signing) so `https://studybuddy.mj665.in/*` opens the app.
- **targetSdk 35 + 16 KB page size** → satisfied by the current Expo SDK; confirm via
  the build (`expo-doctor`).
- Minimum-functionality: push + offline + native nav + splash + deep links satisfy the
  "not just a webview" bar.

## Structure

```
apps/mobile/
  app.config.ts         # Expo config (env-driven: web URL, FCM, EAS id)
  eas.json              # build profiles (development/preview/production AAB)
  app/
    _layout.tsx         # expo-router root + notification handler
    index.tsx           # the WebView screen (all native add-ons)
  src/
    lib/push.ts         # FCM token registration + backend device registration
    components/OfflineScreen.tsx
  assets/               # icon / adaptive-icon / splash / notification icon (from web logo)
```
