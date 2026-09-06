import test from 'node:test';
import assert from 'node:assert/strict';
import { parseShipping } from '../lib/shipping.ts';
const form = (values: Record<string, string>) => { const f = new FormData(); for (const [k,v] of Object.entries(values)) f.set(k,v); return f; };
const terms = { shippingMode: 'courier', shippingMethod: 'Corriere venditore', shippingCost: '4.95', shippingTime: 'Italia, 3–5 giorni dichiarati dal venditore' };
test('seller chooses shipping method, cost and timing', () => {
  assert.equal(parseShipping(form(terms))?.shipping_cost_cents, 495);
  assert.equal(parseShipping(form(terms))?.shipping_time, terms.shippingTime);
});
test('missing legacy terms remain unspecified, invalid charges rejected', () => {
  assert.equal(parseShipping(new FormData()), null);
  for (const shippingCost of ['', '-1', 'NaN', 'Infinity']) assert.throws(() => parseShipping(form({ ...terms, shippingCost })));
  assert.throws(() => parseShipping(form({ ...terms, shippingMode: 'pickup' })));
  assert.equal(parseShipping(form({ ...terms, shippingMode: 'pickup', shippingCost: '0' }))?.shipping_cost_cents, 0);
});
