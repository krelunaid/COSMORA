import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { commerceCategory } from '../lib/i18n/commerce.ts';
import { AccountRequestError } from '../lib/account-http.ts';
import type { Locale } from '../lib/i18n/config.ts';

// Execute the real module with the same aliased dependency used by the bundler.
// Node's strip-types runner does not resolve the app's @/ paths.
const compiled = ts.transpileModule(
  readFileSync(new URL('../lib/i18n/checkout.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const exports: { checkoutErrorText?: (locale: Locale, reason: string | Error) => string } = {};
vm.runInNewContext(compiled, {
  exports, Error,
  require(name: string) {
    assert.equal(name, '@/lib/account-http', 'Unexpected checkout dependency');
    return { AccountRequestError };
  },
});
const checkoutErrorText = exports.checkoutErrorText!;

void test('category translation only changes known category and condition values', () => {
  assert.equal(commerceCategory('fr', 'Comics'), 'Mangas et BD');
  assert.equal(commerceCategory('es', 'Like New'), 'Como nuevo');
  assert.equal(commerceCategory('fr', 'support'), 'support');
  assert.equal(
    commerceCategory('de', 'Original custom category'),
    'Original custom category',
  );
});

void test('checkout preserves payment verification and state conflict instructions in translation', () => {
  assert.equal(
    checkoutErrorText(
      'en',
      'Verifica Stripe temporaneamente non disponibile. Non ripetere il pagamento: riprova la verifica.',
    ),
    'Stripe verification is temporarily unavailable. Do not pay again: retry the status check.',
  );
  assert.equal(
    checkoutErrorText(
      'es',
      'L’ordine è cambiato: aggiorna lo stato prima di riprovare.',
    ),
    'El pedido ha cambiado. Actualiza su estado antes de volver a intentarlo.',
  );
  assert.equal(
    checkoutErrorText('fr', 'Accedi per vedere l’ordine.'),
    'Connectez-vous pour continuer.',
  );
  assert.match(
    checkoutErrorText(
      'en',
      'Esito del rimborso non verificato. Riprova lo stesso ordine: non verrà creato un secondo rimborso.',
    ),
    /could not be verified[\s\S]*Resume the same request with the same details[\s\S]*Do not create a new request/,
  );
  assert.equal(
    checkoutErrorText('en', new AccountRequestError('Private upstream diagnostic', 503, 'REFUND_UNVERIFIED')),
    checkoutErrorText('en', 'Esito del rimborso non verificato. Riprova lo stesso ordine: non verrà creato un secondo rimborso.'),
    'A coded error must retain the same safe no-duplicate-payment guidance',
  );
});
