import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import type { Session } from '@supabase/supabase-js';
import type { Locale } from './i18n/config';
import { canRestorePush, isPushIdentity, notificationRoute, PUSH_STORAGE, type PushIdentity } from './push-policy';

export type PushState = 'off' | 'enabled' | 'busy' | 'denied' | 'error';
let state: PushState = 'off';
let session: Session | null = null;
let locale: Locale = 'it';
let generation = 0;
let started: Promise<void> | null = null;
let pendingToken: { resolve: (token: string) => void; reject: (error: Error) => void } | null = null;
let currentToken = '';
let busy: Promise<void> | null = null;
let navigate: ((path: string) => void) | null = null;
let pendingRoute: string | null = null;
const listeners = new Set<() => void>();
const handles: PluginListenerHandle[] = [];
export const nativePushAvailable = () => Capacitor.isNativePlatform();
export const subscribePush = (callback: () => void) => { listeners.add(callback); return () => { listeners.delete(callback); }; };
export const getPushState = () => state;
function publish(next: PushState) { state = next; listeners.forEach((listener) => listener()); }
function identity(): PushIdentity {
  const raw = localStorage.getItem(PUSH_STORAGE);
  if (raw) { try { const value: unknown = JSON.parse(raw); if (isPushIdentity(value)) return value; } catch { /* Create a fresh identity for malformed local data. */ } }
  const value: PushIdentity = { id: crypto.randomUUID(), secret: Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join(''), enabled: false };
  save(value); return value;
}
function save(value: PushIdentity) { localStorage.setItem(PUSH_STORAGE, JSON.stringify(value)); }
async function request(action: string, device: PushIdentity, token?: string, auth = session, language = locale) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/push-devices`, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', ...(auth ? { Authorization: `Bearer ${auth.access_token}` } : {}) },
      body: JSON.stringify({ action, installationId: device.id, installationSecret: device.secret, platform: Capacitor.getPlatform(), locale: language, token }),
    });
    if (!response.ok) throw new Error('push_request_failed');
  } finally { clearTimeout(timeout); }
}
export function setPushNavigator(callback: (path: string) => void) {
  navigate = callback;
  if (pendingRoute) { callback(pendingRoute); pendingRoute = null; }
  return () => { if (navigate === callback) navigate = null; };
}
async function start() {
  if (started) return started;
  started = (async () => {
    handles.push(await PushNotifications.addListener('registration', ({ value }) => {
      currentToken = value;
      pendingToken?.resolve(value);
      // Refreshes initiated by the native SDK are saved only for a consenting account.
      if (!pendingToken && session && state === 'enabled' && !busy) void restore().catch(() => publish('error'));
    }));
    handles.push(await PushNotifications.addListener('registrationError', () => pendingToken?.reject(new Error('push_registration_failed'))));
    handles.push(await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const route = notificationRoute(notification.data);
      if (route) { if (navigate) navigate(route); else pendingRoute = route; }
    }));
    handles.push(await App.addListener('appStateChange', ({ isActive }) => { if (isActive) void updatePushSession(session, locale); }));
    window.addEventListener('online', () => { void updatePushSession(session, locale); });
    if (Capacitor.getPlatform() === 'android') await PushNotifications.createChannel({ id: 'community', name: 'COSMORA', importance: 3, visibility: 1 });
  })().catch(async (error: unknown) => { await Promise.allSettled(handles.splice(0).map((handle) => handle.remove())); started = null; throw error; });
  return started;
}
async function register() {
  await start();
  if (currentToken) return currentToken;
  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => { pendingToken = null; reject(new Error('push_registration_timeout')); }, 15000);
    pendingToken = {
      resolve: (value) => { clearTimeout(timeout); pendingToken = null; resolve(value); },
      reject: (error) => { clearTimeout(timeout); pendingToken = null; reject(error); },
    };
    void PushNotifications.register().catch((error: unknown) => pendingToken?.reject(error instanceof Error ? error : new Error('push_registration_failed')));
  });
}
export async function disablePush() {
  if (!nativePushAvailable()) return;
  generation++;
  const device = identity();
  save({ ...device, enabled: false, pendingDisable: true });
  publish('busy');
  currentToken = '';
  // Local OS unregistration happens even if the network is unavailable.
  try { await Promise.race([PushNotifications.unregister(), new Promise((_, reject) => setTimeout(() => reject(new Error('unregister_timeout')), 5000))]); } catch { /* Server revocation below remains authoritative. */ }
  try {
    await request('disable', device, undefined, null);
    save({ ...device, userId: undefined, enabled: false, pendingDisable: false });
    publish('off');
  } catch { publish('error'); }
}
async function restore() {
  if (!session || session.user.is_anonymous) return;
  const device = identity();
  const permission = await PushNotifications.checkPermissions();
  if (!canRestorePush(device, session.user.id, !!session.user.is_anonymous, permission.receive)) {
    if (device.enabled && permission.receive !== 'granted') await disablePush();
    return;
  }
  await enablePush(false);
}
export async function enablePush(prompt = true) {
  if (!nativePushAvailable() || busy || !session || session.user.is_anonymous) return;
  const capturedSession = session;
  const capturedGeneration = generation;
  const capturedLocale = locale;
  busy = (async () => {
    publish('busy');
    try {
      let permission = await PushNotifications.checkPermissions();
      if (permission.receive !== 'granted' && prompt) permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') { publish('denied'); return; }
      const token = await register();
      if (capturedGeneration !== generation || session?.user.id !== capturedSession.user.id) { publish('off'); return; }
      const device = identity();
      await request('register', device, token, capturedSession, capturedLocale);
      if (capturedGeneration !== generation || session?.user.id !== capturedSession.user.id) {
        await request('disable', device, undefined, null); publish('off'); return;
      }
      save({ ...device, userId: capturedSession.user.id, enabled: true, pendingDisable: false });
      publish('enabled');
    } catch { publish('error'); }
  })().finally(() => { busy = null; });
  return busy;
}
export async function updatePushSession(next: Session | null, language: Locale) {
  if (!nativePushAvailable()) return;
  const previousUser = session?.user.id;
  session = next; locale = language;
  if (previousUser !== next?.user.id) generation++;
  try {
    await start();
    const device = identity();
    if (device.pendingDisable || (device.userId && device.userId !== next?.user.id)) await disablePush();
    await restore();
  } catch { publish('error'); }
}
