import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { ChatView } from '@/components/ChatView';
import { EmptyState } from '@/components/ui';
import { canDirectMessage, useAuth } from '@/lib/auth';
import { useDirectChat, useProfileName } from '@/lib/chat';
import { useI18n } from '@/lib/i18n';

// Личная переписка. Сервер дополнительно проверяет, что обоим собеседникам есть 15 лет.
export default function DirectChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const name = useProfileName(userId);
  const allowed = !!user && canDirectMessage(user);
  const chat = useDirectChat(allowed ? userId : undefined);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: name || t('unknownUser') }} />
      {allowed ? (
        <ChatView chat={chat} showNames={false} />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="lock-closed-outline" title={t('groupOnly')} />
        </View>
      )}
    </View>
  );
}
