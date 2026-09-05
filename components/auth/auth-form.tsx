'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from '@/components/app-link';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { signInOnIOS } from '@/lib/supabase/native-auth';

type SocialProvider = 'google' | 'apple';
const schema = z.object({
  email: z.email('Inserisci un indirizzo email valido.'),
  password: z.string().min(8, 'Usa almeno 8 caratteri.'),
  displayName: z
    .string()
    .trim()
    .min(2, 'Inserisci il tuo nome pubblico.')
    .max(80)
    .optional(),
});
const authDestination =
  'https://cosmora-app.andreagadducci.chatgpt.site/profile/me';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [providers, setProviders] = useState({ google: false, apple: false });
  const [checking, setChecking] = useState(
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  );
  const isRegister = mode === 'register';
  useEffect(() => {
    const controller = new AbortController();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unavailable');
        const value = (await response.json()) as {
          external?: { google?: boolean; apple?: boolean };
        };
        if (!controller.signal.aborted)
          setProviders({
            google: value.external?.google === true,
            apple: value.external?.apple === true,
          });
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, []);
  async function signInWithSocial(provider: SocialProvider) {
    if (!providers[provider]) return;
    setStatus('loading');
    setMessage('');
    try {
      const client = getSupabaseBrowserClient();
      if (!client) throw new Error('Accesso momentaneamente non disponibile.');
      if (await signInOnIOS(provider, client)) {
        window.location.assign('/profile/me');
        return;
      }
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: authDestination },
      });
      if (error)
        throw new Error(
          'Accesso social non riuscito. Riprova oppure usa la tua email.',
        );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : 'Controlla la connessione e riprova.',
      );
      setStatus('idle');
    }
  }
  async function submit(formData: FormData) {
    setStatus('loading');
    setMessage('');
    try {
      const result = schema.safeParse({
        email: formData.get('email'),
        password: formData.get('password'),
        displayName: isRegister ? formData.get('displayName') : undefined,
      });
      if (!result.success)
        throw new Error(
          result.error.issues[0]?.message || 'Controlla i campi.',
        );
      const client = getSupabaseBrowserClient();
      if (!client) throw new Error('Accesso momentaneamente non disponibile.');
      if (isRegister) {
        const { data, error } = await client.auth.signUp({
          email: result.data.email,
          password: result.data.password,
          options: {
            emailRedirectTo: authDestination,
            data: { display_name: result.data.displayName, role: 'buyer' },
          },
        });
        if (error)
          throw new Error(
            'Registrazione non riuscita. Controlla i dati o riprova tra qualche minuto.',
          );
        if (data.session) {
          window.location.assign('/profile/me');
          return;
        }
        setMessage(
          'Controlla la tua email per confermare l’account. Se sei già registrato, torna ad Accedi o recupera la password.',
        );
        setStatus('success');
        return;
      }
      const { error } = await client.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      });
      if (error)
        throw new Error(
          'Accesso non riuscito. Controlla email e password e conferma il tuo indirizzo email.',
        );
      window.location.assign('/profile/me');
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : 'Controlla la connessione e riprova.',
      );
      setStatus('idle');
    }
  }
  return (
    <main className="auth-screen min-h-dvh bg-[#090a19] px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-[1040px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0d20] shadow-2xl lg:grid-cols-2">
        <section className="relative hidden min-h-[700px] overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between">
          <Image
            src="/cosmora-hero.jpg"
            alt=""
            fill
            sizes="520px"
            className="object-cover object-[68%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090a19] via-[#090a19]/50 to-[#090a19]/30" />
          <Link
            href="/"
            className="relative flex items-center gap-2 py-3 text-base"
          >
            <ArrowLeft className="size-5" />
            Torna a COSMORA
          </Link>
          <div className="relative">
            <p className="mb-5 text-sm uppercase tracking-[.2em] text-pink-300">
              Il tuo universo, le tue passioni
            </p>
            <h2 className="text-4xl font-semibold leading-tight">
              Trova la tua crew.
              <br />
              Dai vita alle tue idee.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/80">
              Cosplay, collezioni e incontri. Tutto comincia dalle persone.
            </p>
          </div>
        </section>
        <section className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="mx-auto max-w-[400px]">
            <Link href="/" className="mb-8 flex items-center gap-3">
              <Sparkles className="size-7 text-pink-400" />
              <span className="brand-wordmark !text-2xl">COSMORA</span>
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight">
              {isRegister ? 'Entra nel tuo universo' : 'Bentornato'}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-white/70">
              {isRegister
                ? 'Un account per comprare, creare e conoscere la community.'
                : 'Accedi per ritrovare annunci, messaggi e persone.'}
            </p>
            <div
              className="mt-7 space-y-3"
              aria-label="Accesso con altri account"
            >
              {(['google', 'apple'] as const).map((provider) => (
                <Button
                  key={provider}
                  type="button"
                  variant="outline"
                  onClick={() => signInWithSocial(provider)}
                  disabled={status === 'loading' || !providers[provider]}
                  className={`h-auto min-h-14 w-full gap-3 rounded-xl px-4 py-3 text-base disabled:opacity-65 ${provider === 'google' ? 'border-white/20 bg-white text-[#161622] hover:bg-white/90' : 'border-white/25 bg-black text-white hover:bg-white/10'}`}
                >
                  {provider === 'google' ? (
                    <span
                      aria-hidden
                      className="text-xl font-bold text-blue-600"
                    >
                      G
                    </span>
                  ) : (
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      className="size-5 fill-current"
                    >
                      <path d="M17.05 12.54c.03 3.12 2.74 4.16 2.77 4.17-.02.07-.43 1.48-1.42 2.93-.86 1.26-1.76 2.51-3.17 2.54-1.39.03-1.84-.82-3.43-.82-1.59 0-2.09.79-3.41.85-1.36.05-2.4-1.36-3.27-2.61-1.78-2.56-3.14-7.24-1.31-10.41.91-1.57 2.53-2.56 4.29-2.59 1.34-.03 2.61.91 3.43.91.82 0 2.36-1.13 3.98-.97.68.03 2.59.27 3.82 2.07-.1.06-2.28 1.33-2.25 3.93ZM14.43 4.89c.72-.87 1.21-2.08 1.08-3.29-1.04.04-2.3.69-3.05 1.56-.67.77-1.26 2-1.1 3.18 1.16.09 2.35-.59 3.07-1.45Z" />
                    </svg>
                  )}
                  <span className="flex flex-col items-start">
                    <span>
                      Continua con {provider === 'google' ? 'Google' : 'Apple'}
                    </span>
                    {!providers[provider] && (
                      <span className="text-sm font-normal">
                        {checking
                          ? 'Verifica disponibilità…'
                          : 'Non ancora attivo'}
                      </span>
                    )}
                  </span>
                </Button>
              ))}
            </div>
            <div className="my-6 flex items-center gap-3 text-sm text-white/60">
              <span className="h-px flex-1 bg-white/15" />
              oppure con email
              <span className="h-px flex-1 bg-white/15" />
            </div>
            <form action={submit} className="space-y-4">
              {isRegister && (
                <Field
                  icon={UserRound}
                  label="Nome pubblico"
                  name="displayName"
                >
                  <Input
                    id="displayName"
                    name="displayName"
                    autoComplete="nickname"
                    placeholder="Come ti chiami nella community?"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </Field>
              )}
              <Field icon={Mail} label="Email" name="email">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nome@gmail.com"
                  required
                />
              </Field>
              <div>
                <Label htmlFor="password" className="mb-2 text-base">
                  Password
                </Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-4 size-5 text-white/50" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={
                      isRegister ? 'new-password' : 'current-password'
                    }
                    placeholder="Almeno 8 caratteri"
                    minLength={8}
                    required
                    className="!h-13 rounded-xl pl-10 pr-12 !text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? 'Nascondi password' : 'Mostra password'
                    }
                    className="absolute right-0 top-0 flex size-13 items-center justify-center text-white/65"
                  >
                    {showPassword ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>
              </div>
              {!isRegister && (
                <Link
                  href="/auth/recovery"
                  className="block py-1 text-right text-sm text-pink-300"
                >
                  Password dimenticata?
                </Link>
              )}
              <Button
                type="submit"
                disabled={status === 'loading'}
                className="min-h-13 w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-base font-semibold"
              >
                {status === 'loading' && (
                  <LoaderCircle className="animate-spin" />
                )}
                {status === 'loading'
                  ? 'Attendi…'
                  : isRegister
                    ? 'Crea account'
                    : 'Accedi'}
              </Button>
              {message && (
                <output className="block rounded-xl border border-white/20 p-4 text-base leading-relaxed text-white/85">
                  {message}
                </output>
              )}
            </form>
            <p className="mt-7 text-center text-base text-white/70">
              {isRegister ? 'Hai già un account?' : 'Sei nuovo qui?'}{' '}
              <Link
                href={isRegister ? '/auth/login' : '/auth/register'}
                className="font-semibold text-pink-300"
              >
                {isRegister ? 'Accedi' : 'Crea un account'}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
function Field({
  icon: Icon,
  label,
  name,
  children,
}: {
  icon: typeof Mail;
  label: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-base">
        {label}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-4 size-5 text-white/50" />
        <div className="[&_input]:!h-13 [&_input]:rounded-xl [&_input]:pl-10 [&_input]:!text-base">
          {children}
        </div>
      </div>
    </div>
  );
}
