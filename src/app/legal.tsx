import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenTitle, Txt } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { CONTACT_EMAIL, LEGAL } from '@/lib/legal';
import { space } from '@/lib/theme';

// Правила и политика конфиденциальности (доступны и до входа в аккаунт).
export default function Legal() {
  const { lang, t } = useI18n();
  const insets = useSafeAreaInsets();
  const doc = LEGAL[lang];
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: insets.bottom + space.xl, gap: space.lg }}>
      <ScreenTitle title={doc.title} />
      <Txt tone="muted">{doc.note}</Txt>
      {doc.sections.map((s) => (
        <View key={s.h} style={{ gap: space.sm }}>
          <Txt variant="h2">{s.h}</Txt>
          {s.p.map((p) => (
            <Txt key={p}>{p}</Txt>
          ))}
        </View>
      ))}
      {CONTACT_EMAIL ? (
        <Txt tone="muted">
          {t('contactUs')}: {CONTACT_EMAIL}
        </Txt>
      ) : null}
    </ScrollView>
  );
}
