import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  BLOCKS_CHANGED_EVENT,
  applyBlockChange,
  blockedAuthorIds,
  notifyBlockChange,
  readOwnBlockedAuthors,
  subscribeToBlockChanges,
  withListingAuthors,
  withoutBlockedAuthors,
} from '../lib/blocked-content.ts';
import { getBlockedAuthorIds } from '../lib/server/blocked-content.ts';

const viewer = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const third = '10000000-0000-4000-8000-000000000003';

void test('visibility excludes authors blocked in either direction, deduplicates, and keeps the viewer', () => {
  assert.deepEqual(blockedAuthorIds([
    { blocker_id: viewer, blocked_id: other },
    { blocker_id: other, blocked_id: viewer },
    { blocker_id: third, blocked_id: viewer },
    { blocker_id: other, blocked_id: third },
    { blocker_id: viewer, blocked_id: viewer },
  ], viewer), [other, third]);
});

void test('block lookup skips anonymous requests, uses both directions, and returns DB errors', async () => {
  let query = '';
  let fail = false;
  const dbError = { code: '42P01', message: 'Fixture lookup failure' };
  const admin = {
    from(table: string) {
      assert.equal(table, 'user_blocks');
      return { select(columns: string) {
        assert.equal(columns, 'blocker_id,blocked_id');
        return { or(filter: string) {
          query = filter;
          return { order() { return this; }, async range() {
            return fail ? { data: null, error: dbError } : {
              data: [{ blocker_id: other, blocked_id: viewer }], error: null,
            };
          } };
        } };
      } };
    },
  } as unknown as Parameters<typeof getBlockedAuthorIds>[0];
  assert.deepEqual(await getBlockedAuthorIds(admin), { ids: [], error: null });
  assert.equal(query, '');
  assert.deepEqual(await getBlockedAuthorIds(admin, viewer), { ids: [other], error: null });
  assert.equal(query, `blocker_id.eq.${viewer},blocked_id.eq.${viewer}`);
  fail = true;
  assert.deepEqual(await getBlockedAuthorIds(admin, viewer), { ids: [], error: dbError });
});

void test('a late feed response cannot restore blocked content; unrelated and own items stay visible', () => {
  const rows = [{ id: 'own', author: viewer }, { id: 'blocked', author: other }, { id: 'other', author: third }];
  const initial = new Set<string>();
  const blocked = applyBlockChange(initial, { userId: other, blocked: true });
  assert.equal(initial.size, 0);
  assert.deepEqual(withoutBlockedAuthors(rows, blocked, (row) => row.author).map((row) => row.id), ['own', 'other']);
  const unblocked = applyBlockChange(blocked, { userId: other, blocked: false });
  assert.equal(blocked.has(other), true);
  assert.deepEqual(withoutBlockedAuthors(rows, unblocked, (row) => row.author), rows);
});

void test('legacy client hydrates persisted outgoing blocks through RLS with pagination and fails closed', async () => {
  let fail = false;
  const pages: number[] = [];
  let start = 0;
  const chain = {
    select(columns: string) { assert.equal(columns, 'blocked_id'); return this; },
    eq(column: string, id: string) { assert.equal(column, 'blocker_id'); assert.equal(id, viewer); return this; },
    order(column: string) { assert.equal(column, 'blocked_id'); return this; },
    range(from: number, to: number) { pages.push(from); start = from; assert.equal(to, from + 499); return this; },
    async abortSignal(signal: AbortSignal) {
      assert.equal(signal.aborted, false);
      if (fail) return { data: null, error: { message: 'Unavailable' } };
      return { data: start === 0 ? Array.from({ length: 500 }, (_, n) => ({ blocked_id: 'blocked-' + n })) : [{ blocked_id: other }], error: null };
    },
  };
  const client = { from(table: string) { assert.equal(table, 'user_blocks'); return chain; } } as unknown as Parameters<typeof readOwnBlockedAuthors>[0];
  const ids = await readOwnBlockedAuthors(client, viewer, new AbortController().signal);
  assert.equal(ids.size, 501);
  assert.equal(ids.has(other), true);
  assert.deepEqual(pages, [0, 500]);
  fail = true;
  await assert.rejects(() => readOwnBlockedAuthors(client, viewer, new AbortController().signal), /lookup unavailable/);
});

