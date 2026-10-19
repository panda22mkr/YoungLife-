import type { Lang } from './i18n';

const months: Record<Lang, string[]> = {
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const weekdays: Record<Lang, string[]> = {
  ru: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

const pad = (n: number) => String(n).padStart(2, '0');

export const dayNumber = (d: Date) => String(d.getDate());
export const monthShort = (d: Date, lang: Lang) => months[lang][d.getMonth()];
export const timeText = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const weekdayShort = (d: Date, lang: Lang) => weekdays[lang][d.getDay()];

// «пт, 24 окт, 19:00»
export function fullText(d: Date, lang: Lang): string {
  return `${weekdayShort(d, lang)}, ${d.getDate()} ${monthShort(d, lang)}, ${timeText(d)}`;
}

// Формат ввода: ДД.ММ.ГГГГ ЧЧ:ММ
export function parseDateTime(input: string): Date | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/.exec(input.trim());
  if (!m) return null;
  const [d, mo, y, h, mi] = m.slice(1).map(Number);
  const date = new Date(y, mo - 1, d, h, mi);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d ||
    h > 23 ||
    mi > 59
  ) {
    return null;
  }
  return date;
}

// Обратное преобразование для редактирования: Date -> «ДД.ММ.ГГГГ ЧЧ:ММ»
export const formatDateTime = (d: Date) =>
  `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
