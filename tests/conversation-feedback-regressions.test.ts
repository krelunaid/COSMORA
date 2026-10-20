import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/real-conversation.tsx', import.meta.url), 'utf8');
const block = source.slice(source.indexOf('async function blockUser('), source.indexOf('  useEffect(() => {', source.indexOf('async function blockUser(')));
const load = source.slice(source.indexOf('async function load()'), source.indexOf('  async function send('));
const send = source.slice(source.indexOf('async function send('), source.indexOf('  return (', source.indexOf('async function send(')));

void test('successful background polling only clears loading errors, preserving action failures', () => {
  assert.match(source, /\[loadError, setLoadError\] = useState<ConversationError \| null>\(null\)/);
  assert.match(source, /\[actionError, setActionError\] = useState<ConversationError \| null>\(null\)/);
  assert.match(source, /const error = actionError \?\? loadError/);
  assert.match(load, /setLoadError\(null\)/);
  assert.match(load, /setLoadError\(\{[\s\S]*?Caricamento non riuscito/);
  assert.doesNotMatch(load, /setActionError|setBlockNotice|setError/);
});

void test('block and unblock clear previous action feedback before the request', () => {
  const request = block.indexOf("await viewerRequest('/api/blocks'");
  for (const update of ['setActionError(null)', "setBlockNotice('')"]) {
    assert.ok(block.indexOf(update) >= 0 && block.indexOf(update) < request);
  }
  assert.match(block, /await viewerRequest\([\s\S]*?setBlockNotice\([\s\S]*?Utente sbloccato/);
  assert.match(block, /catch \(reason\) \{\s*if \(viewerRef\.current !== actor\) return;\s*setActionError/);
  assert.doesNotMatch(block.slice(block.indexOf('catch (reason)')), /setBlockNotice\(/);
  assert.doesNotMatch(block, /setLoadError/);
});

void test('message actions share a synchronous guard and release it on success or failure', () => {
  assert.match(source, /const mutationInFlight = useRef\(false\)/);
  for (const action of [block, send]) {
    assert.match(action, /if \(mutationInFlight\.current(?: \|\| !draft\.trim\(\))?\) return/);
    assert.ok(action.indexOf('mutationInFlight.current = true') < action.indexOf('await viewerRequest'));
    assert.match(action, /finally \{\s*mutationInFlight\.current = false/);
  }
  assert.match(block, /setBlocking\(true\)/);
  assert.match(block, /finally \{\s*mutationInFlight\.current = false;\s*setBlocking\(false\)/);
  assert.equal((source.match(/disabled=\{blocking \|\| sending\}/g) ?? []).length, 2);
  assert.match(source, /disabled=\{sending \|\| blocking \|\| !draft\.trim\(\) \|\| !userId\}/);
});

void test('login is offered only for typed HTTP 401 errors, including after a prior successful load', () => {
  assert.equal((source.match(/needsLogin: reason instanceof AccountRequestError && reason\.status === 401/g) ?? []).length, 3);
  assert.match(source, /\{error\.needsLogin && \([\s\S]*?href="\/auth\/login"/);
  assert.doesNotMatch(source, /\{!userId && \(|message\.startsWith\('Accedi'\)/);
  assert.match(source, /<output[^>]*>\{error\.message\}<\/output>/);
});

void test('a new send clears old block notices while preserving an unsuccessful draft and request id', () => {
  const request = send.indexOf("await viewerRequest('/api/messages'");
  assert.ok(send.indexOf("setBlockNotice('')") < request);
  assert.ok(send.indexOf('setActionError(null)') < request);
  assert.match(send, /const id = pendingId \|\| crypto\.randomUUID\(\)/);
  const failure = send.slice(send.indexOf('catch (reason)'));
  assert.match(failure, /setActionError\(/);
  assert.doesNotMatch(failure, /setDraft\(|setPendingId\(|setLoadError\(/);
});

void test('polling cleanup and mounted input behaviour remain intact', () => {
  assert.match(load, /if \(active\)[\s\S]*?setLoadError/);
  assert.match(load, /return \(\) => \{\s*active = false;\s*clearTimeout\(timer\)/);
  assert.match(source, /<Conversation key=\{peer\} peer=\{peer\}/);
  assert.match(source, /onSubmit=\{send\}/);
  assert.match(source, /value=\{draft\}/);
  assert.doesNotMatch(source, /action=\{send\}|\.reset\(\)/);
});
