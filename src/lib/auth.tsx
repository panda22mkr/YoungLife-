import type { Session } from '@supabase/supabase-js';
import * as ImageManipulator from 'expo-image-manipulator';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { TKey } from './i18n';
import { supabase } from './supabase';

// Роли: гость (ребёнок/подросток), лидер, старший лидер.
// Роли лидера и старшего лидера выдаёт только администратор в базе (см. supabase/schema.sql).
export type Role = 'guest' | 'leader' | 'senior';

export type User = {
  id: string;
  name: string;
  email: string;
  birthDate: Date;
  role: Role;
  bio: string;
  // Ссылка на фото в облаке (Supabase Storage).
  avatarUri?: string;
};

type ProfileData = User;
export type ProfilePatch = Partial<Pick<User, 'name' | 'bio' | 'avatarUri'>>;

export function calcAge(birth: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

// Минимальный возраст для регистрации (пока 14 лет). Тот же запрет есть и в базе.
export const MIN_AGE = 14;
export const MIN_PASSWORD = 8;

// Формат ДД.ММ.ГГГГ -> Date (или null, если дата неверна)
export function parseBirthDate(input: string): Date | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(input.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  if (date.getTime() > Date.now() || y < 1900) return null;
  return date;
}

// Правило: детям младше 15 лет доступен только общий чат (без личных сообщений).
export function canDirectMessage(user: User): boolean {
  return calcAge(user.birthDate) >= 15;
}

export const isLeader = (u: User | null) => !!u && (u.role === 'leader' || u.role === 'senior');
export const canCreateEvents = (u: User | null) => !!u && u.role === 'senior';

const pad = (n: number) => String(n).padStart(2, '0');
const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIsoDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Превращает ошибку сервера в понятное сообщение на языке пользователя.
export function mapAuthError(e: { message?: string; name?: string } | null | undefined): TKey {
  const m = (e?.message ?? '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'wrongCredentials';
  if (m.includes('already registered') || m.includes('already been registered')) return 'emailTaken';
  if (m.includes('email not confirmed')) return 'emailNotConfirmed';
  if (m.includes('rate limit') || m.includes('too many')) return 'rateLimit';
  if (m.includes('password')) return 'weakPassword';
  if (m.includes('database error saving new user')) return 'signUpFailed';
  if (m.includes('network') || m.includes('fetch') || e?.name === 'AuthRetryableFetchError') return 'networkError';
  return 'unknownError';
}

type SignUpResult = { error?: TKey; needsConfirm?: boolean };

type Auth = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<TKey | null>;
  signUp: (name: string, email: string, password: string, birthDate: Date) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<boolean>;
};

const Ctx = createContext<Auth | null>(null);

type ProfileRow = { id: string; name: string; bio: string; role: Role; avatar_url: string | null };

async function fetchProfile(
  uid: string,
  email: string,
): Promise<{ profile?: ProfileData; missing?: boolean; failed?: boolean }> {
  const [p, priv] = await Promise.all([
    supabase.from('profiles').select('id,name,bio,role,avatar_url').eq('id', uid).maybeSingle(),
    supabase.from('profile_private').select('birth_date').eq('id', uid).maybeSingle(),
  ]);
  if (p.error || priv.error) return { failed: true };
  const row = p.data as ProfileRow | null;
  const birth = (priv.data as { birth_date: string } | null)?.birth_date;
  if (!row || !birth) return { missing: true };
  return {
    profile: {
      id: row.id,
      name: row.name,
      bio: row.bio,
      role: row.role,
      email,
      birthDate: fromIsoDate(birth),
      avatarUri: row.avatar_url ?? undefined,
    },
  };
}

// Сжимает фото до 512x512 и загружает в облако; возвращает ссылку (или null при ошибке).
async function uploadAvatar(uid: string, localUri: string): Promise<string | null> {
  try {
    const small = await ImageManipulator.manipulateAsync(localUri, [{ resize: { width: 512, height: 512 } }], {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const bytes = await (await fetch(small.uri)).arrayBuffer();
    const path = `${uid}/avatar.jpg`;
    const { error } = await supabase.storage.from('avatars').upload(path, bytes, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (error) return null;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`; // v= чтобы новое фото сразу заменило старое в кэше
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  // 1. Следим за входом (сессия хранится на телефоне).
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 2. Когда пользователь вошёл, загружаем его профиль из базы.
  const uid = session?.user.id;
  const email = session?.user.email ?? '';
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    (async () => {
      const result = await fetchProfile(uid, email);
      if (!alive) return;
      if (result.profile) setProfile(result.profile);
      else if (result.missing) await supabase.auth.signOut();
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [uid, email, reload]);

  const value = useMemo<Auth>(() => {
    const user: User | null = profile && profile.id === uid ? profile : null;

    return {
      user,
      loading,

      signIn: async (mail, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email: mail.trim().toLowerCase(), password });
        if (error) return mapAuthError(error);
        setReload((n) => n + 1);
        return null;
      },

      signUp: async (name, mail, password, birthDate) => {
        const { data, error } = await supabase.auth.signUp({
          email: mail.trim().toLowerCase(),
          password,
          options: { data: { name: name.trim(), birth_date: toIsoDate(birthDate) } },
        });
        if (error) return { error: mapAuthError(error) };
        if (!data.session) return { needsConfirm: true };
        setReload((n) => n + 1);
        return {};
      },

      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
      },

      updateProfile: async (patch) => {
        if (!profile) return false;
        const fields: Record<string, string | null> = {};
        if (patch.name !== undefined) fields.name = patch.name;
        if (patch.bio !== undefined) fields.bio = patch.bio;
        let nextAvatar: string | undefined = profile.avatarUri;
        if ('avatarUri' in patch && patch.avatarUri !== profile.avatarUri) {
          if (!patch.avatarUri) {
            fields.avatar_url = null;
            nextAvatar = undefined;
          } else {
            const url = await uploadAvatar(profile.id, patch.avatarUri);
            if (!url) return false;
            fields.avatar_url = url;
            nextAvatar = url;
          }
        }
        if (Object.keys(fields).length === 0) return true;
        const { error } = await supabase.from('profiles').update(fields).eq('id', profile.id);
        if (error) return false;
        setProfile((p) => (p ? { ...p, name: patch.name ?? p.name, bio: patch.bio ?? p.bio, avatarUri: nextAvatar } : p));
        return true;
      },
    };
  }, [profile, uid, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): Auth {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
