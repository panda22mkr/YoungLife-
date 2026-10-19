import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './auth';
import { supabase } from './supabase';

// Данные инструментов лидера (Дерево, Список, Карта). Они личные: сервер отдаёт лидеру только его записи.

// ---------- Типы ----------

export type TreeKind = 'trunk' | 'root' | 'branch';
export type TreePerson = { id: string; kind: TreeKind; name: string; note: string; noteHidden: boolean };

export const PRAYER_COLS = ['new', 'club', 'leaders', 'students', 'sponsors'] as const;
export type PrayerCol = (typeof PRAYER_COLS)[number];
export type PrayerPerson = {
  id: string;
  col: PrayerCol;
  name: string;
  note: string;
  noteHidden: boolean;
  position: number;
};

export const PLACE_KINDS = ['school', 'field', 'park', 'village', 'city', 'country', 'other'] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];
export const PLACE_STATUSES = ['praying', 'planning', 'started'] as const;
export type PlaceStatus = (typeof PLACE_STATUSES)[number];
export type Place = {
  id: string;
  name: string;
  kind: PlaceKind;
  status: PlaceStatus;
  note: string;
  noteHidden: boolean;
  x: number;
  y: number;
};

export type AddResult<T> = { item?: T; error?: 'limit' | 'error' };

// ---------- Общий помощник для таблицы ----------

type Raw = Record<string, unknown>;

function useOwnTable<T extends { id: string }>(
  table: string,
  fromRow: (r: Raw) => T,
  sort: (a: T, b: T) => number,
) {
  const { user } = useAuth();
  const uid = user?.id;
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const alive = useRef(true);
  const fromRowRef = useRef(fromRow);
  const sortRef = useRef(sort);

  const reload = useCallback(async () => {
    if (!uid) return;
    const { data, error: err } = await supabase.from(table).select('*').limit(2000);
    if (!alive.current) return;
    if (err) {
      setError(true);
    } else {
      setError(false);
      setItems(((data ?? []) as Raw[]).map(fromRowRef.current).sort(sortRef.current));
    }
    setLoading(false);
  }, [table, uid]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Обновляем данные каждый раз, когда экран открывается.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const add = useCallback(
    async (row: Raw): Promise<AddResult<T>> => {
      const { data, error: err } = await supabase.from(table).insert(row).select('*').single();
      if (err || !data) return { error: /limit_reached/.test(err?.message ?? '') ? 'limit' : 'error' };
      const item = fromRowRef.current(data as Raw);
      setItems((prev) => [...prev.filter((p) => p.id !== item.id), item].sort(sortRef.current));
      return { item };
    },
    [table],
  );

  // Меняет поля на сервере; на экране изменение видно сразу (local), при ошибке данные перечитываются.
  const patch = useCallback(
    async (id: string, fields: Raw, local: Partial<T>): Promise<boolean> => {
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...local } : p)).sort(sortRef.current));
      const { error: err } = await supabase.from(table).update(fields).eq('id', id);
      if (err) {
        reload();
        return false;
      }
      return true;
    },
    [table, reload],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const { error: err } = await supabase.from(table).delete().eq('id', id);
      if (err) return false;
      setItems((prev) => prev.filter((p) => p.id !== id));
      return true;
    },
    [table],
  );

  return { items, loading, error, reload, add, patch, remove };
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown, d = 0) => (typeof v === 'number' ? v : d);

// ---------- Дерево ----------

const treeFrom = (r: Raw): TreePerson & { createdAt: number } => ({
  id: str(r.id),
  kind: r.kind as TreeKind,
  name: str(r.name),
  note: str(r.note),
  noteHidden: r.note_hidden === true,
  createdAt: Date.parse(str(r.created_at)) || 0,
});

export function useTree() {
  const t = useOwnTable('tree_people', treeFrom, (a, b) => a.createdAt - b.createdAt);
  const trunk = t.items.find((p) => p.kind === 'trunk');
  const roots = t.items.filter((p) => p.kind === 'root');
  const branches = t.items.filter((p) => p.kind === 'branch');

  const addPerson = (kind: TreeKind, name: string, note: string, noteHidden: boolean) =>
    t.add({ kind, name: name.trim(), note: note.trim(), note_hidden: noteHidden });

  const update = (id: string, v: { name: string; note: string; noteHidden: boolean }) =>
    t.patch(
      id,
      { name: v.name.trim(), note: v.note.trim(), note_hidden: v.noteHidden },
      { name: v.name.trim(), note: v.note.trim(), noteHidden: v.noteHidden },
    );

  return { trunk, roots, branches, loading: t.loading, error: t.error, reload: t.reload, addPerson, update, remove: t.remove };
}

// ---------- Список ----------

