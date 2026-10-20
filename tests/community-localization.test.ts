import assert from 'node:assert/strict';
import test from 'node:test';
import { communityError, communityTranslator } from '../lib/i18n/community.ts';
import {
  exploreDiscoveries,
  filterExploreDiscoveries,
} from '../lib/explore-data.ts';

void test('discovery search matches the displayed French section without changing stored section IDs', () => {
  const t = communityTranslator('fr');
  const cards = exploreDiscoveries.map((item) => ({
    ...item,
    title: t(item.title),
    meta: t(item.meta),
  }));
  const sellers = filterExploreDiscoveries(cards, 'Per te', 'vendeurs', t);
  assert.ok(sellers.some((item) => item.section === 'Creator'));
  assert.equal(
    filterExploreDiscoveries(cards, 'Creator', 'personnes', t)[0]?.href,
    '/explore?section=Creator',
  );
  assert.equal(
    filterExploreDiscoveries(cards, 'Prodotti', 'figurines', t)[0]?.section,
    'Prodotti',
  );
});

void test('category and people labels are available in all five supported languages', () => {
  const expected = {
    it: ['Persone e venditori', 'Carte collezionabili'],
    en: ['People & sellers', 'Trading cards'],
    fr: ['Personnes et vendeurs', 'Cartes à collectionner'],
    de: ['Personen & Verkäufer', 'Sammelkarten'],
    es: ['Personas y vendedores', 'Cartas coleccionables'],
  } as const;
  for (const locale of ['it', 'en', 'fr', 'de', 'es'] as const) {
    const t = communityTranslator(locale);
    assert.deepEqual([t('Creator'), t('Cards')], expected[locale]);
    assert.notEqual(t('Pubblicazione non riuscita.'), '');
  }
});

void test('authentication and network errors are localized with a useful generic fallback', () => {
  assert.equal(
    communityError('es', new Error('Accedi per inviare messaggi.')),
    'Inicia sesión para continuar.',
  );
  assert.equal(
    communityError('fr', new Error('Accedi per continuare.')),
    'Connectez-vous pour continuer.',
  );
  assert.equal(
    communityError(
      'en',
      new Error('Unexpected backend response'),
      'Caricamento non riuscito.',
    ),
    'Could not load. Please try again.',
  );
  assert.equal(
    communityTranslator('fr')('An original user caption'),
    'An original user caption',
  );
});
