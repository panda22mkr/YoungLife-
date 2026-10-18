import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Card, EmptyState, ScreenTitle, Segmented, Txt } from '@/components/ui';
import { canDirectMessage, useAuth } from '@/lib/auth';
import { useDirectThreads } from '@/lib/chat';
import { fullText, timeText } from '@/lib/dates';
import { useEvents } from '@/lib/events';
import { useI18n } from '@/lib/i18n';
import { space, usePalette } from '@/lib/theme';

type Tab = 'events' | 'direct';

// Чаты: общие чаты мероприятий и личные сообщения.
// Детям младше 15 лет личные сообщения недоступны (правило проверяется и на сервере).
export default function ChatsScreen() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { events, loading: eventsLoading, refresh: refreshEvents } = useEvents();
  const { threads, loading: threadsLoading, refresh: refreshThreads } = useDirectThreads();
  const insets = useSafeAreaInsets();
  const c = usePalette();
  const dm = user ? canDirectMessage(user) : false;
  const [tab, setTab] = useState<Tab>('events');
  const active: Tab = dm ? tab : 'events';

  const header = (
    <View>
      <ScreenTitle title={t('chatsTitle')} subtitle={t('chatsHint')} />
      {dm ? (
        <View style={{ marginBottom: space.md }}>
          <Segmented<Tab>
            value={active}
            onChange={setTab}
            options={[
              { key: 'events', label: t('chatEvents') },
              { key: 'direct', label: t('chatDirect') },
            ]}
          />
        </View>
      ) : (
        <Txt tone="muted" variant="small" style={{ marginBottom: space.md }}>
          {t('groupOnly')}
        </Txt>
      )}
    </View>
  );

  const listStyle = {
    paddingHorizontal: space.screen,
    paddingTop: insets.top + space.lg,
    paddingBottom: space.xl,
    gap: space.sm + 4,
  };

  if (active === 'events') {
    return (
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        refreshing={eventsLoading}
        onRefresh={refreshEvents}
        contentContainerStyle={listStyle}
        ListHeaderComponent={header}
        ListEmptyComponent={
          eventsLoading ? null : (
            <EmptyState icon="chatbubbles-outline" title={t('noChatEventsTitle')} hint={t('noChatEventsHint')} />
          )
        }
        renderItem={({ item }) => (
          <Row
            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
            left={
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: c.greenSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="chatbubbles-outline" size={24} color={c.greenText} />
              </View>
            }
            title={item.title}
            subtitle={fullText(item.startsAt, lang)}
          />
        )}
      />
    );
  }

  return (
    <FlatList
      data={threads}
      keyExtractor={(x) => x.userId}
      refreshing={threadsLoading}
      onRefresh={refreshThreads}
      contentContainerStyle={listStyle}
      ListHeaderComponent={header}
      ListEmptyComponent={
        threadsLoading ? null : (
          <EmptyState icon="chatbubble-ellipses-outline" title={t('noThreadsTitle')} hint={t('noThreadsHint')} />
        )
      }
      renderItem={({ item }) => (
        <Row
          onPress={() => router.push({ pathname: '/dm/[userId]', params: { userId: item.userId } })}
          left={<Avatar name={item.name || '?'} size={48} />}
          title={item.name || t('unknownUser')}
          subtitle={`${item.lastMine ? `${t('you')}: ` : ''}${item.lastBody}`}
          meta={timeText(item.lastAt)}
        />
      )}
    />
  );
}

function Row({
  left,
  title,
  subtitle,
  meta,
  onPress,
}: {
  left: React.ReactNode;
  title: string;
  subtitle: string;
  meta?: string;
  onPress: () => void;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.85, transform: [{ scale: 0.99 }] } : undefined)}>
      <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center', padding: 14 }}>
        {left}
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="strong" numberOfLines={1}>
            {title}
          </Txt>
          <Txt variant="small" tone="muted" numberOfLines={1}>
            {subtitle}
          </Txt>
        </View>
        {meta ? (
          <Txt variant="caption" tone="muted">
            {meta}
          </Txt>
        ) : (
          <Ionicons name="chevron-forward" size={20} color={c.muted} />
        )}
      </Card>
    </Pressable>
  );
}
