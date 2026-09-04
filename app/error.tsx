'use client';
import Link from '@/components/app-link';
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] items-center justify-center bg-[#080918] p-6 text-white">
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold">
          Non siamo riusciti ad aprire la pagina
        </h1>
        <p className="text-base text-white/70">
          Controlla la connessione e riprova. I dati già salvati rimangono nel
          tuo account.
        </p>
        <button
          onClick={reset}
          className="min-h-12 w-full rounded-xl bg-violet-600 text-base"
        >
          Riprova
        </button>
        <Link href="/" className="block py-3 text-center text-pink-300">
          Torna alla Home
        </Link>
      </div>
    </main>
  );
}
