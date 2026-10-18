import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button, Field, ScreenTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { space, usePalette } from '@/lib/theme';

export default function ProfileEdit() {
  const { t } = useI18n();
  const { user, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const c = usePalette();
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(user?.avatarUri);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
    } catch {
      Alert.alert(t('photoError'));
    }
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert(t('nameRequired'));
    setBusy(true);
    const ok = await updateProfile({ name: name.trim().slice(0, 60), bio: bio.trim(), avatarUri });
    setBusy(false);
    if (ok) router.back();
    else Alert.alert(t('saveError'));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: insets.bottom + space.lg }}>
        <ScreenTitle title={t('editProfile')} />

        <View style={{ alignItems: 'center', gap: space.sm, marginBottom: space.lg }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('changePhoto')}
            onPress={pickPhoto}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <Avatar name={name || user.name} uri={avatarUri} size={120} />
            <View
              style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: c.green,
                borderWidth: 3,
                borderColor: c.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="camera" size={20} color={c.onGreen} />
            </View>
          </Pressable>
          <Button title={t('changePhoto')} variant="ghost" icon="image-outline" onPress={pickPhoto} />
          {avatarUri ? (
            <Button title={t('removePhoto')} variant="ghost" onPress={() => setAvatarUri(undefined)} />
          ) : null}
        </View>

        <Field label={t('name')} value={name} onChangeText={setName} autoComplete="name" />
        <Field
          label={t('bio')}
          value={bio}
          onChangeText={setBio}
          placeholder={t('bioHint')}
          multiline
          maxLength={200}
        />
        <View style={{ marginTop: space.sm }}>
          <Button title={t('save')} onPress={save} loading={busy} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
