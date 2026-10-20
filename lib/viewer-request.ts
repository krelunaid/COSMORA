import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { accountHttp, AccountRequestError } from '@/lib/account-http';

/** Bind a private mutation to the account that was viewing its form. */
export async function viewerRequest<T = unknown>(path: string, viewerId: string, options: RequestInit) {
  const client = getSupabaseBrowserClient();
  if (!viewerId || !client) throw new AccountRequestError('Accedi per continuare.', 401, 'AUTH_REQUIRED');
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error('Accesso non disponibile. Riprova più tardi.');
  if (data.session?.user.id !== viewerId)
    throw new AccountRequestError('Accedi per continuare.', 401, 'AUTH_REQUIRED');
  const headers = new Headers(options.headers);
  headers.set('Authorization', 'Bearer ' + data.session.access_token);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  return accountHttp<T>(path, { ...options, headers });
}
