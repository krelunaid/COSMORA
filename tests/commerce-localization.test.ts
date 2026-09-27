import assert from 'node:assert/strict';
import test from 'node:test';
import { commerceCategory } from '../lib/i18n/commerce.ts';
import { checkoutErrorText } from '../lib/i18n/checkout.ts';

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
    /second refund will not be created/,
  );
});
