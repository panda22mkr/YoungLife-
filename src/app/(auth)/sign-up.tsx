import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field, ScreenTitle } from '@/components/ui';
import { calcAge, MIN_AGE, parseBirthDate, useAuth } from '@/lib/auth';
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

  const submit = () => {
    if (!name || !email || !password || !birth) return Alert.alert(t('fillAll'));
    const date = parseBirthDate(birth);
    if (!date) return Alert.alert(t('invalidDate'));
    if (calcAge(date) < MIN_AGE) return Alert.alert(t('tooYoung'));
    signUp(name, email, password, date);
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
        <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry />
        <Field
          label={t('birthDate')}
          value={birth}
          onChangeText={setBirth}
          keyboardType="numbers-and-punctuation"
          placeholder={t('birthHint')}
        />
        <View style={{ gap: space.sm, marginTop: space.sm }}>
          <Button title={t('signUp')} onPress={submit} />
          <Button title={t('haveAccount')} variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
