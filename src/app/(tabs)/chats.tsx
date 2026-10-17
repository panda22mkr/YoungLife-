import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ScreenTitle, Txt } from '@/components/ui';
import { canDirectMessage, useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { space } from '@/lib/theme';

// Заготовка. Мессенджер (общие чаты мероприятий + личные сообщения) — следующий этап.
// Правило уже заложено: детям младше 15 лет доступен только общий чат.
export default function ChatsScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const dm = user ? canDirectMessage(user) : false;

  return (
    <View style={{ flex: 1, paddingHorizontal: space.screen, paddingTop: insets.top + space.lg }}>
      <ScreenTitle title={t('chatsTitle')} />
      <EmptyState icon="chatbubbles-outline" title={t('chatSoon')} hint={t('chatSoonHint')} />
      {!dm && (
        <Txt tone="muted" variant="small" style={{ textAlign: 'center' }}>
          {t('groupOnly')}
        </Txt>
      )}
    </View>
  );
}
