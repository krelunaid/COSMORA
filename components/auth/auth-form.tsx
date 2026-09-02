'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from '@/components/app-link';
import { ArrowLeft, CheckCircle2, LoaderCircle, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type SocialProvider = 'google' | 'twitter' | 'facebook';

const schema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
  displayName: z.string().min(2, 'Enter your display name.').optional(),
  role: z.enum(['buyer', 'seller', 'creator', 'pro_shop']).optional(),
});

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [message, setMessage] = useState('');
  const isRegister = mode === 'register';

  async function signInWithSocial(provider: SocialProvider) {
    setStatus('loading');
    setMessage('');
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage('Add the Supabase keys to enable social login.');
      setStatus('idle');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/profile/me` },
    });
    if (error) {
      setMessage(error.message);
      setStatus('idle');
    }
  }

  async function submit(formData: FormData) {
    setStatus('loading');
    setMessage('');
    const result = schema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
      displayName: isRegister ? formData.get('displayName') : undefined,
      role: isRegister ? formData.get('role') : undefined,
    });

    if (!result.success) {
      setMessage(result.error.issues[0]?.message ?? 'Check the form.');
      setStatus('idle');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage('Supabase keys are not configured yet. The interface and database are ready for connection.');
      setStatus('idle');
      return;
    }

    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email: result.data.email,
        password: result.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/profile/me`,
          data: { display_name: result.data.displayName, role: result.data.role },
        },
      });
      if (error) { setMessage(error.message); setStatus('idle'); return; }
      setMessage('Check your email to verify your COSMORA account.');
      setStatus('success');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: result.data.email, password: result.data.password });
    if (error) { setMessage(error.message); setStatus('idle'); return; }
    window.location.assign('/profile/me');
  }

  return (
    <main className="auth-screen min-h-dvh px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-[1100px] overflow-hidden rounded-[28px] border border-white/10 bg-[#090a19]/90 shadow-2xl lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between">
          <Image src="/cosmora-hero.png" alt="COSMORA original convention scene" fill sizes="55vw" className="object-cover object-[68%_center]" />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#060712] via-[#09091a]/80 to-fuchsia-950/25" />
          <Link href="/" className="relative z-10 flex items-center gap-2 text-sm text-white/70"><ArrowLeft className="size-4" /> Back to COSMORA</Link>
          <div className="relative z-10 max-w-md">
            <span className="brand-wordmark text-2xl!">COSMORA</span>
            <h2 className="mt-6 text-4xl font-semibold leading-tight">One account.<br /><span className="gradient-copy">Every fandom.</span></h2>
            <p className="mt-4 text-sm leading-6 text-white/65">Buy, create, connect and experience Europe’s pop-culture events with a community built around trust.</p>
          </div>
        </section>

        <section className="flex items-center p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-[420px]">
            <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden"><Sparkles className="text-fuchsia-300" /><span className="brand-wordmark">COSMORA</span></Link>
            <p className="eyebrow">{isRegister ? 'Join the universe' : 'Welcome back'}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{isRegister ? 'Create your account' : 'Sign in to COSMORA'}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{isRegister ? 'Choose how you want to participate. You can upgrade your role later.' : 'Continue where you left off.'}</p>

            <div className="mt-7 grid grid-cols-4 gap-2" aria-label="Social sign in">
              <SocialButton label="Google" mark="G" onClick={() => signInWithSocial('google')} disabled={status === 'loading'} />
              <SocialButton label="X" mark="𝕏" onClick={() => signInWithSocial('twitter')} disabled={status === 'loading'} />
              <SocialButton label="Facebook" mark="f" onClick={() => signInWithSocial('facebook')} disabled={status === 'loading'} />
              <SocialButton label="Instagram" mark="◎" disabled title="Requires custom Meta OAuth configuration" />
            </div>
            <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[.18em] text-white/30"><span className="h-px flex-1 bg-white/10" />or continue with email<span className="h-px flex-1 bg-white/10" /></div>

            <form action={submit} className="space-y-5">
              {isRegister && <Field icon={UserRound} label="Display name" name="displayName"><Input id="displayName" name="displayName" autoComplete="name" placeholder="Nova Atelier" required /></Field>}
              <Field icon={Mail} label="Email" name="email"><Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></Field>
              <Field icon={LockKeyhole} label="Password" name="password"><Input id="password" name="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder="At least 8 characters" minLength={8} required /></Field>
              {isRegister && (
                <div className="space-y-2"><Label htmlFor="role">Account type</Label><NativeSelect id="role" name="role" defaultValue="buyer"><option value="buyer">Buyer</option><option value="seller">Seller</option><option value="creator">Creator</option><option value="pro_shop">Professional shop</option></NativeSelect></div>
              )}
              <Button disabled={status === 'loading'} className="h-11 w-full bg-gradient-to-r from-[#ff3da5] to-[#9152ff]">
                {status === 'loading' ? <LoaderCircle className="animate-spin" /> : status === 'success' ? <CheckCircle2 /> : null}
                {isRegister ? 'Create account' : 'Sign in'}
              </Button>
              {message && <output className={`block rounded-xl border p-3 text-sm ${status === 'success' ? 'border-emerald-400/20 bg-emerald-400/8 text-emerald-200' : 'border-amber-400/20 bg-amber-400/8 text-amber-100'}`}>{message}</output>}
            </form>

            <p className="mt-7 text-center text-sm text-muted-foreground">
              {isRegister ? 'Already have an account?' : 'New to COSMORA?'}{' '}
              <Link className="font-medium text-fuchsia-300 hover:text-fuchsia-200" href={isRegister ? '/auth/login' : '/auth/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function SocialButton({ label, mark, onClick, disabled, title }: { label: string; mark: string; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={disabled} title={title} aria-label={`Continue with ${label}`} className="h-12 rounded-xl border-white/10 bg-white/[.035] text-white hover:bg-white/[.08]">
      <span aria-hidden className="text-lg font-semibold">{mark}</span>
    </Button>
  );
}

function Field({ icon: Icon, label, name, children }: { icon: typeof Mail; label: string; name: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><div className="relative"><Icon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><div className="[&_input]:h-11 [&_input]:pl-10">{children}</div></div></div>;
}
