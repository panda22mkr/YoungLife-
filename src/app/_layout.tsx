import {
  Onest_400Regular,
  Onest_500Medium,
  Onest_600SemiBold,
  Onest_700Bold,
  Onest_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/onest';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { EventsProvider } from '@/lib/events';
import { I18nProvider } from '@/lib/i18n';
import { PrefsProvider } from '@/lib/prefs';
import { usePush } from '@/lib/push';
import { font, usePalette, useScheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

// Крупная кнопка «назад» для инструментов: всегда закрывает инструмент.
function ToolBack() {
  const router = useRouter();
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={16}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/tools'))}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}>
      <Ionicons name="chevron-back" size={28} color={c.ink} />
    </Pressable>
  );
}

const toolOptions = {
  title: '',
  headerBackVisible: false,
  headerLeft: () => <ToolBack />,
  gestureEnabled: false, // свайп от края не мешает перетаскиванию
} as const;

function Routes() {
  const { user, loading } = useAuth();
  const c = usePalette();
  const scheme = useScheme();
  usePush();

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
        <Stack.Screen name="legal" options={{ title: '' }} />
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="event/[id]" options={{ title: '' }} />
          <Stack.Screen name="event/new" options={{ title: '' }} />
          <Stack.Screen name="chat/[id]" options={{ title: '' }} />
          <Stack.Screen name="tools/tree" options={toolOptions} />
          <Stack.Screen name="tools/list" options={toolOptions} />
          <Stack.Screen name="tools/map" options={toolOptions} />
          <Stack.Screen name="dm/[userId]" options={{ title: '' }} />
          <Stack.Screen name="settings" options={{ title: '' }} />
          <Stack.Screen name="donate" options={{ title: '' }} />
          <Stack.Screen name="blocked" options={{ title: '' }} />
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
