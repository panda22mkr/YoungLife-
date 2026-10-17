import { Stack } from 'expo-router';
import { usePalette } from '@/lib/theme';

export default function AuthLayout() {
  const c = usePalette();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />;
}
