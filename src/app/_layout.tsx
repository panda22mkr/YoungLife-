import {
  Onest_400Regular,
  Onest_500Medium,
  Onest_600SemiBold,
  Onest_700Bold,
  Onest_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/onest';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { EventsProvider } from '@/lib/events';
import { I18nProvider } from '@/lib/i18n';
import { PrefsProvider } from '@/lib/prefs';
import { font, usePalette, useScheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

function Routes() {
  const { user, loading } = useAuth();
  const c = usePalette();
  const scheme = useScheme();

  // Заставка закрывается, когда проверен вход (чтобы не мигал экран входа).
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerShadowVisible: false,
          headerTintColor: c.ink,
          headerTitleStyle: { fontFamily: font.bold },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: c.bg },
        }}>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="event/[id]" options={{ title: '' }} />
          <Stack.Screen name="event/new" options={{ title: '' }} />
          <Stack.Screen name="settings" options={{ title: '' }} />
          <Stack.Screen name="profile-edit" options={{ title: '' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
    Onest_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
    <PrefsProvider>
      <I18nProvider>
        <AuthProvider>
          <EventsProvider>
            <Routes />
          </EventsProvider>
        </AuthProvider>
      </I18nProvider>
    </PrefsProvider>
  );
}
