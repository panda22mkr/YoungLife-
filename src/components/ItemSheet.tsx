import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field, Txt } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { radius, space, usePalette } from '@/lib/theme';

export type ItemValues = { name: string; note: string; noteHidden: boolean };

// Окно для добавления и правки имени (Дерево, Список) или места (Карта).
// Имя всегда видно, а заметку можно скрыть: тогда в окне она закрыта, пока не нажать «Показать».
// Чтобы окно открывалось «с нуля», родитель задаёт ему новый key.
export function ItemSheet({
  title,
  nameLabel,
  initial,
  children,
  onSave,
  onDelete,
  onClose,
}: {
  title: string;
  nameLabel: string;
  initial?: ItemValues;
  children?: React.ReactNode;
  onSave: (v: ItemValues) => Promise<boolean>;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initial?.name ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [hidden, setHidden] = useState(initial?.noteHidden ?? false);
  // Скрытая заметка в уже сохранённом имени закрыта, пока человек сам не нажмёт «Показать».
  const [revealed, setRevealed] = useState(!(initial?.noteHidden && (initial?.note ?? '').length > 0));
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState(false);

  const canSave = name.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setProblem(false);
    const ok = await onSave({ name, note, noteHidden: hidden });
    setSaving(false);
    if (!ok) setProblem(true);
  };

  const askDelete = () =>
    Alert.alert(t('deletePersonAsk'), undefined, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('deletePerson'), style: 'destructive', onPress: onDelete },
    ]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          accessibilityLabel={t('cancel')}
          onPress={onClose}
          style={{ flex: 1, backgroundColor: 'rgba(14,42,71,0.45)' }}
        />
        <View
          style={{
            maxHeight: '88%',
            backgroundColor: c.bg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: space.md,
            paddingBottom: Math.max(insets.bottom, space.md),
          }}>
          <View
            style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.line, marginBottom: space.md }}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: space.sm }}>
            <Txt variant="h2" style={{ marginBottom: space.md }}>
              {title}
            </Txt>

            <Field
              label={nameLabel}
              value={name}
              onChangeText={setName}
              maxLength={60}
              autoFocus={!initial}
              returnKeyType="done"
            />

            {children}

            {revealed ? (
              <Field
                label={t('personNote')}
                value={note}
                onChangeText={setNote}
                placeholder={t('personNoteHint')}
                multiline
                maxLength={1000}
              />
            ) : (
              <View style={{ marginBottom: space.md }}>
                <Txt variant="small" tone="muted" style={{ marginBottom: 6 }}>
                  {t('personNote')}
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setRevealed(true)}
                  style={{
                    minHeight: 56,
                    borderRadius: radius.input,
                    borderWidth: 1,
                    borderColor: c.line,
                    backgroundColor: c.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.sm,
                    paddingHorizontal: space.md,
                  }}>
                  <Ionicons name="eye-off-outline" size={22} color={c.muted} />
                  <Txt tone="muted" style={{ flex: 1 }}>
                    {t('noteHiddenText')}
                  </Txt>
                  <Txt variant="strong" tone="green">
                    {t('showNote')}
                  </Txt>
                </Pressable>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48, marginBottom: space.md }}>
              <Ionicons name="eye-off-outline" size={22} color={c.muted} />
              <Txt style={{ flex: 1 }}>{t('hideNote')}</Txt>
              <Switch
                accessibilityLabel={t('hideNote')}
                value={hidden}
                onValueChange={setHidden}
                trackColor={{ false: c.track, true: c.green }}
                thumbColor="#FFFFFF"
              />
            </View>

            {problem ? (
              <Txt variant="small" tone="danger" style={{ marginBottom: space.sm }}>
                {t('toolSaveError')}
              </Txt>
            ) : null}

            <View style={{ gap: space.sm }}>
              <Button title={t('save')} onPress={save} loading={saving} style={!canSave && !saving ? { opacity: 0.5 } : undefined} />
              {onDelete ? <Button title={t('deletePerson')} variant="danger" icon="trash-outline" onPress={askDelete} /> : null}
              <Button title={t('cancel')} variant="ghost" onPress={onClose} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
