import type { EuropeEvent } from './events-data';

export const EVENT_TIME_ZONE = 'Europe/Rome';
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: EVENT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

/** Catalog dates are inclusive calendar days in the event calendar's time zone. */
export function eventDay(now = new Date()): string {
  const parts = dayFormatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function selectFeaturedEvent(events: readonly EuropeEvent[], today: string): EuropeEvent | undefined {
  // Sort a copy so selection never changes the shared catalog. Ongoing events
  // take precedence; the first start date then gives stable, chronological order.
  return events.filter((event) => event.end >= today).sort((a, b) => {
    const aOngoing = a.start <= today;
    const bOngoing = b.start <= today;
    return Number(bOngoing) - Number(aOngoing) || a.start.localeCompare(b.start) || a.name.localeCompare(b.name);
  })[0];
}

/** Find the next local midnight, including the 23/25-hour daylight-saving days. */
export function millisecondsUntilNextEventDay(now = new Date()): number {
  const currentDay = eventDay(now);
  const start = now.getTime();
  let low = start;
  let high = start + 27 * 60 * 60 * 1000;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (eventDay(new Date(middle)) === currentDay) low = middle;
    else high = middle;
  }
  return high - start;
}

export function formatEventDates(event: Pick<EuropeEvent, 'start' | 'end'>, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return formatter.formatRange(new Date(`${event.start}T12:00:00Z`), new Date(`${event.end}T12:00:00Z`));
}
