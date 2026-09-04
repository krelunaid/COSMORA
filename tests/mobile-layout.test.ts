import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  exploreDiscoveries,
  exploreSections,
  filterExploreDiscoveries,
} from '../lib/explore-data.ts';
import { messages } from '../lib/i18n/messages.ts';
import {
  DISCOVERY_CARD_CHROME,
  DISCOVERY_GRID_COLUMNS,
  isCompleteDiscoveryCard,
  MOBILE_NAV_ITEM_COUNT,
  MOBILE_NAV_BAR_INLINE_STYLE,
  MOBILE_NAV_POSITION_CLASS,
  nativeNavBarCssResets,
  PHONE_SHELL_MAX_WIDTH_CLASS,
  PHONE_SHELL_MAX_WIDTH_PX,
  usesConflictingNavCentering,
} from '../lib/mobile-layout.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

void test('keeps one 430px shell width and inset-centered nav', () => {
  assert.equal(PHONE_SHELL_MAX_WIDTH_PX, 430);
  assert.equal(PHONE_SHELL_MAX_WIDTH_CLASS, 'max-w-[430px]');
  assert.equal(MOBILE_NAV_ITEM_COUNT, 5);
  assert.equal(usesConflictingNavCentering(MOBILE_NAV_POSITION_CLASS), false);
  assert.match(MOBILE_NAV_POSITION_CLASS, /inset-x-0/);
  assert.match(MOBILE_NAV_POSITION_CLASS, /translate-none/);
  assert.deepEqual(MOBILE_NAV_BAR_INLINE_STYLE, {
    left: '0',
    right: '0',
    width: '100%',
    transform: 'none',
    translate: 'none',
  });
  assert.deepEqual(nativeNavBarCssResets(), {
    left: '0',
    right: '0',
    width: '100%',
    maxWidth: 'none',
    transform: 'none',
    translate: 'none',
  });
});

void test('rejects the left-1/2 translate centering that clips iPhone tabs', () => {
  assert.equal(
    usesConflictingNavCentering(
      'fixed bottom-0 left-1/2 w-full -translate-x-1/2 max-w-[480px]',
    ),
    true,
  );
  assert.equal(usesConflictingNavCentering(MOBILE_NAV_POSITION_CLASS), false);
});

void test('Explore discoveries always expose image, label, title and meta', () => {
  assert.equal(DISCOVERY_GRID_COLUMNS, 2);
  assert.equal(DISCOVERY_CARD_CHROME.columns, 2);
  assert.ok(exploreDiscoveries.length >= 4);
  for (const card of exploreDiscoveries) {
    assert.equal(isCompleteDiscoveryCard(card), true, card.title);
  }
  const figures = exploreDiscoveries.find((card) => card.title === 'Figures');
  assert.ok(figures);
  assert.equal(figures.section, 'Prodotti');
  assert.equal(figures.meta, 'Figure e collectibles');
  assert.equal(figures.image, '/mobile-category-figures.jpg');
  const lucca = exploreDiscoveries.find(
    (card) => card.title === 'Lucca Comics & Games 2026',
  );
  assert.ok(lucca);
  assert.equal(lucca.imageFit, 'contain');
});

void test('Explore filters keep Italian section labels', () => {
  assert.deepEqual(
    [...exploreSections],
    ['Per te', 'Prodotti', 'Eventi', 'Creator', 'Crew', 'Community'],
  );
  assert.equal(
    filterExploreDiscoveries(exploreDiscoveries, 'Prodotti', '').length,
    3,
  );
  assert.equal(
    filterExploreDiscoveries(exploreDiscoveries, 'Per te', 'figures')[0]?.title,
    'Figures',
  );
  assert.equal(
    filterExploreDiscoveries(exploreDiscoveries, 'Eventi', 'xyzzy').length,
    0,
  );
});

void test('Italian tab labels stay complete', () => {
  assert.deepEqual(messages.it.nav, {
    home: 'Home',
    explore: 'Esplora',
    events: 'Eventi',
    community: 'Community',
    create: 'Crea',
    sell: 'Vendi',
    inbox: 'Messaggi',
    profile: 'Profilo',
  });
});

void test('native letterbox full-bleed and nav translate reset stay in CSS', () => {
  const css = readFileSync(join(root, 'app/globals.css'), 'utf8');
  assert.match(
    css,
    /html\.native-capacitor \.(phone-shell|mobile-shell-frame)[\s\S]*max-width:\s*none/,
  );
  assert.match(css, /\.mobile-nav-bar\s*\{[^}]*left:\s*0/);
  assert.match(css, /\.mobile-nav-bar\s*\{[^}]*right:\s*0/);
  assert.match(css, /\.mobile-nav-bar\s*\{[^}]*width:\s*100%/);
  assert.match(css, /\.mobile-nav-bar\s*\{[^}]*transform:\s*none/);
  assert.match(css, /\.mobile-nav-bar\s*\{[^}]*translate:\s*none/);
  assert.match(
    css,
    /html\.native-capacitor \.mobile-nav-bar\s*\{[^}]*translate:\s*none/,
  );
  assert.match(
    css,
    /html\.native-capacitor \.mobile-nav-bar\s*\{[^}]*transform:\s*none/,
  );
  assert.match(
    css,
    /html\.native-capacitor \.mobile-nav-bar\s*\{[^}]*left:\s*0/,
  );
  assert.doesNotMatch(css, /letterbox/);
});

void test('shell and Explore markup no longer use the 480 / translate pair', () => {
  const shell = readFileSync(join(root, 'components/mobile-shell.tsx'), 'utf8');
  const explore = readFileSync(join(root, 'app/explore/page.tsx'), 'utf8');
  assert.doesNotMatch(shell, /left-1\/2/);
  assert.doesNotMatch(shell, /-translate-x-1\/2/);
  assert.doesNotMatch(shell, /max-w-\[480px\]/);
  assert.doesNotMatch(shell, /wide\s*=/);
  assert.match(shell, /MOBILE_NAV_POSITION_CLASS/);
  assert.match(shell, /MOBILE_NAV_BAR_INLINE_STYLE/);
  assert.match(shell, /PHONE_SHELL_MAX_WIDTH_CLASS/);
  assert.doesNotMatch(explore, /max-w-\[480px\]/);
  assert.doesNotMatch(explore, /wide/);
  assert.match(explore, /discovery-grid/);
  assert.match(explore, /discovery-card/);
  assert.match(explore, /discovery-card-media/);
  assert.match(explore, /line-clamp-2/);
  assert.match(explore, /aspect-\[5\/4\]/);
  assert.match(explore, /bodyHeightClass/);
  assert.match(explore, /imageFit/);
});
