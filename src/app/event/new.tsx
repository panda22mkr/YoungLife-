import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
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
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  if (!user || !canCreateEvents(user)) return null;

  const pickPhoto = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
      if (!r.canceled && r.assets[0]) setImageUri(r.assets[0].uri);
    } catch {
      Alert.alert(t('photoError'));
    }
  };

  const submit = async () => {
    if (!title.trim() || !place.trim() || !when) return Alert.alert(t('fillAll'));
    const startsAt = parseDateTime(when);
    if (!startsAt) return Alert.alert(t('invalidDateTime'));
    setBusy(true);
    const ok = await addEvent({ title, description, place, startsAt, imageUri });
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
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 16, marginBottom: space.sm }} />
        ) : null}
        <Button title={imageUri ? t('changePhoto') : t('addEventPhoto')} variant="ghost" icon="image-outline" onPress={pickPhoto} />
        {imageUri ? <Button title={t('removePhoto')} variant="ghost" onPress={() => setImageUri(undefined)} /> : null}
        <View style={{ marginTop: space.sm }}>
          <Button title={t('create')} onPress={submit} loading={busy} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
