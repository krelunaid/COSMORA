import assert from 'node:assert/strict';
import test from 'node:test';
import { postHashtags } from '../lib/community-feed.ts';

void test('tags preserve international author text and deduplicate case variants', () => {
  assert.deepEqual(postHashtags('Un cosplay #Lucca #LUCCA\n#café #漫画 #cosplay_2026'),
    ['#lucca', '#café', '#漫画', '#cosplay_2026']);
});

void test('plain descriptions, URL fragments and bare hashes do not invent topics', () => {
  assert.deepEqual(postHashtags('Carissime carte e manga https://example.invalid/#cards # #!'), []);
});

void test('a long tag is never silently truncated into a different topic', () => {
  assert.deepEqual(postHashtags('#' + 'a'.repeat(41) + ' #ok'), ['#ok']);
  assert.deepEqual(postHashtags('#' + 'a'.repeat(40)), ['#' + 'a'.repeat(40)]);
});
