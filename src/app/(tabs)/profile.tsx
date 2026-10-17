import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, IconBadge, Segmented, Txt } from '@/components/ui';
import { calcAge, Role, useAuth } from '@/lib/auth';
import { Lang, TKey, useI18n } from '@/lib/i18n';
import { font, space, usePalette } from '@/lib/theme';

const roleKey: Record<Role, TKey> = { guest: 'roleGuest', leader: 'roleLeader', senior: 'roleSenior' };

export default function ProfileScreen() {
  const { t, lang, setLang } = useI18n();
  const { user, signOut, setDemoRole } = useAuth();
  const insets = useSafeAreaInsets();
  const c = usePalette();
  if (!user) return null;

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: space.screen,
        paddingTop: insets.top + space.lg,
        paddingBottom: space.xl,
        gap: space.md,
      }}>
      <View style={{ alignItems: 'center', gap: space.sm, marginBottom: space.sm }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: c.greenSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontFamily: font.extrabold, fontSize: 36, color: c.greenText }}>{initials}</Text>
        </View>
        <Txt variant="title" style={{ textAlign: 'center' }}>
          {user.name}
        </Txt>
        <Txt tone="muted">
          {user.email}, {calcAge(user.birthDate)} {t('years')}
        </Txt>
        <Chip label={t(roleKey[user.role])} />
      </View>

      <Card style={{ gap: space.sm }}>
        <Txt variant="small" tone="muted">
          {t('language')}
        </Txt>
        <Segmented<Lang>
          value={lang}
          onChange={setLang}
          options={[
            { key: 'ru', label: 'Русский' },
            { key: 'en', label: 'English' },
          ]}
        />
      </Card>

      <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        <IconBadge name="heart-outline" />
        <View style={{ flex: 1 }}>
          <Txt variant="strong">{t('donate')}</Txt>
          <Txt variant="small" tone="muted">
            {t('donateSoon')}
          </Txt>
        </View>
      </Card>

      <Card style={{ gap: space.sm }}>
        <Txt variant="small" tone="muted">
          {t('demoRole')}
        </Txt>
        <Segmented<Role>
          value={user.role}
          onChange={setDemoRole}
          options={[
            { key: 'guest', label: t('roleGuest') },
            { key: 'leader', label: t('roleLeader') },
            { key: 'senior', label: t('roleSenior') },
          ]}
        />
      </Card>

      <Button title={t('signOut')} variant="ghost" icon="log-out-outline" onPress={signOut} />
    </ScrollView>
  );
}
