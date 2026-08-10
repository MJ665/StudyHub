# 🚀 Launch StudyBuddy on Google Play — simple step-by-step

This is written for someone new to Expo/EAS. Follow it top to bottom. Copy-paste
the commands exactly. Anything in **Play Console** is done in your web browser at
<https://play.google.com/console>.

You already have: an EAS/Expo account, a Firebase project (`google-services.json`),
a Google Play Console account, and the live web app at <https://studybuddy.mj665.in>.

---

## Part A — One time on your computer (5 min)

1. Install the EAS command-line tool and log in:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Put your Firebase file here (get it from Firebase → Project settings → your
   Android app → "google-services.json"):
   ```
   apps/mobile/google-services.json
   ```
   (This file is gitignored — it never gets uploaded to GitHub. Good.)
3. Link the project (only if `eas init` was never run here). From `apps/mobile`:
   ```bash
   cd apps/mobile
   eas init          # pick your existing project when asked
   ```
   This writes your EAS project id. That's not a secret.

> **Optional — crash reports (Sentry).** Skip this and the app still works fine.
> To enable it, run the two `eas env:create` commands in `README.md`
> ("Secrets & environment variables"). You do **not** need it to launch.

---

## Part B — Build the app file (the `.aab`) (~15–20 min, runs in the cloud)

From `apps/mobile`:

```bash
eas build -p android --profile production
```

- EAS builds it on Expo's servers — your laptop can sleep.
- The **first** time it asks "Generate a new Android Keystore?" → answer **Yes**.
  EAS keeps this signing key safe for you. (Don't lose your Expo account — this key
  signs every future update.)
- When it finishes it prints a link and an **`.aab`** file. Download it (or use
  `eas build:list` later to find it). This `.aab` is what you upload to Play.

> Want to test on a real phone first? Run `eas build -p android --profile preview`
> instead — that makes an **`.apk`** you can install directly on your phone. Do the
> quick test list at the bottom, then run the production build above.

---

## Part C — Create the app in Play Console (once)

1. Go to <https://play.google.com/console> → **Create app**.
   - App name: **StudyBuddy**
   - Default language: English
   - App or game: **App**
   - Free or paid: **Free**
   - Accept the declarations → **Create app**.

2. Left menu → **Policy → App content**. Fill these in (each is a short form):

   **Privacy policy**
   - Paste this URL:
     ```
     https://studybuddy.mj665.in/privacy
     ```

   **Data safety** — answer "Yes, this app collects/shares data", then declare
   exactly this (the app records exams, so be honest — a wrong answer gets you
   rejected later):

   | Data type | Collected? | Purpose | Shared? |
   |-----------|-----------|---------|---------|
   | Name, Email address | Yes | Account management | No |
   | Photos & videos (webcam exam video + uploads) | Yes | App functionality (proctoring, uploads) | No |
   | Audio (microphone during exams) | Yes | App functionality (proctoring) | No |
   | Files & docs (knowledge uploads) | Yes | App functionality | No |
   | App activity + crash/diagnostics | Yes | Analytics / app performance | No |
   | Device or other IDs (push token) | Yes | Notifications | No |

   For every row also tick: **Encrypted in transit = Yes**, and
   **Users can request data deletion = Yes**, with this deletion URL:
   ```
   https://studybuddy.mj665.in/privacy#account-deletion
   ```

   **App access** — some screens need a login. Choose "All functionality requires
   sign-in" and give a demo login so Google can review (create a normal test user
   in your app and paste its email + password here).

   **Ads** → No ads (unless you added ads).

   **Content rating** → fill the questionnaire (it's an education app; answer
   honestly — no violence, etc.).

   **Target audience** → choose your age groups (e.g. 18+ or 13+). Not designed
   for children.

   **Permissions (Camera & Microphone)** → if asked to justify them, say:
   > "Camera and microphone are used only during proctored exams to record the
   > candidate for integrity. The app shows a clear consent screen before
   > recording starts."

---

## Part D — Store listing (what users see)

Left menu → **Grow → Store presence → Main store listing**:

- **App name:** StudyBuddy
- **Short description** (max 80 chars):
  ```
  Learn, take proctored exams, and share team knowledge — all in one app.
  ```
- **Full description:** a paragraph about assessments, proctored exams, coding
  practice, certificates, and the knowledge assistant.
- **App icon:** 512×512 (you can reuse `apps/mobile/assets/icon.png`).
- **Feature graphic:** 1024×500 banner.
- **Phone screenshots:** at least 2 (take them from the app running on a phone —
  the dashboard, an exam, and the knowledge chat look great in the navy theme).

---

## Part E — Upload and release

1. Left menu → **Test and release → Testing → Internal testing** → **Create new
   release**.
2. Upload the **`.aab`** from Part B (drag-and-drop).
3. Add release notes (e.g. "First release").
4. Add testers (your own email is fine) → **Save → Review release → Start rollout
   to Internal testing**.
5. Install it on your phone from the internal-testing link and run the test list
   below. If it all works → promote to **Production** the same way (Test and
   release → Production → Create new release → reuse the build → roll out).

> Google's automated **Pre-launch report** runs after you upload — check it for
> crashes before going to Production.

---

## Part F — After your first production release (deep links)

Play generates your app's signing fingerprint only after the first upload.

1. Play Console → **Test and release → Setup → App signing** → copy the
   **SHA-256 certificate fingerprint**.
2. Paste it into `apps/web-next/public/.well-known/assetlinks.json`, replacing
   `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT`, and redeploy the web app.
3. Now tapping a `https://studybuddy.mj665.in/...` link opens the app. (Everything
   else works without this — it's a nice-to-have.)

---

## Quick test list (on a real phone)

- App opens and shows the login screen.
- Log in → dashboard loads; close and reopen the app → still logged in.
- Switch theme in the sidebar → the app's top/background matches (no color flash).
- Start a proctored exam → it asks for camera + mic, shows your webcam, records.
- Upload a file (profile photo or a knowledge doc) → the file picker opens.
- Download a certificate → it opens/saves.
- Ask the knowledge assistant a question → it answers.
- Turn on airplane mode → the "no connection / retry" screen shows.

---

## If something goes wrong

- **Build fails** → run `npx expo-doctor` in `apps/mobile` and fix what it lists,
  then rebuild.
- **"Package name already exists"** in Play → the app id `com.studybuddy.app` is
  taken by another Console; change `android.package` in `app.config.ts`, rebuild.
- **Push notifications don't arrive** → `google-services.json` is missing or from
  the wrong Firebase project. Re-download it and rebuild.
- **Camera is black in an exam** → make sure you allowed the camera/mic permission
  prompt; if you denied it, enable it in Android Settings → Apps → StudyBuddy →
  Permissions.
