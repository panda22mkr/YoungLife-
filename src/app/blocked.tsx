import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, Card, EmptyState, ScreenTitle, Txt } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { unblockUser, useBlocked } from '@/lib/safety';
import { space } from '@/lib/theme';

export default function Blocked() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { items, loading, reload } = useBlocked();

  const unblock = async (id: string) => {
    if (await unblockUser(id)) reload();
    else Alert.alert(t('saveError'));
  };

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: insets.bottom + space.xl, gap: space.md }}>
      <ScreenTitle title={t('blockedUsers')} />
      {!loading && items.length === 0 ? <EmptyState icon="shield-checkmark-outline" title={t('noBlocked')} /> : null}
      {items.map((u) => (
        <Card key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Avatar name={u.name || '?'} size={44} />
          <View style={{ flex: 1 }}>
            <Txt variant="strong">{u.name}</Txt>
          </View>
          <Button title={t('unblock')} variant="secondary" onPress={() => unblock(u.id)} />
        </Card>
      ))}
    </ScrollView>
  );
}
