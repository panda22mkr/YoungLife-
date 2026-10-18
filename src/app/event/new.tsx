import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field, ScreenTitle } from '@/components/ui';
import { canCreateEvents, useAuth } from '@/lib/auth';
import { parseDateTime } from '@/lib/dates';
import { useEvents } from '@/lib/events';
import { useI18n } from '@/lib/i18n';
import { space } from '@/lib/theme';

// Создавать мероприятия может только старший лидер.
export default function NewEvent() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { addEvent } = useEvents();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [place, setPlace] = useState('');
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user || !canCreateEvents(user)) return null;

  const submit = async () => {
    if (!title.trim() || !place.trim() || !when) return Alert.alert(t('fillAll'));
    const startsAt = parseDateTime(when);
    if (!startsAt) return Alert.alert(t('invalidDateTime'));
    setBusy(true);
    const ok = await addEvent({ title, description, place, startsAt });
    setBusy(false);
    if (ok) router.back();
    else Alert.alert(t('createError'));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.screen, paddingBottom: insets.bottom + space.lg }}>
        <ScreenTitle title={t('newEvent')} />
        <Field label={t('eventTitle')} value={title} onChangeText={setTitle} />
        <Field label={t('eventDescription')} value={description} onChangeText={setDescription} multiline />
        <Field label={t('eventPlace')} value={place} onChangeText={setPlace} />
        <Field
          label={t('eventWhen')}
          value={when}
          onChangeText={setWhen}
          placeholder={t('eventWhenHint')}
          keyboardType="numbers-and-punctuation"
        />
        <View style={{ marginTop: space.sm }}>
          <Button title={t('create')} onPress={submit} loading={busy} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
