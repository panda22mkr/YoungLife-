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
