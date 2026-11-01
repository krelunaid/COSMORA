import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { z } from 'zod';
import * as names from '../lib/public-name.ts';
import { publicNameAvailable } from '../lib/server/public-name.ts';

void test('names normalize compatibility characters and redundant whitespace', () => {
  for (const name of [' Andre ', 'Ａｎｄｒｅ', '\tAndre\n']) assert.equal(names.normalizePublicName(name), 'Andre');
  assert.equal(names.normalizePublicName('Andre  Cosplay'), 'Andre Cosplay');
  assert.equal(names.normalizePublicName('Andre\u0301'), 'André');
  for (const name of ['', ' ', 'A', 'a'.repeat(81), 'An\u200bdre']) assert.equal(names.validPublicName(name), false);
  assert.equal(names.validPublicName('Andre_cosplay'), true);
});
void test('only the nickname unique constraint maps to a taken-name error', () => {
  assert.equal(names.isPublicNameConflict({ code: '23505', message: 'duplicate key violates profiles_public_name_unique' }), true);
  assert.equal(names.isPublicNameConflict({ code: '23505', message: 'duplicate key violates profiles_pkey' }), false);
  assert.equal(names.isPublicNameConflict({ code: '500', message: 'profiles_public_name_unique' }), false);
});
void test('availability excludes the same owner and escapes SQL LIKE wildcards', async () => {
  const calls: unknown[][] = [];
  const query = { select: () => query, ilike: (...args: unknown[]) => { calls.push(args); return query; },
    neq: (...args: unknown[]) => { calls.push(args); return query; }, limit: () => ({ data: [], error: null }) };
  const result = await publicNameAvailable({ from: () => query } as unknown as Parameters<typeof publicNameAvailable>[0], 'Andre_100%', 'owner');
  assert.equal(result.available, true);
  assert.deepEqual(calls, [['display_name', 'Andre\\_100\\%'], ['id', 'owner']]);
});

function accountRoute(available: boolean, conflict = false, authenticated = true) {
  let writes = 0;
  const compiled = ts.transpileModule(readFileSync(new URL('../app/api/account/route.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const modules: Record<string, unknown> = {
    'next/server': { NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) } },
    'zod': { z }, '@/lib/public-name': names,
    '@/lib/server/public-name': { publicNameAvailable: async () => ({ available, error: null }) },
    '@/lib/supabase/server': { requireAuthenticatedUser: async () => authenticated ? { user: { id: 'owner' }, admin: { from: () => ({ upsert: async (data: { id: string; display_name: string }) => {
      writes++; assert.equal(data.id, 'owner'); assert.equal(data.display_name, 'Andre');
      return { error: conflict ? { code: '23505', message: 'profiles_public_name_unique' } : null };
    } }) } } : null },
  };
  const exports: { PUT?: (request: Request) => Promise<Response> } = {};
  vm.runInNewContext(compiled, { exports, require: (name: string) => { assert.ok(name in modules); return modules[name]; } });
  return { save: () => exports.PUT!(new Request('https://example.invalid/api/account', { method: 'PUT', body: JSON.stringify({ displayName: '  Andre  ', country: 'IT' }) })), writes: () => writes };
}
void test('taken names are rejected before writing, including a race won by another account', async () => {
  const taken = accountRoute(false);
  const response = await taken.save();
  assert.equal(response.status, 409); assert.equal(((await response.json()) as { code: string }).code, 'PUBLIC_NAME_TAKEN');
  assert.equal(taken.writes(), 0);
  const race = await accountRoute(true, true).save();
  assert.equal(race.status, 409); assert.equal(((await race.json()) as { code: string }).code, 'PUBLIC_NAME_TAKEN');
});
void test('authenticated available name is saved normalized; anonymous writes are rejected', async () => {
  const response = await accountRoute(true).save();
  assert.equal(response.status, 200); assert.equal(((await response.json()) as { displayName: string }).displayName, 'Andre');
  const anonymous = accountRoute(true, false, false);
  assert.equal((await anonymous.save()).status, 401); assert.equal(anonymous.writes(), 0);
});
