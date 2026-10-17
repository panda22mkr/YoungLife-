import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ComponentProps } from 'react';
import { View } from 'react-native';
import { isLeader, useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { font, usePalette } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Иконка вкладки: у активной вкладки появляется мягкая зелёная «таблетка».
function TabIcon({ on, off, focused }: { on: IconName; off: IconName; focused: boolean }) {
  const c = usePalette();
  return (
    <View
      style={{
        backgroundColor: focused ? c.greenSoft : 'transparent',
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 4,
      }}>
      <Ionicons name={focused ? on : off} size={24} color={focused ? c.greenText : c.muted} />
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useI18n();
  const { user } = useAuth();
  const c = usePalette();
  const leader = isLeader(user);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.muted,
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 12 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabEvents'),
          tabBarIcon: ({ focused }) => <TabIcon on="calendar" off="calendar-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: t('tabChats'),
          tabBarIcon: ({ focused }) => <TabIcon on="chatbubbles" off="chatbubbles-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: t('tabTools'),
          href: leader ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon on="grid" off="grid-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabProfile'),
          tabBarIcon: ({ focused }) => <TabIcon on="person" off="person-outline" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
