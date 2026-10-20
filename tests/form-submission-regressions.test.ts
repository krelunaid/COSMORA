import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { AccountRequestError } from '../lib/account-http.ts';
import { readFormResponse } from '../lib/form-response.ts';

const community = readFileSync(new URL('../app/community/post/new/page.tsx', import.meta.url), 'utf8');
const report = readFileSync(new URL('../components/report-button.tsx', import.meta.url), 'utf8');
const sell = readFileSync(new URL('../app/sell/page.tsx', import.meta.url), 'utf8');
const sellerProfile = readFileSync(new URL('../app/seller/onboarding/page.tsx', import.meta.url), 'utf8');

for (const [label, source] of [['community', community], ['report', report]] as const) {
  void test(`${label} form preserves entered values after a handled submission failure`, () => {
    assert.doesNotMatch(source, /action=\{submit\}|\.reset\(\)|window\.location/);
    assert.match(source, /onSubmit=\{\(event\) => \{\s*event\.preventDefault\(\);\s*void submit\(new FormData\(event\.currentTarget\)\)/);
    assert.match(source, /instanceof AccountRequestError && (?:error|e)\.status === 401/);
    assert.match(source, /\{needsLogin && \([\s\S]*?href="\/auth\/login"/);
  });
}

void test('community distinguishes session failure from a missing session before submitting', () => {
  assert.ok(community.indexOf('if (session.error)') < community.indexOf('if (!token)'));
  assert.match(community, /if \(!token\) throw new AccountRequestError\('Accedi per continuare\.', 401, 'AUTH_REQUIRED'\)/);
  assert.match(community, /readFormResponse</);
  assert.match(community, /setPublishError\(error instanceof Error \? error : 'failed'\)/);
  assert.match(community, /communityError\(locale, publishError, 'Pubblicazione non riuscita\.'\)/);
});

for (const status of [400, 401, 403, 413, 429, 500, 503]) {
  void test(`form responses preserve HTTP ${status} and the server's explanation`, async () => {
    await assert.rejects(
      readFormResponse(Response.json({ error: 'Spiegazione del servizio.', code: 'FORM_DIAGNOSTIC' }, { status }), 'Errore generico.'),
      (error: unknown) => {
        assert.ok(error instanceof AccountRequestError);
        assert.equal(error.status, status);
        assert.equal(error.code, 'FORM_DIAGNOSTIC');
        assert.equal(error.message, 'Spiegazione del servizio.');
        assert.equal(error.status === 401, status === 401);
        return true;
      },
    );
  });
}

void test('invalid and empty server errors use a readable fallback and preserve status', async () => {
  for (const response of [
    new Response('<html>Unavailable</html>', { status: 503 }),
    Response.json({ error: ' ' }, { status: 503 }),
    Response.json({ error: { internal: 'detail' } }, { status: 503 }),
  ]) {
    await assert.rejects(readFormResponse(response, 'Servizio non disponibile.'), (error: unknown) => {
      assert.ok(error instanceof AccountRequestError);
      assert.equal(error.status, 503);
      assert.equal(error.message, 'Servizio non disponibile.');
      return true;
    });
  }
});

void test('successful form response keeps the pending-review receipt', async () => {
  const receipt = { post: { id: 'temporary', status: 'PENDING_REVIEW' } };
  assert.deepEqual(await readFormResponse(Response.json(receipt, { status: 201 }), 'Errore.'), receipt);
  await assert.rejects(readFormResponse(new Response('invalid', { status: 201 }), 'Risposta non valida.'), /Risposta non valida/);
});

void test('listing and seller profile display API errors instead of unconditional login prompts', () => {
  assert.match(sell, /await readFormResponse\(response, t\('error'\)\)/);
  assert.match(sell, /setPublishError\(error instanceof Error \? error : 'failed'\)/);
  assert.match(sell, /apiErrorText\(locale, publishError, t\('error'\)\)/);
  assert.doesNotMatch(sell, /response\.status === 400 \? t\('invalid'\) : t\('error'\)/);
  assert.match(sellerProfile, /error instanceof AccountRequestError && error\.status === 401/);
  assert.match(sellerProfile, /\{needsLogin && \([\s\S]*?href="\/auth\/login"/);
  assert.match(sellerProfile, /apiErrorText\(locale, error, t\('error'\)\)/);
});
