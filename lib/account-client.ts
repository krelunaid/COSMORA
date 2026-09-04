import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type AccountResponse = {
  email: string; displayName: string; country: string; userId: string;
  profiles: Array<{ id: string; display_name: string }>;
  messages: Array<{ id: string; sender_id: string; recipient_id: string; body: string; created_at: string }>;
  orders: Array<{ id: string; status: string; amount_cents: number; currency: string }>;
};
export async function accountRequest<T = AccountResponse>(path: string, options: RequestInit = {}): Promise<T> {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error('Accesso non disponibile. Riprova più tardi.');
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error('Accedi per continuare.');
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${data.session.access_token}`);
  if (options.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...options, headers, cache: 'no-store' });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || 'Operazione non riuscita. Riprova.');
  return result;
}
