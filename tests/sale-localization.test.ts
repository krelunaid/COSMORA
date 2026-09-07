import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { saleCopy, saleText } from '../lib/i18n/sale.ts';
import { supportedLocales } from '../lib/i18n/config.ts';

test('all seller messages exist in every supported language', () => {
  for (const key of Object.keys(saleCopy) as (keyof typeof saleCopy)[]) {
    assert.equal(saleCopy[key].length, supportedLocales.length);
    for (const locale of supportedLocales) assert.ok(saleText(locale, key).trim());
  }
  assert.equal(saleText('it', 'publish'), 'Pubblica annuncio');
  assert.equal(saleText('en', 'publish'), 'Publish listing');
  assert.equal(saleText('fr', 'publish'), 'Publier l’annonce');
});

test('localized labels do not change category and shipping payload values', () => {
  const sell = readFileSync(new URL('../app/sell/page.tsx', import.meta.url), 'utf8');
  assert.match(sell, /value=\{value\}/);
  assert.match(sell, /value="courier"/);
  assert.match(sell, /value="pickup"/);
  assert.match(sell, /name="shippingCost" value="0"/);
  assert.match(sell, /minLength=\{10\}/);
  assert.doesNotMatch(sell, /placeholder="Size|placeholder="Estimated delivery/);
});
