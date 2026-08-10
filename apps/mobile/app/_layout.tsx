import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';

// Sentry — native crash + JS error + performance tracing. No-op without a DSN.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
Sentry.init({
  dsn: SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || 'production',
  tracesSampleRate: Number(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.2),
  enableNativeCrashHandling: true,
  sendDefaultPii: false,
});
if (SENTRY_DSN) Sentry.setTag('component', 'mobile');

// Foreground notifications show a banner. (SDK 53+ replaced shouldShowAlert with
// the explicit shouldShowBanner + shouldShowList.)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* Transient launch bar (navy shell); index.tsx sets the themed one. Edge-
          to-edge is default in SDK 57, so StatusBar no longer takes backgroundColor. */}
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0b1220' },
        }}
      />
    </SafeAreaProvider>
  );
}

// Sentry.wrap adds automatic performance + touch/breadcrumb instrumentation.
export default Sentry.wrap(RootLayout);
