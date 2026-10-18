import Constants from 'expo-constants';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, IconBadge, ScreenTitle, Segmented, SwitchRow, Txt } from '@/components/ui';
import { Role, useAuth } from '@/lib/auth';
import { Lang, useI18n } from '@/lib/i18n';
import { ThemeChoice, usePrefs } from '@/lib/prefs';
import { space } from '@/lib/theme';

export default function SettingsScreen() {
  const { t, lang, setLang } = useI18n();
  const { user, signOut, setDemoRole } = useAuth();
  const { theme, setTheme, notifications, setNotifications } = usePrefs();
  const insets = useSafeAreaInsets();
  if (!user) return null;

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: space.screen,
        paddingBottom: insets.bottom + space.xl,
        gap: space.md,
      }}>
      <ScreenTitle title={t('settings')} />

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

      <Card style={{ gap: space.sm }}>
        <Txt variant="small" tone="muted">
          {t('theme')}
        </Txt>
        <Segmented<ThemeChoice>
          value={theme}
          onChange={setTheme}
          options={[
            { key: 'system', label: t('themeAuto') },
            { key: 'light', label: t('themeLight') },
            { key: 'dark', label: t('themeDark') },
          ]}
        />
      </Card>

      <Card>
        <SwitchRow
          icon="notifications-outline"
          title={t('notifications')}
          subtitle={t('notificationsHint')}
          value={notifications}
          onValueChange={setNotifications}
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
            { key: 'senior', label: t('roleSeniorShort') },
          ]}
        />
      </Card>

      <Button
        title={t('signOut')}
        variant="danger"
        icon="log-out-outline"
        onPress={() =>
          Alert.alert(t('signOut'), undefined, [
            { text: t('cancel'), style: 'cancel' },
            { text: t('signOut'), style: 'destructive', onPress: signOut },
          ])
        }
      />

      <Txt variant="caption" tone="muted" style={{ textAlign: 'center' }}>
        {t('appVersion')} {Constants.expoConfig?.version ?? '1.0.0'}
      </Txt>
    </ScrollView>
  );
}
