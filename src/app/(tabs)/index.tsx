import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, DateTile, EmptyState, ScreenTitle, Txt } from '@/components/ui';
import { canCreateEvents, useAuth } from '@/lib/auth';
import { timeText } from '@/lib/dates';
import { useEvents } from '@/lib/events';
import { useI18n } from '@/lib/i18n';
import { font, radius, space, touch, usePalette } from '@/lib/theme';

export default function EventsScreen() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { events, loading, error, refresh } = useEvents();
  const insets = useSafeAreaInsets();
  const c = usePalette();
  const canCreate = canCreateEvents(user);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={{
          paddingHorizontal: space.screen,
          paddingTop: insets.top + space.lg,
          paddingBottom: 112,
          gap: space.sm + 4,
        }}
        ListHeaderComponent={<ScreenTitle title={t('eventsTitle')} subtitle={t('eventsHint')} />}
        ListEmptyComponent={
          loading ? null : error ? (
            <EmptyState icon="cloud-offline-outline" title={t('loadError')} hint={t('loadErrorHint')} />
          ) : (
            <EmptyState icon="calendar-outline" title={t('noEventsTitle')} hint={t('noEventsHint')} />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } })}
            style={({ pressed }) => (pressed ? { opacity: 0.85, transform: [{ scale: 0.99 }] } : undefined)}>
            <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center', padding: 14 }}>
              <DateTile date={item.startsAt} lang={lang} />
              <View style={{ flex: 1, gap: 4 }}>
                <Txt variant="h2" numberOfLines={2}>
                  {item.title}
                </Txt>
                <Meta icon="time-outline" text={timeText(item.startsAt)} />
                <Meta icon="location-outline" text={item.place} />
              </View>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  accessibilityIgnoresInvertColors
                  style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: c.track }}
                />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={c.muted} />
              )}
            </Card>
          </Pressable>
        )}
      />

      {canCreate && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('newEvent')}
          onPress={() => router.push('/event/new')}
          style={({ pressed }) => ({
            position: 'absolute',
            right: space.screen,
            bottom: space.screen,
            minHeight: touch,
            borderRadius: radius.button,
            backgroundColor: c.green,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            paddingHorizontal: space.lg,
            opacity: pressed ? 0.85 : 1,
          })}>
          <Ionicons name="add" size={24} color={c.onGreen} />
          <Text style={{ fontFamily: font.bold, fontSize: 16, color: c.onGreen }}>{t('newEvent')}</Text>
        </Pressable>
      )}
    </View>
  );
}

function Meta({ icon, text }: { icon: 'time-outline' | 'location-outline'; text: string }) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={icon} size={16} color={c.muted} />
      <Txt variant="small" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
        {text}
      </Txt>
    </View>
  );
}
