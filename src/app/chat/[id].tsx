import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { ChatView } from '@/components/ChatView';
import { canCreateEvents, useAuth } from '@/lib/auth';
import { useEventChat } from '@/lib/chat';
import { useEvents } from '@/lib/events';
import { useI18n } from '@/lib/i18n';

// Общий чат мероприятия: доступен всем вошедшим.
export default function EventChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events } = useEvents();
  const { user } = useAuth();
  const { t } = useI18n();
  const chat = useEventChat(id);
  const title = events.find((e) => e.id === id)?.title ?? t('eventChat');

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title }} />
      <ChatView chat={chat} showNames canDeleteAny={canCreateEvents(user)} />
    </View>
  );
}
