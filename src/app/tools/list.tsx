import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ItemSheet } from '@/components/ItemSheet';
import { EmptyState, ScreenTitle, Txt } from '@/components/ui';
import { isLeader, useAuth } from '@/lib/auth';
import { TKey, useI18n } from '@/lib/i18n';
import { PRAYER_COLS, PrayerCol, PrayerPerson, usePrayerList } from '@/lib/tools';
import { font, radius, space, usePalette } from '@/lib/theme';

// Список: имена по пяти столбцам, как в блокноте. Имя перетаскивается за ручку слева
// в другой столбец или на другое место. Есть и запасной способ: открыть имя и выбрать столбец.

const COL_TITLE: Record<PrayerCol, TKey> = {
  new: 'colNew',
  club: 'colClub',
  leaders: 'colLeaders',
  students: 'colStudents',
  sponsors: 'colSponsors',
};

const PAD = space.screen;
const GAP = 12;
const ROW = 60; // высота строки вместе с отступом
const CARD_H = 52;
const HEAD_H = 52;
const COL_PAD = 10;
const AREA_TOP = COL_PAD + HEAD_H; // где начинаются карточки внутри столбца

type Target = { col: PrayerCol; index: number };
type Drag = { id: string; name: string; from: Target; target: Target };
type SheetState = { person?: PrayerPerson; n: number } | null;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function ListScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const c = usePalette();
  const { width: W } = useWindowDimensions();
  const list = usePrayerList();
  const colW = Math.min(176, Math.floor(W * 0.46));

  const [sheet, setSheet] = useState<SheetState>(null);
  const [sheetCol, setSheetCol] = useState<PrayerCol>('new');
  const [drag, setDrag] = useState<Drag | null>(null);

  const rootRef = useRef<View>(null);
  const boardRef = useRef<View>(null);
  const hRef = useRef<ScrollView>(null);
  const vRef = useRef<ScrollView>(null);
  const ghost = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragRef = useRef<Drag | null>(null);
  const itemsRef = useRef(list.items);
  itemsRef.current = list.items;
  const boardW = PAD * 2 + PRAYER_COLS.length * colW + (PRAYER_COLS.length - 1) * GAP;
  // Пока имя несут, весь стол с пятью столбцами уменьшается и целиком помещается на экран.
  // Страница при этом стоит на месте: ничего не прокручивается, можно положить имя в любой столбец.
  const fit = Math.min(1, (W - 12) / boardW);
  const geo = useRef({
    by0: 0, rootX: 0, rootY: 0, px: 0, py: 0, ready: false, fit: 1,
  }).current;
  geo.fit = fit;
  const moveRef = useRef(list.move);
  moveRef.current = list.move;

  const colItems = (col: PrayerCol, skipId?: string) =>
    itemsRef.current.filter((p) => p.col === col && p.id !== skipId);

  // Куда сейчас «смотрит» палец: столбец и место в нём (с учётом уменьшения стола).
  const computeTarget = useCallback(() => {
    const d = dragRef.current;
    if (!d || !geo.ready) return;
    const sc = geo.fit;
    const ci = clamp(Math.floor((geo.px - PAD * sc) / ((colW + GAP) * sc)), 0, PRAYER_COLS.length - 1);
    const col = PRAYER_COLS[ci];
    const n = colItems(col, d.id).length;
    const index = clamp(Math.floor((geo.py - geo.by0 - AREA_TOP * sc) / (ROW * sc)), 0, n);
    if (d.target.col === col && d.target.index === index) return;
    const next = { ...d, target: { col, index } };
    dragRef.current = next;
    setDrag(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colW]);

  const placeGhost = () => {
    ghost.setValue({ x: geo.px - geo.rootX - colW / 2, y: geo.py - geo.rootY - CARD_H / 2 });
  };

  const onDragStart = (p: PrayerPerson, pageX: number, pageY: number) => {
    const from: Target = { col: p.col, index: colItems(p.col, p.id).filter((q) => q.position < p.position).length };
    const d: Drag = { id: p.id, name: p.name, from, target: from };
    dragRef.current = d;
    geo.px = pageX;
    geo.py = pageY;
    geo.ready = false;
    let got = 0;
    const done = () => {
      if (++got === 2) {
        geo.ready = true;
        placeGhost();
        computeTarget();
      }
    };
    rootRef.current?.measureInWindow((x, y) => {
      geo.rootX = x;
      geo.rootY = y;
      done();
    });
    // Верх стола на экране не меняется при уменьшении, поэтому измеряем его один раз.
    boardRef.current?.measureInWindow((_x, y) => {
      geo.by0 = y;
      done();
    });
    hRef.current?.scrollTo({ x: 0, animated: false });
    setDrag(d);
  };

  const onDragMove = (x: number, y: number) => {
    geo.px = x;
    geo.py = y;
    if (!geo.ready) return;
    placeGhost();
    computeTarget();
  };

  const onDragEnd = () => {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d || !geo.ready) return;
    // Стол возвращается в обычный размер: показываем столбец, куда положили имя.
    const ci = PRAYER_COLS.indexOf(d.target.col);
    setTimeout(
      () => hRef.current?.scrollTo({ x: Math.max(0, PAD + ci * (colW + GAP) - (W - colW) / 2), animated: true }),
      60,
    );
    const same = d.target.col === d.from.col && d.target.index === d.from.index;
    if (!same) {
      moveRef.current(d.id, d.target.col, d.target.index).then((ok) => {
        if (!ok) Alert.alert(t('toolSaveError'));
      });
    }
  };

  if (!isLeader(user)) return null;

  const maxLen = Math.max(0, ...PRAYER_COLS.map((col) => list.byCol(col).length));
  const colH = COL_PAD * 2 + HEAD_H + Math.max(4, maxLen + 1) * ROW + 56;

  const openAdd = (col: PrayerCol) => {
    setSheetCol(col);
    setSheet({ n: Date.now() });
  };
  const openEdit = (p: PrayerPerson) => {
    setSheetCol(p.col);
    setSheet({ person: p, n: 0 });
  };

  const save = async (v: { name: string; note: string; noteHidden: boolean }) => {
    if (!sheet) return true;
    if (sheet.person) {
      const ok = await list.update(sheet.person.id, v);
      if (!ok) return false;
      if (sheetCol !== sheet.person.col) {
        const moved = await list.move(sheet.person.id, sheetCol, 100000);
        if (!moved) return false;
      }
      setSheet(null);
      return true;
    }
    const res = await list.addPerson(sheetCol, v.name, v.note, v.noteHidden);
    if (res.error === 'limit') {
      setSheet(null);
      Alert.alert(t('limitReached'));
      return true;
    }
    if (res.error) return false;
    setSheet(null);
    return true;
  };

  return (
    <View ref={rootRef} collapsable={false} style={{ flex: 1 }}>
      <ScrollView
        ref={vRef}
        scrollEnabled={!drag}
        contentContainerStyle={{ paddingTop: space.md, paddingBottom: space.xl * 2 }}>
        <View style={{ paddingHorizontal: PAD }}>
          <ScreenTitle title={t('list')} subtitle={t('listHint')} />
        </View>

        {list.loading ? (
          <ActivityIndicator color={c.muted} style={{ marginTop: space.xl }} />
        ) : list.error ? (
          <EmptyState icon="cloud-offline-outline" title={t('toolsLoadError')} />
        ) : (
          <ScrollView
            ref={hRef}
            horizontal
            scrollEnabled={!drag}
            showsHorizontalScrollIndicator={false}>
            <View style={{ width: drag ? W : boardW, height: colH }}>
            <View
              ref={boardRef}
              collapsable={false}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: boardW,
                flexDirection: 'row',
                paddingHorizontal: PAD,
                gap: GAP,
                transformOrigin: 'top left',
                transform: drag ? [{ scale: fit }] : [],
              }}>
              {PRAYER_COLS.map((col) => {
                const all = list.byCol(col);
                const hover = drag?.target.col === col;
                // Несомое имя остаётся на своём месте в исходном столбце (скрытым), чтобы касание не прерывалось.
                // Метка «сюда» вставляется перед N-м из остальных имён.
                const rows: React.ReactNode[] = [];
                let seen = 0;
                let placed = false;
                const placeholder = (
                  <View
                    key="placeholder"
                    style={{
                      height: CARD_H,
                      marginBottom: ROW - CARD_H,
                      borderRadius: radius.input,
                      borderWidth: 2,
                      borderStyle: 'dashed',
                      borderColor: c.green,
                      backgroundColor: c.greenSoft,
                    }}
                  />
                );
                for (const p of all) {
                  const carried = p.id === drag?.id;
                  if (!carried && hover && drag && !placed && seen === drag.target.index) {
                    rows.push(placeholder);
                    placed = true;
                  }
                  if (!carried) seen++;
                  rows.push(
                    <PersonCard
                      key={p.id}
                      person={p}
                      hidden={carried}
                      onPress={() => openEdit(p)}
                      onStart={onDragStart}
                      onMove={onDragMove}
                      onEnd={onDragEnd}
                    />,
                  );
                }
                if (hover && drag && !placed) rows.push(placeholder);
                return (
                  <View
                    key={col}
                    style={{
                      width: colW,
                      minHeight: colH,
                      padding: COL_PAD,
                      borderRadius: radius.card,
                      backgroundColor: c.track,
                      borderWidth: 2,
                      borderColor: hover ? c.green : 'transparent',
                    }}>
                    <View style={{ height: HEAD_H, justifyContent: 'center' }}>
                      <Text numberOfLines={1} style={{ fontFamily: font.bold, fontSize: 16, color: c.ink }}>
                        {t(COL_TITLE[col])}
                      </Text>
                      <Txt variant="caption" tone="muted">
                        {all.length}
                      </Txt>
                    </View>
                    {rows}
                    {all.length === 0 && !hover ? (
                      <Txt variant="small" tone="muted" style={{ textAlign: 'center', marginVertical: space.sm }}>
                        {t('emptyColumn')}
                      </Txt>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${t('addName')}: ${t(COL_TITLE[col])}`}
                      onPress={() => openAdd(col)}
                      style={({ pressed }) => ({
                        minHeight: 48,
                        marginTop: 4,
                        borderRadius: radius.input,
                        borderWidth: 2,
                        borderStyle: 'dashed',
                        borderColor: c.muted,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        opacity: pressed ? 0.7 : 0.9,
                      })}>
                      <Ionicons name="add" size={20} color={c.muted} />
                      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: c.muted }}>{t('addName')}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            </View>
          </ScrollView>
        )}
      </ScrollView>

      {drag ? (
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, top: 0, width: colW, transform: ghost.getTranslateTransform() }}>
          <View
            style={{
              height: CARD_H,
              borderRadius: radius.input,
              backgroundColor: c.surface,
              borderWidth: 2,
              borderColor: c.green,
              justifyContent: 'center',
              paddingHorizontal: space.md,
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}>
            <Text numberOfLines={1} style={{ fontFamily: font.bold, fontSize: 16, color: c.ink }}>
              {drag.name}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {sheet ? (
        <ItemSheet
          key={`${sheet.person?.id ?? 'new'}-${sheet.n}`}
          title={sheet.person ? sheet.person.name : t('addName')}
          nameLabel={t('personName')}
          initial={sheet.person ? { name: sheet.person.name, note: sheet.person.note, noteHidden: sheet.person.noteHidden } : undefined}
          onSave={save}
          onDelete={
            sheet.person
              ? async () => {
                  if (await list.remove(sheet.person!.id)) setSheet(null);
                  else Alert.alert(t('toolSaveError'));
                }
              : undefined
          }
          onClose={() => setSheet(null)}>
          <Txt variant="small" tone="muted" style={{ marginBottom: 6 }}>
            {t('moveTo')}
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.md }}>
            {PRAYER_COLS.map((col) => {
              const on = col === sheetCol;
              return (
                <Pressable
                  key={col}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setSheetCol(col)}
                  style={{
                    minHeight: 44,
                    paddingHorizontal: 14,
                    borderRadius: 22,
                    borderWidth: 1.5,
                    borderColor: on ? c.green : c.line,
                    backgroundColor: on ? c.greenSoft : c.surface,
                    justifyContent: 'center',
                  }}>
                  <Text style={{ fontFamily: on ? font.bold : font.medium, fontSize: 14, color: on ? c.greenText : c.ink }}>
                    {t(COL_TITLE[col])}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ItemSheet>
      ) : null}
    </View>
  );
}

// Карточка имени. Ручка слева (⋮⋮) нужна для перетаскивания, остальная карточка открывает имя.
function PersonCard({
  person,
  hidden = false,
  onPress,
  onStart,
  onMove,
  onEnd,
}: {
  person: PrayerPerson;
  hidden?: boolean;
  onPress: () => void;
  onStart: (p: PrayerPerson, x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  onEnd: () => void;
}) {
  const c = usePalette();
  const { t } = useI18n();
  const props = useRef({ person, onStart, onMove, onEnd });
  props.current = { person, onStart, onMove, onEnd };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => props.current.onStart(props.current.person, e.nativeEvent.pageX, e.nativeEvent.pageY),
      onPanResponderMove: (_e, g) => props.current.onMove(g.moveX, g.moveY),
      onPanResponderRelease: () => props.current.onEnd(),
      onPanResponderTerminate: () => props.current.onEnd(),
    }),
  ).current;

  return (
    <View
      style={{
        height: hidden ? 0 : CARD_H,
        marginBottom: hidden ? 0 : ROW - CARD_H,
        opacity: hidden ? 0 : 1,
        overflow: 'hidden',
        borderRadius: radius.input,
        backgroundColor: c.surface,
        borderWidth: hidden ? 0 : 1,
        borderColor: c.line,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
      <View
        {...pan.panHandlers}
        accessibilityRole="button"
        accessibilityLabel={`${t('dragHandle')}: ${person.name}`}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        style={{ width: 40, height: CARD_H, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="reorder-two-outline" size={22} color={c.muted} />
      </View>
      <Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1, height: CARD_H, justifyContent: 'center', paddingRight: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.bold, fontSize: 16, color: c.ink }}>
            {person.name}
          </Text>
          {person.note ? (
            <Ionicons name={person.noteHidden ? 'eye-off-outline' : 'document-text-outline'} size={14} color={c.muted} />
          ) : null}
        </View>
        {person.note && !person.noteHidden ? (
          <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 12, color: c.muted }}>
            {person.note}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}
