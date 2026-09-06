// Never retry mutations automatically: a lost response may still represent a saved write.
export async function accountHttp<T>(
  path: string,
  options: RequestInit,
  timeoutMs = 20000,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (options.signal?.aborted) cancel();
  options.signal?.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(path, { ...options, signal: controller.signal, cache: 'no-store' });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = result && typeof result === 'object' && 'error' in result ? result.error : null;
      throw new Error(typeof error === 'string' ? error : 'Servizio temporaneamente non disponibile. Riprova.');
    }
    if (result === null) throw new Error('Risposta del servizio non valida. Riprova.');
    return result as T;
  } catch (reason) {
    if (timedOut) throw new Error('La connessione sta impiegando troppo tempo. Controlla la rete e riprova.');
    if (reason instanceof TypeError) throw new Error('Connessione non disponibile. Controlla la rete e riprova.');
    throw reason;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}
