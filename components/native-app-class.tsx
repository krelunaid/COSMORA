'use client';

import { useLayoutEffect } from 'react';
import { Capacitor } from '@capacitor/core';

import { applyNativeCapacitorClass } from '@/lib/native-app';

export function NativeAppClass() {
  useLayoutEffect(() => {
    applyNativeCapacitorClass(Capacitor.isNativePlatform());
  }, []);
  return null;
}
