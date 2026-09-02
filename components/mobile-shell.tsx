'use client';

import { useState } from 'react';
import Link from '@/components/app-link';
import {
  Camera,
  Compass,
  Home,
  Inbox,
  Plus,
  ShoppingBag,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { localeLabels, supportedLocales, type Locale } from '@/lib/i18n/config';

export function MobileShell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className="min-h-dvh bg-[#04050d] text-white">
      <div
        className={`mx-auto min-h-dvh w-full max-w-[430px] overflow-hidden border-white/10 bg-[#080918] pt-[env(safe-area-inset-top)] sm:my-3 sm:min-h-[calc(100dvh-1.5rem)] sm:rounded-[34px] sm:border sm:pt-0 ${className}`}
      >
        {children}
      </div>
    </main>
  );
}

export function MobileNav({
  active,
  wide = false,
}: {
  active: 'home' | 'explore' | 'sell' | 'inbox' | 'profile';
  wide?: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const { locale, setLocale, messages } = useI18n();
  const links = [
    { key: 'home', label: messages.nav.home, href: '/', icon: Home },
    {
      key: 'explore',
      label: messages.nav.explore,
      href: '/explore',
      icon: Compass,
    },
    { key: 'create', label: messages.nav.create, href: '#create', icon: Plus },
    { key: 'inbox', label: messages.nav.inbox, href: '/inbox', icon: Inbox },
    {
      key: 'profile',
      label: messages.nav.profile,
      href: '/profile/stardust-atelier',
      icon: UserRound,
    },
  ] as const;
  return (
    <>
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm"
          onClick={() => setCreateOpen(false)}
        >
          <section
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-[430px] rounded-t-[28px] border border-white/10 bg-[#101122] p-4 pb-7 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-base font-semibold">Crea</p>
                <p className="text-[9px] text-white/45">
                  Scegli cosa vuoi fare.
                </p>
              </div>
              <button
                onClick={() => setCreateOpen(false)}
                aria-label="Close create menu"
                className="grid size-9 place-items-center rounded-full bg-white/5"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2">
              <CreateAction
                href="/community/create"
                icon={Camera}
                title="Post"
                description="Condividi cosplay, collezioni e momenti."
              />
              <CreateAction
                href="/sell"
                icon={ShoppingBag}
                title="Vendi"
                description="Pubblica un prodotto nel marketplace."
              />
              <CreateAction
                href="/squads/create"
                icon={UsersRound}
                title="Crew cosplay / Incontro"
                description="Forma una crew di personaggi oppure organizza un ritrovo pubblico."
              />
            </div>
            <label className="mt-4 flex items-center justify-between border-t border-white/8 pt-4 text-[9px] text-white/50">
              App language
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
                className="h-9 rounded-lg border border-white/10 bg-[#17172b] px-3 text-[10px] text-white"
              >
                {supportedLocales.map((item) => (
                  <option key={item} value={item}>
                    {localeLabels[item]}
                  </option>
                ))}
              </select>
            </label>
          </section>
        </div>
      )}
      <div
        aria-hidden="true"
        className="h-[calc(64px+env(safe-area-inset-bottom))] shrink-0"
      />
      <nav
        className={`${wide ? 'max-w-[480px]' : 'max-w-[430px]'} fixed bottom-0 left-1/2 z-40 grid h-[calc(64px+env(safe-area-inset-bottom))] w-full -translate-x-1/2 grid-cols-5 border-t border-white/10 bg-[#080918]/98 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:bottom-3 sm:h-16 sm:rounded-b-[34px] sm:pb-0`}
        aria-label="Main navigation"
      >
        {links.map(({ key, label, href, icon: Icon }) =>
          key === 'create' ? (
            <button
              key={key}
              onClick={() => setCreateOpen(true)}
              className="flex touch-manipulation flex-col items-center justify-center gap-1 text-[11px] font-medium text-fuchsia-300"
            >
              <span className="grid size-8 place-items-center rounded-full border border-violet-400/40 bg-gradient-to-br from-pink-500 to-violet-600 shadow-lg shadow-fuchsia-500/20">
                <Icon className="size-5" />
              </span>
              <span>{label}</span>
            </button>
          ) : (
            <Link
              key={key}
              href={href}
              className={`flex touch-manipulation flex-col items-center justify-center gap-1 text-[11px] font-medium ${active === key ? 'text-fuchsia-300' : 'text-white/60'}`}
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </Link>
          ),
        )}
      </nav>
    </>
  );
}

function CreateAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Camera;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#17172b] p-4"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-500/12">
        <Icon className="size-5 text-violet-300" />
      </span>
      <span>
        <b className="block text-xs uppercase tracking-wide">{title}</b>
        <small className="mt-1 block text-[9px] text-white/45">
          {description}
        </small>
      </span>
      <span className="ml-auto text-white/30">›</span>
    </Link>
  );
}

export function ScreenHeader({
  title,
  back = '/',
  action,
}: {
  title: string;
  back?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/8 px-4">
      <Link href={back} aria-label="Back" className="text-xl">
        ‹
      </Link>
      <h1 className="text-[18px] font-semibold">{title}</h1>
      <div className="min-w-5 text-right">{action}</div>
    </header>
  );
}

export function SellerChip() {
  return (
    <Link href="/profile/stardust-atelier" className="flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-pink-400 to-violet-600 text-[9px] font-bold">
        SA
      </span>
      <span>
        <b className="block text-[10px]">Stardust Atelier</b>
        <small className="block text-[8px] text-white/45">
          Verified Seller
        </small>
      </span>
    </Link>
  );
}
