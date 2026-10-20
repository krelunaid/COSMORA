import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCategorySearchSuggestions,
  MARKET_CATEGORY_IDS,
  resolveMarketCategory,
} from '../lib/marketplace-categories.ts';
import {
  categoryPageCopy,
  categoryPageText,
} from '../lib/i18n/category-pages.ts';
import { supportedLocales } from '../lib/i18n/config.ts';

void test('known URL category IDs resolve to the stored listing categories', () => {
  for (const category of MARKET_CATEGORY_IDS) {
    assert.equal(resolveMarketCategory(category), category);
  }
  assert.equal(resolveMarketCategory('All'), 'All');
});

void test('invalid URL categories cannot introduce arbitrary filters or object keys', () => {
  for (const value of [
    null,
    undefined,
    '',
    'comics',
    'Manga e fumetti',
    'Comics,price.lt.0',
    '__proto__',
    'constructor',
    'toString',
    ['Comics'],
    { toString: () => 'Comics' },
  ]) {
    assert.equal(resolveMarketCategory(value), 'All');
    assert.deepEqual(getCategorySearchSuggestions(value), []);
  }
});

void test('search suggestions belong to the chosen category and do not become global category buttons', () => {
  assert.deepEqual(getCategorySearchSuggestions('Comics'), [
    'One Piece', 'Naruto', 'Dragon Ball', 'Marvel', 'DC',
  ]);
  assert.ok(getCategorySearchSuggestions('Gaming').includes('Nintendo'));
  assert.ok(!getCategorySearchSuggestions('Comics').includes('Nintendo'));
  assert.ok(getCategorySearchSuggestions('Cards').includes('Pokémon'));
  assert.ok(!getCategorySearchSuggestions('Cosplay').includes('Pokémon'));
  assert.deepEqual(getCategorySearchSuggestions('All'), []);
  for (const category of MARKET_CATEGORY_IDS) {
    const suggestions = getCategorySearchSuggestions(category);
    assert.ok(suggestions.length > 0);
    assert.equal(new Set(suggestions).size, suggestions.length);
    for (const suggestion of suggestions) {
      assert.ok(!MARKET_CATEGORY_IDS.some((id) => id === suggestion));
    }
  }
});

void test('each supported language explains the category and labels suggestions as searches', () => {
  for (const locale of supportedLocales) {
    for (const category of MARKET_CATEGORY_IDS) {
      const copy = categoryPageCopy(locale, category);
      assert.ok(copy.intro.length > 0);
      assert.ok(copy.searchPlaceholder.length > 0);
    }
    assert.ok(categoryPageText(locale, 'relatedSearches').length > 0);
    assert.ok(categoryPageText(locale, 'browseAll').length > 0);
    assert.ok(categoryPageText(locale, 'clearSearch').length > 0);
  }
  assert.equal(categoryPageCopy('it', 'Comics').searchPlaceholder, 'Titolo, serie o autore…');
  assert.equal(categoryPageText('it', 'relatedSearches'), 'Ricerche suggerite');
  assert.equal(categoryPageText('en', 'relatedSearches'), 'Suggested searches');
});
