import React, { createContext, useContext, useMemo, useState } from 'react';

export type Lang = 'ru' | 'en';

const dict = {
  ru: {
    appName: 'YoungLife',
    signIn: 'Войти',
    signUp: 'Регистрация',
    email: 'Эл. почта',
    password: 'Пароль',
    name: 'Имя',
    birthDate: 'Дата рождения (ДД.ММ.ГГГГ)',
    noAccount: 'Нет аккаунта? Зарегистрироваться',
    haveAccount: 'Уже есть аккаунт? Войти',
    invalidDate: 'Введите дату в формате ДД.ММ.ГГГГ',
    tooYoung: 'Регистрация доступна с 14 лет',
    fillAll: 'Заполните все поля',
    tabEvents: 'События',
    tabChats: 'Чаты',
    tabTools: 'Инструменты',
    tabProfile: 'Профиль',
    upcoming: 'Ближайшие мероприятия',
    noEvents: 'Пока нет мероприятий',
    author: 'Организатор',
    when: 'Когда',
    where: 'Где',
    openInMaps: 'Открыть на карте',
    writeAuthor: 'Написать организатору',
    chatSoon: 'Чаты появятся в следующей версии',
    groupOnly: 'Тебе будут доступны только общие чаты мероприятий',
    newEvent: 'Новое мероприятие',
    eventTitle: 'Название',
    eventDescription: 'Описание',
    eventPlace: 'Место (адрес)',
    eventWhen: 'Дата и время',
    create: 'Создать',
    tree: 'Дерево',
    treeDesc: 'Дерево ученичества: лидеры и ребята, которых вы растите',
    list: 'Список',
    listDesc: 'Список людей, за которых вы молитесь',
    map: 'Карта',
    mapDesc: 'Районы, города и сёла, где ещё нет клубов',
    comingSoon: 'Скоро',
    role: 'Роль',
    roleGuest: 'Гость',
    roleLeader: 'Лидер',
    roleSenior: 'Старший лидер',
    language: 'Язык',
    signOut: 'Выйти',
    demoRole: 'Демо: переключить роль (только для теста)',
    donate: 'Поддержать приложение',
    donateSoon: 'Возможность пожертвовать появится позже',
    age: 'Возраст',
    onlyLeaders: 'Этот раздел доступен только лидерам',
  },
  en: {
    appName: 'YoungLife',
    signIn: 'Sign in',
    signUp: 'Sign up',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    birthDate: 'Date of birth (DD.MM.YYYY)',
    noAccount: "Don't have an account? Sign up",
    haveAccount: 'Already have an account? Sign in',
    invalidDate: 'Enter the date as DD.MM.YYYY',
    tooYoung: 'Registration is available from age 14',
    fillAll: 'Please fill in all fields',
    tabEvents: 'Events',
    tabChats: 'Chats',
    tabTools: 'Tools',
    tabProfile: 'Profile',
    upcoming: 'Upcoming events',
    noEvents: 'No events yet',
    author: 'Organizer',
    when: 'When',
    where: 'Where',
    openInMaps: 'Open in maps',
    writeAuthor: 'Message the organizer',
    chatSoon: 'Chats will arrive in the next version',
    groupOnly: 'You will only have access to event group chats',
    newEvent: 'New event',
    eventTitle: 'Title',
    eventDescription: 'Description',
    eventPlace: 'Place (address)',
    eventWhen: 'Date and time',
    create: 'Create',
    tree: 'Tree',
    treeDesc: 'Discipleship tree: the leaders and kids you are growing',
    list: 'List',
    listDesc: 'The people you are praying for',
    map: 'Map',
    mapDesc: 'Areas, cities and villages without clubs yet',
    comingSoon: 'Coming soon',
    role: 'Role',
    roleGuest: 'Guest',
    roleLeader: 'Leader',
    roleSenior: 'Senior leader',
    language: 'Language',
    signOut: 'Sign out',
    demoRole: 'Demo: switch role (testing only)',
    donate: 'Support the app',
    donateSoon: 'Donations will be available later',
    age: 'Age',
    onlyLeaders: 'This section is for leaders only',
  },
} as const;

export type TKey = keyof (typeof dict)['ru'];

type I18n = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string };

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('ru');
  const value = useMemo<I18n>(
    () => ({ lang, setLang, t: (k) => dict[lang][k] }),
    [lang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n must be used inside I18nProvider');
  return v;
}
