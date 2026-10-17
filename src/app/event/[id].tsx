import { Ionicons } from '@expo/vector-icons';
import { Alert, Linking, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, DateTile, IconBadge, Txt } from '@/components/ui';
import { fullText } from '@/lib/dates';
import { useEvents } from '@/lib/events';
import { useI18n } from '@/lib/i18n';
import { space, usePalette } from '@/lib/theme';

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events } = useEvents();
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const c = usePalette();
  const event = events.find((e) => e.id === id);
  if (!event) return null;

  const openMaps = () =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.place)}`);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space.screen, gap: space.lg }}>
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <DateTile date={event.startsAt} lang={lang} large />
          <Txt variant="title" style={{ flex: 1 }}>
            {event.title}
          </Txt>
        </View>

        {event.description ? <Txt tone="muted">{event.description}</Txt> : null}

        <Card style={{ gap: space.md }}>
          <InfoRow icon="time-outline" label={t('when')} value={fullText(event.startsAt, lang)} />
          <InfoRow icon="location-outline" label={t('where')} value={event.place} />
          <InfoRow icon="person-outline" label={t('author')} value={event.authorName} />
        </Card>
      </ScrollView>

      <View
        style={{
          padding: space.screen,
          paddingBottom: insets.bottom + space.md,
          gap: space.sm,
          backgroundColor: c.bg,
          borderTopWidth: 1,
          borderTopColor: c.line,
        }}>
        <Button title={t('writeAuthor')} icon="chatbubble-outline" onPress={() => Alert.alert(t('chatSoon'))} />
        <Button title={t('openInMaps')} variant="secondary" icon="map-outline" onPress={openMaps} />
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
      <IconBadge name={icon} />
      <View style={{ flex: 1 }}>
        <Txt variant="caption" tone="muted">
          {label}
        </Txt>
        <Txt variant="strong">{value}</Txt>
      </View>
    </View>
  );
}
