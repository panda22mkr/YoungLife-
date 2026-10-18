import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, Chip, IconButton, Txt } from '@/components/ui';
import { calcAge, Role, useAuth } from '@/lib/auth';
import { TKey, useI18n } from '@/lib/i18n';
import { space } from '@/lib/theme';

const roleKey: Record<Role, TKey> = { guest: 'roleGuest', leader: 'roleLeader', senior: 'roleSenior' };

export default function ProfileScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  if (!user) return null;

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: space.screen,
        paddingTop: insets.top + space.md,
        paddingBottom: space.xl,
        gap: space.md,
      }}>
      <View style={{ alignItems: 'flex-end' }}>
        <IconButton icon="settings-outline" label={t('settings')} onPress={() => router.push('/settings')} />
      </View>

      <View style={{ alignItems: 'center', gap: space.sm, marginBottom: space.md }}>
        <Avatar name={user.name} uri={user.avatarUri} size={112} />
        <Txt variant="title" style={{ textAlign: 'center', marginTop: space.sm }}>
          {user.name}
        </Txt>
        <Txt tone="muted">
          {user.email}, {calcAge(user.birthDate)} {t('years')}
        </Txt>
        <Chip label={t(roleKey[user.role])} align="center" />
        {user.bio ? (
          <Txt tone="muted" style={{ textAlign: 'center', marginTop: space.sm }}>
            {user.bio}
          </Txt>
        ) : null}
      </View>

      <Button title={t('editProfile')} icon="create-outline" onPress={() => router.push('/profile-edit')} />
      <Button title={t('settings')} variant="secondary" icon="settings-outline" onPress={() => router.push('/settings')} />
    </ScrollView>
  );
}
