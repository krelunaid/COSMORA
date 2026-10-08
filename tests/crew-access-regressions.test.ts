import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const list = readFileSync(new URL('../components/crew-list.tsx', import.meta.url), 'utf8');
const create = readFileSync(new URL('../app/squads/create/page.tsx', import.meta.url), 'utf8');
const account = readFileSync(new URL('../lib/account-client.ts', import.meta.url), 'utf8');

test('crew list source reads the shared session and preserves optional public access', () => {
  assert.match(list, /await getSupabaseBrowserClient\(\)\?\.auth\.getSession\(\)/);
  assert.match(list, /headers: token \? \{ Authorization: 'Bearer ' \+ token \} : \{\}/);
  assert.match(list, /apiFetch\('\/api\/squads'/);
  assert.doesNotMatch(list, /accountRequest\(|\/auth\/login/);
  assert.ok(list.indexOf('getSession()') < list.indexOf("apiFetch('/api/squads'"));
  assert.match(list, /if \(session\?\.error\) throw session\.error/);
});

test('crew list source cancels after session lookup and guards asynchronous state updates', () => {
  const cancelCheck = list.indexOf('if (controller.signal.aborted) return');
  assert.ok(cancelCheck > list.indexOf('getSession()'));
  assert.ok(cancelCheck < list.indexOf("apiFetch('/api/squads'"));
  assert.match(list, /signal: controller\.signal/);
  assert.match(list, /if \(!controller\.signal\.aborted\) setCrews\(d\.squads\)/);
  assert.match(list, /catch\s*\{\s*if \(!controller\.signal\.aborted\)\s*setError/);
  assert.match(list, /if \(!controller\.signal\.aborted\) setLoading\(false\)/);
  assert.match(list, /return \(\) => controller\.abort\(\)/);
});

test('crew creation source offers login only for a typed 401 and preserves entered values', () => {
  assert.match(create, /setNeedsLogin\(e instanceof AccountRequestError && e\.status === 401\)/);
  assert.match(create, /\{needsLogin && \([\s\S]*?<Link href="\/auth\/login"/);
  assert.equal((create.match(/href="\/auth\/login"/g) ?? []).length, 1);
  assert.ok(create.indexOf('setNeedsLogin(false)') < create.indexOf('await accountRequest'));
  assert.doesNotMatch(create, /\.reset\(\)|window\.location/);
});

test('missing account session is typed separately from session-service failures', () => {
  assert.match(account, /if \(error\) throw new Error\('Accesso non disponibile\. Riprova più tardi\.'\)/);
  assert.match(account, /if \(!data\.session\)\s*throw new AccountRequestError\('Accedi per continuare\.', 401, 'AUTH_REQUIRED'\)/);
  assert.ok(account.indexOf('if (error)') < account.indexOf('if (!data.session)'));
  assert.match(account, /headers\.set\('Authorization', `Bearer \$\{data\.session\.access_token\}`\)/);
});

test('crew date source rejects invalid input before ISO conversion and keeps the form mounted', () => {
  assert.match(create, /if \(!Number\.isFinite\(startsAt\.getTime\(\)\)\)/);
  assert.ok(create.indexOf('Number.isFinite(startsAt.getTime())') < create.indexOf('startsAt.toISOString()'));
  assert.match(create, /Controlla nome, descrizione, data, luogo e regole\./);
  assert.doesNotMatch(create, /if \(error\)\s*return/);
});
