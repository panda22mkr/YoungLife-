import React, { createContext, useContext, useMemo, useState } from 'react';

export type YLEvent = {
  id: string;
  title: string;
  description: string;
  place: string;
  startsAt: Date;
  authorName: string;
};

function nextWeekday(weekday: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  const diff = (weekday - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

// Демонстрационные данные. Позже события будут храниться на сервере.
const seed: YLEvent[] = [
  {
    id: '1',
    title: 'Клуб YoungLife: вечер игр',
    description: 'Игры, музыка, чай и новые друзья. Приходите с друзьями!',
    place: 'Молодёжный центр, ул. Примерная, 1',
    startsAt: nextWeekday(5, 19),
    authorName: 'Демо-лидер',
  },
  {
    id: '2',
    title: 'Campaigners: встреча',
    description: 'Небольшая группа для разговоров и вопросов о жизни.',
    place: 'Кафе «Центр», ул. Образцовая, 5',
    startsAt: nextWeekday(6, 16),
    authorName: 'Демо-лидер',
  },
];

type Events = { events: YLEvent[]; addEvent: (e: Omit<YLEvent, 'id'>) => void };
const Ctx = createContext<Events | null>(null);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<YLEvent[]>(seed);
  const value = useMemo<Events>(
    () => ({
      events: [...events].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
      addEvent: (e) => setEvents((list) => [...list, { ...e, id: String(Date.now()) }]),
    }),
    [events],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEvents(): Events {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEvents must be used inside EventsProvider');
  return v;
}
