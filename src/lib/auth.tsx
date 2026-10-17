import React, { createContext, useContext, useMemo, useState } from 'react';

// Роли: гость (ребёнок/подросток), лидер, старший лидер.
// Администратор будет выдавать роли leader / senior на сервере (следующий этап).
export type Role = 'guest' | 'leader' | 'senior';

export type User = {
  id: string;
  name: string;
  email: string;
  birthDate: Date;
  role: Role;
};

export function calcAge(birth: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

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

type Auth = {
  user: User | null;
  signIn: (email: string, password: string) => boolean;
  signUp: (name: string, email: string, password: string, birthDate: Date) => void;
  signOut: () => void;
  setDemoRole: (role: Role) => void;
};

const Ctx = createContext<Auth | null>(null);

// ВНИМАНИЕ: пока это демо без сервера. Аккаунты хранятся только в памяти
// и пропадают при перезапуске. Настоящая регистрация (Supabase) — следующий этап.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Record<string, User>>({});

  const value = useMemo<Auth>(
    () => ({
      user,
      signIn: (email) => {
        const found = accounts[email.trim().toLowerCase()];
        if (!found) return false;
        setUser(found);
        return true;
      },
      signUp: (name, email, _password, birthDate) => {
        const key = email.trim().toLowerCase();
        const u: User = { id: key, name: name.trim(), email: key, birthDate, role: 'guest' };
        setAccounts((a) => ({ ...a, [key]: u }));
        setUser(u);
      },
      signOut: () => setUser(null),
      setDemoRole: (role) => setUser((u) => (u ? { ...u, role } : u)),
    }),
    [user, accounts],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): Auth {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
