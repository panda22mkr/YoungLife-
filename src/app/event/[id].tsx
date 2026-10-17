import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import { Button, Card } from '@/components/ui';
import { useEvents } from '@/lib/events';
import { useI18n } from '@/lib/i18n';
import { colors, space } from '@/lib/theme';

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events } = useEvents();
  const { t } = useI18n();
  const event = events.find((e) => e.id === id);
  if (!event) return null;

  const openMaps = () =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.place)}`);

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }}>
      <Stack.Screen options={{ title: event.title }} />
      <Text style={{ color: colors.white, fontSize: 24, fontWeight: '800' }}>{event.title}</Text>
      <Text style={{ color: colors.muted, fontSize: 16 }}>{event.description}</Text>
      <Card style={{ gap: space.sm }}>
        <Row icon="time" label={t('when')} value={event.when} />
        <Row icon="location" label={t('where')} value={event.place} />
        <Row icon="person" label={t('author')} value={event.authorName} />
      </Card>
      <Button title={t('openInMaps')} onPress={openMaps} />
      <Button variant="secondary" title={t('writeAuthor')} onPress={() => Alert.alert(t('chatSoon'))} />
    </ScrollView>
  );
}

function Row({ icon, label, value }: { icon: 'time' | 'location' | 'person'; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
      <Ionicons name={icon} size={18} color={colors.green} />
      <Text style={{ color: colors.muted }}>{label}:</Text>
      <Text style={{ color: colors.white, flexShrink: 1 }}>{value}</Text>
    </View>
  );
}
