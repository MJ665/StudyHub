// @ts-check

/**
 * GrindBuddy Android wrapper — a thin Expo shell that renders the deployed web
 * app (apps/web-next) in a WebView. The web app is the single master codebase;
 * anything pushed there reflects here instantly.
 *
 * Plain JS (not app.config.ts) on purpose: Expo's TypeScript config loader can
 * fail with "Cannot read properties of undefined (reading 'CommonJS')" in this
 * monorepo; a .js config is read directly with no TS transpiler.
 *
 * Env-driven:
 *   EXPO_PUBLIC_WEB_URL  — the deployed web app URL the WebView loads
 *   GOOGLE_SERVICES_JSON — path to the Firebase google-services.json (for FCM)
 *   EAS_PROJECT_ID       — EAS project id (defaults to the linked project below)
 */
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://grindbuddy.mj665.in';
// Host used for Android App Links (https deep links open the app, not the browser).
let WEB_HOST = 'grindbuddy.mj665.in';
try {
  WEB_HOST = new URL(WEB_URL).host;
} catch (e) {
  WEB_HOST = 'grindbuddy.mj665.in';
}

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: 'GrindBuddy',
  slug: 'grindbuddy',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'grindbuddy',
  // 'automatic' so native chrome matches the web theme (default is now Navy
  // Light); the shell also mirrors the exact theme via the THEME bridge.
  userInterfaceStyle: 'automatic',
  backgroundColor: '#0b1220',
  assetBundlePatterns: ['**/*'],
  android: {
    package: 'in.mj665.GrindBuddy',
    // Explicit versionCode for local (expo prebuild + Gradle) builds. Bump this
    // for each Play Store upload. (EAS cloud builds can still auto-increment.)
    versionCode: 3,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff', // GrindBuddy logo is on white — match it
    },
    permissions: [
      'INTERNET',
      'POST_NOTIFICATIONS',
      'CAMERA',
      'RECORD_AUDIO', // proctored-exam webcam capture (getUserMedia)
      'READ_MEDIA_IMAGES',
      'READ_MEDIA_VIDEO',
    ],
    // Firebase config for FCM push. Owner drops google-services.json here (or
    // points GOOGLE_SERVICES_JSON at an EAS secret file).
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    // Android App Links: https://grindbuddy.mj665.in/* opens the app directly
    // (notification + shared links). Requires /.well-known/assetlinks.json on the
    // web domain carrying the Play App Signing SHA-256 fingerprint before Android
    // will auto-verify. The grindbuddy:// scheme (above) remains for custom links.
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: WEB_HOST }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#3b82f6', // brand blue (matches the new navy palette accent)
      },
    ],
    // Sentry — native crash handling + JS errors + source-map upload on EAS builds.
    // authToken comes from SENTRY_AUTH_TOKEN in the build env (never hardcode it).
    [
      '@sentry/react-native/expo',
      {
        organization: process.env.SENTRY_ORG ?? 'meet-w7',
        project: process.env.SENTRY_PROJECT ?? 'grindbuddy',
      },
    ],
  ],
  extra: {
    webUrl: WEB_URL,
    // The installed app opens straight into the product, skipping the web
    // marketing home ("/"). Default /dashboard is auth-gated → /login if needed.
    entryPath: process.env.EXPO_PUBLIC_ENTRY_PATH ?? '/dashboard',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    // Linked EAS project. Must be a STATIC literal so EAS tooling can read it
    // (a value behind process.env is "dynamic" and EAS refuses to link). This id
    // is a public project identifier tied to the @contact.hackathonmj account —
    // safe to commit.
    eas: { projectId: '597715a5-bedb-47a0-8f74-76d03715cb7c' },
  },
};

module.exports = config;
