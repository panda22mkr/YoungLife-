import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { Button, Field } from '@/components/ui';
import { calcAge, MIN_AGE, parseBirthDate, useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { colors, space } from '@/lib/theme';

export default function SignUp() {
  const { t } = useI18n();
  const { signUp } = useAuth();
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
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 72 }}>
        <Text style={{ color: colors.white, fontSize: 28, fontWeight: '800', marginBottom: space.lg }}>
          {t('signUp')}
        </Text>
        <Field label={t('name')} value={name} onChangeText={setName} />
        <Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry />
        <Field label={t('birthDate')} value={birth} onChangeText={setBirth} keyboardType="numbers-and-punctuation" placeholder="15.03.2010" />
        <Button title={t('signUp')} onPress={submit} />
        <Link href="/sign-in" style={{ color: colors.green, textAlign: 'center', padding: space.md }}>
          {t('haveAccount')}
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
