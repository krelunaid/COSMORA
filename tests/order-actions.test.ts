import assert from 'node:assert/strict';
import test from 'node:test';
import { orderActionPatch } from '../lib/order-actions.ts';
const order = { buyer_id: 'buyer', seller_id: 'seller', status: 'paid', fulfillment_status: 'awaiting_shipment', issue_opened_at: null };
const ship = { action: 'ship' as const, carrier: 'Corriere', trackingNumber: '12345' };
test('only seller ships, only buyer confirms receipt', () => {
  assert.equal(orderActionPatch(order, 'seller', ship, '').fulfillment_status, 'shipped');
  assert.throws(() => orderActionPatch(order, 'buyer', ship, ''));
  assert.throws(() => orderActionPatch(order, 'seller', { action: 'received' }, ''));
  assert.throws(() => orderActionPatch(order, 'buyer', { action: 'received' }, ''));
  assert.equal(orderActionPatch({ ...order, fulfillment_status: 'shipped' }, 'buyer', { action: 'received' }, '').fulfillment_status, 'delivered');
});
test('unpaid/refunded orders cannot ship and open issues block shipping', () => {
  for (const status of ['pending', 'refunded', 'failed']) assert.throws(() => orderActionPatch({ ...order, status }, 'seller', ship, ''));
  assert.throws(() => orderActionPatch({ ...order, issue_opened_at: 'now' }, 'seller', ship, ''));
});
test('buyer can report a problem without declaring an automatic refund', () => {
  assert.deepEqual(orderActionPatch(order, 'buyer', { action: 'report', reason: 'Articolo non ricevuto' }, 'now'), { issue_reason: 'Articolo non ricevuto', issue_opened_at: 'now' });
  assert.throws(() => orderActionPatch(order, 'outsider', { action: 'report', reason: 'test' }, ''));
});
