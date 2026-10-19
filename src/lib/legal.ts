import type { Lang } from './i18n';

// Публичный адрес для связи (его увидят пользователи). Вставьте свой, например 'help@example.com'.
export const CONTACT_EMAIL = '';

type Section = { h: string; p: string[] };

export const LEGAL: Record<Lang, { title: string; note: string; sections: Section[] }> = {
  ru: {
    title: 'Правила и конфиденциальность',
    note: 'Приложение независимое и пока не является официальным приложением организации YoungLife.',
    sections: [
      {
        h: 'Кто мы',
        p: [
          'Это некоммерческое приложение для молодёжных мероприятий и общения. Оно бесплатное, без рекламы. Пожертвования добровольные и идут только на его работу.',
        ],
      },
      {
        h: 'Какие данные мы храним',
        p: [
          'Имя, адрес почты, дата рождения, описание профиля и фото (по желанию), сообщения в чатах, ваши записи в инструментах лидера (Дерево, Список, Карта), адрес телефона для уведомлений и ваши жалобы на других.',
          'Дата рождения нужна только для проверки возраста (регистрация с 14 лет, личные сообщения с 15 лет) и другим пользователям не показывается. Записи в инструментах лидера видите только вы.',
        ],
      },
      {
        h: 'Как мы их используем',
        p: [
          'Только для работы приложения: вход, показ мероприятий и чатов, проверка возраста, уведомления, защита от нарушений. Мы не продаём данные и не показываем рекламу.',
          'Данные хранятся на серверах сервиса Supabase (Европа). Уведомления отправляются через сервис Expo.',
        ],
      },
      {
        h: 'Правила общения',
        p: [
          'Уважайте других. Запрещены оскорбления, травля, угрозы, сексуальный и иной неприемлемый контент, спам, выдача себя за другого и попытки узнать личные данные несовершеннолетних.',
          'На сообщение можно пожаловаться или заблокировать человека: нажмите и удерживайте сообщение. Администраторы рассматривают жалобы, могут удалять сообщения и закрывать доступ нарушителям.',
        ],
      },
      {
        h: 'Дети и подростки',
        p: [
          'Регистрация доступна с 14 лет. Пользователям младше 15 лет доступны только общие чаты мероприятий, личные сообщения для них отключены.',
        ],
      },
      {
        h: 'Ваши права',
        p: [
          'Вы можете изменить данные профиля, убрать фото, отключить уведомления и удалить аккаунт в разделе «Настройки». При удалении аккаунта удаляются профиль, сообщения, мероприятия, записи в инструментах и адрес телефона.',
        ],
      },
    ],
  },
  en: {
    title: 'Rules and privacy',
    note: 'This app is independent and is not yet an official app of the YoungLife organization.',
    sections: [
      {
        h: 'Who we are',
        p: [
          'This is a non-profit app for youth events and chat. It is free and has no ads. Donations are voluntary and go only toward running the app.',
        ],
      },
      {
        h: 'Data we store',
        p: [
          'Your name, email, date of birth, profile bio and photo (optional), chat messages, your notes in the leader tools (Tree, List, Map), your phone address for notifications, and reports you file about others.',
          'Your date of birth is used only to check age (sign-up from 14, private messages from 15) and is never shown to other users. Leader tool notes are visible only to you.',
        ],
      },
      {
        h: 'How we use it',
        p: [
          'Only to run the app: sign-in, showing events and chats, age checks, notifications and abuse protection. We do not sell data or show ads.',
          'Data is stored on Supabase servers (Europe). Notifications are sent through the Expo service.',
        ],
      },
      {
        h: 'Community rules',
        p: [
          'Respect others. Insults, bullying, threats, sexual or other inappropriate content, spam, impersonation and attempts to get personal details of minors are forbidden.',
          'You can report a message or block a person: press and hold a message. Administrators review reports, may remove messages and suspend offenders.',
        ],
      },
      {
        h: 'Children and teens',
        p: [
          'Sign-up is available from age 14. Users under 15 can only use event group chats; private messages are disabled for them.',
        ],
      },
      {
        h: 'Your rights',
        p: [
          'You can edit your profile, remove your photo, turn off notifications and delete your account in Settings. Deleting your account removes your profile, messages, events, tool notes and phone address.',
        ],
      },
    ],
  },
};
