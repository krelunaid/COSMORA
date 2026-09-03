'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';

type AppLinkProps = ComponentProps<typeof NextLink>;

/** Keep the app mounted without preloading every destination on mobile. */
export default function AppLink({ prefetch = false, ...props }: AppLinkProps) {
  return <NextLink prefetch={prefetch} {...props} />;
}
