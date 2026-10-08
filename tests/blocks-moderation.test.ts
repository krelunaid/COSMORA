import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import { compileFunction } from 'node:vm';
import { z } from 'zod';
import { isBlockModerationNotice } from '../lib/moderation.ts';

const route = readFileSync(new URL('../app/api/blocks/route.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20261006091124_block_moderation_notifications.sql', import.meta.url), 'utf8');
const actor = '10000000-0000-4000-8000-000000000001';
const author = '10000000-0000-4000-8000-000000000002';
const content = '20000000-0000-4000-8000-000000000001';
type Result = { data: { id: string } | null; error: { message: string } | null };
type Query = Promise<Result> & {
  select: (fields: string) => Query;
  eq: (column: string, value: string) => Query;
  maybeSingle: () => Promise<Result>;
  upsert: (value: Record<string, unknown>, options: unknown) => Promise<Result>;
  delete: () => Query;
};

function fixture(options: { authenticated?: boolean; contextFound?: boolean; contextError?: boolean; writeError?: boolean } = {}) {
  const calls: Array<{ table: string; action: string; value?: unknown }> = [];
  const writeResult: Result = { data: null, error: options.writeError ? { message: 'failed' } : null };
  const admin = { from(table: string) {
    const query = Promise.resolve(writeResult) as Query;
    query.select = (fields) => { calls.push({ table, action: 'select', value: fields }); return query; };
    query.eq = (column, value) => { calls.push({ table, action: 'eq', value: [column, value] }); return query; };
    query.maybeSingle = () => Promise.resolve({ data: options.contextFound === false ? null : { id: content }, error: options.contextError ? { message: 'unavailable' } : null });
    query.upsert = (value, settings) => { calls.push({ table, action: 'upsert', value: { value, settings } }); return Promise.resolve(writeResult); };
    query.delete = () => { calls.push({ table, action: 'delete' }); return query; };
    return query;
  } };
  const javascript = stripTypeScriptTypes(route.replace(/^import .+;\n/gm, '').replace('export async function POST', 'async function POST'));
  const create = compileFunction(javascript + '\nreturn POST;', ['NextResponse', 'z', 'requireAuthenticatedUser']) as
    (response: { json: typeof Response.json }, validator: typeof z, authenticate: () => Promise<unknown>) => (request: Request) => Promise<Response>;
  const post = create({ json: Response.json.bind(Response) }, z, async () => options.authenticated === false ? null : { user: { id: actor }, admin });
  return { calls, send: (body: unknown) => post(new Request('https://example.invalid/api/blocks', { method: 'POST', body: JSON.stringify(body) })) };
}

void test('legacy block request persists only the authenticated actor and succeeds', async () => {
  const api = fixture();
  const response = await api.send({ userId: author, blocked: true, blocker_id: author });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { saved: true });
  assert.deepEqual(api.calls.find((call) => call.action === 'upsert')?.value, {
    value: { blocker_id: actor, blocked_id: author }, settings: { onConflict: 'blocker_id,blocked_id' },
  });
  assert.ok(api.calls.every((call) => call.table === 'user_blocks'));
});

void test('block API rejects missing authentication, self-blocks and incomplete context', async () => {
  assert.equal((await fixture({ authenticated: false }).send({ userId: author, blocked: true })).status, 401);
  for (const body of [
    { userId: actor, blocked: true },
    { userId: author, blocked: true, contextTargetType: 'POST' },
    { userId: author, blocked: true, contextTargetId: content },
    { userId: author, blocked: true, contextTargetType: 'USER', contextTargetId: actor },
  ]) {
    const api = fixture();
    assert.equal((await api.send(body)).status, 400);
    assert.ok(!api.calls.some((call) => call.action === 'upsert'));
  }
});

for (const [targetType, table, owner] of [['POST', 'community_posts', 'author_id'], ['SQUAD', 'squads', 'owner_id'], ['LISTING', 'listings', 'seller_id']] as const) {
  void test(`block context for ${targetType} is checked against its author before persistence`, async () => {
    const api = fixture();
    assert.equal((await api.send({ userId: author, blocked: true, contextTargetType: targetType, contextTargetId: content })).status, 200);
    assert.ok(api.calls.some((call) => call.table === table && call.action === 'eq' && JSON.stringify(call.value) === JSON.stringify([owner, author])));
    assert.deepEqual(api.calls.find((call) => call.action === 'upsert')?.value, {
      value: { blocker_id: actor, blocked_id: author, context_target_type: targetType, context_target_id: content },
      settings: { onConflict: 'blocker_id,blocked_id' },
    });
  });
}

void test('invalid ownership, database failure and trigger failure never report success', async () => {
  for (const [options, expected] of [[{ contextFound: false }, 404], [{ contextError: true }, 503], [{ writeError: true }, 503]] as const) {
    const api = fixture(options);
    assert.equal((await api.send({ userId: author, blocked: true, contextTargetType: 'POST', contextTargetId: content })).status, expected);
    if (!('writeError' in options)) assert.ok(!api.calls.some((call) => call.action === 'upsert'));
  }
});

void test('unblock is scoped to the caller and does not remove the persistent moderator notice', async () => {
  const api = fixture();
  assert.equal((await api.send({ userId: author, blocked: false })).status, 200);
  assert.deepEqual(api.calls, [
    { table: 'user_blocks', action: 'delete' },
    { table: 'user_blocks', action: 'eq', value: ['blocker_id', actor] },
    { table: 'user_blocks', action: 'eq', value: ['blocked_id', author] },
  ]);
});

void test('block migration uses an atomic invoker trigger and a pair-specific unique notice', () => {
  assert.match(migration, /language plpgsql\s+security invoker\s+set search_path = ''/);
  assert.doesNotMatch(migration, /security definer|grant\s+(?:insert|update|all).*to\s+(?:anon|authenticated)/i);
  assert.match(migration, /after insert or update on public\.user_blocks/);
  assert.match(migration, /on public\.reports \(reporter_id, target_id\)\s+where source = 'USER_BLOCK' and target_type = 'USER'/);
  assert.match(migration, /on conflict \(reporter_id, target_id\)/);
  assert.match(migration, /when tg_op = 'INSERT' and public\.reports\.status not in \('OPEN','REVIEWING'\)/);
  assert.doesNotMatch(migration, /insert into public\.reports[\s\S]*select[\s\S]*from public\.user_blocks/i);
});

void test('moderation API and UI expose durable block notices with readable context', () => {
  const api = readFileSync(new URL('../app/api/moderation/route.ts', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../app/moderation/page.tsx', import.meta.url), 'utf8');
  assert.match(api, /source,context_target_type,context_target_id/);
  assert.match(api, /source: r\.source, contextTargetType: r\.context_target_type/);
  assert.match(ui, /Blocco utente · avviso al gestore/);
  assert.match(ui, /Avvisi di blocco da esaminare in questa pagina/);
});

void test('notice label works with the legacy moderation API and trusts an explicit source', () => {
  const details = 'Un utente ha bloccato questo autore. Avviso automatico al gestore; il blocco non costituisce da solo una violazione.';
  assert.equal(isBlockModerationNotice({ source: 'USER_BLOCK', reason: 'OTHER', details: null }), true);
  assert.equal(isBlockModerationNotice({ reason: 'OTHER', details }), true);
  assert.equal(isBlockModerationNotice({ source: 'USER_REPORT', reason: 'OTHER', details }), false);
  assert.equal(isBlockModerationNotice({ reason: 'OTHER', details: 'Vorrei bloccare un utente.' }), false);
  assert.equal(isBlockModerationNotice({ reason: 'SPAM', details }), false);
});
