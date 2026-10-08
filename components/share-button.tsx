'use client';
import { useI18n } from '@/components/i18n-provider';
import { accountMessages } from '@/lib/i18n/account';
import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
export function ShareButton({ title, url }: { title: string; url?: string }) {
  const { locale } = useI18n();
  const t = accountMessages[locale];
  const [message, setMessage] = useState('');
  async function share() {
    const publicOrigin = Capacitor.isNativePlatform()
      ? 'https://cosmora.kreluna.it'
      : window.location.origin;
    const target = new URL(url ?? `${window.location.pathname}${window.location.search}`, publicOrigin).href;
    try {
      if (navigator.share) await navigator.share({ title, url: target });
      else {
        await navigator.clipboard.writeText(target);
        setMessage('copied');
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError'))
        setMessage('shareFailed');
    }
  }
  return (
    <div>
      <button
        onClick={share}
        className="flex min-h-11 items-center gap-2 text-sm text-pink-300"
      >
        <Share2 className="size-4" />
        {t.share}
      </button>
      {message && (
        <output className="block text-sm text-white/70">
          {message === 'copied' ? t.copied : t.shareFailed}
        </output>
      )}
    </div>
  );
}
