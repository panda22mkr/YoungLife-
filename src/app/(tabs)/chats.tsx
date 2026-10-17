import { Text, View } from 'react-native';
import { canDirectMessage, useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { colors, space } from '@/lib/theme';

// Заготовка. Мессенджер (общие чаты мероприятий + личные сообщения) — следующий этап.
// Правило уже заложено: детям младше 15 лет доступен только общий чат.
export default function ChatsScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const dm = user ? canDirectMessage(user) : false;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg }}>
      <Text style={{ color: colors.white, fontSize: 18, textAlign: 'center' }}>{t('chatSoon')}</Text>
      {!dm && (
        <Text style={{ color: colors.muted, marginTop: space.sm, textAlign: 'center' }}>{t('groupOnly')}</Text>
      )}
    </View>
  );
}