void test('legacy saved items resolve owners only for known active IDs and omit inaccessible results', async () => {
  let calls = 0;
  let fail = false;
  const chain = {
    select(columns: string) { assert.equal(columns, 'id,seller_id'); return this; },
    eq(column: string, value: string) { assert.equal(column, 'status'); assert.equal(value, 'active'); return this; },
    in(column: string, ids: string[]) { assert.equal(column, 'id'); assert.deepEqual(ids, ['active', 'missing']); return this; },
    async abortSignal() { return fail ? { data: null, error: { message: 'Unavailable' } } : { data: [{ id: 'active', seller_id: other }], error: null }; },
  };
  const client = { from(table: string) { calls++; assert.equal(table, 'listings'); return chain; } } as unknown as Parameters<typeof withListingAuthors>[0];
  const items = [{ id: 'active', status: 'active' }, { id: 'missing', status: 'active' }, { id: 'unavailable', status: 'unavailable' }];
  const signal = new AbortController().signal;
  const resolved = await withListingAuthors(client, items, signal);
  assert.deepEqual(resolved, [{ id: 'active', status: 'active', seller_id: other }, { id: 'unavailable', status: 'unavailable', seller_id: '' }]);
  assert.deepEqual(withoutBlockedAuthors(resolved, new Set([other]), (item) => item.seller_id), [resolved[1]]);
  await withListingAuthors(client, resolved, signal);
  assert.equal(calls, 1, 'new API owner fields need no fallback query');
  fail = true;
  await assert.rejects(() => withListingAuthors(client, items, signal), /authors unavailable/);
});

void test('successful block notifications reach every feed listener and cleanup removes listeners', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const target = new EventTarget();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: target });
  const changes: unknown[] = [];
  const secondFeed: unknown[] = [];
  const stop = subscribeToBlockChanges((value) => changes.push(value));
  const stopSecond = subscribeToBlockChanges((value) => secondFeed.push(value));
  try {
    notifyBlockChange(other, true);
    assert.deepEqual(changes, [{ userId: other, blocked: true }]);
    assert.deepEqual(secondFeed, changes);
    target.dispatchEvent(new CustomEvent(BLOCKS_CHANGED_EVENT, { detail: { userId: other, blocked: 'yes' } }));
    assert.equal(changes.length, 1);
    stop();
    notifyBlockChange(other, false);
    assert.equal(changes.length, 1);
    assert.equal(secondFeed.length, 2);
  } finally {
    stop();
    stopSecond();
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

const source = (file: string) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

void test('public content routes fail closed and filter before pagination or signing, including direct links', () => {
  for (const [file, authorColumn, limit] of [
    ['app/api/listings/route.ts', 'seller_id', '.range(offset'],
    ['app/api/squads/route.ts', 'owner_id', ".order('starts_at').limit(50)"],
    ['app/api/profiles/route.ts', 'id', '.limit(24)'],
  ]) {
    const code = source(file);
    const filter = `query.not('${authorColumn}', 'in', '(' + blocks.ids.join(',') + ')')`;
    assert.match(code, /request\.headers\.has\('authorization'\) && !auth/);
    assert.ok(code.indexOf('if (blocks.error)') < code.indexOf(filter));
    assert.ok(code.indexOf(filter) > 0 && code.indexOf(filter) < code.indexOf(limit));
    assert.match(code, /Cache-Control': 'private, no-store'/);
  }
  assert.match(source('app/api/listings/route.ts'), /if \(slug\) query = query\.eq\('slug', slug\)/);
  assert.match(source('app/api/squads/route.ts'), /status\.eq\.ACTIVE,owner_id\.eq\./);
  assert.doesNotMatch(source('app/api/seller/listings/route.ts'), /getBlockedAuthorIds|blocks\.ids/);
});

void test('saved items omit blocked authors before media signing and reject re-saving their listings', () => {
  const code = source('app/api/saved-items/route.ts');
  const filter = 'if (listing && blocks.ids.includes(listing.seller_id)) return null';
  assert.ok(code.indexOf(filter) > 0 && code.indexOf(filter) < code.indexOf('createSignedUrl'));
  assert.match(code, /items: items\.filter\(\(item\) => item !== null\)/);
  assert.ok(code.lastIndexOf('if (blocks.ids.includes(listing.seller_id))') < code.lastIndexOf('.upsert('));
});

void test('all discovery views subscribe, hide cached blocked authors, and reload with the block revision', () => {
  for (const file of [
    'app/community/page.tsx', 'components/live-listings.tsx', 'components/crew-list.tsx',
    'components/profile-directory.tsx', 'components/saved-items.tsx',
  ]) {
    const code = source(file);
    assert.match(code, /useBlockedContent\(\)/);
    assert.match(code, /withoutBlockedAuthors\(/);
    assert.match(code, /blocksReady[^;]*?\? withoutBlockedAuthors/);
    assert.match(code, /BlockedContentNotice/);
    assert.match(code, /\}, \[[^\]]*blocksRevision[^\]]*\]\)/);
  }
  for (const file of ['components/live-listings.tsx', 'components/profile-directory.tsx', 'app/profile/[username]/page.tsx']) {
    const code = source(file);
    assert.match(code, /getSupabaseBrowserClient\(\)\?\.auth\.getSession\(\)/);
    assert.match(code, /headers: token \? \{ Authorization: 'Bearer ' \+ token \} : \{\}/);
  }
  assert.match(source('app/profile/[username]/page.tsx'), /profile && !blockedIds\.has\(profile\.id\)/);
  assert.match(source('app/squads/[slug]/page.tsx'), /!crew \|\| blockedIds\.has\(crew\.owner_id\)/);
});

