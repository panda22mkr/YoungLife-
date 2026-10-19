import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './auth';
import { supabase } from './supabase';

// Сообщение в общем или личном чате.
export type Message = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  body: string;
  createdAt: Date;
};

export type SendResult = 'ok' | 'notAllowed' | 'error';

const PAGE = 100;
// Запасное обновление на случай, если мгновенная доставка не сработала.
const POLL_MS = 10000;

type EventRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender: { name: string; avatar_url: string | null } | { name: string; avatar_url: string | null }[] | null;
};

type DirectRow = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };

const senderOf = (s: EventRow['sender']) => (Array.isArray(s) ? s[0] : s) ?? null;

const fromEventRow = (r: EventRow): Message => ({
  id: r.id,
  senderId: r.sender_id,
  senderName: senderOf(r.sender)?.name ?? '',
  senderAvatar: senderOf(r.sender)?.avatar_url ?? undefined,
  body: r.body,
  createdAt: new Date(r.created_at),
});

// Объединяет списки сообщений без повторов; новые сверху.
function merge(a: Message[], b: Message[]): Message[] {
  const map = new Map<string, Message>();
  for (const m of [...a, ...b]) map.set(m.id, m);
  return [...map.values()].sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime());
}

// Обновление списка: берём свежие данные с сервера (так пропадают удалённые сообщения)
// и оставляем только что отправленные, которые сервер ещё мог не успеть вернуть.
function reconcile(prev: Message[], fetched: Message[]): Message[] {
  const newest = fetched[0]?.createdAt.getTime() ?? 0;
  return merge(
    fetched,
    prev.filter((m) => m.createdAt.getTime() > newest),
  );
}

// RLS-ошибка Postgres (код 42501) значит «запрещено правилами», а не «нет связи».
const isForbidden = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42501' || /row-level security/i.test(e.message ?? ''));

type Chat = {
  messages: Message[]; // от новых к старым (так удобно для перевёрнутого списка)
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  send: (body: string) => Promise<SendResult>;
  remove: (id: string) => Promise<boolean>;
};

// ---------- Общий чат мероприятия ----------

