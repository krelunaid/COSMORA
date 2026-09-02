'use client';

import { useEffect } from 'react';
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';

const prefetchedRoutes = new Set<string>();
let corePrefetchScheduled = false;
const coreRoutes = [
  '/',
  '/explore',
  '/sell',
  '/inbox',
  '/profile/stardust-atelier',
  '/marketplace',
  '/events',
];

function prefetchRoute(href: string) {
  if (!href.startsWith('/') || prefetchedRoutes.has(href)) return;
  prefetchedRoutes.add(href);
  void fetch(href, { credentials: 'same-origin', cache: 'force-cache' }).catch(
    () => undefined,
  );
}

type AppLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

/**
 * Uses normal document navigation so links work consistently in the hosted
 * site and inside the iOS WebView, without relying on RSC client routing.
 */
export default function AppLink({
  href,
  children,
  onClick,
  onPointerEnter,
  onTouchStart,
  ...props
}: AppLinkProps) {
  useEffect(() => {
    if (corePrefetchScheduled) return;
    corePrefetchScheduled = true;
    const schedule = window.requestIdleCallback ?? ((callback) => window.setTimeout(callback, 700));
    const handle = schedule(() => coreRoutes.forEach(prefetchRoute));
    return () => {
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, []);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !href.startsWith('/')
    ) {
      return;
    }

    event.preventDefault();
    document.documentElement.dataset.navigating = 'true';
    window.location.assign(href);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      onPointerEnter={(event) => {
        prefetchRoute(href);
        onPointerEnter?.(event);
      }}
      onTouchStart={(event) => {
        prefetchRoute(href);
        onTouchStart?.(event);
      }}
      {...props}
    >
      {children}
    </a>
  );
}
