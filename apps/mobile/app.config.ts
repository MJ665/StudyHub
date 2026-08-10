import type { ExpoConfig } from 'expo/config';

/**
 * StudyBuddy Android wrapper — a thin Expo shell that renders the deployed web
 * app (apps/web-next) in a WebView. The web app is the single master codebase;
 * anything pushed there reflects here instantly.
 *
 * Everything env-driven so nothing is hardcoded before hosting exists:
 *   EXPO_PUBLIC_WEB_URL  — the deployed web app URL the WebView loads
 *   GOOGLE_SERVICES_JSON — path to the Firebase google-services.json (for FCM)
 *   EAS_PROJECT_ID       — your EAS project id (from `eas init`)
 */
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://studybuddy.mj665.in';
// Host used for Android App Links (https deep links open the app, not the browser).
const WEB_HOST = (() => {
  try {
    return new URL(WEB_URL).host;
  } catch {
    return 'studybuddy.mj665.in';
  }
})();

const config: ExpoConfig = {
  name: 'StudyBuddy',
  slug: 'studybuddy',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'studybuddy',
  // 'automatic' so native chrome matches the web theme (default is now Navy
  // Light); the shell also mirrors the exact theme via the THEME bridge.
  userInterfaceStyle: 'automatic',
  backgroundColor: '#0b1220',
  assetBundlePatterns: ['**/*'],
  android: {
    package: 'com.studybuddy.app',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0b1220',
    },
    permissions: [
      'INTERNET',
      'POST_NOTIFICATIONS',
      'CAMERA',
      'RECORD_AUDIO',        // proctored-exam webcam capture (getUserMedia)
      'READ_MEDIA_IMAGES',
      'READ_MEDIA_VIDEO',
    ],
    // Firebase config for FCM push. Owner drops google-services.json here (or
    // points GOOGLE_SERVICES_JSON at an EAS secret file).
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    // Android App Links: https://studybuddy.mj665.in/* opens the app directly
    // (notification + shared links). Requires /.well-known/assetlinks.json on the
    // web domain carrying the Play App Signing SHA-256 fingerprint before Android
    // will auto-verify. The studybuddy:// scheme (above) remains for custom links.
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
        backgroundColor: '#0b1220',
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
        project: process.env.SENTRY_PROJECT ?? 'studybuddy',
      },
    ],
  ],
  extra: {
    webUrl: WEB_URL,
    // The installed app opens straight into the product, skipping the web
    // marketing home ("/"). Default /dashboard is auth-gated → /login if needed.
    entryPath: process.env.EXPO_PUBLIC_ENTRY_PATH ?? '/dashboard',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    eas: { projectId: process.env.EAS_PROJECT_ID ?? 'REPLACE_WITH_EAS_PROJECT_ID' },
  },
};

export default config;
