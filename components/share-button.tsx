'use client';
import { useState } from 'react';
import { Share2 } from 'lucide-react';
export function ShareButton({ title, url }: { title: string; url?: string }) {
  const [message, setMessage] = useState('');
  async function share() {
    const target = url
      ? new URL(url, window.location.origin).href
      : window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url: target });
      else {
        await navigator.clipboard.writeText(target);
        setMessage('Link copiato.');
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError'))
        setMessage('Non è stato possibile condividere il link.');
    }
  }
  return (
    <div>
      <button
        onClick={share}
        className="flex min-h-11 items-center gap-2 text-sm text-pink-300"
      >
        <Share2 className="size-4" />
        Condividi
      </button>
      {message && (
        <output className="block text-sm text-white/70">{message}</output>
      )}
    </div>
  );
}
