import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { Link } from 'react-router';

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string | { pathname?: string; query?: Record<string, string>; hash?: string };
  replace?: boolean;
  prefetch?: boolean | null;
  scroll?: boolean;
};

export default forwardRef<HTMLAnchorElement, Props>(function MobileLink(
  { href, prefetch: _prefetch, scroll: _scroll, replace, ...props }, ref,
) {
  const to = typeof href === 'string' ? href : `${href.pathname ?? ''}${href.query ? '?' + new URLSearchParams(href.query) : ''}${href.hash ?? ''}`;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(to)) return <a {...props} ref={ref} href={to} />;
  return <Link {...props} ref={ref} to={to} replace={replace} />;
});
