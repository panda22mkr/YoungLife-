import React, { createContext, useContext, useMemo, useState } from 'react';

export type YLEvent = {
  id: string;
  title: string;
  description: string;
  place: string;
  when: string;
  authorName: string;
};

// Демонстрационные данные. Позже события будут храниться на сервере.
const seed: YLEvent[] = [
  {
    id: '1',
    title: 'Клуб YoungLife: вечер игр',
    description: 'Игры, музыка, чай и новые друзья. Приходи с друзьями!',
    place: 'Молодёжный центр, ул. Примерная, 1',
    when: 'Пт, 19:00',
    authorName: 'Демо-лидер',
  },
  {
    id: '2',
    title: 'Campaigners: встреча',
    description: 'Небольшая группа для разговоров и вопросов о жизни.',
    place: 'Кафе «Центр», ул. Образцовая, 5',
    when: 'Сб, 16:00',
    authorName: 'Демо-лидер',
  },
];

type Events = { events: YLEvent[]; addEvent: (e: Omit<YLEvent, 'id'>) => void };
const Ctx = createContext<Events | null>(null);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<YLEvent[]>(seed);
  const value = useMemo<Events>(
    () => ({
      events,
      addEvent: (e) => setEvents((list) => [{ ...e, id: String(Date.now()) }, ...list]),
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
