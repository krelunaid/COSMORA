import { Mail } from 'lucide-react';
import Link from '@/components/app-link';
import { MobileShell, ScreenHeader } from '@/components/mobile-shell';

export const metadata = { title: 'Assistenza COSMORA', description: 'Contatta l’assistenza COSMORA per account, annunci e segnalazioni.' };

export default function SupportPage() {
  const subject = '[COSMORA] Richiesta di assistenza';
  const mailto = `mailto:info@kreluna.it?subject=${encodeURIComponent(subject)}`;
  return (
    <MobileShell>
      <ScreenHeader title="Assistenza" back="/profile/me" />
      <section className="space-y-6 px-5 py-6 text-base leading-relaxed">
        <div>
          <h1 className="text-2xl font-semibold">Come possiamo aiutarti?</h1>
          <p className="mt-3 text-white/75">Scrivici per problemi con l’accesso, il tuo account, gli annunci o per una segnalazione relativa a COSMORA.</p>
        </div>
        <a href={mailto} className="flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-300">
          <Mail className="size-5" aria-hidden="true" /> Contatta assistenza
        </a>
        <div className="rounded-2xl border border-white/15 bg-[#111225] p-4">
          <p className="break-all">Email: <a className="text-pink-300 underline" href={mailto}>info@kreluna.it</a></p>
          <p className="mt-3">Oggetto: <span className="text-white/80">{subject}</span></p>
          <p className="mt-3 text-white/75">Il pulsante apre la tua app di posta con l’oggetto già compilato. Se non si apre, copia indirizzo e oggetto nella tua casella email.</p>
        </div>
        <p className="text-white/75">Descrivi il problema e indica la sezione interessata e il modello del dispositivo. Puoi allegare uno screenshot, oscurando informazioni personali non necessarie.</p>
        <p className="rounded-2xl border border-amber-300/25 p-4 text-amber-100">Non inviare password, codici di accesso o dati completi della carta di pagamento.</p>
        <Link href="/account/delete" className="block min-h-12 text-pink-300 underline">Elimina il tuo account e i contenuti associati</Link>
      </section>
    </MobileShell>
  );
}
