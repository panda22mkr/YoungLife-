import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { ItemSheet } from '@/components/ItemSheet';
import { EmptyState, ScreenTitle } from '@/components/ui';
import { isLeader, useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { TreeKind, TreePerson, useTree } from '@/lib/tools';
import { font, space, usePalette, useScheme } from '@/lib/theme';

// Дерево ученичества: на стволе одно имя (вы), корни и ветки — сколько угодно.
// Одно имя = один корень или одна ветка.

const CLOUD_H = 64;
const ROW_BRANCH = 92;
const ROW_ROOT = 84;
const TRUNK_H = 150;
const LEAF_COLORS = ['#7AC143', '#B6E08A', '#F4A259', '#C58FE0', '#F28DB2', '#F6D55C', '#6FC3E0'];

type Pt = { x: number; y: number };
const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
};

type Slot = { person?: TreePerson; x: number; y: number };
type SheetState = { kind: TreeKind; person?: TreePerson; n: number } | null;

export default function TreeScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const c = usePalette();
  const dark = useScheme() === 'dark';
  const { width: W } = useWindowDimensions();
  const tree = useTree();
  const [sheet, setSheet] = useState<SheetState>(null);
  const scroller = useRef<ScrollView>(null);
  const scrolled = useRef(false);

  if (!isLeader(user)) return null;

  const brown = dark ? '#B0906F' : '#7A5C45';
  const cloudW = Math.min(180, W * 0.43);
  const cx = W / 2;

  // Ветки: сверху вниз, ближайшие к стволу - внизу. Последний слот - пустое место для новой ветки.
  const nB = tree.branches.length;
  const rowsB = Math.max(1, Math.ceil((nB + 1) / 2));
  const trunkTop = 28 + CLOUD_H / 2 + (rowsB - 1) * ROW_BRANCH + 112;
  const trunkBottom = trunkTop + TRUNK_H;

  const slot = (i: number, kind: 'branch' | 'root'): Slot => {
    const side = i % 2 === 0 ? -1 : 1;
    const row = Math.floor(i / 2);
    const shift = row % 2 === 1 ? side * 0.03 * W : 0;
    const x = cx + side * 0.235 * W + shift;
    const people = kind === 'branch' ? tree.branches : tree.roots;
    const y = kind === 'branch' ? trunkTop - 112 - row * ROW_BRANCH : trunkBottom + 96 + row * ROW_ROOT;
    return { person: people[i], x, y };
  };

  const branchSlots = Array.from({ length: nB + 1 }, (_, i) => slot(i, 'branch'));
  const nR = tree.roots.length;
  const rootSlots = Array.from({ length: nR + 1 }, (_, i) => slot(i, 'root'));
  const rowsR = Math.max(1, Math.ceil((nR + 1) / 2));
  const height = trunkBottom + 96 + (rowsR - 1) * ROW_ROOT + CLOUD_H / 2 + 36;

  const branchPaths = branchSlots.map((s, i) => {
    const p0 = { x: cx + (i % 2 === 0 ? -5 : 5), y: trunkTop + 16 };
    const p3 = { x: s.x + (s.x < cx ? 18 : -18), y: s.y + CLOUD_H / 2 - 2 };
    const p1 = { x: cx + (s.x < cx ? -10 : 10), y: trunkTop - 26 - Math.floor(i / 2) * 10 };
    const p2 = { x: s.x, y: s.y + CLOUD_H / 2 + 70 };
    return { p0, p1, p2, p3, d: `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}` };
  });

  const rootPaths = rootSlots.map((s, i) => {
    const p0 = { x: cx + (i % 2 === 0 ? -10 : 10), y: trunkBottom - 8 };
    const p3 = { x: s.x, y: s.y - CLOUD_H / 2 + 4 };
    const p1 = { x: cx + (s.x < cx ? -20 : 20), y: trunkBottom + 40 };
    const p2 = { x: s.x, y: s.y - CLOUD_H / 2 - 56 };
    return { d: `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}` };
  });

  const openAdd = (kind: TreeKind) => setSheet({ kind, n: Date.now() });
  const openEdit = (person: TreePerson) => setSheet({ kind: person.kind, person, n: 0 });

  const save = async (v: { name: string; note: string; noteHidden: boolean }) => {
    if (!sheet) return true;
    if (sheet.person) {
      const ok = await tree.update(sheet.person.id, v);
      if (ok) setSheet(null);
      return ok;
    }
    const res = await tree.addPerson(sheet.kind, v.name, v.note, v.noteHidden);
    if (res.error === 'limit') {
      setSheet(null);
      Alert.alert(t('limitReached'));
      return true;
    }
    if (res.error) return false;
    setSheet(null);
    return true;
  };

  const sheetTitle = sheet
    ? sheet.person
      ? sheet.person.name
      : sheet.kind === 'branch'
        ? t('addBranch')
        : sheet.kind === 'root'
          ? t('addRoot')
          : t('trunkMe')
    : '';

  const initial = sheet?.person
    ? { name: sheet.person.name, note: sheet.person.note, noteHidden: sheet.person.noteHidden }
    : sheet?.kind === 'trunk' && user
      ? { name: user.name, note: '', noteHidden: false }
      : undefined;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scroller}
        onContentSizeChange={() => {
          // Первый раз показываем ствол, а не верхушку дерева.
          if (!scrolled.current && !tree.loading) {
            scrolled.current = true;
            scroller.current?.scrollTo({ y: Math.max(0, trunkTop - 220), animated: false });
          }
        }}
        contentContainerStyle={{ paddingTop: space.md, paddingBottom: space.xl }}>
        <View style={{ paddingHorizontal: space.screen }}>
          <ScreenTitle title={t('tree')} subtitle={t('treeHint')} />
        </View>

        {tree.loading ? (
          <ActivityIndicator color={c.muted} style={{ marginTop: space.xl }} />
        ) : tree.error ? (
          <EmptyState icon="cloud-offline-outline" title={t('toolsLoadError')} />
        ) : (
          <View style={{ width: W, height }}>
            <Svg width={W} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
              {/* ствол */}
              <Path
                d={`M ${cx - 14} ${trunkTop} Q ${cx - 18} ${trunkTop + 80} ${cx - 38} ${trunkBottom} L ${cx + 38} ${trunkBottom} Q ${cx + 18} ${trunkTop + 80} ${cx + 14} ${trunkTop} Z`}
                fill={brown}
              />
              {/* ветки и листья */}
              {branchPaths.map((b, i) => (
                <Path key={`b${i}`} d={b.d} stroke={brown} strokeWidth={4} strokeLinecap="round" fill="none" opacity={i === nB ? 0.35 : 1} />
              ))}
              {branchPaths.slice(0, nB).flatMap((b, i) =>
                [0.3, 0.42, 0.54, 0.66, 0.78, 0.9].map((tt, k) => {
                  const p = bez(b.p0, b.p1, b.p2, b.p3, tt);
                  const side = (k + i) % 2 === 0 ? 1 : -1;
                  return (
                    <Ellipse
                      key={`l${i}-${k}`}
                      cx={p.x + side * 8}
                      cy={p.y - 3}
                      rx={8}
                      ry={4}
                      rotation={side * 35 + (i % 3) * 12}
                      origin={`${p.x + side * 8}, ${p.y - 3}`}
                      fill={LEAF_COLORS[(i * 3 + k) % LEAF_COLORS.length]}
                    />
                  );
                }),
              )}
              {/* корни */}
              {rootPaths.map((r, i) => (
                <Path key={`r${i}`} d={r.d} stroke={brown} strokeWidth={5} strokeLinecap="round" fill="none" opacity={i === nR ? 0.35 : 1} />
              ))}
            </Svg>

            {branchSlots.map((s, i) => (
              <Cloud
                key={`bc${i}`}
                person={s.person}
                x={s.x}
                y={s.y}
                w={cloudW}
                color={c.green}
                addLabel={t('addBranch')}
                onPress={() => (s.person ? openEdit(s.person) : openAdd('branch'))}
              />
            ))}

            <Cloud
              person={tree.trunk}
              x={cx}
              y={trunkTop + 114}
              w={Math.min(190, W * 0.5)}
              color={dark ? '#F4A259' : '#D9822B'}
              thick
              addLabel={t('trunkMe')}
              onPress={() => (tree.trunk ? openEdit(tree.trunk) : openAdd('trunk'))}
            />

            {rootSlots.map((s, i) => (
              <Cloud
                key={`rc${i}`}
                person={s.person}
                x={s.x}
                y={s.y}
                w={cloudW}
                color={brown}
                addLabel={t('addRoot')}
                onPress={() => (s.person ? openEdit(s.person) : openAdd('root'))}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {sheet ? (
        <ItemSheet
          key={`${sheet.person?.id ?? 'new'}-${sheet.kind}-${sheet.n}`}
          title={sheetTitle}
          nameLabel={t('personName')}
          initial={initial}
          onSave={save}
          onDelete={
            sheet.person
              ? async () => {
                  const id = sheet.person!.id;
                  if (await tree.remove(id)) setSheet(null);
                  else Alert.alert(t('toolSaveError'));
                }
              : undefined
          }
          onClose={() => setSheet(null)}
        />
      ) : null}
    </View>
  );
}

// «Облачко» с именем. Пустое облачко с плюсом - место для нового имени.
function Cloud({
  person,
  x,
  y,
  w,
  color,
  thick,
  addLabel,
  onPress,
}: {
  person?: TreePerson;
  x: number;
  y: number;
  w: number;
  color: string;
  thick?: boolean;
  addLabel: string;
  onPress: () => void;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={person ? person.name : addLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        left: x - w / 2,
        top: y - CLOUD_H / 2,
        width: w,
        height: CLOUD_H,
        borderRadius: 32,
        borderWidth: person ? (thick ? 4 : 3) : 2,
        borderStyle: person ? 'solid' : 'dashed',
        borderColor: person ? color : c.muted,
        backgroundColor: person ? c.surface : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        flexDirection: 'row',
        gap: 6,
        opacity: pressed ? 0.8 : person ? 1 : 0.8,
      })}>
      {person ? (
        <>
          <Text
            numberOfLines={2}
            style={{ flexShrink: 1, textAlign: 'center', fontFamily: font.bold, fontSize: 16, lineHeight: 20, color: c.ink }}>
            {person.name}
          </Text>
          {person.note ? (
            <Ionicons name={person.noteHidden ? 'eye-off-outline' : 'document-text-outline'} size={14} color={c.muted} />
          ) : null}
        </>
      ) : (
        <>
          <Ionicons name="add" size={20} color={c.muted} />
          <Text numberOfLines={2} style={{ flexShrink: 1, fontFamily: font.semibold, fontSize: 13, lineHeight: 16, color: c.muted }}>
            {addLabel}
          </Text>
        </>
      )}
    </Pressable>
  );
}
