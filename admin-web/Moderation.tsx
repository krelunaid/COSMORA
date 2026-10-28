// Standalone Vite: signed moderation media uses native elements, not Next image optimization.
// Uploaded videos have no caption track in the existing data model; do not invent a transcript.
/* eslint-disable next/no-img-element, jsx-a11y/media-has-caption */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  ImageOff,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  isBlockModerationNotice,
  type ModerationAction,
} from '../lib/moderation';
import {
  actionDescriptions,
  actionLabels,
  approvalReason,
  availableActions,
  canSubmitDecision,
  decisionReason,
  itemKey,
  parseModerationHistory,
  parseModerationQueue,
  reasons,
  reportLabels,
  statusLabels,
  targetLabels,
  type AdminModerationItem,
  type AdminModerationQueue,
  type HistoryEntry,
} from './moderation-model';
import './moderation.css';

const endpoint =
  'https://pwdpwgonvnuwmgfiidut.supabase.co/functions/v1/community-moderation';
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Rome',
  }).format(new Date(value));
const statusLabel = (value?: string) =>
  value
    ? statusLabels[value.toUpperCase()] || 'Stato registrato'
    : 'Non disponibile';
type View = 'pending' | 'hidden' | 'history';
class RequestError extends Error {
  status: number;
  constructor(status: number) {
    super(`http-${status}`);
    this.status = status;
  }
}
async function request(
  token: string,
  signal: AbortSignal,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const response = await fetch(endpoint + path, {
    method: body ? 'POST' : 'GET',
    signal,
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new RequestError(response.status);
  return response.json();
}
function Modal({
  title,
  children,
  busy = false,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  busy?: boolean;
  onClose: () => void;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    closeButton.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`mod-modal ${wide ? 'mod-modal-wide' : ''}`}
      aria-labelledby="mod-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="mod-dialog-heading">
        <h2 id="mod-dialog-title">{title}</h2>
        <button
          ref={closeButton}
          type="button"
          className="mod-icon"
          aria-label="Chiudi"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function ItemReview({
  item,
  onChoose,
  onMediaFailure,
  disabled,
}: {
  item: AdminModerationItem;
  onChoose: (action: ModerationAction, item: AdminModerationItem) => void;
  onMediaFailure: (key: string) => void;
  disabled: boolean;
}) {
  const [loaded, setLoaded] = useState<Set<number>>(new Set());
  const [failed, setFailed] = useState(false);
  const [enlarged, setEnlarged] = useState<number | null>(null);
  const mediaReady =
    !item.mediaUnavailable && !failed && loaded.size === item.media.length;
  const actions = availableActions(item);
  const primaryActions = actions.filter(
    (action) => action !== 'DISMISS' && action !== 'RESOLVE',
  );
  const reportActions = actions.filter(
    (action) => action === 'DISMISS' || action === 'RESOLVE',
  );
  const pending = item.status.toUpperCase() === 'PENDING_REVIEW';
  const markLoaded = (index: number) =>
    setLoaded((previous) => new Set([...previous, index]));
  const mediaFailed = () => {
    setFailed(true);
    onMediaFailure(itemKey(item));
  };
  const title =
    item.status === 'MISSING'
      ? 'Contenuto non più disponibile'
      : item.title || targetLabels[item.targetType];
  return (
    <article className="mod-post">
      <header className="mod-post-header">
        <div className="mod-author-avatar" aria-hidden="true">
          {item.authorDisplayName?.slice(0, 1).toUpperCase() || (
            <MessageSquare size={20} />
          )}
        </div>
        <div className="mod-author">
          <strong>
            {item.authorDisplayName ||
              (item.targetType === 'USER'
                ? 'Account COSMORA'
                : 'Autore della community')}
          </strong>
          <span>
            {targetLabels[item.targetType]}
            {item.createdAt ? ` · ${formatDate(item.createdAt)}` : ''}
          </span>
        </div>
        <span className="mod-status">
          <Clock3 size={12} />
          {statusLabel(item.status)}
        </span>
      </header>
      <div
        className={`mod-post-content ${item.media.length ? '' : 'mod-without-media'}`}
      >
        {item.media.length > 0 && (
          <div className="mod-media-column">
            <p className="mod-media-instruction">
              Controlla tutti i{' '}
              {item.media.length === 1 ? 'file' : `${item.media.length} file`}{' '}
              prima di approvare.
            </p>
            {item.media.map((media, index) => (
              <figure className="mod-media" key={media.url}>
                {media.type === 'VIDEO' ? (
                  <video
                    src={media.url}
                    controls
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={() => markLoaded(index)}
                    onError={mediaFailed}
                    aria-label={`Video ${index + 1} da esaminare`}
                  />
                ) : (
                  <button
                    type="button"
                    className="mod-image-button"
                    onClick={() => setEnlarged(index)}
                    aria-label={`Ingrandisci foto ${index + 1}`}
                  >
                    <img
                      src={media.url}
                      alt={`Foto ${index + 1} del contenuto da esaminare`}
                      onLoad={() => markLoaded(index)}
                      onError={mediaFailed}
                    />
                    <span className="mod-zoom">
                      <ZoomIn size={14} />
                      Ingrandisci
                    </span>
                  </button>
                )}
                {item.media.length > 1 && (
                  <figcaption>
                    File {index + 1} di {item.media.length}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
        <div className="mod-post-copy">
          <span className="mod-kicker">
            {targetLabels[item.targetType]} della community
          </span>
          <h2>{title}</h2>
          {item.body && item.body !== item.title && (
            <p className="mod-body">{item.body}</p>
          )}
          {item.authorId && (
            <a
              className="mod-profile"
              href={`https://cosmora.kreluna.it/profile/${item.authorId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Apri il profilo dell’autore <span aria-hidden="true">↗</span>
              <span className="sr-only"> in una nuova scheda</span>
            </a>
          )}
          {pending && (
            <p className="mod-visibility">
              <ShieldCheck size={16} />
              La community vedrà questo contenuto dopo la tua approvazione.
            </p>
          )}
          {(item.mediaUnavailable || failed) && (
            <p role="alert" className="mod-warning">
              <ImageOff size={19} />
              Alcuni file non sono disponibili. Premi Aggiorna per ricaricarli;
              l’approvazione rimane disabilitata.
            </p>
          )}
          {!mediaReady && !failed && !item.mediaUnavailable && (
            <output className="mod-muted">
              Caricamento dei file in corso…
            </output>
          )}
          {primaryActions.length > 0 && (
            <div className="mod-decisions">
              <h3>
                {pending ? 'Vuoi pubblicarlo?' : 'Gestisci questo contenuto'}
              </h3>
              <div className="mod-action-buttons">
                {primaryActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className={`mod-button ${action === 'APPROVE' || action === 'RESTORE' ? 'mod-primary' : 'mod-danger'}`}
                    disabled={disabled || (action === 'APPROVE' && !mediaReady)}
                    onClick={() => onChoose(action, item)}
                  >
                    {action === 'APPROVE' ? (
                      <Check size={19} />
                    ) : action === 'REJECT' ? (
                      <X size={19} />
                    ) : (
                      <ShieldCheck size={18} />
                    )}
                    {action === 'APPROVE' && item.targetType === 'POST'
                      ? 'Approva post'
                      : actionLabels[action]}
                  </button>
                ))}
              </div>
              {pending && (
                <p className="mod-auto-reason">
                  <CheckCheck size={14} />
                  Per approvare non devi scrivere niente.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      {item.reports.length > 0 && (
        <section
          className="mod-reports"
          aria-label="Segnalazioni da verificare"
        >
          <h3>
            <ShieldAlert size={20} />
            Segnalazioni e avvisi ({item.reports.length})
          </h3>
          {item.reports.map((report) => (
            <article key={report.id} className="mod-report">
              <div className="mod-report-heading">
                <strong>
                  {isBlockModerationNotice(report)
                    ? 'Blocco utente · avviso al gestore'
                    : reportLabels[report.reason] || 'Segnalazione'}
                </strong>
                <time dateTime={report.created_at}>
                  {formatDate(report.created_at)}
                </time>
              </div>
              {report.details && <p>{report.details}</p>}
              {report.contextTargetType && (
                <p className="mod-muted">
                  Contenuto di origine:{' '}
                  {targetLabels[report.contextTargetType] ||
                    'Contenuto della community'}
                </p>
              )}
              {report.contextMessage && (
                <blockquote>
                  <span>
                    Messaggio segnalato ·{' '}
                    {formatDate(report.contextMessage.created_at)}
                  </span>
                  <p>{report.contextMessage.body}</p>
                </blockquote>
              )}
            </article>
          ))}
          <div className="mod-report-actions">
            {reportActions.map((action) => (
              <button
                key={action}
                type="button"
                className="mod-button mod-secondary"
                disabled={disabled}
                onClick={() => onChoose(action, item)}
              >
                {actionLabels[action]}
              </button>
            ))}
          </div>
          <p className="mod-muted">
            Queste due azioni chiudono le segnalazioni senza modificare il
            contenuto o lo stato dell’account.
          </p>
        </section>
      )}
      {enlarged !== null && (
        <Modal
          title={`Foto ${enlarged + 1} di ${item.media.length}`}
          wide
          onClose={() => setEnlarged(null)}
        >
          <img
            className="mod-full-image"
            src={item.media[enlarged].url}
            alt="Foto completa del contenuto da esaminare"
            onError={mediaFailed}
          />
        </Modal>
      )}
    </article>
  );
}
export function Moderation({
  accessToken,
  onSessionExpired,
}: {
  accessToken: string;
  onSessionExpired: () => void;
}) {
  const [view, setView] = useState<View>('pending');
  const [offset, setOffset] = useState(0);
  const [queue, setQueue] = useState<AdminModerationQueue>({
    items: [],
    more: false,
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [decision, setDecision] = useState<{
    action: ModerationAction;
    item: AdminModerationItem;
  } | null>(null);
  const [chosenReason, setChosenReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const requestId = useRef(0);
  const currentToken = useRef(accessToken);
  const postController = useRef<AbortController | null>(null);
  const posting = useRef(false);
  const mounted = useRef(true);
  const expired = useRef(onSessionExpired);
  useEffect(() => {
    currentToken.current = accessToken;
    expired.current = onSessionExpired;
  }, [accessToken, onSessionExpired]);
  const clearPrivate = useCallback(() => {
    setQueue({ items: [], more: false });
    setHistory([]);
    setDecision(null);
    setSelected('');
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      postController.current?.abort();
    };
  }, []);
  useEffect(() => {
    postController.current?.abort();
    posting.current = false;
    // Clear private data immediately when credentials change, before any new request.
    // eslint-disable-next-line react/react-compiler
    clearPrivate();
    setNotice('');
    setBusy(false);
    setDecisionError('');
  }, [accessToken, clearPrivate]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    const version = ++requestId.current;
    const token = accessToken;
    let active = true;
    const current = () =>
      active &&
      mounted.current &&
      requestId.current === version &&
      currentToken.current === token;
    // Invalidate private content synchronously before switching remote moderation queues.
    // eslint-disable-next-line react/react-compiler
    setLoading(true);
    setError('');
    clearPrivate();
    void request(token, controller.signal, `?view=${view}&offset=${offset}`)
      .then((result) => {
        if (!current()) return;
        if (view === 'history') setHistory(parseModerationHistory(result));
        else {
          const next = parseModerationQueue(result);
          setQueue(next);
          setSelected(next.items[0] ? itemKey(next.items[0]) : '');
        }
      })
      .catch((failure: unknown) => {
        if (!current()) return;
        clearPrivate();
        if (failure instanceof RequestError && failure.status === 401) {
          expired.current();
          return;
        }
        setError(
          failure instanceof RequestError && failure.status === 403
            ? 'Il tuo account non è autorizzato alla moderazione. Nessun contenuto è stato caricato.'
            : controller.signal.aborted
              ? 'Il caricamento ha impiegato troppo tempo. Verifica la connessione e riprova.'
              : 'Non è stato possibile caricare la coda. Premi Aggiorna per riprovare.',
        );
      })
      .finally(() => {
        clearTimeout(timer);
        if (current()) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [accessToken, view, offset, refresh, clearPrivate]);
  const selectView = (next: View) => {
    if (next === view && offset === 0) return;
    if (!busy) {
      clearPrivate();
      setView(next);
      setOffset(0);
      setNotice('');
    }
  };
  const reload = () => {
    if (!busy) {
      clearPrivate();
      setRefresh((n) => n + 1);
    }
  };
  const mediaFailed = (key: string) => {
    setQueue((previous) => ({
      ...previous,
      items: previous.items.map((entry) =>
        itemKey(entry) === key ? { ...entry, mediaUnavailable: true } : entry,
      ),
    }));
    if (decision?.action === 'APPROVE' && itemKey(decision.item) === key) {
      setDecision(null);
      setNotice(
        'Un file non è più disponibile. Aggiorna e controlla il contenuto prima di approvare.',
      );
    }
  };
  const choose = (action: ModerationAction, item: AdminModerationItem) => {
    if (busy || posting.current) return;
    setChosenReason('');
    setCustomReason('');
    setDecisionError('');
    setDecision({ action, item });
  };
  async function submitDecision(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision || posting.current) return;
    const reason = decisionReason(decision.action, chosenReason, customReason);
    if (!canSubmitDecision(decision.item, decision.action, reason, true))
      return;
    posting.current = true;
    setBusy(true);
    setDecisionError('');
    const snapshot = decision;
    const token = accessToken;
    const controller = new AbortController();
    postController.current = controller;
    const timer = setTimeout(() => controller.abort(), 20_000);
    const current = () =>
      mounted.current &&
      currentToken.current === token &&
      postController.current === controller;
    try {
      const result = await request(token, controller.signal, '', {
        targetType: snapshot.item.targetType,
        targetId: snapshot.item.targetId,
        expectedStatus: snapshot.item.status,
        action: snapshot.action,
        reason,
        reportIds: snapshot.item.reports.map((report) => report.id),
      });
      if (!current()) return;
      if (
        !result ||
        typeof result !== 'object' ||
        !('saved' in result) ||
        result.saved !== true
      )
        throw new Error('unconfirmed');
      setDecision(null);
      clearPrivate();
      setNotice(
        snapshot.action === 'APPROVE'
          ? 'Contenuto approvato. La decisione è stata salvata nel registro.'
          : 'Decisione salvata nel registro. La coda è stata aggiornata.',
      );
      setOffset(0);
      setRefresh((n) => n + 1);
    } catch (failure: unknown) {
      if (!current()) return;
      const status = failure instanceof RequestError ? failure.status : 0;
      if (status === 401) {
        clearPrivate();
        expired.current();
      } else if (status === 403) {
        clearPrivate();
        setError('L’autorizzazione alla moderazione non è più disponibile.');
      } else if (status === 400)
        setDecisionError(
          'La decisione non è valida per questo contenuto. Chiudi e aggiorna la coda prima di riprovare.',
        );
      else {
        clearPrivate();
        setNotice(
          status === 409
            ? 'Il contenuto è già cambiato. La coda è stata ricaricata: controlla il nuovo stato prima di decidere.'
            : status === 404
              ? 'Questo contenuto non è più disponibile. Coda ricaricata.'
              : 'Non abbiamo ricevuto conferma del salvataggio. Controlla il registro e la coda aggiornata prima di riprovare.',
        );
        setRefresh((n) => n + 1);
      }
    } finally {
      clearTimeout(timer);
      if (current()) {
        posting.current = false;
        setBusy(false);
        postController.current = null;
      }
    }
  }
  const index = queue.items.findIndex((item) => itemKey(item) === selected);
  const item = queue.items[index];
  const reason = decision
    ? decisionReason(decision.action, chosenReason, customReason)
    : '';
  return (
    <section className="mod-root" aria-labelledby="mod-title">
      <div className="mod-heading">
        <div>
          <span className="mod-kicker">PRENDITI CURA DELLA COMMUNITY</span>
          <h1 id="mod-title">
            {view === 'history'
              ? 'Le tue decisioni'
              : 'Post e contenuti da gestire'}
          </h1>
          <p>Guarda il contenuto e scegli. Per approvare basta una conferma.</p>
        </div>
        <button
          className="mod-button mod-secondary"
          type="button"
          onClick={reload}
          disabled={loading || busy}
        >
          <RefreshCw size={17} className={loading ? 'spin' : ''} />
          Aggiorna
        </button>
      </div>
      <div className="mod-tabs" aria-label="Code di moderazione">
        {(
          [
            {
              key: 'pending',
              label: 'Da esaminare',
              icon: <Clock3 size={16} />,
            },
            {
              key: 'hidden',
              label: 'Nascosti e sospesi',
              icon: <ShieldCheck size={16} />,
            },
            { key: 'history', label: 'Registro', icon: <FileText size={16} /> },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-pressed={view === tab.key}
            onClick={() => selectView(tab.key)}
            disabled={busy}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      {notice && (
        <output className="mod-notice">
          <ShieldCheck size={18} />
          <span>{notice}</span>
          <button
            className="mod-icon"
            aria-label="Chiudi messaggio"
            onClick={() => setNotice('')}
          >
            <X size={16} />
          </button>
        </output>
      )}
      {loading ? (
        <output className="mod-empty">
          <LoaderCircle className="spin" size={32} />
          <strong>Caricamento della coda…</strong>
          <span>Stiamo recuperando i contenuti da esaminare.</span>
        </output>
      ) : error ? (
        <div className="mod-empty mod-error" role="alert">
          <ShieldAlert size={34} />
          <h2>La coda non è disponibile</h2>
          <p>{error}</p>
          <button className="mod-button mod-secondary" onClick={reload}>
            Riprova
          </button>
        </div>
      ) : view === 'history' ? (
        <div className="mod-history">
          <p className="mod-muted">
            Ultime 100 decisioni. Orari indicati per l’Italia.
          </p>
          {history.length === 0 && (
            <div className="mod-empty">
              <FileText size={32} />
              <h2>Il registro è ancora vuoto</h2>
              <p>Le decisioni salvate compariranno qui.</p>
            </div>
          )}
          {history.map((entry) => (
            <article className="mod-history-row" key={entry.id}>
              <span
                className={`mod-history-icon ${entry.action === 'APPROVE' ? 'mod-positive' : ''}`}
              >
                {entry.action === 'APPROVE' ? (
                  <Check size={19} />
                ) : (
                  <ShieldCheck size={19} />
                )}
              </span>
              <div>
                <h2>
                  {actionLabels[entry.action]} ·{' '}
                  {targetLabels[entry.target_type] || 'Contenuto'}
                </h2>
                <time dateTime={entry.created_at}>
                  {formatDate(entry.created_at)}
                </time>
                <p>{entry.reason}</p>
                <span className="mod-muted">
                  {statusLabel(entry.previous_state?.status)} →{' '}
                  {statusLabel(entry.next_state?.status)}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <>
          {queue.items.length === 0 ? (
            <div className="mod-empty">
              <CheckCheck size={38} />
              <h2>
                {view === 'pending'
                  ? 'Nessun contenuto da esaminare in questa pagina'
                  : 'Nessun contenuto nascosto in questa pagina'}
              </h2>
              <p>
                Puoi aggiornare la coda o consultare le decisioni nel registro.
              </p>
              <button
                className="mod-button mod-secondary"
                onClick={() => selectView('history')}
              >
                Apri il registro
              </button>
            </div>
          ) : (
            <div className="mod-workspace">
              <aside
                className="mod-queue"
                aria-label="Contenuti in questa pagina"
              >
                <div className="mod-queue-heading">
                  <strong>IN QUESTA PAGINA</strong>
                  <span>{queue.items.length}</span>
                </div>
                {queue.items.map((candidate) => (
                  <button
                    key={itemKey(candidate)}
                    type="button"
                    className={`mod-queue-item ${itemKey(candidate) === selected ? 'mod-selected' : ''}`}
                    aria-pressed={itemKey(candidate) === selected}
                    disabled={busy}
                    onClick={() => setSelected(itemKey(candidate))}
                  >
                    {candidate.media[0]?.type === 'IMAGE' ? (
                      <img src={candidate.media[0].url} alt="" />
                    ) : (
                      <span className="mod-thumb">
                        <MessageSquare size={23} />
                      </span>
                    )}
                    <span>
                      <strong>
                        {candidate.title || targetLabels[candidate.targetType]}
                      </strong>
                      <small>
                        {targetLabels[candidate.targetType]} ·{' '}
                        {statusLabel(candidate.status)}
                      </small>
                      {candidate.reports.length > 0 && (
                        <small className="mod-report-count">
                          {candidate.reports.length} segnalazioni / avvisi
                        </small>
                      )}
                    </span>
                  </button>
                ))}
                <p className="mod-queue-note">
                  <ShieldCheck size={16} />
                  Il registro conserva il motivo di ogni decisione.
                </p>
              </aside>
              <div className="mod-review">
                <div className="mod-review-nav">
                  <span>
                    Contenuto <strong>{index + 1}</strong> di{' '}
                    {queue.items.length} in questa pagina
                  </span>
                  <div>
                    <button
                      className="mod-icon"
                      aria-label="Contenuto precedente"
                      disabled={busy || index <= 0}
                      onClick={() =>
                        setSelected(itemKey(queue.items[index - 1]))
                      }
                    >
                      <ChevronLeft size={19} />
                    </button>
                    <button
                      className="mod-icon"
                      aria-label="Contenuto successivo"
                      disabled={busy || index >= queue.items.length - 1}
                      onClick={() =>
                        setSelected(itemKey(queue.items[index + 1]))
                      }
                    >
                      <ChevronRight size={19} />
                    </button>
                  </div>
                </div>
                {item && (
                  <ItemReview
                    key={`${itemKey(item)}:${item.status}:${item.media.map((media) => media.url).join(',')}`}
                    item={item}
                    onChoose={choose}
                    onMediaFailure={mediaFailed}
                    disabled={busy}
                  />
                )}
              </div>
            </div>
          )}
          {(offset > 0 || queue.more) && (
            <div className="mod-pagination">
              <button
                className="mod-button mod-secondary"
                disabled={busy || offset === 0}
                onClick={() => setOffset(Math.max(0, offset - 50))}
              >
                <ChevronLeft size={17} />
                Pagina precedente
              </button>
              <span>Pagina {offset / 50 + 1}</span>
              <button
                className="mod-button mod-secondary"
                disabled={busy || !queue.more}
                onClick={() => setOffset(offset + 50)}
              >
                Pagina successiva
                <ChevronRight size={17} />
              </button>
            </div>
          )}
        </>
      )}
      {decision && (
        <Modal
          title={
            decision.action === 'APPROVE'
              ? 'Pubblicare questo contenuto?'
              : actionLabels[decision.action]
          }
          busy={busy}
          onClose={() => setDecision(null)}
        >
          <form onSubmit={submitDecision} aria-busy={busy}>
            <p className="mod-dialog-description">
              {decision.action === 'RESTORE' &&
              decision.item.targetType === 'USER'
                ? 'Ripristina l’accesso alle funzioni dell’account sospeso. I contenuti rimossi o nascosti devono essere esaminati separatamente.'
                : actionDescriptions[decision.action]}
            </p>
            <div className="mod-dialog-content">
              <span className="mod-kicker">
                {targetLabels[decision.item.targetType]}
              </span>
              <strong>
                {decision.item.title || 'Contenuto della community'}
              </strong>
            </div>
            {decision.action === 'APPROVE' ? (
              <div className="mod-approval-note">
                <CheckCheck size={21} />
                <p>
                  Non serve scrivere.
                  <span>
                    Motivo registrato automaticamente:{' '}
                    <strong>{approvalReason}</strong>
                  </span>
                </p>
              </div>
            ) : (
              <fieldset className="mod-reasons" disabled={busy}>
                <legend>Scegli il motivo</legend>
                {[...(reasons[decision.action] || []), 'other'].map(
                  (choice) => (
                    <label key={choice}>
                      <input
                        type="radio"
                        name="moderation-reason"
                        value={choice}
                        checked={chosenReason === choice}
                        onChange={() => setChosenReason(choice)}
                        required
                      />
                      {choice === 'other' ? 'Altro motivo' : choice}
                    </label>
                  ),
                )}
                {chosenReason === 'other' && (
                  <label className="mod-custom-reason">
                    Spiega il motivo
                    <textarea
                      minLength={5}
                      maxLength={2000}
                      required
                      rows={3}
                      value={customReason}
                      onChange={(event) => setCustomReason(event.target.value)}
                      placeholder="Scrivi una breve spiegazione (almeno 5 caratteri)"
                    />
                  </label>
                )}
              </fieldset>
            )}
            {decisionError && (
              <p className="mod-warning" role="alert">
                {decisionError}
              </p>
            )}
            <div className="mod-dialog-actions">
              <button
                type="button"
                className="mod-button mod-secondary"
                disabled={busy}
                onClick={() => setDecision(null)}
              >
                Annulla
              </button>
              <button
                type="submit"
                className={`mod-button ${decision.action === 'APPROVE' || decision.action === 'RESTORE' ? 'mod-primary' : 'mod-danger'}`}
                disabled={
                  busy ||
                  Boolean(decisionError) ||
                  !canSubmitDecision(
                    decision.item,
                    decision.action,
                    reason,
                    true,
                  )
                }
              >
                {busy ? (
                  <>
                    <LoaderCircle size={18} className="spin" />
                    Salvataggio…
                  </>
                ) : decision.action === 'APPROVE' ? (
                  'Sì, pubblica'
                ) : (
                  'Conferma decisione'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
