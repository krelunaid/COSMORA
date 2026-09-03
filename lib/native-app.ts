export const NATIVE_CAPACITOR_CLASS = 'native-capacitor';

export function detectNativeCapacitorApp(
  input: {
    isNativePlatform?: boolean;
    userAgent?: string;
  } = {},
) {
  if (typeof input.isNativePlatform === 'boolean')
    return input.isNativePlatform;
  return /Capacitor/i.test(input.userAgent ?? '');
}

export function applyNativeCapacitorClass(
  isNative: boolean,
  root?: {
    classList: { toggle: (name: string, force?: boolean) => unknown };
  } | null,
) {
  const target =
    root ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!target) return;
  target.classList.toggle(NATIVE_CAPACITOR_CLASS, isNative);
}
