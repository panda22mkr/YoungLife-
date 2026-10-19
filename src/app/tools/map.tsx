import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useRef, useState } from 'react';
import { ActivityIndicator, Alert, PanResponder, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { ItemSheet } from '@/components/ItemSheet';
import { Button, EmptyState, ScreenTitle, Txt } from '@/components/ui';
import { isLeader, useAuth } from '@/lib/auth';
import { TKey, useI18n } from '@/lib/i18n';
import { PLACE_KINDS, PLACE_STATUSES, Place, PlaceKind, PlaceStatus, usePlaces } from '@/lib/tools';
import { font, radius, space, usePalette } from '@/lib/theme';

// Карта: рисованная схема, как в блокноте. В центре клуб, вокруг кружки-места,
// за которые лидер молится: школа, двор, район, село, город. Кружки можно двигать.

type IconName = ComponentProps<typeof Ionicons>['name'];

const KIND_ICON: Record<PlaceKind, IconName> = {
  school: 'school-outline',
  field: 'football-outline',
  park: 'leaf-outline',
  village: 'home-outline',
  city: 'business-outline',
  country: 'earth-outline',
  other: 'location-outline',
};
const KIND_TITLE: Record<PlaceKind, TKey> = {
  school: 'kindSchool',
  field: 'kindField',
  park: 'kindPark',
  village: 'kindVillage',
  city: 'kindCity',
  country: 'kindCountry',
  other: 'kindOther',
};
const STATUS_TITLE: Record<PlaceStatus, TKey> = {
  praying: 'statusPraying',
  planning: 'statusPlanning',
  started: 'statusStarted',
};

const NODE_W = 104;
const NODE_H = 66;
const PLANNING = '#E39A2D';

type SheetState = { place?: Place; n: number } | null;

export default function MapScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const c = usePalette();
  const { width: W } = useWindowDimensions();
  const map = usePlaces();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [kind, setKind] = useState<PlaceKind>('school');
  const [status, setStatus] = useState<PlaceStatus>('praying');
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [scrollOn, setScrollOn] = useState(true);

  if (!isLeader(user)) return null;

  const cw = Math.min(W, 520) - space.screen * 2;
  const ch = Math.round(cw * 1.3);

  const statusColor = (s: PlaceStatus) => (s === 'started' ? c.green : s === 'planning' ? PLANNING : c.muted);

  const openAdd = () => {
    setKind('school');
    setStatus('praying');
    setSheet({ n: Date.now() });
  };
  const openEdit = (p: Place) => {
    setKind(p.kind);
    setStatus(p.status);
    setSheet({ place: p, n: 0 });
  };

  const save = async (v: { name: string; note: string; noteHidden: boolean }) => {
    if (!sheet) return true;
    const input = { ...v, kind, status };
    if (sheet.place) {
      if (!(await map.update(sheet.place.id, input))) return false;
      setSheet(null);
      return true;
    }
    const res = await map.addPlace(input);
    if (res.error === 'limit') {
      setSheet(null);
      Alert.alert(t('limitReached'));
      return true;
    }
    if (res.error) return false;
    setSheet(null);
    return true;
  };

  const chips = <T extends string>(
    label: string,
    values: readonly T[],
    titles: Record<T, TKey>,
    current: T,
    set: (v: T) => void,
    tint: (v: T) => string,
  ) => (
    <>
      <Txt variant="small" tone="muted" style={{ marginBottom: 6 }}>
        {label}
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.md }}>
        {values.map((v) => {
          const on = v === current;
          return (
            <Pressable
              key={v}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => set(v)}
              style={{
                minHeight: 44,
                paddingHorizontal: 14,
                borderRadius: 22,
                borderWidth: 1.5,
                borderColor: on ? tint(v) : c.line,
                backgroundColor: on ? c.greenSoft : c.surface,
                justifyContent: 'center',
              }}>
              <Text style={{ fontFamily: on ? font.bold : font.medium, fontSize: 14, color: c.ink }}>{t(titles[v])}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView scrollEnabled={scrollOn} contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: space.xl }}>
        <ScreenTitle title={t('map')} subtitle={t('mapHint')} />
        <Button title={t('addPlace')} icon="add" variant="secondary" onPress={openAdd} style={{ marginBottom: space.md }} />

        {map.loading ? (
          <ActivityIndicator color={c.muted} style={{ marginTop: space.xl }} />
        ) : map.error && map.items.length === 0 ? (
          <EmptyState icon="cloud-offline-outline" title={t('toolsLoadError')} />
        ) : (
          <>
            <View
              style={{
                width: cw,
                height: ch,
                borderRadius: radius.card,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.line,
                overflow: 'hidden',
              }}>
              {/* дороги и клуб в центре */}
              <Svg width={cw} height={ch} viewBox="0 0 100 130" preserveAspectRatio="none" style={{ position: 'absolute' }}>
                <Path d="M-5,18 C25,28 40,40 50,65 C62,92 80,100 105,108" stroke={c.track} strokeWidth={9} fill="none" strokeLinecap="round" />
                <Path d="M50,65 C30,78 22,95 -5,104" stroke={c.track} strokeWidth={7} fill="none" strokeLinecap="round" />
                <Path d="M50,65 C60,45 78,32 105,24" stroke={c.track} strokeWidth={7} fill="none" strokeLinecap="round" />
                <Path d="M50,65 C48,90 44,110 40,136" stroke={c.track} strokeWidth={6} fill="none" strokeLinecap="round" />
                <Rect x={41} y={57} width={18} height={14} rx={2} fill={c.green} />
                <Path d="M40,58 L50,50 L60,58 Z" fill={c.greenText} />
              </Svg>
              <View
                pointerEvents="none"
                style={{ position: 'absolute', left: cw / 2 - 50, top: ch / 2 + 22, width: 100, alignItems: 'center' }}>
                <Text style={{ fontFamily: font.extrabold, fontSize: 13, color: c.greenText }}>{t('myClub')}</Text>
              </View>

              {/* места */}
              {map.items.map((p) => {
                const live = drag?.id === p.id ? drag : null;
                return (
                  <PlaceNode
                    key={p.id}
                    place={p}
                    x={live ? live.x : p.x}
                    y={live ? live.y : p.y}
                    cw={cw}
                    ch={ch}
                    color={statusColor(p.status)}
                    onTap={() => {
                      setScrollOn(true);
                      openEdit(p);
                    }}
                    onCancel={() => setScrollOn(true)}
                    onDragStart={() => setScrollOn(false)}
                    onDrag={(x, y) => setDrag({ id: p.id, x, y })}
                    onDrop={(x, y) => {
                      setDrag(null);
                      setScrollOn(true);
                      void map.moveTo(p.id, x, y);
                    }}
                  />
                );
              })}
            </View>

            {map.items.length === 0 ? (
              <Txt tone="muted" style={{ textAlign: 'center', marginTop: space.md }}>
                {t('mapEmptyHint')}
              </Txt>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md }}>
                {PLACE_STATUSES.map((s) => (
                  <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: statusColor(s) }} />
                    <Txt variant="small" tone="muted">
                      {t(STATUS_TITLE[s])}
                    </Txt>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {sheet ? (
        <ItemSheet
          key={`${sheet.place?.id ?? 'new'}-${sheet.n}`}
          title={sheet.place ? sheet.place.name : t('addPlace')}
          nameLabel={t('placeName')}
          initial={
            sheet.place ? { name: sheet.place.name, note: sheet.place.note, noteHidden: sheet.place.noteHidden } : undefined
          }
          onSave={save}
          onDelete={
            sheet.place
              ? async () => {
                  if (await map.remove(sheet.place!.id)) setSheet(null);
                  else Alert.alert(t('toolSaveError'));
                }
              : undefined
          }
          onClose={() => setSheet(null)}>
          {chips(t('placeKind'), PLACE_KINDS, KIND_TITLE, kind, setKind, () => c.green)}
          {chips(t('placeStatus'), PLACE_STATUSES, STATUS_TITLE, status, setStatus, statusColor)}
        </ItemSheet>
      ) : null}
    </View>
  );
}

// Кружок-место: нажатие открывает запись, перетаскивание двигает кружок по схеме.
function PlaceNode({
  place,
  x,
  y,
  cw,
  ch,
  color,
  onTap,
  onCancel,
  onDragStart,
  onDrag,
  onDrop,
}: {
  place: Place;
  x: number;
  y: number;
  cw: number;
  ch: number;
  color: string;
  onTap: () => void;
  onCancel: () => void;
  onDragStart: () => void;
  onDrag: (x: number, y: number) => void;
  onDrop: (x: number, y: number) => void;
}) {
  const c = usePalette();
  const props = useRef({ place, cw, ch, onTap, onCancel, onDragStart, onDrag, onDrop });
  props.current = { place, cw, ch, onTap, onCancel, onDragStart, onDrag, onDrop };
  const start = useRef({ x: 0, y: 0, moved: false, last: { x: 0, y: 0 } }).current;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const p = props.current;
        start.x = p.place.x;
        start.y = p.place.y;
        start.moved = false;
        start.last = { x: p.place.x, y: p.place.y };
        // Страница замирает сразу при касании кружка, а не после первого сдвига.
        p.onDragStart();
      },
      onPanResponderMove: (_e, g) => {
        const p = props.current;
        if (!start.moved && Math.hypot(g.dx, g.dy) < 6) return;
        start.moved = true;
        const nx = Math.max(0.1, Math.min(0.9, start.x + g.dx / p.cw));
        const ny = Math.max(0.07, Math.min(0.93, start.y + g.dy / p.ch));
        start.last = { x: nx, y: ny };
        p.onDrag(nx, ny);
      },
      onPanResponderRelease: () => {
        const p = props.current;
        if (start.moved) p.onDrop(start.last.x, start.last.y);
        else p.onTap();
      },
      onPanResponderTerminate: () => {
        if (start.moved) props.current.onDrop(start.last.x, start.last.y);
        else props.current.onCancel();
      },
    }),
  ).current;

  const started = place.status === 'started';
  return (
    <View
      {...pan.panHandlers}
      accessibilityRole="button"
      accessibilityLabel={place.name}
      style={{
        position: 'absolute',
        left: x * cw - NODE_W / 2,
        top: y * ch - NODE_H / 2,
        width: NODE_W,
        height: NODE_H,
        borderRadius: NODE_H / 2,
        borderWidth: 2.5,
        borderColor: color,
        borderStyle: place.status === 'praying' ? 'dashed' : 'solid',
        backgroundColor: started ? c.greenSoft : c.bg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
      }}>
      <Ionicons name={KIND_ICON[place.kind]} size={16} color={c.muted} />
      <Text numberOfLines={2} style={{ fontFamily: font.bold, fontSize: 12, lineHeight: 14, textAlign: 'center', color: c.ink }}>
        {place.name}
      </Text>
    </View>
  );
}
