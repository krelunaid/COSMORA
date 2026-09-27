import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveLocale,
  readLocalePreference,
  saveLocalePreference,
} from '../lib/i18n/config.ts';

void test('a manual language takes priority over the device language', () => {
  assert.equal(resolveLocale('it', ['fr-FR', 'en-US']), 'it');
});
void test('regional French and Spanish device preferences resolve to supported locales', () => {
  assert.equal(resolveLocale(null, ['fr-CA']), 'fr');
  assert.equal(resolveLocale(null, ['es-MX']), 'es');
  assert.equal(resolveLocale(null, ['DE_at']), 'de');
});
void test('device language order is preserved while unsupported choices are skipped', () => {
  assert.equal(resolveLocale(null, ['nl-NL', 'es-ES', 'fr-FR']), 'es');
});
void test('an invalid stored choice falls back to the device and then English', () => {
  assert.equal(resolveLocale('not-a-locale', ['it-IT']), 'it');
  assert.equal(resolveLocale(null, ['ja-JP']), 'en');
  assert.equal(resolveLocale(undefined, []), 'en');
});
void test('denied storage does not prevent locale detection or selection', () => {
  const denied = () => {
    throw new Error('SecurityError');
  };
  assert.equal(readLocalePreference(denied), null);
  assert.equal(resolveLocale(readLocalePreference(denied), ['fr-FR']), 'fr');
  assert.doesNotThrow(() => saveLocalePreference('es', denied));
});
void test('manual choices are persisted and invalid stored data is ignored', () => {
  const values = new Map<string, string>();
  const storage = () => ({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  });
  saveLocalePreference('de', storage);
  assert.equal(readLocalePreference(storage), 'de');
  values.set('cosmora_locale', 'invalid');
  assert.equal(readLocalePreference(storage), null);
});
