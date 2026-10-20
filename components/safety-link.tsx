'use client';

import { ShieldCheck, ChevronRight } from 'lucide-react';
import Link from '@/components/app-link';
import { useI18n } from '@/components/i18n-provider';

const labels = {
  it: ['Segnala o blocca un utente', 'Cerca un utente e gestisci i tuoi blocchi'],
  en: ['Report or block a user', 'Find a user and manage your blocked users'],
  fr: ['Signaler ou bloquer un utilisateur', 'Recherchez un utilisateur et gérez vos blocages'],
  de: ['Nutzer melden oder blockieren', 'Nutzer suchen und Blockierungen verwalten'],
  es: ['Denunciar o bloquear a un usuario', 'Busca un usuario y gestiona tus bloqueos'],
};

export function SafetyLink() {
  const { locale } = useI18n();
  const [title, description] = labels[locale];
  return <Link href="/safety" className="flex min-h-14 items-center gap-3 rounded-2xl border border-violet-300/30 bg-violet-500/10 p-4">
    <ShieldCheck className="size-5 shrink-0 text-violet-200" aria-hidden="true" />
    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-violet-100">{title}</span><span className="mt-1 block text-xs leading-relaxed text-white/65">{description}</span></span>
    <ChevronRight className="size-4 shrink-0 text-white/60" aria-hidden="true" />
  </Link>;
}
