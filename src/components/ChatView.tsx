import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, EmptyState, Txt } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { Message, SendResult } from '@/lib/chat';
import { fullText, timeText } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { font, radius, space, usePalette } from '@/lib/theme';

type ChatLike = {
  messages: Message[];
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  send: (body: string) => Promise<SendResult>;
  remove: (id: string) => Promise<boolean>;
};

const isToday = (d: Date) => d.toDateString() === new Date().toDateString();

// Общий экран переписки: список сообщений и поле ввода.
// showNames: показывать имя автора над чужими сообщениями (в общем чате).
// canDeleteAny: можно ли удалять чужие сообщения (старший лидер в общем чате).
export function ChatView({
  chat,
  showNames,
  canDeleteAny = false,
}: {
  chat: ChatLike;
  showNames: boolean;
  canDeleteAny?: boolean;
}) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  // Старые сообщения сверху, новые внизу; список всегда прокручен к последнему.
  const ordered = useMemo(() => [...chat.messages].reverse(), [chat.messages]);

  const canSend = text.trim().length > 0 && !sending;

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    setProblem(null);
    const result = await chat.send(text);
    setSending(false);
    if (result === 'ok') setText('');
    else setProblem(t(result === 'notAllowed' ? 'dmNotAllowed' : 'sendError'));
  };

  const askDelete = (m: Message) =>
    Alert.alert(t('deleteMessage'), t('deleteMessageAsk'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => {
          if (!(await chat.remove(m.id))) Alert.alert(t('deleteError'));
        },
      },
    ]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}>
      {chat.loading && chat.messages.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.muted} />
        </View>
      ) : chat.messages.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {chat.error ? (
            <EmptyState icon="cloud-offline-outline" title={t('chatLoadError')} />
          ) : (
            <EmptyState icon="chatbubbles-outline" title={t('noMessagesTitle')} hint={t('noMessagesHint')} />
          )}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={ordered}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          keyExtractor={(m) => m.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          refreshing={false}
          onRefresh={chat.refresh}
          contentContainerStyle={{ padding: space.screen, gap: 8 }}
          renderItem={({ item }) => {
            const mine = item.senderId === user?.id;
            const deletable = mine || canDeleteAny;
            return (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                {showNames && !mine ? (
                  <Avatar name={item.senderName || '?'} uri={item.senderAvatar} size={32} />
                ) : null}
                <Pressable
                  accessibilityRole="text"
                  accessibilityHint={deletable ? t('deleteMessage') : undefined}
                  onLongPress={deletable ? () => askDelete(item) : undefined}
                  delayLongPress={350}
                  style={{
                    maxWidth: '78%',
                    borderRadius: radius.card,
                    borderBottomRightRadius: mine ? 6 : radius.card,
                    borderBottomLeftRadius: mine ? radius.card : 6,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: mine ? c.green : c.surface,
                    borderWidth: mine ? 0 : 1,
                    borderColor: c.line,
                    gap: 2,
                  }}>
                  {showNames && !mine ? (
                    <Txt variant="caption" tone="green" numberOfLines={1}>
                      {item.senderName || t('unknownUser')}
                    </Txt>
                  ) : null}
                  <Text style={{ fontFamily: font.medium, fontSize: 16, lineHeight: 22, color: mine ? c.onGreen : c.ink }}>
                    {item.body}
                  </Text>
                  <Text
                    style={{
                      fontFamily: font.medium,
                      fontSize: 11,
                      lineHeight: 14,
                      alignSelf: 'flex-end',
                      color: mine ? c.onGreen : c.muted,
                      opacity: mine ? 0.7 : 1,
                    }}>
                    {isToday(item.createdAt) ? timeText(item.createdAt) : fullText(item.createdAt, lang)}
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}

      <View
        style={{
          paddingHorizontal: space.md,
          paddingTop: space.sm,
          paddingBottom: Math.max(insets.bottom, space.sm) + 2,
          gap: 6,
          backgroundColor: c.bg,
          borderTopWidth: 1,
          borderTopColor: c.line,
        }}>
        {problem ? (
          <Txt variant="small" tone="danger">
            {problem}
          </Txt>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('typeMessage')}
            placeholderTextColor={c.muted}
            multiline
            numberOfLines={1}
            maxLength={2000}
            accessibilityLabel={t('typeMessage')}
            style={{
              flex: 1,
              minHeight: 48,
              maxHeight: 140,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: c.line,
              backgroundColor: c.surface,
              color: c.ink,
              fontFamily: font.medium,
              fontSize: 16,
              paddingHorizontal: 18,
              paddingTop: Platform.OS === 'ios' ? 13 : 10,
              paddingBottom: Platform.OS === 'ios' ? 13 : 10,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('sendMessage')}
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={submit}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: canSend ? c.green : c.track,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}>
            {sending ? (
              <ActivityIndicator color={c.onGreen} />
            ) : (
              <Ionicons name="arrow-up" size={24} color={canSend ? c.onGreen : c.muted} />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
