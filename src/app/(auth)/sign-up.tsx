import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field, ScreenTitle, Txt } from '@/components/ui';
import { calcAge, MIN_AGE, MIN_PASSWORD, parseBirthDate, useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { space } from '@/lib/theme';

export default function SignUp() {
  const { t } = useI18n();
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birth, setBirth] = useState('');

  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email || !password || !birth) return Alert.alert(t('fillAll'));
    const date = parseBirthDate(birth);
    if (!date) return Alert.alert(t('invalidDate'));
    if (calcAge(date) < MIN_AGE) return Alert.alert(t('tooYoung'));
    if (password.length < MIN_PASSWORD) return Alert.alert(t('weakPassword'));
    setBusy(true);
    const result = await signUp(name, email, password, date);
    setBusy(false);
    if (result.error) return Alert.alert(t(result.error));
    if (result.needsConfirm) {
      Alert.alert(t('checkEmail'));
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: space.screen,
          paddingTop: insets.top + space.xl,
          paddingBottom: insets.bottom + space.lg,
        }}>
        <ScreenTitle title={t('signUp')} />
        <Field label={t('name')} value={name} onChangeText={setName} autoComplete="name" />
        <Field
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          label={t('password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t('passwordHint')}
        />
        <Field
          label={t('birthDate')}
          value={birth}
          onChangeText={setBirth}
          keyboardType="numbers-and-punctuation"
          placeholder={t('birthHint')}
        />
        <View style={{ gap: space.sm, marginTop: space.sm }}>
          <Txt variant="small" tone="muted" style={{ textAlign: 'center' }}>
            {t('termsAccept')}{' '}
            <Txt variant="small" tone="green" onPress={() => router.push('/legal')}>
              {t('rulesPrivacy')}
            </Txt>
          </Txt>
          <Button title={t('signUp')} onPress={submit} loading={busy} />
          <Button title={t('haveAccount')} variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