const prayerFrom = (r: Raw): PrayerPerson => ({
  id: str(r.id),
  col: r.col as PrayerCol,
  name: str(r.name),
  note: str(r.note),
  noteHidden: r.note_hidden === true,
  position: num(r.position),
});

export function usePrayerList() {
  const t = useOwnTable('prayer_people', prayerFrom, (a, b) => a.position - b.position);

  const byCol = (col: PrayerCol) => t.items.filter((p) => p.col === col);

  const addPerson = (col: PrayerCol, name: string, note: string, noteHidden: boolean) => {
    const last = byCol(col).at(-1)?.position ?? 0;
    return t.add({ col, name: name.trim(), note: note.trim(), note_hidden: noteHidden, position: last + 1 });
  };

  const update = (id: string, v: { name: string; note: string; noteHidden: boolean }) =>
    t.patch(
      id,
      { name: v.name.trim(), note: v.note.trim(), note_hidden: v.noteHidden },
      { name: v.name.trim(), note: v.note.trim(), noteHidden: v.noteHidden },
    );

  // Переносит имя в столбец col на место index (0 = в самое начало).
  const move = (id: string, col: PrayerCol, index: number) => {
    const others = byCol(col).filter((p) => p.id !== id);
    const i = Math.max(0, Math.min(index, others.length));
    const before = others[i - 1]?.position;
    const after = others[i]?.position;
    let position: number;
    if (before === undefined && after === undefined) position = 1;
    else if (before === undefined) position = (after as number) - 1;
    else if (after === undefined) position = before + 1;
    else position = (before + after) / 2;
    return t.patch(id, { col, position }, { col, position });
  };

  return { items: t.items, byCol, loading: t.loading, error: t.error, reload: t.reload, addPerson, update, move, remove: t.remove };
}

// ---------- Карта ----------

const placeFrom = (r: Raw): Place & { createdAt: number } => ({
  id: str(r.id),
  name: str(r.name),
  kind: (PLACE_KINDS as readonly string[]).includes(str(r.kind)) ? (r.kind as PlaceKind) : 'other',
  status: (PLACE_STATUSES as readonly string[]).includes(str(r.status)) ? (r.status as PlaceStatus) : 'praying',
  note: str(r.note),
  noteHidden: r.note_hidden === true,
  x: num(r.x, 0.5),
  y: num(r.y, 0.5),
  createdAt: Date.parse(str(r.created_at)) || 0,
});

export type PlaceInput = { name: string; kind: PlaceKind; status: PlaceStatus; note: string; noteHidden: boolean };

// Свободное место на схеме: кольцами вокруг клуба (центр 0.5, 0.5).
export function freeSpot(taken: { x: number; y: number }[]): { x: number; y: number } {
  const rings = [
    { r: 0.3, n: 6, off: -Math.PI / 2 },
    { r: 0.42, n: 8, off: -Math.PI / 2 + Math.PI / 8 },
    { r: 0.2, n: 4, off: Math.PI / 4 },
  ];
  for (const ring of rings) {
    for (let i = 0; i < ring.n; i++) {
      const a = ring.off + (i * 2 * Math.PI) / ring.n;
      const x = 0.5 + ring.r * 0.9 * Math.cos(a);
      const y = 0.5 + ring.r * 1.0 * Math.sin(a);
      if (taken.every((p) => Math.hypot((p.x - x) * 0.9, p.y - y) > 0.13)) return { x, y };
    }
  }
  return { x: 0.1 + Math.random() * 0.8, y: 0.1 + Math.random() * 0.8 };
}

export function usePlaces() {
  const t = useOwnTable('map_places', placeFrom, (a, b) => a.createdAt - b.createdAt);

  const addPlace = (v: PlaceInput) => {
    const spot = freeSpot(t.items);
    return t.add({
      name: v.name.trim(),
      kind: v.kind,
      status: v.status,
      note: v.note.trim(),
      note_hidden: v.noteHidden,
      x: spot.x,
      y: spot.y,
    });
  };

  const update = (id: string, v: PlaceInput) =>
    t.patch(
      id,
      { name: v.name.trim(), kind: v.kind, status: v.status, note: v.note.trim(), note_hidden: v.noteHidden },
      { name: v.name.trim(), kind: v.kind, status: v.status, note: v.note.trim(), noteHidden: v.noteHidden },
    );

  const moveTo = (id: string, x: number, y: number) => {
    const cx = Math.max(0.05, Math.min(0.95, x));
    const cy = Math.max(0.05, Math.min(0.95, y));
    return t.patch(id, { x: cx, y: cy }, { x: cx, y: cy });
  };

  return { items: t.items, loading: t.loading, error: t.error, reload: t.reload, addPlace, update, moveTo, remove: t.remove };
}
