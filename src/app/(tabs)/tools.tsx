import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Card } from '@/components/ui';
import { isLeader, useAuth } from '@/lib/auth';
import { TKey, useI18n } from '@/lib/i18n';
import { colors, space } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const tools: { icon: IconName; title: TKey; desc: TKey }[] = [
  { icon: 'git-network', title: 'tree', desc: 'treeDesc' },
  { icon: 'list', title: 'list', desc: 'listDesc' },
  { icon: 'map', title: 'map', desc: 'mapDesc' },
];

// Три инструмента лидера YoungLife: Дерево, Список, Карта. Пока это заготовки.
export default function ToolsScreen() {
  const { t } = useI18n();
  const { user } = useAuth();

  if (!isLeader(user)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.muted }}>{t('onlyLeaders')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }}>
      {tools.map((tool) => (
        <Card key={tool.title} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <Ionicons name={tool.icon} size={36} color={colors.green} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.white, fontSize: 20, fontWeight: '700' }}>{t(tool.title)}</Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>{t(tool.desc)}</Text>
            <Text style={{ color: colors.green, marginTop: 6, fontSize: 12 }}>{t('comingSoon')}</Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
