import { TextStyle, useColorScheme } from 'react-native';

// Палитра YoungLife: тёмно-синий (navy) и зелёный на нейтральном фоне.
// Светлая и тёмная темы переключаются автоматически по настройке телефона.
const light = {
  bg: '#F5F6F7',
  surface: '#FFFFFF',
  ink: '#0E2A47',
  muted: '#5F6E7E',
  line: '#E2E6EA',
  track: '#E8EBEE',
  green: '#7AC143',
  onGreen: '#0E2A47',
  greenSoft: '#E6F3D9',
  greenText: '#3E7A10',
  danger: '#C23B3B',
};

const dark = {
  bg: '#101214',
  surface: '#1A1D21',
  ink: '#F3F5F7',
  muted: '#9AA5B1',
  line: '#2A2E34',
  track: '#23272C',
  green: '#86CC4E',
  onGreen: '#0E2A47',
  greenSoft: '#1F2E15',
  greenText: '#97D95F',
  danger: '#FF7A7A',
};

export type Palette = typeof light;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

// Фирменный тёмно-синий, одинаковый в обеих темах (плитка даты).
export const navy = '#0E2A47';

export const font = {
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semibold: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
  extrabold: 'Onest_800ExtraBold',
};

// Шкала шрифтов
export const type = {
  title: { fontFamily: font.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  h2: { fontFamily: font.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: font.medium, fontSize: 16, lineHeight: 24 },
  strong: { fontFamily: font.bold, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: font.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16 },
} satisfies Record<string, TextStyle>;

export const radius = { input: 14, button: 16, card: 20, tile: 16 };
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, screen: 20 };
// Минимальная высота нажимаемых элементов (удобно пальцем).
export const touch = 56;
