/** Shared phone-frame width for web preview and in-flow desktop chrome. */
export const PHONE_SHELL_MAX_WIDTH_PX = 430;

export const MOBILE_NAV_ITEM_COUNT = 5;

export const DISCOVERY_GRID_COLUMNS = 2;

export const DISCOVERY_CARD_CHROME = {
  columns: DISCOVERY_GRID_COLUMNS,
  imageAspect: '5 / 4',
  titleLines: 2,
  metaLines: 2,
  bodyHeightClass: 'h-[5.75rem]',
} as const;

export const PHONE_SHELL_MAX_WIDTH_CLASS = `max-w-[${PHONE_SHELL_MAX_WIDTH_PX}px]`;

/**
 * Center the tab bar with left/right insets. Do not use `left-1/2` plus
 * `-translate-x-1/2`: native full-bleed CSS sets `left: 0` and Tailwind v4
 * applies `translate` (not `transform`), which shifts the bar off-screen.
 */
export const MOBILE_NAV_POSITION_CLASS =
  'inset-x-0 mx-auto w-full translate-none';

export function usesConflictingNavCentering(className: string) {
  const usesHalfLeft = /(^|\s)left-1\/2(\s|$)/.test(className);
  const usesNegativeHalfTranslate =
    /(^|\s)-translate-x-1\/2(\s|$)/.test(className) ||
    /(^|\s)translate-x-\[-50%\](\s|$)/.test(className);
  return usesHalfLeft || usesNegativeHalfTranslate;
}

export function nativeNavBarCssResets() {
  return {
    left: '0',
    right: '0',
    maxWidth: 'none',
    transform: 'none',
    translate: 'none',
  } as const;
}

export type DiscoveryCardContent = {
  section: string;
  title: string;
  meta: string;
  image: string;
  href: string;
};

export function isCompleteDiscoveryCard(card: DiscoveryCardContent) {
  return [card.section, card.title, card.meta, card.image, card.href].every(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );
}
