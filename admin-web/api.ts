import { createClient } from '@supabase/supabase-js';

const authStorageKey = 'cosmora-admin-auth';
const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const adminEndpoint =
  'https://pwdpwgonvnuwmgfiidut.supabase.co/functions/v1/community-admin';

// Bound every auth request, including automatic refresh, so a stalled connection
// cannot leave sign-in or session restoration waiting indefinitely.
async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const originalSignal = init?.signal;
  const abort = () => controller.abort();
  if (originalSignal?.aborted) controller.abort();
  else originalSignal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 12_000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    originalSignal?.removeEventListener('abort', abort);
  }
}

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storage: window.sessionStorage,
          storageKey: authStorageKey,
        },
        global: { fetch: authFetch },
      })
    : null;

export function clearStoredSession() {
  window.sessionStorage.removeItem(authStorageKey);
}

export type AdminUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  country: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  suspended: boolean;
  deletionPending: boolean;
  providers: string[];
};

export type DashboardData = {
  generatedAt: string;
  timezone: 'Europe/Rome';
  summary: {
    totalUsers: number;
    confirmedUsers: number;
    newUsers7d: number;
    newUsers30d: number;
    signIns30d: number;
    posts: number;
    listings: number;
    squads: number;
    meetups: number;
    openReports: number;
    pushDevices: number;
    pushIOS: number;
    pushAndroid: number;
  };
  registrations: { date: string; count: number }[];
  users: { page: number; pageSize: 25; total: number; items: AdminUser[] };
};

const summaryKeys: (keyof DashboardData['summary'])[] = [
  'totalUsers',
  'confirmedUsers',
  'newUsers7d',
  'newUsers30d',
  'signIns30d',
  'posts',
  'listings',
  'squads',
  'meetups',
  'openReports',
  'pushDevices',
  'pushIOS',
  'pushAndroid',
];
const isCount = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isDate = (value: unknown) =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));
const nullableString = (value: unknown) =>
  value === null || typeof value === 'string';

export function parseDashboard(value: unknown): DashboardData {
  if (!value || typeof value !== 'object') throw new Error('invalid-response');
  const data = value as DashboardData;
  if (
    !isDate(data.generatedAt) ||
    data.timezone !== 'Europe/Rome' ||
    !data.summary ||
    !summaryKeys.every((key) => isCount(data.summary[key])) ||
    !Array.isArray(data.registrations) ||
    data.registrations.length > 31 ||
    !data.registrations.every(
      (day) =>
        /^\d{4}-\d{2}-\d{2}$/.test(day.date) &&
        isDate(day.date) &&
        isCount(day.count),
    ) ||
    !data.users ||
    !isCount(data.users.page) ||
    data.users.page < 1 ||
    data.users.pageSize !== 25 ||
    !isCount(data.users.total) ||
    !Array.isArray(data.users.items) ||
    data.users.items.length > 25 ||
    !data.users.items.every(
      (user) =>
        user &&
        typeof user.id === 'string' &&
        nullableString(user.email) &&
        nullableString(user.displayName) &&
        nullableString(user.country) &&
        isDate(user.createdAt) &&
        (user.lastSignInAt === null || isDate(user.lastSignInAt)) &&
        typeof user.emailConfirmed === 'boolean' &&
        typeof user.suspended === 'boolean' &&
        typeof user.deletionPending === 'boolean' &&
        Array.isArray(user.providers) &&
        user.providers.every((provider) => typeof provider === 'string'),
    )
  ) {
    throw new Error('invalid-response');
  }
  return data;
}

export function friendlyAuthError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : '';
  if (code === 'email_not_confirmed')
    return 'Conferma prima il tuo indirizzo email con il link ricevuto da COSMORA.';
  if (code === 'invalid_credentials')
    return 'Email o password non corrette. Riprova con il tuo account COSMORA.';
  if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit'
  )
    return 'Troppi tentativi. Attendi qualche minuto prima di riprovare.';
  if (code === 'user_banned')
    return 'Questo account non può accedere. Contatta il responsabile di COSMORA.';
  return 'Accesso non riuscito. Verifica la connessione e riprova.';
}
