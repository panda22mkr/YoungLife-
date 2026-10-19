import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ComponentProps } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, IconBadge, ScreenTitle, Txt } from '@/components/ui';
import { isLeader, useAuth } from '@/lib/auth';
import { TKey, useI18n } from '@/lib/i18n';
import { space, usePalette } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Три инструмента лидера YoungLife: Дерево, Список, Карта (личные, их видит только сам лидер).
const tools: { icon: IconName; title: TKey; desc: TKey; href: '/tools/tree' | '/tools/list' | '/tools/map' }[] = [
  { icon: 'git-network-outline', title: 'tree', desc: 'treeDesc', href: '/tools/tree' },
  { icon: 'list-outline', title: 'list', desc: 'listDesc', href: '/tools/list' },
  { icon: 'map-outline', title: 'map', desc: 'mapDesc', href: '/tools/map' },
];

export default function ToolsScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const c = usePalette();

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: space.screen,
        paddingTop: insets.top + space.lg,
        paddingBottom: space.xl,
        gap: space.sm + 4,
      }}>
      <ScreenTitle title={t('toolsTitle')} />
      {!isLeader(user) ? (
        <Txt tone="muted">{t('onlyLeaders')}</Txt>
      ) : (
        tools.map((tool) => (
          <Pressable
            key={tool.title}
            accessibilityRole="button"
            onPress={() => router.push(tool.href)}
            style={({ pressed }) => (pressed ? { opacity: 0.85, transform: [{ scale: 0.99 }] } : undefined)}>
            <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
              <IconBadge name={tool.icon} size={52} />
              <View style={{ flex: 1, gap: 4 }}>
                <Txt variant="h2">{t(tool.title)}</Txt>
                <Txt variant="small" tone="muted">
                  {t(tool.desc)}
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={20} color={c.muted} />
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
