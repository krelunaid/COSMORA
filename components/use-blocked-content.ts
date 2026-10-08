'use client';
import { useEffect, useState } from 'react';
import { applyBlockChange, readOwnBlockedAuthors, subscribeToBlockChanges } from '@/lib/blocked-content';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function useBlockedContent() {
  const [state, setState] = useState(() => ({
    ids: new Set<string>(), revision: 0, ready: false, error: false, viewerId: '',
  }));
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    let active = true;
    let generation = 0;
    let viewer: string | undefined;
    let request: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    async function hydrate() {
      const attempt = ++generation;
      request?.abort();
      const controller = new AbortController();
      request = controller;
      const timeout = setTimeout(() => {
        if (!active || attempt !== generation) return;
        ++generation;
        controller.abort();
        setState((current) => ({ ...current, ready: false, error: true }));
      }, 15000);
      deadline = timeout;
      try {
        if (!client) throw new Error('Session unavailable.');
        const session = await client.auth.getSession();
        if (!active || attempt !== generation) return;
        if (session.error) throw session.error;
        const id = session.data.session?.user.id ?? '';
        if (viewer !== undefined && viewer !== id) {
          setState((current) => ({ ids: new Set(), revision: current.revision + 1, ready: false, error: false, viewerId: id }));
        }
        viewer = id;
        const ids = id ? await readOwnBlockedAuthors(client, id, controller.signal) : new Set<string>();
        if (!active || attempt !== generation) return;
        setState((current) => ({
          ids,
          revision: current.revision + (current.ids.size !== ids.size || [...ids].some((value) => !current.ids.has(value)) ? 1 : 0),
          ready: true, error: false, viewerId: id,
        }));
      } catch {
        if (active && attempt === generation)
          setState((current) => ({ ...current, ready: false, error: true }));
      } finally {
        clearTimeout(timeout);
      }
    }
    function schedule() {
      ++generation;
      request?.abort();
      clearTimeout(timer);
      clearTimeout(deadline);
      // Auth callbacks run under a Supabase lock; start session reads afterwards.
      timer = setTimeout(() => { void hydrate(); }, 0);
    }
    const stopBlocks = subscribeToBlockChanges((change) => {
      if (change.viewerId && change.viewerId !== viewer) return;
      setState((current) => ({ ...current, ids: applyBlockChange(current.ids, change), revision: current.revision + 1 }));
      schedule(); // Cancels a stale lookup that started before this mutation.
    });
    const auth = client?.auth.onAuthStateChange((event, session) => {
      const id = session?.user.id ?? '';
      if (event === 'INITIAL_SESSION' || id === viewer) return;
      viewer = id;
      setState((current) => ({ ids: new Set(), revision: current.revision + 1, ready: false, error: false, viewerId: id }));
      schedule();
    });
    const onFocus = () => schedule();
    window.addEventListener('focus', onFocus);
    void hydrate();
    return () => {
      active = false;
      ++generation;
      request?.abort();
      clearTimeout(timer);
      clearTimeout(deadline);
      stopBlocks();
      auth?.data.subscription.unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, [retry]);
  return {
    blockedIds: state.ids, blocksRevision: state.revision,
    blocksReady: state.ready, blocksError: state.error, viewerId: state.viewerId,
    retryBlocks: () => { setState((current) => ({ ...current, ready: false, error: false })); setRetry((current) => current + 1); },
  };
}
