import assert from 'node:assert/strict';
import test from 'node:test';
import { orderStatusLabel } from '../lib/order-status.ts';

test('refunds and failed payments are not described as pending', () => {
  assert.equal(orderStatusLabel('refunded'), 'Rimborsato');
  assert.equal(orderStatusLabel('partially_refunded'), 'Rimborso parziale');
  assert.equal(orderStatusLabel('failed'), 'Pagamento non riuscito');
  assert.match(orderStatusLabel('unexpected'), /assistenza/);
});
