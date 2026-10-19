import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { supabase } from './supabase';

// Жалоба на сообщение (администратор читает жалобы в панели Supabase).
export async function reportMessage(
  kind: 'event_message' | 'direct_message',
  messageId: string,
  targetUser: string,
  body: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('reports')
    .insert({ kind, target_id: messageId, target_user: targetUser, body: body.slice(0, 2000), reason: 'message' });
  return !error;
}

export async function blockUser(id: string): Promise<boolean> {
  const { error } = await supabase.from('blocks').insert({ blocked_id: id });
  return !error || error.code === '23505'; // уже заблокирован — тоже успех
}

export async function unblockUser(id: string): Promise<boolean> {
  const { error } = await supabase.from('blocks').delete().eq('blocked_id', id);
  return !error;
}

export type BlockedUser = { id: string; name: string };

export function useBlocked() {
  const [items, setItems] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data: rows } = await supabase.from('blocks').select('blocked_id');
    const ids = ((rows ?? []) as { blocked_id: string }[]).map((r) => r.blocked_id);
    if (ids.length === 0) {
      setItems([]);
    } else {
      const { data: profs } = await supabase.from('profiles').select('id,name').in('id', ids);
      setItems(((profs ?? []) as BlockedUser[]).map((p) => ({ id: p.id, name: p.name })));
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { items, loading, reload };
}

// Удаляет аккаунт целиком: фото в облаке, затем все данные на сервере.
export async function deleteAccount(uid: string): Promise<boolean> {
  try {
    await supabase.storage.from('avatars').remove([`${uid}/avatar.jpg`]);
  } catch {}
  const { error } = await supabase.rpc('delete_my_account');
  return !error;
}
