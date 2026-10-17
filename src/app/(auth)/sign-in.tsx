import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Button, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { colors, space } from '@/lib/theme';

export default function SignIn() {
  const { t, lang, setLang } = useI18n();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => {
    if (!email || !password) return Alert.alert(t('fillAll'));
    if (!signIn(email, password)) Alert.alert(t('signUp'), t('noAccount'));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 96 }}>
        <Text style={{ color: colors.green, fontSize: 40, fontWeight: '800' }}>young</Text>
        <Text style={{ color: colors.white, fontSize: 40, fontWeight: '800', marginTop: -12, marginBottom: space.xl }}>
          life
        </Text>
        <Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry />
        <Button title={t('signIn')} onPress={submit} />
        <View style={{ height: space.md }} />
        <Link href="/sign-up" style={{ color: colors.green, textAlign: 'center', padding: space.sm }}>
          {t('noAccount')}
        </Link>
        <View style={{ height: space.lg }} />
        <Button
          variant="secondary"
          title={lang === 'ru' ? 'English' : 'Русский'}
          onPress={() => setLang(lang === 'ru' ? 'en' : 'ru')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
