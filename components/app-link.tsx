'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';

type AppLinkProps = ComponentProps<typeof NextLink>;

/** Keep the app mounted and change pages through Vinext's client router. */
export default function AppLink({ prefetch = true, ...props }: AppLinkProps) {
  return <NextLink prefetch={prefetch} {...props} />;
}
