import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Chip, IconBadge, ScreenTitle, Txt } from '@/components/ui';
import { isLeader, useAuth } from '@/lib/auth';
import { TKey, useI18n } from '@/lib/i18n';
import { space } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Три инструмента лидера YoungLife: Дерево, Список, Карта. Пока это заготовки.
const tools: { icon: IconName; title: TKey; desc: TKey }[] = [
  { icon: 'git-network-outline', title: 'tree', desc: 'treeDesc' },
  { icon: 'list-outline', title: 'list', desc: 'listDesc' },
  { icon: 'map-outline', title: 'map', desc: 'mapDesc' },
];

export default function ToolsScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

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
          <Card key={tool.title} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <IconBadge name={tool.icon} size={52} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="h2">{t(tool.title)}</Txt>
              <Txt variant="small" tone="muted">
                {t(tool.desc)}
              </Txt>
              <View style={{ marginTop: 4 }}>
                <Chip label={t('comingSoon')} />
              </View>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
