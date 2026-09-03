import type { AnchorHTMLAttributes, ReactNode } from 'react';

type AppLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  children?: ReactNode;
  prefetch?: boolean;
};

/**
 * Vinext's client router currently throws during transitions inside the iOS
 * webview. A normal document navigation is reliable and is served immediately
 * by the app's service-worker cache after the first shell install.
 */
export default function AppLink({ prefetch: _prefetch, href, ...props }: AppLinkProps) {
  return <a href={href} {...props} />;
}
