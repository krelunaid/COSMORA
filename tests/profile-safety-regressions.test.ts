import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import { compileFunction } from 'node:vm';
import ts from 'typescript';
import { AccountRequestError } from '../lib/account-http.ts';
import { blockFeedbackMessages } from '../lib/i18n/block-feedback.ts';
import { profileSafetyMessages } from '../lib/i18n/profile-safety.ts';
import type { BlockChange } from '../lib/blocked-content.ts';

const source = (file: string) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const profile = source('app/profile/[username]/page.tsx');
const control = source('components/report-button.tsx');
const feedback = source('components/block-feedback.tsx');
const safety = source('components/safety-center.tsx');
const actor = '10000000-0000-4000-8000-000000000001';
const author = '10000000-0000-4000-8000-000000000002';
const otherActor = '10000000-0000-4000-8000-000000000003';

function parse(code: string) {
  return ts.createSourceFile('component.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function find<T extends ts.Node>(root: ts.Node, predicate: (node: ts.Node) => node is T): T {
  let match: T | undefined;
  function visit(node: ts.Node) {
    if (match) return;
    if (predicate(node)) { match = node; return; }
    ts.forEachChild(node, visit);
  }
  visit(root);
  assert.ok(match, 'Expected source construct is missing');
  return match;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

// Execute the component's actual subscription effect with controlled Auth and
// event dependencies. This is an isolated unit test, not a browser/device test.
function feedbackFixture() {
  const ast = parse(feedback);
  const effect = find(ast, (node): node is ts.CallExpression => ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect');
  const javascript = stripTypeScriptTypes('const effect = ' + effect.arguments[0].getText(ast) + ';') + '\nreturn effect();';
  const start = compileFunction(javascript, ['getSupabaseBrowserClient', 'subscribeToBlockChanges', 'setNotice']);
  type Session = { user: { id: string } } | null;
  const initial = deferred<{ data: { session: Session }; error: Error | null }>();
  let authChanged!: (event: string, session: Session) => void;
  let changed!: (change: BlockChange) => void;
  let notice: BlockChange | null = null;
  let authUnsubscribed = false;
  let eventsUnsubscribed = false;
  const client = { auth: {
    onAuthStateChange(callback: typeof authChanged) {
      authChanged = callback;
      return { data: { subscription: { unsubscribe() { authUnsubscribed = true; } } } };
    },
    getSession: () => initial.promise,
  } };
  const cleanup = start(
    () => client,
    (callback: typeof changed) => { changed = callback; return () => { eventsUnsubscribed = true; }; },
    (next: BlockChange | null | ((previous: BlockChange | null) => BlockChange | null)) => {
      notice = typeof next === 'function' ? next(notice) : next;
    },
  ) as () => void;
  return {
    initial,
    auth(id: string) { authChanged('SIGNED_IN', id ? { user: { id } } : null); },
    event: (change: BlockChange) => changed(change),
    notice: () => notice,
    cleanup,
    unsubscribed: () => authUnsubscribed && eventsUnsubscribed,
  };
}

void test('block confirmation only accepts the current authenticated actor', async () => {
  const value = feedbackFixture();
  value.initial.resolve({ data: { session: { user: { id: actor } } }, error: null });
  await settle();
  value.event({ userId: author, blocked: true, viewerId: otherActor });
  value.event({ userId: author, blocked: true });
  assert.equal(value.notice(), null);
  value.event({ userId: author, blocked: true, viewerId: actor });
  assert.deepEqual(value.notice(), { userId: author, blocked: true, viewerId: actor });
  value.cleanup();
  assert.equal(value.unsubscribed(), true);
});

void test('an auth event wins over a late initial session response', async () => {
  const value = feedbackFixture();
  value.auth(otherActor);
  value.initial.resolve({ data: { session: { user: { id: actor } } }, error: null });
  await settle();
  value.event({ userId: author, blocked: true, viewerId: actor });
  assert.equal(value.notice(), null);
  value.event({ userId: author, blocked: true, viewerId: otherActor });
  assert.equal(value.notice()?.viewerId, otherActor);
  value.cleanup();
});

void test('logout, account switches, and matching unblocks dismiss previous confirmation', () => {
  const value = feedbackFixture();
  value.auth(actor);
  value.event({ userId: author, blocked: true, viewerId: actor });
  value.event({ userId: otherActor, blocked: false, viewerId: actor });
  assert.equal(value.notice()?.userId, author, 'Unblocking an unrelated user keeps the current notice');
  value.event({ userId: author, blocked: false, viewerId: actor });
  assert.equal(value.notice(), null);
  value.event({ userId: author, blocked: true, viewerId: actor });
  value.auth(otherActor);
  assert.equal(value.notice(), null);
  value.event({ userId: author, blocked: true, viewerId: otherActor });
  value.auth('');
  assert.equal(value.notice(), null);
  value.event({ userId: author, blocked: true, viewerId: otherActor });
  assert.equal(value.notice(), null);
  value.cleanup();
});

void test('initial-session failure and unmounted session completion do not accept notices', async () => {
  for (const mode of ['error', 'reject', 'unmount'] as const) {
    const value = feedbackFixture();
    if (mode === 'unmount') value.cleanup();
    if (mode === 'reject') value.initial.reject(new Error('Fixture Auth unavailable'));
    else value.initial.resolve({ data: { session: { user: { id: actor } } }, error: mode === 'error' ? new Error('Fixture session error') : null });
    await settle();
    value.event({ userId: author, blocked: true, viewerId: actor });
    assert.equal(value.notice(), null);
    value.cleanup();
  }
});

function blockFixture(viewerId = actor, authorId = author) {
  const ast = parse(control);
  const action = find(ast, (node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === 'blockAuthor');
  const javascript = stripTypeScriptTypes(action.getText(ast)) + '\nreturn blockAuthor;';
  const pending = deferred<unknown>();
  const viewerRef = { current: viewerId };
  const contextVersion = { current: 1 };
  const blockingRef = { current: false };
  const calls: unknown[] = [];
  const notices: unknown[] = [];
  let busy = false;
  let message = '';
  let login = false;
  const dependencies = {
    authorId, viewerId, viewerRef, contextVersion, blockingRef, locale: 'it',
    targetType: 'USER', targetId: author,
    setBlocking: (next: boolean) => { busy = next; },
    setBlockMessage: (next: string) => { message = next; },
    setBlockNeedsLogin: (next: boolean) => { login = next; },
    viewerRequest: (...args: unknown[]) => { calls.push(args); return pending.promise; },
    notifyBlockChange: (...args: unknown[]) => { notices.push(args); },
    communityError: (_locale: string, error: Error) => error.message,
    AccountRequestError,
  };
  const actionFn = compileFunction(javascript, Object.keys(dependencies))(...Object.values(dependencies)) as () => Promise<void>;
  return { pending, viewerRef, contextVersion, blockingRef, calls, notices, run: actionFn, status: () => ({ busy, message, login }) };
}

void test('block action sends one bound request and announces success only after acknowledgement', async () => {
  const value = blockFixture();
  const first = value.run();
  const duplicate = value.run();
  assert.equal(value.calls.length, 1);
  assert.equal(value.status().busy, true);
  assert.deepEqual(value.notices, []);
  const [path, id, options] = value.calls[0] as [string, string, { method: string; body: string }];
  assert.equal(path, '/api/blocks');
  assert.equal(id, actor);
  assert.equal(options.method, 'POST');
  assert.deepEqual(JSON.parse(options.body), { userId: author, blocked: true, contextTargetType: 'USER', contextTargetId: author });
  value.pending.resolve({ saved: true });
  await Promise.all([first, duplicate]);
  assert.deepEqual(value.notices, [[author, true, actor]]);
  assert.equal(value.status().busy, false);
  assert.equal(value.blockingRef.current, false);
});

void test('self blocks send no request and failed blocks never announce success', async () => {
  const own = blockFixture(actor, actor);
  await own.run();
  assert.deepEqual(own.calls, []);
  for (const error of [new Error('Fixture failure'), new AccountRequestError('Accedi', 401, 'AUTH_REQUIRED')]) {
    const value = blockFixture();
    const done = value.run();
    value.pending.reject(error);
    await done;
    assert.deepEqual(value.notices, []);
    assert.equal(value.status().message, error.message);
    assert.equal(value.status().login, error instanceof AccountRequestError);
    assert.equal(value.status().busy, false);
  }
});

void test('late block completions cannot update a new viewer, target, or unmounted control', async () => {
  for (const change of ['viewer', 'context'] as const) {
    const value = blockFixture();
    const done = value.run();
    if (change === 'viewer') value.viewerRef.current = otherActor;
    else value.contextVersion.current++;
    value.pending.resolve({ saved: true });
    await done;
    assert.deepEqual(value.notices, []);
  }
  assert.match(control, /return \(\) => \{ contextVersion\.current \+= 1; \}/);
  assert.match(control, /\}, \[viewerId, targetType, targetId, contextMessageId, authorId\]\)/);
});

void test('own public profile replaces messaging and reporting with profile management', () => {
  assert.match(profile, /const isOwnProfile = Boolean\(viewerId && profile\?\.id === viewerId\)/);
  assert.match(profile, /\{isOwnProfile && \([\s\S]*?\{safety\.ownProfile\}/);
  assert.match(profile, /\{isOwnProfile \? \([\s\S]*?href="\/profile\/me"[\s\S]*?\{safety\.manageProfile\}[\s\S]*?: \([\s\S]*?href=\{'\/inbox\/' \+ profile\.id\}/);
  assert.match(profile, /\{!isOwnProfile && <ReportButton[^>]*viewerId=\{viewerId\}/);
  assert.match(source('components/profile-directory.tsx'), /\{p\.id === viewerId && \([\s\S]*?\{safety\.you\}/);
});

void test('other users have a labeled block button with visible effect explanation', () => {
  assert.match(control, /authorId && authorId !== viewerId && \([\s\S]*?<button[\s\S]*?onClick=\{\(\) => void blockAuthor\(\)\}[\s\S]*?min-h-11[\s\S]*?\{blocking \? safety\.working : safety\.block\}/);
  assert.match(control, /authorId && authorId !== viewerId && <p[^>]*>\{blockCopy\.help\}/);
  assert.match(control, /\{blockMessage && <p role="alert"/);
  assert.match(control, /\{blockNeedsLogin && \([\s\S]*?href="\/auth\/login"/);
});

void test('confirmation is outside route content and survives removal of a blocked profile or post', () => {
  assert.match(source('app/layout.tsx'), /<TermsConsentGate>\{children\}<BlockFeedback \/><\/TermsConsentGate>/);
  const mobile = source('mobile/main.tsx');
  assert.equal((mobile.match(/<BlockFeedback \/>/g) ?? []).length, 1);
  assert.ok(mobile.indexOf('<BlockFeedback />') > mobile.indexOf('</Suspense>'));
  assert.doesNotMatch(profile, /<BlockFeedback/);
  assert.doesNotMatch(source('app/community/page.tsx'), /<BlockFeedback/);
  assert.match(feedback, /href="\/safety\?view=blocked"/);
  assert.match(feedback, /role="status"/);
  assert.match(feedback, /onClick=\{\(\) => setNotice\(null\)\}/);
});

void test('blocked profiles and the confirmation retain a reachable unblock path', () => {
  assert.match(profile, /blockedIds\.has\(username\) \? \([\s\S]*?\{safety\.blockedTitle\}[\s\S]*?href="\/safety"/);
  assert.match(safety, /useSearchParams\(\)\.get\('view'\) === 'blocked'/);
  assert.match(safety, /blockedHeadingRef\.current\?\.scrollIntoView/);
  assert.match(safety, /blockedHeadingRef\.current\?\.focus/);
  assert.match(safety, /<h2 ref=\{blockedHeadingRef\} tabIndex=\{-1\} id="safety-blocked-heading"/);
  assert.match(safety, /setConfirmation\(\{ profile, blocked: false \}\)/);
});

void test('all supported languages describe ownership, block effects, and recovery', () => {
  for (const locale of ['it', 'en', 'fr', 'de', 'es'] as const) {
    for (const copy of [profileSafetyMessages[locale], blockFeedbackMessages[locale]]) {
      for (const text of Object.values(copy)) assert.ok(typeof text === 'string' && text.trim().length > 0);
    }
  }
  assert.match(blockFeedbackMessages.it.saved, /nascosti[\s\S]*messaggi[\s\S]*moderatori[\s\S]*Utenti bloccati/);
});
