import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from './auth';
import { supabase } from './supabase';

export type YLEvent = {
  id: string;
  title: string;
  description: string;
  place: string;
  startsAt: Date;
  authorId: string;
  authorName: string;
  imageUrl?: string;
};

export type NewEvent = Pick<YLEvent, 'title' | 'description' | 'place' | 'startsAt'> & { imageUri?: string };

type Row = {
  id: string;
  title: string;
  description: string;
  place: string;
  starts_at: string;
  author_id: string;
  image_url: string | null;
  author: { name: string } | { name: string }[] | null;
};

type Events = {
  events: YLEvent[];
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  addEvent: (e: NewEvent) => Promise<boolean>;
  // image: 'keep' — не трогать обложку, 'remove' — убрать, иначе путь к новому фото на телефоне.
  updateEvent: (id: string, e: Omit<NewEvent, 'imageUri'>, image: 'keep' | 'remove' | { uri: string }) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
};

const Ctx = createContext<Events | null>(null);

const DAY = 24 * 3600 * 1000;

// Сжимает обложку (до 1200 px по ширине) и загружает в облако.
async function uploadEventPhoto(uid: string, localUri: string): Promise<string | null> {
  try {
    const small = await ImageManipulator.manipulateAsync(localUri, [{ resize: { width: 1200 } }], {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const bytes = await (await fetch(small.uri)).arrayBuffer();
    const path = `${uid}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('event-photos').upload(path, bytes, { contentType: 'image/jpeg' });
    if (error) return null;
    return supabase.storage.from('event-photos').getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

// Удаляет файл обложки из облака (ошибки не важны: это только уборка).
async function removeEventPhoto(url?: string) {
  const m = url && /\/event-photos\/([^?]+)/.exec(url);
  if (m) await supabase.storage.from('event-photos').remove([decodeURIComponent(m[1])]).catch(() => {});
}

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id;
  const [events, setEvents] = useState<YLEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    // Показываем будущие мероприятия и те, что начались не более суток назад.
    const since = new Date(Date.now() - DAY).toISOString();
    const { data, error: err } = await supabase
      .from('events')
      .select('id,title,description,place,starts_at,author_id,image_url,author:profiles(name)')
      .gte('starts_at', since)
      .order('starts_at', { ascending: true });
    if (err) {
      setError(true);
    } else {
      setError(false);
      setEvents(
        ((data ?? []) as unknown as Row[]).map((r) => {
          const author = Array.isArray(r.author) ? r.author[0] : r.author;
          return {
            id: r.id,
            title: r.title,
            description: r.description,
            place: r.place,
            startsAt: new Date(r.starts_at),
            authorId: r.author_id,
            authorName: author?.name ?? '',
            imageUrl: r.image_url ?? undefined,
          };
        }),
      );
    }
    setLoading(false);
  }, [uid]);

  // Загружаем мероприятия при входе, очищаем при выходе.
  useEffect(() => {
    if (uid) refresh();
    else setEvents([]);
  }, [uid, refresh]);

  const value = useMemo<Events>(
    () => ({
      events,
      loading,
      error,
      refresh,
      addEvent: async (e) => {
        if (!uid) return false;
        let imageUrl: string | null = null;
        if (e.imageUri) {
          imageUrl = await uploadEventPhoto(uid, e.imageUri);
          if (!imageUrl) return false;
        }
        const { error: err } = await supabase.from('events').insert({
          image_url: imageUrl,
          title: e.title.trim(),
          description: e.description.trim(),
          place: e.place.trim(),
          starts_at: e.startsAt.toISOString(),
        });
        if (err) return false;
        await refresh();
        return true;
      },
      updateEvent: async (id, e, image) => {
        if (!uid) return false;
        const old = events.find((x) => x.id === id);
        const fields: Record<string, string | null> = {
          title: e.title.trim(),
          description: e.description.trim(),
          place: e.place.trim(),
          starts_at: e.startsAt.toISOString(),
        };
        if (image === 'remove') fields.image_url = null;
        else if (image !== 'keep') {
          const url = await uploadEventPhoto(uid, image.uri);
          if (!url) return false;
          fields.image_url = url;
        }
        const { data, error: err } = await supabase.from('events').update(fields).eq('id', id).select('id');
        if (err || !data || data.length === 0) return false;
        if (image !== 'keep') await removeEventPhoto(old?.imageUrl);
        await refresh();
        return true;
      },
      deleteEvent: async (id) => {
        const old = events.find((x) => x.id === id);
        const { data, error: err } = await supabase.from('events').delete().eq('id', id).select('id');
        if (err || !data || data.length === 0) return false;
        await removeEventPhoto(old?.imageUrl);
        await refresh();
        return true;
      },
    }),
    [events, loading, error, refresh, uid],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEvents(): Events {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEvents must be used inside EventsProvider');
  return v;
}
