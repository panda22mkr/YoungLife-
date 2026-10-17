import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Button, Field } from '@/components/ui';
import { canCreateEvents, useAuth } from '@/lib/auth';
import { useEvents } from '@/lib/events';
import { useI18n } from '@/lib/i18n';
import { space } from '@/lib/theme';

// Создавать мероприятия может только старший лидер.
export default function NewEvent() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { addEvent } = useEvents();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [place, setPlace] = useState('');
  const [when, setWhen] = useState('');

  if (!user || !canCreateEvents(user)) return null;

  const submit = () => {
    if (!title || !place || !when) return Alert.alert(t('fillAll'));
    addEvent({ title, description, place, when, authorName: user.name });
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: space.md }}>
      <Field label={t('eventTitle')} value={title} onChangeText={setTitle} />
      <Field label={t('eventDescription')} value={description} onChangeText={setDescription} multiline style={{ minHeight: 90 }} />
      <Field label={t('eventPlace')} value={place} onChangeText={setPlace} />
      <Field label={t('eventWhen')} value={when} onChangeText={setWhen} placeholder="Пт, 19:00" />
      <Button title={t('create')} onPress={submit} />
    </ScrollView>
  );
}