void test('block hydration cancels stale lookups and never turns lookup failures into an empty visible feed', () => {
  const code = source('components/use-blocked-content.ts');
  assert.match(code, /readOwnBlockedAuthors\(client, id, controller\.signal\)/);
  assert.match(code, /attempt !== generation/);
  assert.match(code, /ready: false, error: true/);
  assert.match(code, /request\?\.abort\(\)/);
  assert.match(code, /onAuthStateChange/);
  assert.match(code, /subscription\.unsubscribe\(\)/);
  assert.match(code, /timer = setTimeout\(\(\) => \{ void hydrate\(\); \}, 0\)/);
});

void test('every block action emits only after success and sends validated moderation context', () => {
  for (const [file, action, notification] of [
    ['components/report-button.tsx', 'async function blockAuthor()', 'notifyBlockChange(authorId, true, actor)'],
    ['components/real-conversation.tsx', 'async function blockUser(', 'notifyBlockChange(peer, blocked, actor)'],
  ]) {
    const code = source(file).slice(source(file).indexOf(action));
    const request = code.indexOf("await viewerRequest('/api/blocks'");
    assert.ok(request >= 0 && request < code.indexOf(notification));
    assert.ok(code.indexOf(notification) < code.indexOf('catch ('));
    assert.match(code, /contextTargetType/);
    assert.match(code, /contextTargetId/);
  }
});

void test('blocked conversations suppress stale message history and composer while keeping Unblock reachable', () => {
  const chat = source('components/real-conversation.tsx');
  assert.match(chat, /const peerBlocked = blockedIds\.has\(peer\)/);
  assert.match(chat, /const visibleMessages = blocksReady && currentViewer && !peerBlocked \? messages : \[\]/);
  assert.match(chat, /visibleMessages\.map\(\(message\)/);
  assert.doesNotMatch(chat, /\{messages\.map/);
  assert.match(chat, /if \(!blocksReady \|\| !currentViewer \|\| peerBlocked\) return/);
  assert.match(chat, /\{blocksReady && currentViewer && !peerBlocked && <form/);
  assert.match(chat, /onClick=\{\(\) => void blockUser\(false\)\}/);
  assert.match(chat, /\[peer, revision, locale, t, blocksRevision, viewerId\]/);
  const inbox = source('components/real-inbox.tsx');
  assert.match(inbox, /blockedIds\.has\(item\.id\) \? \{ \.\.\.item, label: t\('Conversazione'\), detail: t\('Utente bloccato/);
  assert.match(inbox, /tab === 'messages' && !blocksReady \? null/);
  assert.match(inbox, /href=\{`\/inbox\/\$\{item\.id\}`\}/);
});

void test('private payloads stay tied to their request identity across logout or account changes', () => {
  const saved = source('components/saved-items.tsx');
  const inbox = source('components/real-inbox.tsx');
  for (const code of [saved, inbox]) {
    assert.match(code, /const actor = session\.data\.session\.user\.id/);
    assert.match(code, /headers: \{ Authorization: 'Bearer ' \+ session\.data\.session\.access_token \}/);
    assert.match(code, /setItemsViewer\(actor\)/);
    assert.match(code, /itemsViewer [!=]== viewerId/);
  }
  const chat = source('components/real-conversation.tsx');
  assert.match(chat, /Boolean\(viewerId && userId === viewerId\)/);
  assert.match(chat, /if \(draftViewer !== viewerId\) \{[\s\S]*?setDraft\(''\);[\s\S]*?setPendingId\(''\)/);
  assert.match(chat, /await viewerRequest\('\/api\/messages', actor/);
  assert.match(chat, /if \(viewerRef\.current !== actor\) return;\s*followLatest/);
  assert.match(chat, /if \(viewerRef\.current !== actor\) return;\s*notifyBlockChange/);
  const mutation = source('lib/viewer-request.ts');
  assert.ok(mutation.indexOf('data.session?.user.id !== viewerId') < mutation.indexOf('return accountHttp'));
  const hydration = source('components/use-blocked-content.ts');
  assert.match(hydration, /if \(change\.viewerId && change\.viewerId !== viewer\) return/);
  assert.match(hydration, /\}, 15000\)/);
  assert.match(hydration, /clearTimeout\(deadline\)/);
});
