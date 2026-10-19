import { Ionicons } from '@expo/vector-icons';
import { Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ScreenTitle, Txt } from '@/components/ui';
import { DONATE_URL } from '@/lib/config';
import { useI18n } from '@/lib/i18n';
import { space, usePalette } from '@/lib/theme';

// Экран пожертвований: приложение некоммерческое, помощь добровольная.
export default function Donate() {
  const { t } = useI18n();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const ready = DONATE_URL.startsWith('https://');

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: insets.bottom + space.xl, gap: space.lg }}>
      <ScreenTitle title={t('donate')} />
      <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.lg }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: c.greenSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="heart" size={44} color={c.green} />
        </View>
        <Txt variant="h2" style={{ textAlign: 'center' }}>
          {t('donateTitle')}
        </Txt>
        <Txt tone="muted" style={{ textAlign: 'center' }}>
          {t('donateText')}
        </Txt>
      </View>
      {ready ? (
        <Button title={t('donateButton')} icon="heart-outline" onPress={() => Linking.openURL(DONATE_URL)} />
      ) : (
        <Txt tone="muted" style={{ textAlign: 'center' }}>
          {t('donateSoon')}
        </Txt>
      )}
      <Txt variant="caption" tone="muted" style={{ textAlign: 'center' }}>
        {t('donateNote')}
      </Txt>
    </ScrollView>
  );
}
