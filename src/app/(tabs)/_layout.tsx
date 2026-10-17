import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { isLeader, useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { colors } from '@/lib/theme';

export default function TabsLayout() {
  const { t } = useI18n();
  const { user } = useAuth();
  const leader = isLeader(user);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.white,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabEvents'),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: t('tabChats'),
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: t('tabTools'),
          href: leader ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="construct" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabProfile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color as string} size={size} />,
        }}
      />
    </Tabs>
  );
}
