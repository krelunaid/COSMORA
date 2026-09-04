import Link from '@/components/app-link';
import { MobileShell, MobileNav } from '@/components/mobile-shell';
export default function NotFound() {
  return (
    <MobileShell className="flex flex-col">
      <section className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
        <h1 className="text-2xl font-semibold">Pagina non trovata</h1>
        <p className="text-base text-white/70">
          Il contenuto potrebbe essere stato spostato o rimosso.
        </p>
        <Link href="/explore" className="rounded-xl bg-violet-600 p-4">
          Torna a Esplora
        </Link>
      </section>
      <MobileNav active="explore" />
    </MobileShell>
  );
}