export function useEventChat(eventId: string | undefined): Chat {
  const { user } = useAuth();
  const uid = user?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const alive = useRef(true);

  const select = 'id,sender_id,body,created_at,sender:profiles(name,avatar_url)';

  const refresh = useCallback(async () => {
    if (!eventId || !uid) return;
    const { data, error: err } = await supabase
      .from('event_messages')
      .select(select)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(PAGE);
    if (!alive.current) return;
    if (err) {
      setError(true);
    } else {
      setError(false);
      const fetched = ((data ?? []) as unknown as EventRow[]).map(fromEventRow);
      setMessages((prev) => reconcile(prev, fetched));
    }
    setLoading(false);
  }, [eventId, uid]);

  useEffect(() => {
    alive.current = true;
    setMessages([]);
    setLoading(true);
    refresh();
    if (!eventId || !uid) return;

    const channel = supabase
      .channel(`event-chat-${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'event_messages', filter: `event_id=eq.${eventId}` },
        async (payload) => {
          const id = (payload.new as { id?: string }).id;
          if (!id) return;
          const { data } = await supabase.from('event_messages').select(select).eq('id', id).maybeSingle();
          if (data && alive.current) setMessages((prev) => merge(prev, [fromEventRow(data as unknown as EventRow)]));
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'event_messages' },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (id && alive.current) setMessages((prev) => prev.filter((m) => m.id !== id));
        },
      )
      .subscribe();

    const timer = setInterval(refresh, POLL_MS);
    return () => {
      alive.current = false;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [eventId, uid, refresh]);

  const send = useCallback(
    async (body: string): Promise<SendResult> => {
      const text = body.trim();
      if (!eventId || !uid || !text) return 'error';
      const { data, error: err } = await supabase
        .from('event_messages')
        .insert({ event_id: eventId, body: text })
        .select(select)
        .single();
      if (err || !data) return isForbidden(err) ? 'notAllowed' : 'error';
      setMessages((prev) => merge(prev, [fromEventRow(data as unknown as EventRow)]));
      return 'ok';
    },
    [eventId, uid],
  );

  const remove = useCallback(async (id: string) => {
    const { data, error: err } = await supabase.from('event_messages').delete().eq('id', id).select('id');
    if (err || !data || data.length === 0) return false;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    return true;
  }, []);

  return { messages, loading, error, refresh, send, remove };
}

// ---------- Личный чат ----------

export function useDirectChat(otherId: string | undefined): Chat {
  const { user } = useAuth();
  const uid = user?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const alive = useRef(true);

  const fromRow = useCallback(
    (r: DirectRow): Message => ({
      id: r.id,
      senderId: r.sender_id,
      senderName: '',
      body: r.body,
      createdAt: new Date(r.created_at),
    }),
    [],
  );

  const refresh = useCallback(async () => {
    if (!otherId || !uid) return;
    const { data, error: err } = await supabase
      .from('direct_messages')
      .select('id,sender_id,recipient_id,body,created_at')
      .or(
        `and(sender_id.eq.${uid},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${uid})`,
      )
      .order('created_at', { ascending: false })
      .limit(PAGE);
    if (!alive.current) return;
    if (err) {
      setError(true);
    } else {
      setError(false);
      const fetched = ((data ?? []) as DirectRow[]).map(fromRow);
      setMessages((prev) => reconcile(prev, fetched));
    }
    setLoading(false);
  }, [otherId, uid, fromRow]);

  useEffect(() => {
    alive.current = true;
    setMessages([]);
    setLoading(true);
    refresh();
    if (!otherId || !uid) return;

    // Входящие сообщения приходят сразу; свои мы добавляем при отправке.
    const channel = supabase
      .channel(`direct-chat-${uid}-${otherId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${uid}` },
        (payload) => {
          const row = payload.new as DirectRow;
          if (row.sender_id === otherId && alive.current) setMessages((prev) => merge(prev, [fromRow(row)]));
        },
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'direct_messages' }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id && alive.current) setMessages((prev) => prev.filter((m) => m.id !== id));
      })
      .subscribe();

    const timer = setInterval(refresh, POLL_MS);
    return () => {
      alive.current = false;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [otherId, uid, refresh, fromRow]);

  const send = useCallback(
    async (body: string): Promise<SendResult> => {
      const text = body.trim();
      if (!otherId || !uid || !text) return 'error';
      const { data, error: err } = await supabase
        .from('direct_messages')
        .insert({ recipient_id: otherId, body: text })
        .select('id,sender_id,recipient_id,body,created_at')
        .single();
      if (err || !data) return isForbidden(err) ? 'notAllowed' : 'error';
      setMessages((prev) => merge(prev, [fromRow(data as DirectRow)]));
      return 'ok';
    },
    [otherId, uid, fromRow],
  );

  const remove = useCallback(async (id: string) => {
    const { data, error: err } = await supabase.from('direct_messages').delete().eq('id', id).select('id');
    if (err || !data || data.length === 0) return false;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    return true;
  }, []);

  return { messages, loading, error, refresh, send, remove };
}

// ---------- Список личных переписок ----------

export type Thread = { userId: string; name: string; avatar?: string; lastBody: string; lastAt: Date; lastMine: boolean };

export function useDirectThreads(): {
  threads: Thread[];
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
} {
  const { user } = useAuth();
  const uid = user?.id;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    if (!uid) return;
    const { data, error: err } = await supabase
      .from('direct_messages')
      .select('id,sender_id,recipient_id,body,created_at')
      .order('created_at', { ascending: false })
      .limit(300);
    if (!alive.current) return;
    if (err) {
      setError(true);
      setLoading(false);
      return;
    }
    // Берём по одному (самому свежему) сообщению на собеседника.
    const latest = new Map<string, DirectRow>();
    for (const r of (data ?? []) as DirectRow[]) {
      const other = r.sender_id === uid ? r.recipient_id : r.sender_id;
      if (!latest.has(other)) latest.set(other, r);
    }
    const ids = [...latest.keys()];
    const names = new Map<string, { name: string; avatar?: string }>();
    if (ids.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id,name,avatar_url').in('id', ids);
      for (const p of (profs ?? []) as { id: string; name: string; avatar_url: string | null }[])
        names.set(p.id, { name: p.name, avatar: p.avatar_url ?? undefined });
    }
    if (!alive.current) return;
    setError(false);
    setThreads(
      ids.map((id) => {
        const r = latest.get(id)!;
        return {
          userId: id,
          name: names.get(id)?.name ?? '',
          avatar: names.get(id)?.avatar,
          lastBody: r.body,
          lastAt: new Date(r.created_at),
          lastMine: r.sender_id === uid,
        };
      }),
    );
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    alive.current = true;
    refresh();
    if (!uid) return;
    const channel = supabase
      .channel(`direct-threads-${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${uid}` },
        () => {
          refresh();
        },
      )
      .subscribe();
    const timer = setInterval(refresh, POLL_MS * 3);
    return () => {
      alive.current = false;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [uid, refresh]);

  return { threads, loading, error, refresh };
}

// Имя участника по его id (для заголовка личного чата).
export function useProfileName(id: string | undefined): string {
  const [name, setName] = useState('');
  useEffect(() => {
    if (!id) return;
    let alive = true;
    supabase
      .from('profiles')
      .select('name')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (alive && data) setName((data as { name: string }).name);
      });
    return () => {
      alive = false;
    };
  }, [id]);
  return name;
}
