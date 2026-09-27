import assert from 'node:assert/strict';
import test from 'node:test';
import { europeEvents, type EuropeEvent } from '../lib/events-data.ts';
import { eventDay, formatEventDates, millisecondsUntilNextEventDay, selectFeaturedEvent } from '../lib/event-selection.ts';

const event = (name: string, start: string, end: string): EuropeEvent => ({ name, start, end, city: 'Lucca', country: 'Italy', flag: '🇮🇹', dateLabel: '', type: 'Comics', url: 'https://example.com', image: '/event.jpg' });

test('selects the ongoing event before future events regardless of catalog order', () => {
  const events = [event('future', '2026-11-02', '2026-11-04'), event('live', '2026-10-28', '2026-11-01'), event('old', '2026-10-01', '2026-10-04')];
  assert.equal(selectFeaturedEvent(events, '2026-11-01')?.name, 'live');
  assert.deepEqual(events.map((item) => item.name), ['future', 'live', 'old']);
  assert.equal(selectFeaturedEvent(events, '2026-11-02')?.name, 'future');
});

test('selects the nearest upcoming event and handles an exhausted catalog', () => {
  assert.equal(selectFeaturedEvent(europeEvents, '2026-09-27')?.name, 'Romics Fall');
  assert.equal(selectFeaturedEvent(europeEvents, '2026-11-02')?.name, 'Heroes Dutch Comic Con Winter');
  assert.equal(selectFeaturedEvent(europeEvents, '2026-11-23')?.name, 'Manga Barcelona');
  assert.equal(selectFeaturedEvent(europeEvents, '2026-12-09'), undefined);
  assert.equal(selectFeaturedEvent([], '2026-09-27'), undefined);
});

test('keeps events through their final day in Rome even when UTC is a different day', () => {
  const events = [event('live', '2026-10-28', '2026-11-01')];
  assert.equal(eventDay(new Date('2026-11-01T22:59:59Z')), '2026-11-01');
  assert.equal(selectFeaturedEvent(events, eventDay(new Date('2026-11-01T22:59:59Z')))?.name, 'live');
  assert.equal(selectFeaturedEvent(events, eventDay(new Date('2026-11-01T23:00:00Z'))), undefined);
});

test('next refresh follows Rome midnight across daylight-saving changes', () => {
  const springMidnight = new Date('2026-03-28T23:00:00Z');
  const fallMidnight = new Date('2026-10-24T22:00:00Z');
  assert.equal(millisecondsUntilNextEventDay(springMidnight), 23 * 60 * 60 * 1000);
  assert.equal(millisecondsUntilNextEventDay(fallMidnight), 25 * 60 * 60 * 1000);
  assert.equal(millisecondsUntilNextEventDay(new Date('2026-11-01T22:59:59.500Z')), 500);
});

test('event date labels follow the selected language while preserving catalog dates', () => {
  const lucca = event('Lucca', '2026-10-28', '2026-11-01');
  assert.match(formatEventDates(lucca, 'fr'), /oct\./);
  assert.match(formatEventDates(lucca, 'it'), /ott/);
  assert.match(formatEventDates(lucca, 'de'), /Okt/);
  assert.equal(lucca.start, '2026-10-28');
});
