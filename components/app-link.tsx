import type { AnchorHTMLAttributes, ReactNode } from 'react';

type AppLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

/**
 * Uses normal document navigation so links work consistently in the hosted
 * site and inside the iOS WebView, without relying on RSC client routing.
 */
export default function AppLink({ href, children, ...props }: AppLinkProps) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
