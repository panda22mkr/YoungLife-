import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/lib/auth';
import { EventsProvider } from '@/lib/events';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { colors } from '@/lib/theme';

function Routes() {
  const { user } = useAuth();
  const { t } = useI18n();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.white,
        contentStyle: { backgroundColor: colors.bg },
      }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ title: '' }} />
        <Stack.Screen name="event/new" options={{ title: t('newEvent') }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <I18nProvider>
      <AuthProvider>
        <EventsProvider>
          <StatusBar style="light" />
          <Routes />
        </EventsProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
