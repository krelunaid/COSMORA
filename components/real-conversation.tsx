'use client';
import { useI18n } from '@/components/i18n-provider';
import { communityTranslator, communityError } from '@/lib/i18n/community';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from '@/components/app-link';
import { AppBackButton } from '@/components/app-back-button';
import { MobileShell } from '@/components/mobile-shell';
import { accountRequest } from '@/lib/account-client';
import { AccountRequestError } from '@/lib/account-http';
import { ReportButton } from '@/components/report-button';
import { notifyBlockChange } from '@/lib/blocked-content';
import { useBlockedContent } from '@/components/use-blocked-content';
import { BlockedContentNotice } from '@/components/blocked-content-notice';
import { viewerRequest } from '@/lib/viewer-request';
type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
type ConversationError = { message: string; needsLogin: boolean };
export default function RealConversation() {
  const { conversationId: peer } = useParams<{ conversationId: string }>();
  return <Conversation key={peer} peer={peer} />;
}
function Conversation({ peer }: { peer: string }) {
  const { locale } = useI18n();
  const t = communityTranslator(locale);
  const messageViewport = useRef<HTMLElement>(null);
  const followLatest = useRef(true);
  const mutationInFlight = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [draft, setDraft] = useState('');
  const [loadError, setLoadError] = useState<ConversationError | null>(null);
  const [actionError, setActionError] = useState<ConversationError | null>(null);
  const [sending, setSending] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [pendingId, setPendingId] = useState('');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [blockNotice, setBlockNotice] = useState('');
  const { blockedIds, blocksRevision, blocksReady, blocksError, retryBlocks, viewerId } = useBlockedContent();
  const peerBlocked = blockedIds.has(peer);
  const currentViewer = Boolean(viewerId && userId === viewerId);
  const viewerRef = useRef(viewerId);
  useLayoutEffect(() => { viewerRef.current = viewerId; }, [viewerId]);
  const visibleMessages = blocksReady && currentViewer && !peerBlocked ? messages : [];
  const [draftViewer, setDraftViewer] = useState(viewerId);
  if (draftViewer !== viewerId) {
    setDraftViewer(viewerId);
    setDraft('');
    setPendingId('');
    setActionError(null);
    setBlockNotice('');
  }
  const error = actionError ?? loadError;
  useEffect(() => {
    const viewport = messageViewport.current;
    if (viewport && followLatest.current)
      viewport.scrollTop = viewport.scrollHeight;
  }, [messages]);
  async function blockUser(blocked: boolean) {
    if (mutationInFlight.current) return;
    const actor = viewerId;
    mutationInFlight.current = true;
    setBlocking(true);
    setActionError(null);
    setBlockNotice('');
    try {
      await viewerRequest('/api/blocks', actor, {
        method: 'POST',
        body: JSON.stringify({ userId: peer, blocked, contextTargetType: 'USER', contextTargetId: peer }),
      });
      if (viewerRef.current !== actor) return;
      notifyBlockChange(peer, blocked, actor);
      setBlockNotice(
        blocked
          ? t('Utente bloccato: non potete scambiarvi messaggi.')
          : t('Utente sbloccato.'),
      );
    } catch (reason) {
      if (viewerRef.current !== actor) return;
      setActionError({
        message: communityError(locale, reason, 'Operazione non riuscita.'),
        needsLogin: reason instanceof AccountRequestError && reason.status === 401,
      });
    } finally {
      mutationInFlight.current = false;
      setBlocking(false);
    }
  }
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const value = await accountRequest(
          `/api/messages?peer=${encodeURIComponent(peer)}`,
        );
        if (active) {
          setMessages(value.messages.slice().reverse());
          setUserId(value.userId);
          setName(
            value.profiles.find(
              (profile: { id: string }) => profile.id === peer,
            )?.display_name || t('Utente COSMORA'),
          );
          setLoadError(null);
        }
      } catch (reason) {
        if (active)
          setLoadError({
            message: communityError(locale, reason, 'Caricamento non riuscito.'),
            needsLogin: reason instanceof AccountRequestError && reason.status === 401,
          });
      } finally {
        if (active) {
          setLoading(false);
          timer = setTimeout(poll, 15000);
        }
      }
    }
    function poll() {
      if (!active) return;
      if (document.visibilityState === 'visible') void load();
      else timer = setTimeout(poll, 15000);
    }
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [peer, revision, locale, t, blocksRevision, viewerId]);
  async function send(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutationInFlight.current || !draft.trim()) return;
    if (!blocksReady || !currentViewer || peerBlocked) return;
    const actor = viewerId;
    mutationInFlight.current = true;
    setSending(true);
    setActionError(null);
    setBlockNotice('');
    const id = pendingId || crypto.randomUUID();
    setPendingId(id);
    const body = draft.trim();
    try {
      await viewerRequest('/api/messages', actor, {
        method: 'POST',
        body: JSON.stringify({ id, recipientId: peer, body }),
      });
      if (viewerRef.current !== actor) return;
      followLatest.current = true;
      setMessages((current) =>
        current.some((message) => message.id === id)
          ? current
          : [
              ...current,
              {
                id,
                sender_id: userId,
                body,
                created_at: new Date().toISOString(),
              },
            ],
      );
      setDraft('');
      setPendingId('');
      setRevision((value) => value + 1);
    } catch (reason) {
      if (viewerRef.current !== actor) return;
      setActionError({
        message: communityError(locale, reason, 'Invio non riuscito.'),
        needsLogin: reason instanceof AccountRequestError && reason.status === 401,
      });
    } finally {
      mutationInFlight.current = false;
      setSending(false);
    }
  }
  return (
    <MobileShell className="flex !h-dvh !min-h-0 flex-col overflow-hidden">
      <header className="flex min-h-16 shrink-0 items-center gap-3 px-4">
        <AppBackButton fallback="/inbox" />
        <h1 className="truncate text-lg font-semibold">
          {blocksReady && currentViewer && !peerBlocked ? name || t('Conversazione') : t('Conversazione')}
        </h1>
      </header>
      <section
        ref={messageViewport}
        aria-label={t('Conversazione')}
        onScroll={(event) => {
          const viewport = event.currentTarget;
          followLatest.current =
            viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
            80;
        }}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4"
      >
        <BlockedContentNotice ready={blocksReady} error={blocksError} retry={retryBlocks} />
        {error && (
          <div className="rounded-xl border border-amber-300/30 p-3">
            <output className="block text-base text-amber-100">{error.message}</output>
            {error.needsLogin && (
              <Link href="/auth/login" className="mt-2 block text-pink-300">
                {t('Accedi')}
              </Link>
            )}
          </div>
        )}
        {currentViewer && (
          <div className="flex flex-wrap gap-4 text-sm">
            <button
              onClick={() => void blockUser(true)}
              disabled={blocking || sending}
              className="min-h-11 text-pink-300 disabled:opacity-40"
            >
              {t('Blocca utente')}
            </button>
            <ReportButton targetType="USER" targetId={peer} viewerId={viewerId} />
            <button
              onClick={() => void blockUser(false)}
              disabled={blocking || sending}
              className="min-h-11 text-white/70 disabled:opacity-40"
            >
              {t('Sblocca utente')}
            </button>
          </div>
        )}
        {(blockNotice || (blocksReady && peerBlocked)) && (
          <output className="block text-sm text-violet-200">
            {peerBlocked ? t('Utente bloccato: non potete scambiarvi messaggi.') : blockNotice}
          </output>
        )}
        {blocksReady && !peerBlocked && loading && (
          <output className="block text-base text-white/70">
            {t('Caricamento conversazione…')}
          </output>
        )}
        {blocksReady && currentViewer && !peerBlocked && !loading && !error && visibleMessages.length === 0 && (
          <p className="text-base text-white/70">
            {t('Scrivi il primo messaggio.')}
          </p>
        )}
        {visibleMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === userId ? 'justify-end' : ''}`}
          >
            <div className="max-w-[85%]">
            <p
              className={`whitespace-pre-wrap break-words rounded-2xl p-3 text-base ${message.sender_id === userId ? 'bg-violet-600' : 'bg-[#202138]'}`}
            >
              {message.body}
            </p>
            {userId && message.sender_id !== userId && <ReportButton targetType="USER" targetId={peer} viewerId={viewerId} contextMessageId={message.id} />}
            </div>
          </div>
        ))}
      </section>
      {blocksReady && currentViewer && !peerBlocked && <form
        onSubmit={send}
        className="flex shrink-0 gap-2 border-t border-white/15 p-3 pb-[max(12px,env(safe-area-inset-bottom))]"
      >
        <textarea
          aria-label={t('Messaggio')}
          maxLength={4000}
          disabled={sending}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setPendingId('');
          }}
          rows={2}
          className="min-w-0 flex-1 rounded-xl bg-[#202138] p-3 text-base"
          placeholder={t('Scrivi un messaggio…')}
        />
        <button
          disabled={sending || blocking || !draft.trim() || !userId}
          className="rounded-xl bg-violet-600 px-4 text-base disabled:opacity-40"
        >
          {sending ? t('Invio…') : t('Invia')}
        </button>
      </form>}
    </MobileShell>
  );
}
