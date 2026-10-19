import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './auth';
import { usePrefs } from './prefs';
import { supabase } from './supabase';

// Push-уведомления работают только в собранном приложении (development build / App Store / Google Play).
// В Expo Go всё это тихо пропускается и ничего не ломает.
const supported =
  Platform.OS !== 'web' && !(Constants.executionEnvironment === 'storeClient' && Platform.OS === 'android');

let currentToken: string | null = null;

async function getToken(): Promise<string | null> {
  const Notifications = await import('expo-notifications');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'YoungLife',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

// Открывает нужный экран по нажатию на уведомление.
function openFromData(data: unknown) {
  const d = (data ?? {}) as { type?: string; id?: string };
  if (!d.id) return;
  if (d.type === 'dm') router.push({ pathname: '/dm/[userId]', params: { userId: d.id } });
  else if (d.type === 'chat') router.push({ pathname: '/chat/[id]', params: { id: d.id } });
  else if (d.type === 'event') router.push({ pathname: '/event/[id]', params: { id: d.id } });
}

// Забывает этот телефон на сервере (при выходе из аккаунта или отключении уведомлений).
export async function unregisterPush(): Promise<void> {
  if (!currentToken) return;
  try {
    await supabase.from('push_tokens').delete().eq('token', currentToken);
  } catch {}
  currentToken = null;
}

// Подключается один раз после входа: регистрирует телефон и обрабатывает нажатия на уведомления.
export function usePush() {
  const { user } = useAuth();
  const { notifications } = usePrefs();
  const uid = user?.id;

  useEffect(() => {
    if (!supported || !uid) return;
    if (!notifications) {
      unregisterPush();
      return;
    }
    let alive = true;
    (async () => {
      try {
        const token = await getToken();
        if (!token || !alive) return;
        const { error } = await supabase.rpc('register_push_token', { p_token: token });
        if (!error) currentToken = token;
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [uid, notifications]);

  useEffect(() => {
    if (!supported || !uid) return;
    let sub: { remove: () => void } | undefined;
    let alive = true;
    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last && alive) openFromData(last.notification.request.content.data);
        sub = Notifications.addNotificationResponseReceivedListener((r) =>
          openFromData(r.notification.request.content.data),
        );
      } catch {}
    })();
    return () => {
      alive = false;
      sub?.remove();
    };
  }, [uid]);
}
