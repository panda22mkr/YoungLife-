import { ScrollView, Text, View } from 'react-native';
import { Button, Card } from '@/components/ui';
import { calcAge, Role, useAuth } from '@/lib/auth';
import { TKey, useI18n } from '@/lib/i18n';
import { colors, space } from '@/lib/theme';

const roleKey: Record<Role, TKey> = { guest: 'roleGuest', leader: 'roleLeader', senior: 'roleSenior' };

export default function ProfileScreen() {
  const { t, lang, setLang } = useI18n();
  const { user, signOut, setDemoRole } = useAuth();
  if (!user) return null;

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }}>
      <Card>
        <Text style={{ color: colors.white, fontSize: 22, fontWeight: '800' }}>{user.name}</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>{user.email}</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>
          {t('age')}: {calcAge(user.birthDate)} · {t('role')}: {t(roleKey[user.role])}
        </Text>
      </Card>

      <Card style={{ gap: space.sm }}>
        <Text style={{ color: colors.muted }}>{t('demoRole')}</Text>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          {(['guest', 'leader', 'senior'] as Role[]).map((r) => (
            <Button
              key={r}
              title={t(roleKey[r])}
              variant={user.role === r ? 'primary' : 'secondary'}
              onPress={() => setDemoRole(r)}
              style={{ paddingHorizontal: space.md }}
            />
          ))}
        </View>
      </Card>

      <Card style={{ gap: space.sm }}>
        <Text style={{ color: colors.white, fontWeight: '700' }}>{t('donate')}</Text>
        <Text style={{ color: colors.muted }}>{t('donateSoon')}</Text>
      </Card>

      <Button
        variant="secondary"
        title={`${t('language')}: ${lang === 'ru' ? 'English' : 'Русский'}`}
        onPress={() => setLang(lang === 'ru' ? 'en' : 'ru')}
      />
      <Button variant="secondary" title={t('signOut')} onPress={signOut} />
    </ScrollView>
  );
}
