import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field, Segmented, Txt, WordMark } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { Lang, useI18n } from '@/lib/i18n';
import { space } from '@/lib/theme';

export default function SignIn() {
  const { t, lang, setLang } = useI18n();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !password) return Alert.alert(t('fillAll'));
    setBusy(true);
    const error = await signIn(email, password);
    setBusy(false);
    if (error) Alert.alert(t(error));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: space.screen,
          paddingTop: insets.top + space.lg,
          paddingBottom: insets.bottom + space.lg,
          flexGrow: 1,
        }}>
        <View style={{ alignSelf: 'flex-end', width: 180 }}>
          <Segmented<Lang>
            value={lang}
            onChange={setLang}
            options={[
              { key: 'ru', label: 'RU' },
              { key: 'en', label: 'EN' },
            ]}
          />
        </View>

        <View style={{ marginTop: 64, marginBottom: 40, gap: space.md }}>
          <WordMark />
          <Txt tone="muted">{t('tagline')}</Txt>
        </View>

        <Field
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry />

        <View style={{ gap: space.sm, marginTop: space.sm }}>
          <Button title={t('signIn')} onPress={submit} loading={busy} />
          <Button title={t('signUp')} variant="ghost" onPress={() => router.push('/sign-up')} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
