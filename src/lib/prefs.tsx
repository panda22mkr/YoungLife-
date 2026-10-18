import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

export type ThemeChoice = 'system' | 'light' | 'dark';

type Prefs = {
  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;
  notifications: boolean;
  setNotifications: (v: boolean) => void;
};

const Ctx = createContext<Prefs | null>(null);

// Настройки приложения. Пока хранятся только в памяти (до перезапуска);
// после подключения сервера сохраним их в аккаунте.
export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeChoice>('system');
  const [notifications, setNotifications] = useState(true);

  // Чтобы системные окна и клавиатура тоже подстроились под выбранную тему.
  useEffect(() => {
    try {
      Appearance.setColorScheme?.(theme === 'system' ? 'unspecified' : theme);
    } catch {
      // на некоторых платформах не поддерживается, тема всё равно применится в самом приложении
    }
  }, [theme]);

  const value = useMemo<Prefs>(
    () => ({ theme, setTheme, notifications, setNotifications }),
    [theme, notifications],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): Prefs {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePrefs must be used inside PrefsProvider');
  return v;
}
