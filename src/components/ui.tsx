import { Ionicons } from '@expo/vector-icons';
import React, { ComponentProps, useState } from 'react';
import {
  Pressable,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { dayNumber, monthShort } from '@/lib/dates';
import { Lang } from '@/lib/i18n';
import { font, navy, radius, space, touch, type, usePalette } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// ---------- Текст ----------

type Tone = 'ink' | 'muted' | 'green' | 'danger';

export function Txt({
  variant = 'body',
  tone = 'ink',
  style,
  ...rest
}: TextProps & { variant?: keyof typeof type; tone?: Tone }) {
  const c = usePalette();
  const color = { ink: c.ink, muted: c.muted, green: c.greenText, danger: c.danger }[tone];
  return <Text {...rest} style={[type[variant], { color }, style]} />;
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Txt variant="title">{title}</Txt>
      {subtitle ? (
        <Txt tone="muted" style={{ marginTop: space.xs }}>
          {subtitle}
        </Txt>
      ) : null}
    </View>
  );
}

// ---------- Кнопки ----------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const c = usePalette();
  const bg = variant === 'primary' ? c.green : variant === 'secondary' ? c.surface : 'transparent';
  const fg = variant === 'primary' ? c.onGreen : variant === 'danger' ? c.danger : c.ink;
  const border = variant === 'secondary' ? c.line : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: touch,
          borderRadius: radius.button,
          borderWidth: 1,
          borderColor: border,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          paddingHorizontal: space.lg,
        },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style,
      ]}>
      {icon ? <Ionicons name={icon} size={22} color={fg} /> : null}
      <Text style={{ fontFamily: font.bold, fontSize: 16, color: fg }}>{title}</Text>
    </Pressable>
  );
}

// ---------- Поле ввода ----------

export function Field({ label, style, multiline, ...rest }: TextInputProps & { label: string }) {
  const c = usePalette();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space.md }}>
      <Txt variant="small" tone="muted" style={{ marginBottom: 6 }}>
        {label}
      </Txt>
      <TextInput
        {...rest}
        multiline={multiline}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={c.muted}
        style={[
          type.body,
          {
            minHeight: multiline ? 112 : touch,
            textAlignVertical: multiline ? 'top' : 'center',
            color: c.ink,
            backgroundColor: c.surface,
            borderRadius: radius.input,
            borderWidth: focused ? 2 : 1,
            borderColor: focused ? c.ink : c.line,
            paddingHorizontal: space.md,
            paddingVertical: multiline ? 14 : 0,
          },
          style,
        ]}
      />
    </View>
  );
}

// ---------- Карточки и мелкие элементы ----------

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = usePalette();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: radius.card,
          padding: space.md,
          borderWidth: 1,
          borderColor: c.line,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function IconBadge({ name, size = 44 }: { name: IconName; size?: number }) {
  const c = usePalette();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        backgroundColor: c.greenSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Ionicons name={name} size={size * 0.5} color={c.greenText} />
    </View>
  );
}

export function Chip({ label }: { label: string }) {
  const c = usePalette();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: c.greenSoft,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}>
      <Txt variant="caption" tone="green">
        {label}
      </Txt>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
}) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.track, padding: 4, borderRadius: 16 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? c.surface : 'transparent',
              paddingHorizontal: 6,
            }}>
            <Text
              numberOfLines={1}
              style={{ fontFamily: on ? font.bold : font.medium, fontSize: 14, color: on ? c.ink : c.muted }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Плитка с датой: главный запоминающийся элемент карточек мероприятий.
export function DateTile({ date, lang, large }: { date: Date; lang: Lang; large?: boolean }) {
  const w = large ? 88 : 64;
  const h = large ? 100 : 72;
  return (
    <View
      style={{
        width: w,
        height: h,
        borderRadius: radius.tile,
        backgroundColor: navy,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontFamily: font.extrabold, fontSize: large ? 40 : 28, lineHeight: large ? 44 : 32, color: '#FFFFFF' }}>
        {dayNumber(date)}
      </Text>
      <Text style={{ fontFamily: font.bold, fontSize: large ? 16 : 13, color: '#86CC4E' }}>
        {monthShort(date, lang)}
      </Text>
    </View>
  );
}

export function WordMark() {
  const c = usePalette();
  return (
    <View>
      <Text style={{ fontFamily: font.extrabold, fontSize: 36, lineHeight: 42, letterSpacing: -1, color: c.ink }}>
        YoungLife
      </Text>
      <View style={{ width: 44, height: 6, borderRadius: 3, backgroundColor: c.green, marginTop: 6 }} />
    </View>
  );
}

export function EmptyState({ icon, title, hint }: { icon: IconName; title: string; hint?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xl, paddingHorizontal: space.lg, gap: space.sm }}>
      <IconBadge name={icon} size={64} />
      <Txt variant="h2" style={{ textAlign: 'center', marginTop: space.sm }}>
        {title}
      </Txt>
      {hint ? (
        <Txt tone="muted" style={{ textAlign: 'center' }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}
