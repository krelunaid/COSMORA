import {
  moderationActions,
  moderationTargetTypes,
  type ModerationAction,
  type ModerationTargetType,
} from './contract.ts';

type VerifiedUser = {
  id: string;
  is_anonymous?: boolean;
  app_metadata?: Record<string, unknown>;
};
export type ModerationDecision = {
  targetType: ModerationTargetType;
  targetId: string;
  action: ModerationAction;
  reason: string;
  expectedStatus: string;
  reportIds: string[];
};
export type ModerationDependencies = {
  getUser(
    token: string,
  ): Promise<{ user: VerifiedUser | null; error: unknown }>;
  isSuspended(userId: string): Promise<boolean>;
  getQueue(view: 'pending' | 'hidden', offset: number): Promise<unknown>;
  getHistory(): Promise<unknown>;
  decide(
    actorId: string,
    decision: ModerationDecision,
  ): Promise<{ data: unknown; error: { code?: string } | null }>;
};

const origins = new Set([
  'https://software.kreluna.it',
  'http://127.0.0.1:4330',
]);
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && uuid.test(value);

export function parseDecision(value: unknown): ModerationDecision | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const d = value as Record<string, unknown>;
  if (
    !moderationTargetTypes.includes(d.targetType as ModerationTargetType) ||
    !isUuid(d.targetId) ||
    !moderationActions.includes(d.action as ModerationAction) ||
    typeof d.reason !== 'string' ||
    d.reason.trim().length < 5 ||
    d.reason.trim().length > 2000 ||
    d.reason.includes('\0') ||
    typeof d.expectedStatus !== 'string' ||
    d.expectedStatus.length < 1 ||
    d.expectedStatus.length > 30 ||
    d.expectedStatus.includes('\0')
  )
    return null;
  const reportIds = d.reportIds === undefined ? [] : d.reportIds;
  if (
    !Array.isArray(reportIds) ||
    reportIds.length > 100 ||
    !reportIds.every(isUuid) ||
    (['DISMISS', 'RESOLVE'].includes(d.action as string) &&
      reportIds.length === 0)
  )
    return null;
  return {
    targetType: d.targetType as ModerationTargetType,
    targetId: d.targetId,
    action: d.action as ModerationAction,
    reason: d.reason.trim(),
    expectedStatus: d.expectedStatus,
    reportIds,
  };
}

async function readDecision(
  request: Request,
): Promise<ModerationDecision | null> {
  // Bound the actual stream too: Content-Length is optional and client-controlled.
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return parseDecision(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export function createModerationHandler(
  dependencies: () => ModerationDependencies,
) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const allowedOrigin = origin !== null && origins.has(origin);
    const headers: Record<string, string> = {
      'Cache-Control': 'private, no-store',
      Vary: 'Origin',
      'X-Content-Type-Options': 'nosniff',
      ...(allowedOrigin
        ? {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers':
              'authorization, apikey, content-type, x-client-info',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          }
        : {}),
    };
    const reply = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    if (!allowedOrigin) return reply(403, { error: 'origin_not_allowed' });
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers });
    if (!['GET', 'POST'].includes(request.method))
      return reply(405, { error: 'method_not_allowed' });
    const authorization = request.headers.get('authorization');
    const token =
      authorization && authorization.length <= 16384
        ? authorization.match(/^Bearer ([^\s]+)$/i)?.[1]
        : undefined;
    if (!token) return reply(401, { error: 'authentication_required' });

    const parameters = new URL(request.url).searchParams;
    const view = parameters.get('view') || 'pending';
    const offsetText = parameters.get('offset') ?? '0';
    const offset = Number(offsetText);
    if (
      request.method === 'GET' &&
      (!['pending', 'hidden', 'history'].includes(view) ||
        !/^\d{1,6}$/.test(offsetText) ||
        offset > 100000 ||
        parameters.getAll('view').length > 1 ||
        parameters.getAll('offset').length > 1)
    ) {
      return reply(400, { error: 'invalid_query' });
    }
    try {
      const backend = dependencies();
      // GetUser checks Auth now; never trust roles embedded in the submitted JWT.
      const { user, error } = await backend.getUser(token);
      if (
        error ||
        !user ||
        user.is_anonymous ||
        user.app_metadata?.deletion_pending
      ) {
        return reply(401, { error: 'authentication_required' });
      }
      const role = user.app_metadata?.cosmora_role;
      if (role !== 'admin' && role !== 'moderator') {
        return reply(403, { error: 'access_denied' });
      }
      if (await backend.isSuspended(user.id))
        return reply(403, { error: 'account_unavailable' });
      if (request.method === 'GET')
        return reply(
          200,
          view === 'history'
            ? await backend.getHistory()
            : await backend.getQueue(view as 'pending' | 'hidden', offset),
        );

      const decision = await readDecision(request);
      if (!decision)
        return reply(400, {
          error: 'Inserisci una decisione e una motivazione valida.',
        });
      const result = await backend.decide(user.id, decision);
      if (result.error) {
        const code = result.error.code;
        const status =
          code === '40001'
            ? 409
            : code === '42501'
              ? 403
              : code === 'P0002'
                ? 404
                : code === '22023'
                  ? 400
                  : 503;
        const message =
          status === 409
            ? 'Il contenuto è cambiato. Aggiorna la coda prima di decidere.'
            : status === 403
              ? 'Operazione non autorizzata.'
              : status === 404
                ? 'Contenuto non disponibile.'
                : status === 400
                  ? 'Questa decisione non è valida per lo stato attuale.'
                  : 'Decisione non salvata. Riprova.';
        return reply(status, { error: message });
      }
      return reply(200, { saved: true, result: result.data });
    } catch {
      return reply(503, {
        error: 'Servizio non disponibile. Riprova tra poco.',
      });
    }
  };
}
