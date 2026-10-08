'use client';
import { useI18n } from '@/components/i18n-provider';
import { accountMessages } from '@/lib/i18n/account';
import { commerceText } from '@/lib/i18n/commerce';
import { communityRules } from '@/lib/i18n/community-rules';
import { authTerms } from '@/lib/i18n/auth-terms';
import {
  TERMS_VERSION,
  createTermsConsent,
  termsConsentMetadata,
  termsConsentStore,
  syncPendingTermsConsent,
  setAccountDeletionLogin,
  consumeAccountDeletionLogin,
} from '@/lib/terms-consent';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
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
import { signInOnAndroid, signInOnIOS } from '@/lib/supabase/native-auth';
import { authRedirect } from '@/lib/supabase/auth-redirect';

type SocialProvider = 'google' | 'apple';
function authSchema(t: (typeof accountMessages)['en']) {
  return z.object({
    email: z.email(t.validEmail),
    password: z.string().min(8, t.passwordLength),
    displayName: z
      .string()
      .trim()
      .min(2, t.validName)
      .max(80, t.validName)
      .optional(),
  });
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, messages } = useI18n();
  const t = accountMessages[locale];
  const terms = authTerms[locale];
  const schema = authSchema(t);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const termsCheckbox = useRef<HTMLInputElement>(null);
  const [providers, setProviders] = useState({ google: false, apple: false });
  const [checking, setChecking] = useState(
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  );
  const isRegister = mode === 'register';
  const isDeletionLogin = !isRegister && searchParams.get('purpose') === 'delete';
  const displayedMessage = message || (status === 'idle' && searchParams.get('nativeAuth') === 'failed' ? t.socialFailed : '');
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
  function canContinue() {
    if (isDeletionLogin || termsAccepted) return true;
    setTermsError(true);
    termsCheckbox.current?.focus({ preventScroll: true });
    termsCheckbox.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return false;
  }
  function prepareConsent(source: 'email-login' | 'email-register' | SocialProvider, email?: string) {
    setAccountDeletionLogin(isDeletionLogin);
    if (isDeletionLogin) {
      termsConsentStore.clearPending();
      return null;
    }
    const consent = createTermsConsent(termsAccepted, locale, source);
    if (consent) termsConsentStore.record(consent, email);
    return consent;
  }
  async function signInWithSocial(provider: SocialProvider) {
    if (!providers[provider] || status === 'loading' || !canContinue()) return;
    setStatus('loading');
    setMessage('');
    try {
      prepareConsent(provider);
      const client = getSupabaseBrowserClient();
      if (!client) throw new Error(t.unavailable);
      const iosDestination = await signInOnIOS(provider, client);
      if (iosDestination) {
        router.replace(isDeletionLogin ? '/account/delete' : iosDestination);
        return;
      }
      if (await signInOnAndroid(provider, client)) {
        setStatus('idle');
        setMessage(t.completeInBrowser);
        return;
      }
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: authRedirect(window.location.origin, isDeletionLogin ? '/account/delete' : '/profile/me'),
        },
      });
      if (error) throw new Error(t.socialFailed);
    } catch {
      termsConsentStore.clearPending();
      setAccountDeletionLogin(false);
      setMessage(t.socialFailed);
      setStatus('idle');
    }
  }
  async function submit(formData: FormData) {
    if (status === 'loading' || !canContinue()) return;
    setStatus('loading');
    setMessage('');
    try {
      const result = schema.safeParse({
        email: formData.get('email'),
        password: formData.get('password'),
        displayName: isRegister ? formData.get('displayName') : undefined,
      });
      if (!result.success)
        throw new Error(result.error.issues[0]?.message || t.checkFields);
      const consent = prepareConsent(isRegister ? 'email-register' : 'email-login', result.data.email);
      const client = getSupabaseBrowserClient();
      if (!client) throw new Error(t.unavailable);
      if (isRegister) {
        const { data, error } = await client.auth.signUp({
          email: result.data.email,
          password: result.data.password,
          options: {
            emailRedirectTo: authRedirect(
              window.location.origin,
              '/profile/me',
              Capacitor.isNativePlatform(),
            ),
            data: {
              display_name: result.data.displayName,
              role: 'buyer',
              ...(consent ? termsConsentMetadata(consent) : {}),
            },
          },
        });
        if (error) throw new Error(t.registerFailed);
        if (data.session) {
          if (consent) void syncPendingTermsConsent(client, data.session.user, true);
          router.replace('/profile/me');
          return;
        }
        setMessage(t.confirmEmail);
        setStatus('success');
        return;
      }
      const { data, error } = await client.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      });
      if (error) throw new Error(t.loginFailed);
      if (consent && data.user) void syncPendingTermsConsent(client, data.user, true);
      consumeAccountDeletionLogin();
      router.replace(isDeletionLogin || data.user?.app_metadata?.deletion_pending ? '/account/delete' : '/profile/me');
    } catch (reason) {
      termsConsentStore.clearPending();
      setAccountDeletionLogin(false);
      setMessage(
        reason instanceof Error && Object.values(t).includes(reason.message)
          ? reason.message
          : t.connectionFailed,
      );
      setStatus('idle');
    }
  }
  return (
    <main className="auth-screen min-h-dvh bg-[#090a19] px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-[1040px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0d20] shadow-2xl lg:grid-cols-2">
        <section className="relative hidden min-h-[700px] overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between">
          <Image
            src="/editorial/hero.svg"
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
            {t.backCosmora}
          </Link>
          <div className="relative">
            <p className="mb-5 text-sm uppercase tracking-[.2em] text-pink-300">
              {t.universe}
            </p>
            <h2 className="text-4xl font-semibold leading-tight">
              {t.findCrew}
              <br />
              {t.ideas}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/80">
              {t.peopleFirst}
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
              {isDeletionLogin ? terms.deleteTitle : isRegister ? t.enterUniverse : messages.auth.welcome}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-white/70">
              {isDeletionLogin ? terms.deleteDescription : isRegister ? t.registerDescription : t.loginDescription}
            </p>
            {!isDeletionLogin && (
              <section aria-labelledby="auth-terms-title" className="mt-6 space-y-3 rounded-xl border border-white/20 bg-white/5 p-4 text-sm leading-relaxed">
                <h2 id="auth-terms-title" className="text-base font-semibold">{terms.title}</h2>
                <p>{terms.summary}</p>
                <p>{terms.moderation}</p>
                <Link href="/community/rules" className="inline-flex min-h-11 items-center text-pink-300 underline">
                  {terms.read}
                </Link>
                <p className="text-white/60">{terms.version} {TERMS_VERSION}</p>
                <label className="flex cursor-pointer items-start gap-3 text-base">
                  <input
                    ref={termsCheckbox}
                    type="checkbox"
                    name="termsConsent"
                    checked={termsAccepted}
                    disabled={status === 'loading'}
                    aria-invalid={termsError}
                    aria-describedby={termsError ? 'auth-terms-error' : undefined}
                    onChange={(event) => {
                      setTermsAccepted(event.target.checked);
                      if (event.target.checked) setTermsError(false);
                    }}
                    className="mt-1 size-5 shrink-0"
                  />
                  <span>{terms.accept}</span>
                </label>
                {termsError && <p id="auth-terms-error" role="alert" className="text-rose-300">{terms.required}</p>}
              </section>
            )}
            <div className="mt-7 space-y-3" aria-label={t.socialLabel}>
              {(['google', 'apple'] as const).map((provider) => (
                <Button
                  key={provider}
                  type="button"
                  variant="outline"
                  onClick={() => signInWithSocial(provider)}
                  disabled={status === 'loading' || !providers[provider]}
                  className={`h-auto min-h-14 w-full gap-3 rounded-xl px-4 py-3 text-base disabled:opacity-65 ${provider === 'google' ? 'border-white/20 bg-white text-[#161622] hover:bg-white/90 hover:text-[#161622] dark:bg-white dark:text-[#161622] dark:hover:bg-white/90 dark:hover:text-[#161622]' : 'border-white/25 bg-black text-white hover:bg-white/10 dark:bg-black dark:text-white dark:hover:bg-white/10'}`}
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
                      {t.continueWith}{' '}
                      {provider === 'google' ? 'Google' : 'Apple'}
                    </span>
                    {!providers[provider] && (
                      <span className="text-sm font-normal">
                        {checking ? t.checking : t.notActive}
                      </span>
                    )}
                  </span>
                </Button>
              ))}
            </div>
            <div className="my-6 flex items-center gap-3 text-sm text-white/60">
              <span className="h-px flex-1 bg-white/15" />
              {t.orEmail}
              <span className="h-px flex-1 bg-white/15" />
            </div>
            <form onSubmit={(event) => {
              event.preventDefault();
              void submit(new FormData(event.currentTarget));
            }} className="space-y-4">
              {isRegister && (
                <Field
                  icon={UserRound}
                  label={messages.auth.name}
                  name="displayName"
                >
                  <Input
                    id="displayName"
                    name="displayName"
                    autoComplete="nickname"
                    placeholder={t.nickname}
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </Field>
              )}
              <Field icon={Mail} label={messages.auth.email} name="email">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t.emailPlaceholder}
                  required
                />
              </Field>
              <div>
                <Label htmlFor="password" className="mb-2 text-base">
                  {messages.auth.password}
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
                    placeholder={t.passwordPlaceholder}
                    minLength={8}
                    required
                    className="!h-13 rounded-xl pl-10 pr-12 !text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t.hidePassword : t.showPassword}
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
                  {t.forgotPassword}
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
                  ? t.wait
                  : isRegister
                    ? messages.auth.register
                    : messages.auth.signIn}
              </Button>
              {displayedMessage && (
                <output className="block rounded-xl border border-white/20 p-4 text-base leading-relaxed text-white/85">
                  {displayedMessage}
                </output>
              )}
            </form>
            {isDeletionLogin ? (
              <Link href="/auth/login" className="mt-7 block min-h-11 text-center text-pink-300 underline">{terms.standardLogin}</Link>
            ) : <p className="mt-7 text-center text-base text-white/70">
              {isRegister ? t.alreadyAccount : t.newHere}{' '}
              <Link
                href={isRegister ? '/auth/login' : '/auth/register'}
                className="font-semibold text-pink-300"
              >
                {isRegister ? messages.auth.signIn : messages.auth.register}
              </Link>
            </p>}
            {!isRegister && !isDeletionLogin && (
              <Link href="/auth/login?purpose=delete" className="mt-4 block min-h-11 text-center text-sm text-pink-300 underline">{terms.deleteLogin}</Link>
            )}
            <nav className="mt-4 flex flex-wrap justify-center gap-x-6 text-sm text-pink-300">
              <Link href="/community/rules" className="flex min-h-11 items-center underline">
                {communityRules[locale].title}
              </Link>
              <Link
                href="/privacy"
                className="flex min-h-11 items-center underline"
              >
                {commerceText(locale, 'privacy')}
              </Link>
              <Link
                href="/support"
                className="flex min-h-11 items-center underline"
              >
                {t.support}
              </Link>
            </nav>
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
