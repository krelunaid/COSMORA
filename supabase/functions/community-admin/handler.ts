// Authorization is based only on a fresh Auth getUser response. Never use
// user_metadata, profile.role, or decoded (potentially stale) JWT claims here.
type VerifiedUser = {
  id: string;
  is_anonymous?: boolean;
  app_metadata?: Record<string, unknown>;
};

export type DashboardDependencies = {
  getUser: (token: string) => Promise<{ user: VerifiedUser | null; error: unknown }>;
  isSuspended: (userId: string) => Promise<boolean>;
  getDashboard: (search: string, page: number) => Promise<unknown>;
};

const origins = new Set(['https://software.kreluna.it', 'http://127.0.0.1:4330']);

export function createDashboardHandler(dependencies: () => DashboardDependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const allowedOrigin = origin !== null && origins.has(origin);
    const headers: Record<string, string> = {
      'Cache-Control': 'private, no-store',
      'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff',
      ...(allowedOrigin ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      } : {}),
    };
    const reply = (status: number, body: unknown): Response =>
      new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });

    if (!allowedOrigin) return reply(403, { error: 'origin_not_allowed' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return reply(405, { error: 'method_not_allowed' });

    const authorization = request.headers.get('authorization');
    const token = authorization && authorization.length <= 16384
      ? authorization.match(/^Bearer ([^\s]+)$/i)?.[1] : undefined;
    if (!token) return reply(401, { error: 'authentication_required' });

    const parameters = new URL(request.url).searchParams;
    const search = parameters.get('q') ?? '';
    const pageText = parameters.get('page') ?? '1';
    const page = Number(pageText);
    if (search.length > 100 || search.includes('\0') || !/^[1-9]\d{0,4}$/.test(pageText)
      || page > 10000 || parameters.getAll('q').length > 1 || parameters.getAll('page').length > 1) {
      return reply(400, { error: 'invalid_query' });
    }

    try {
      const backend = dependencies();
      const { user, error } = await backend.getUser(token);
      if (error || !user || user.is_anonymous || user.app_metadata?.deletion_pending) {
        return reply(401, { error: 'authentication_required' });
      }
      if (user.app_metadata?.cosmora_dashboard_access !== true && user.app_metadata?.cosmora_role !== 'admin') {
        return reply(403, { error: 'access_denied' });
      }
      if (await backend.isSuspended(user.id)) return reply(403, { error: 'account_unavailable' });
      return reply(200, await backend.getDashboard(search, page));
    } catch {
      // Auth, moderation, RPC and timeout failures must never disclose details
      // or fall back to a weaker source of authorization.
      return reply(503, { error: 'unavailable' });
    }
  };
}
