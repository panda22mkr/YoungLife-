import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Button, Card } from '@/components/ui';
import { canCreateEvents, useAuth } from '@/lib/auth';
import { useEvents } from '@/lib/events';
import { useI18n } from '@/lib/i18n';
import { colors, space } from '@/lib/theme';

export default function EventsScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { events } = useEvents();

  return (
    <FlatList
      data={events}
      keyExtractor={(e) => e.id}
      contentContainerStyle={{ padding: space.md, gap: space.md }}
      ListHeaderComponent={
        <View style={{ gap: space.md }}>
          <Text style={{ color: colors.white, fontSize: 22, fontWeight: '800' }}>{t('upcoming')}</Text>
          {canCreateEvents(user) && <Button title={`+ ${t('newEvent')}`} onPress={() => router.push('/event/new')} />}
        </View>
      }
      ListEmptyComponent={<Text style={{ color: colors.muted }}>{t('noEvents')}</Text>}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } })}>
          <Card>
            <Text style={{ color: colors.white, fontSize: 18, fontWeight: '700' }}>{item.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.sm }}>
              <Ionicons name="time" size={16} color={colors.green} />
              <Text style={{ color: colors.muted }}>{item.when}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Ionicons name="location" size={16} color={colors.green} />
              <Text style={{ color: colors.muted, flexShrink: 1 }}>{item.place}</Text>
            </View>
          </Card>
        </Pressable>
      )}
    />
  );
}
