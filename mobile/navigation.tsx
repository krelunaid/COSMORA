import { useMemo } from 'react';
import { useLocation, useNavigate, useParams as useRouteParams, useSearchParams as useRouteSearchParams } from 'react-router';

export function useRouter() {
  const navigate = useNavigate();
  return useMemo(() => ({
    push: (href: string) => { void navigate(href); },
    replace: (href: string) => { void navigate(href, { replace: true }); },
    back: () => { void navigate(-1); },
    forward: () => { void navigate(1); },
    refresh: () => window.location.reload(),
    prefetch: () => {},
  }), [navigate]);
}
export function useSearchParams() { return useRouteSearchParams()[0]; }
export function useParams<T extends Record<string, string | string[]> = Record<string, string>>() {
  return useRouteParams() as T;
}
export function usePathname() { return useLocation().pathname; }
