// Standalone Vite app: native images and explicit ARIA roles are intentional.
// The scrollable table must be keyboard focusable, including before its content overflows.
/* eslint-disable next/no-img-element, jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-tabindex */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldX,
  Smartphone,
  Sparkles,
  Store,
  Users,
  X,
} from 'lucide-react';
import {
  adminEndpoint,
  clearStoredSession,
  friendlyAuthError,
  parseDashboard,
  supabase,
  type DashboardData,
} from './api';

const numbers = new Intl.NumberFormat('it-IT');
const dateTime = new Intl.DateTimeFormat('it-IT', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Europe/Rome',
});
const shortDate = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Rome',
});
const longDate = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Rome',
});
const formatDate = (value: string | null) =>
  value ? dateTime.format(new Date(value)) : 'Mai registrato';
const chartDate = (value: string) => new Date(`${value}T12:00:00+01:00`);
type LoadStatus = 'idle' | 'loading' | 'ready' | 'forbidden' | 'error';

async function withDeadline<T>(
  promise: PromiseLike<T>,
  milliseconds = 13_000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <img
        src={`${import.meta.env.BASE_URL}cosmora-app-icon.png`}
        alt=""
        width="44"
        height="44"
      />
      <div>
        <strong>COSMORA</strong>
        <span>AMMINISTRAZIONE</span>
      </div>
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <span className="spinner-label" role="status">
      <LoaderCircle className="spin" size={18} />
      {label}
    </span>
  );
}

function Login({
  busy,
  error,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  onSubmit: (email: string, password: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(email.trim(), password);
  }
  return (
    <main className="login-layout">
      <div className="login-story">
        <Brand />
        <div className="login-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="orbit-core">
            <Sparkles size={48} strokeWidth={1.3} />
          </div>
          <span className="orbit-dot dot-one" />
          <span className="orbit-dot dot-two" />
          <span className="orbit-dot dot-three" />
        </div>
        <div className="login-copy">
          <span className="eyebrow">IL TUO UNIVERSO, IN NUMERI</span>
          <h1>
            Uno sguardo sulla
            <br />
            community.
          </h1>
          <p>
            Iscrizioni, attività e persone.
            <br />I dati di COSMORA, in un unico spazio riservato.
          </p>
        </div>
        <div className="story-footer">
          <ShieldCheck size={16} /> Accesso riservato agli amministratori
          autorizzati
        </div>
      </div>
      <div className="login-panel">
        <div className="login-card">
          <div className="login-lock">
            <LockKeyhole size={23} />
          </div>
          <span className="eyebrow">BENVENUTO SU COSMORA</span>
          <h2>Accedi alla console</h2>
          <p className="muted">
            Usa l’email e la password del tuo account COSMORA autorizzato.
          </p>
          <form onSubmit={submit} aria-busy={busy}>
            <label htmlFor="email">Email</label>
            <div className="input-icon">
              <Mail size={18} />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="nome@esempio.it"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy}
              />
            </div>
            <label htmlFor="password">Password</label>
            <div className="input-icon">
              <LockKeyhole size={18} />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="La password del tuo account"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
              />
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary login-submit"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <Spinner label="Accesso in corso…" />
              ) : (
                <>
                  Accedi <ArrowRight size={18} />
                </>
              )}
            </button>
            <a
              className="recovery-link"
              href="https://cosmora.kreluna.it/auth/recovery"
              target="_blank"
              rel="noopener noreferrer"
            >
              Imposta o recupera la password <ExternalLink size={11} />
              <span className="sr-only"> (si apre in una nuova scheda)</span>
            </a>
          </form>
          <div className="login-note">
            <ShieldCheck size={18} />
            <p>
              La console è in sola lettura. L’accesso ai dati richiede
              un’autorizzazione amministrativa verificata dal server.
            </p>
          </div>
        </div>
        <span className="login-copyright">
          COSMORA · Console amministrativa
        </span>
      </div>
    </main>
  );
}

function Metric({
  title,
  value,
  description,
  icon,
  accent = 'violet',
}: {
  title: string;
  value: number;
  description: string;
  icon: ReactNode;
  accent?: string;
}) {
  return (
    <article className={`metric ${accent}`}>
      <div className="metric-top">
        <span>{title}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <strong>{numbers.format(value)}</strong>
      <p>{description}</p>
    </article>
  );
}

function RegistrationChart({ days }: { days: DashboardData['registrations'] }) {
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const max = Math.max(1, ...days.map((day) => day.count));
  const ceiling = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const width = 820,
    height = 210,
    left = 30,
    right = 10,
    top = 10,
    bottom = 30;
  const graphHeight = height - top - bottom;
  const step = (width - left - right) / Math.max(1, days.length);
  return (
    <section
      className="panel chart-panel"
      aria-labelledby="registrations-title"
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">CRESCITA DELLA COMMUNITY</span>
          <h2 id="registrations-title">Nuove iscrizioni</h2>
        </div>
        <span className="period-chip">
          <CalendarDays size={14} />
          Ultimi 30 giorni
        </span>
      </div>
      <div className="chart-total">
        <strong>{numbers.format(total)}</strong>
        <span>nuovi account nel periodo</span>
      </div>
      <div className="chart-wrap">
        <svg
          className="registration-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby="chart-title chart-description"
        >
          <title id="chart-title">
            Nuove iscrizioni negli ultimi 30 giorni
          </title>
          <desc id="chart-description">
            Totale: {numbers.format(total)} nuovi account. I valori di ogni
            giorno sono disponibili nella tabella sotto il grafico.
          </desc>
          <defs>
            <linearGradient id="bar-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#c386ff" />
              <stop offset="100%" stopColor="#7954db" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((tick) => {
            const y = top + graphHeight * (1 - tick / 4);
            return (
              <g key={tick}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y}
                  y2={y}
                  className="chart-grid"
                />
                <text
                  x={left - 9}
                  y={y + 4}
                  textAnchor="end"
                  className="chart-label"
                >
                  {numbers.format((ceiling * tick) / 4)}
                </text>
              </g>
            );
          })}
          {days.map((day, index) => {
            const barHeight = (day.count / ceiling) * graphHeight;
            return (
              <g key={day.date}>
                <rect
                  x={left + index * step + step * 0.18}
                  y={top + graphHeight - barHeight}
                  width={step * 0.64}
                  height={barHeight}
                  rx={Math.min(4, barHeight / 2)}
                  fill="url(#bar-gradient)"
                >
                  <title>
                    {longDate.format(chartDate(day.date))}: {day.count}{' '}
                    iscrizioni
                  </title>
                </rect>
                {(index === 0 ||
                  index === days.length - 1 ||
                  (index % 7 === 0 && days.length - 1 - index > 3)) && (
                  <text
                    x={left + index * step + step / 2}
                    y={height - 5}
                    textAnchor={
                      index === 0
                        ? 'start'
                        : index === days.length - 1
                          ? 'end'
                          : 'middle'
                    }
                    className="chart-label"
                  >
                    {shortDate.format(chartDate(day.date))}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {total === 0 && (
        <p className="chart-empty">Nessuna nuova iscrizione nel periodo.</p>
      )}
      <details className="chart-details">
        <summary>Mostra i dati giornalieri</summary>
        <div className="daily-values">
          <table>
            <caption className="sr-only">
              Iscrizioni per giorno, fuso orario Europe/Rome
            </caption>
            <thead>
              <tr>
                <th scope="col">Giorno</th>
                <th scope="col">Iscrizioni</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.date}>
                  <th scope="row">{longDate.format(chartDate(day.date))}</th>
                  <td>{numbers.format(day.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function CommunityActivity({ summary }: { summary: DashboardData['summary'] }) {
  const rows = [
    {
      label: 'Post',
      count: summary.posts,
      icon: <MessageSquare size={18} />,
      color: 'violet',
    },
    {
      label: 'Annunci',
      count: summary.listings,
      icon: <Store size={18} />,
      color: 'pink',
    },
    {
      label: 'Squad',
      count: summary.squads,
      icon: <Users size={18} />,
      color: 'blue',
    },
    {
      label: 'Incontri',
      count: summary.meetups,
      icon: <CalendarDays size={18} />,
      color: 'orange',
    },
  ];
  return (
    <section className="panel activity-panel" aria-labelledby="activity-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">DENTRO COSMORA</span>
          <h2 id="activity-title">Attività della community</h2>
        </div>
        <Activity size={20} className="muted" />
      </div>
      <div className="activity-list">
        {rows.map((row) => (
          <div className="activity-row" key={row.label}>
            <span className={`activity-icon ${row.color}`}>{row.icon}</span>
            <span>{row.label}</span>
            <strong>{numbers.format(row.count)}</strong>
          </div>
        ))}
      </div>
      <div className="reports-row">
        <span>
          <ShieldCheck size={16} />
          Segnalazioni aperte
        </span>
        <strong
          className={
            summary.openReports > 0
              ? 'report-count has-reports'
              : 'report-count'
          }
        >
          {numbers.format(summary.openReports)}
        </strong>
      </div>
    </section>
  );
}

function UsersTable({
  users,
  loading,
  query,
  input,
  onInput,
  onSearch,
  onClear,
  onPage,
}: {
  users: DashboardData['users'];
  loading: boolean;
  query: string;
  input: string;
  onInput: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onPage: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(users.total / users.pageSize));
  const first = users.items.length ? (users.page - 1) * users.pageSize + 1 : 0;
  const last = users.items.length ? first + users.items.length - 1 : 0;
  return (
    <section
      id="users"
      className="panel users-panel"
      aria-labelledby="users-title"
      aria-busy={loading}
    >
      <div className="users-heading">
        <div>
          <span className="eyebrow">LE PERSONE, AL CENTRO</span>
          <h2 id="users-title">
            Iscritti{' '}
            <span className="count-chip">{numbers.format(users.total)}</span>
          </h2>
        </div>
        <form
          className="search-form"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
        >
          <label className="sr-only" htmlFor="user-search">
            Cerca iscritti per nome o email
          </label>
          <div className="search-input">
            <Search size={17} />
            <input
              id="user-search"
              placeholder="Cerca nome o email…"
              maxLength={200}
              value={input}
              onChange={(event) => onInput(event.target.value)}
            />
            {input && (
              <button
                type="button"
                className="clear-search"
                aria-label="Cancella ricerca"
                onClick={onClear}
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button type="submit" className="button subtle" disabled={loading}>
            Cerca
          </button>
        </form>
      </div>
      {query && (
        <p className="search-summary" role="status">
          Risultati per “{query}” ·{' '}
          <button type="button" onClick={onClear}>
            Mostra tutti
          </button>
        </p>
      )}
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Tabella iscritti; scorri orizzontalmente sui dispositivi piccoli"
      >
        <table className="users-table">
          <caption className="sr-only">
            Iscritti COSMORA, pagina {users.page} di {pageCount}. Date e orari
            nel fuso Europe/Rome.
          </caption>
          <thead>
            <tr>
              <th scope="col">Utente</th>
              <th scope="col">Iscrizione</th>
              <th scope="col">Ultimo accesso autenticato</th>
              <th scope="col">Stato</th>
            </tr>
          </thead>
          <tbody>
            {users.items.map((user) => (
              <tr key={user.id}>
                <td
                  aria-label={
                    user.displayName || user.email || 'Utente senza nome'
                  }
                >
                  <div className="user-cell">
                    <span className="avatar" aria-hidden="true">
                      {(user.displayName || user.email || '?')
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>
                    <div>
                      <strong>
                        {user.displayName || 'Nome non disponibile'}
                      </strong>
                      <span>{user.email || 'Email non disponibile'}</span>
                      {user.country && <small>{user.country}</small>}
                    </div>
                  </div>
                </td>
                <td className="date-cell">{formatDate(user.createdAt)}</td>
                <td className="date-cell">{formatDate(user.lastSignInAt)}</td>
                <td>
                  <div className="user-statuses">
                    {user.suspended && (
                      <span className="status-badge suspended">Sospeso</span>
                    )}
                    {user.deletionPending && (
                      <span className="status-badge pending">
                        Eliminazione richiesta
                      </span>
                    )}
                    <span
                      className={`status-badge ${user.emailConfirmed ? 'confirmed' : 'pending'}`}
                    >
                      {user.emailConfirmed ? (
                        <Check size={12} />
                      ) : (
                        <Clock3 size={12} />
                      )}
                      {user.emailConfirmed
                        ? 'Email confermata'
                        : 'Email da confermare'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.items.length === 0 && (
          <div className="empty-users">
            <Search size={28} />
            <h3>
              {query ? 'Nessun iscritto trovato' : 'Ancora nessun iscritto'}
            </h3>
            <p>
              {query
                ? 'Prova con un altro nome o indirizzo email.'
                : 'Gli account appariranno qui dopo la registrazione.'}
            </p>
          </div>
        )}
      </div>
      <div className="table-footer">
        <span>
          {numbers.format(first)}–{numbers.format(last)} di{' '}
          {numbers.format(users.total)} {query ? 'risultati' : 'iscritti'}
        </span>
        <div className="pagination">
          <button
            type="button"
            className="page-button"
            disabled={loading || users.page <= 1}
            onClick={() => onPage(users.page - 1)}
            aria-label="Pagina precedente"
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            Pagina {users.page} di {pageCount}
          </span>
          <button
            type="button"
            className="page-button"
            disabled={loading || users.page >= pageCount}
            onClick={() => onPage(users.page + 1)}
            aria-label="Pagina successiva"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <p className="table-note">
        <Clock3 size={14} />
        L’ultimo accesso autenticato è registrato dal servizio di
        autenticazione; non rappresenta ogni apertura dell’app.
      </p>
    </section>
  );
}

function Stores() {
  return (
    <section
      id="stores"
      className="panel stores-panel"
      aria-labelledby="stores-title"
    >
      <div className="stores-copy">
        <span className="stores-icon">
          <ArrowDownToLine size={23} />
        </span>
        <div>
          <h2 id="stores-title">E i download dell’app?</h2>
          <p>
            Download e iscritti sono dati diversi. Le statistiche dei download
            sono disponibili negli store.
          </p>
        </div>
      </div>
      <div className="store-links">
        <a
          className="button subtle"
          href="https://appstoreconnect.apple.com/apps/6809232374"
          target="_blank"
          rel="noopener noreferrer"
        >
          App Store Connect <ExternalLink size={14} />
          <span className="sr-only"> (si apre in una nuova scheda)</span>
        </a>
        <a
          className="button subtle"
          href="https://play.google.com/console/u/0/developers/8769136787246988849/app/4974190705613393494/statistics"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Play Console <ExternalLink size={14} />
          <span className="sr-only"> (si apre in una nuova scheda)</span>
        </a>
      </div>
    </section>
  );
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(!supabase);
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const account = useRef<string | null>(null);
  const requestVersion = useRef(0);
  const logoutInProgress = useRef(false);
  const currentToken = useRef<string | null>(null);
  const accessToken = session?.access_token;

  const acceptSession = useCallback((next: Session | null) => {
    const nextAccount = next?.user.id ?? null;
    if (account.current !== nextAccount || !next) {
      account.current = nextAccount;
      requestVersion.current += 1;
      setData(null);
      setStatus('idle');
      setInput('');
      setQuery('');
      setPage(1);
      setError('');
    }
    if (next && currentToken.current !== next.access_token) {
      setStatus('loading');
      setError('');
    }
    currentToken.current = next?.access_token ?? null;
    setSession(next);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let observedAuthEvent = false;
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, next) => {
        // Keep this callback synchronous: awaiting auth methods here can deadlock.
        if (!active || logoutInProgress.current) return;
        observedAuthEvent = true;
        acceptSession(next);
        setInitialized(true);
      },
    );
    withDeadline(supabase.auth.getSession())
      .then(({ data: result, error: sessionError }) => {
        if (!active || observedAuthEvent) return;
        if (sessionError) {
          clearStoredSession();
          setAuthError('Sessione non disponibile. Accedi di nuovo.');
        }
        acceptSession(sessionError ? null : result.session);
        setInitialized(true);
      })
      .catch(() => {
        if (!active || observedAuthEvent) return;
        setAuthError(
          'Il recupero della sessione ha impiegato troppo tempo. Verifica la connessione e accedi di nuovo.',
        );
        setInitialized(true);
      });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [acceptSession]);

  const logout = useCallback(() => {
    logoutInProgress.current = true;
    setAuthPending(true);
    acceptSession(null);
    setAuthError(null);
    clearStoredSession();
    // Clear private UI immediately, even when the auth service is unavailable.
    if (supabase)
      void withDeadline(supabase.auth.signOut({ scope: 'local' }))
        .catch(() => {})
        .finally(() => {
          clearStoredSession();
          logoutInProgress.current = false;
          setAuthPending(false);
        });
  }, [acceptSession]);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    const version = ++requestVersion.current;
    const timer = setTimeout(() => controller.abort(), 20_000);
    let active = true;
    const current = () => active && version === requestVersion.current;
    const endpoint = new URL(adminEndpoint);
    endpoint.searchParams.set('page', String(page));
    if (query) endpoint.searchParams.set('q', query);
    void fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit',
    })
      .then(async (response) => {
        if (!current()) return;
        if (response.status === 401) {
          logout();
          setAuthError(
            'La sessione è scaduta o non è più valida. Accedi di nuovo.',
          );
          return;
        }
        if (response.status === 403) {
          setData(null);
          setStatus('forbidden');
          return;
        }
        if (!response.ok) throw new Error(`http-${response.status}`);
        const result = parseDashboard(await response.json());
        if (!current()) return;
        setData(result);
        setStatus('ready');
      })
      .catch((reason: unknown) => {
        if (!current()) return;
        setData(null);
        setStatus('error');
        setError(
          reason instanceof Error && reason.message === 'invalid-response'
            ? 'Il server ha restituito dati in un formato inatteso. Riprova tra poco.'
            : controller.signal.aborted
              ? 'Il caricamento ha impiegato troppo tempo. Verifica la connessione e riprova.'
              : 'Impossibile caricare i dati. Verifica la connessione e che il servizio amministrativo sia disponibile.',
        );
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [accessToken, page, query, refresh, logout]);

  async function login(email: string, password: string) {
    if (!supabase || authPending) return;
    setAuthPending(true);
    setAuthError(null);
    try {
      const result = await withDeadline(
        supabase.auth.signInWithPassword({ email, password }),
      );
      if (result.error) setAuthError(friendlyAuthError(result.error));
      else acceptSession(result.data.session);
    } catch {
      setAuthError(
        'Accesso non riuscito entro il tempo previsto. Verifica la connessione e riprova.',
      );
    } finally {
      setAuthPending(false);
    }
  }

  if (!supabase)
    return (
      <main className="standalone-state">
        <Brand />
        <div className="state-card">
          <LockKeyhole size={34} />
          <h1>Configurazione necessaria</h1>
          <p>
            La console non dispone della configurazione pubblica di
            autenticazione. Configura l’URL Supabase e la chiave pubblica anon
            prima di avviarla.
          </p>
        </div>
      </main>
    );
  if (!initialized)
    return (
      <main className="standalone-state">
        <Brand />
        <Spinner label="Verifica della sessione…" />
      </main>
    );
  if (!session)
    return <Login busy={authPending} error={authError} onSubmit={login} />;

  const loading = status === 'loading';
  const refreshData = () => {
    setStatus('loading');
    setError('');
    setRefresh((value) => value + 1);
  };
  const submitSearch = () => {
    setPage(1);
    setQuery(input.trim());
    refreshData();
  };
  const clearSearch = () => {
    setInput('');
    setQuery('');
    setPage(1);
    if (query || page !== 1) {
      setStatus('loading');
      setError('');
    }
  };
  return (
    <div className="app-layout">
      <a href="#main" className="skip-link">
        Vai al contenuto
      </a>
      <aside className="sidebar">
        <Brand compact />
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav aria-label="Navigazione amministrazione">
          <a href="#overview" className="nav-link">
            <LayoutDashboard size={19} />
            Panoramica
            <span className="nav-dot" />
          </a>
          <a href="#users">
            <Users size={19} />
            Iscritti
          </a>
          <a href="#stores">
            <ArrowDownToLine size={19} />
            Download negli store
            <ExternalLink size={13} />
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="readonly-box">
            <ShieldCheck size={20} />
            <div>
              <strong>Sola lettura</strong>
              <p>Osserva i dati della community in uno spazio riservato.</p>
            </div>
          </div>
          <div className="account-box">
            <div className="account-avatar">
              {(session.user.email || 'A').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <strong>Account connesso</strong>
              <span title={session.user.email}>
                {session.user.email || 'Account COSMORA'}
              </span>
            </div>
            <button
              onClick={logout}
              className="logout-icon"
              aria-label="Esci dall’account"
              title="Esci"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <main id="main" className="main-content">
        <header id="overview" className="page-heading">
          <div>
            <div className="breadcrumb">
              COSMORA <span>/</span> Console amministrativa
            </div>
            <h1>
              Panoramica <span className="heading-dot" />
            </h1>
            <p>Un punto di vista sulla tua community.</p>
          </div>
          <div className="heading-actions">
            <span className="readonly-chip">
              <LockKeyhole size={12} />
              Sola lettura
            </span>
            <button
              className="button subtle refresh-button"
              onClick={refreshData}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              {loading ? 'Caricamento…' : 'Aggiorna'}
            </button>
          </div>
        </header>
        {status === 'forbidden' ? (
          <section className="state-card access-state" role="alert">
            <span className="state-symbol">
              <ShieldX size={32} />
            </span>
            <span className="eyebrow">AREA RISERVATA</span>
            <h2>Account non autorizzato</h2>
            <p>
              L’accesso al tuo account è riuscito, ma questo account non dispone
              dell’autorizzazione amministrativa di COSMORA.
            </p>
            <p className="muted">
              Contatta il responsabile del progetto oppure accedi con un account
              autorizzato.
            </p>
            <button className="button primary" onClick={logout}>
              <LogOut size={16} />
              Esci e cambia account
            </button>
          </section>
        ) : status === 'error' ? (
          <section className="state-card access-state" role="alert">
            <span className="state-symbol">
              <Activity size={32} />
            </span>
            <h2>Dati non disponibili</h2>
            <p>{error}</p>
            <button className="button primary" onClick={refreshData}>
              <RefreshCw size={16} />
              Riprova
            </button>
          </section>
        ) : !data ? (
          <div className="dashboard-loading" aria-busy="true">
            <Spinner label="Verifica dell’autorizzazione e caricamento dei dati…" />
            <div className="skeleton-metrics" aria-hidden="true">
              {[0, 1, 2, 3].map((item) => (
                <div className="skeleton" key={item} />
              ))}
            </div>
            <div className="skeleton skeleton-chart" aria-hidden="true" />
          </div>
        ) : (
          <div
            className={
              loading ? 'dashboard-content refreshing' : 'dashboard-content'
            }
            aria-busy={loading}
          >
            <div className="source-line">
              <span className="source-dot" />
              <span>Dati del backend COSMORA</span>
              <span className="source-divider">·</span>
              <span>Aggiornati il {formatDate(data.generatedAt)}</span>
              <span className="timezone">Europe/Rome</span>
            </div>
            <section className="metrics-grid" aria-label="Riepilogo iscritti">
              <Metric
                title="Iscritti totali"
                value={data.summary.totalUsers}
                description="Account registrati su COSMORA"
                icon={<Users size={20} />}
              />
              <Metric
                title="Email confermate"
                value={data.summary.confirmedUsers}
                description="Account con indirizzo verificato"
                icon={<CheckCircle2 size={20} />}
                accent="green"
              />
              <Metric
                title="Nuovi iscritti · 30g"
                value={data.summary.newUsers30d}
                description={`${numbers.format(data.summary.newUsers7d)} negli ultimi 7 giorni`}
                icon={<Sparkles size={20} />}
                accent="pink"
              />
              <Metric
                title="Utenti con accesso · 30g"
                value={data.summary.signIns30d}
                description="Con accesso autenticato nel periodo"
                icon={<Activity size={20} />}
                accent="blue"
              />
            </section>
            <p className="registration-note">
              Gli iscritti totali comprendono anche eventuali account tecnici e
              di revisione.
            </p>
            <div className="insights-grid">
              <RegistrationChart days={data.registrations} />
              <CommunityActivity summary={data.summary} />
            </div>
            <section className="push-strip" aria-label="Dispositivi push">
              <span className="push-icon">
                <Smartphone size={19} />
              </span>
              <div>
                <strong>
                  {numbers.format(data.summary.pushDevices)} dispositivi push
                  registrati
                </strong>
                <span>
                  Registrazioni dei dispositivi, non download dell’app
                </span>
              </div>
              <div className="platform-counts">
                <span>
                  iOS <strong>{numbers.format(data.summary.pushIOS)}</strong>
                </span>
                <span>
                  Android{' '}
                  <strong>{numbers.format(data.summary.pushAndroid)}</strong>
                </span>
              </div>
            </section>
            <UsersTable
              users={data.users}
              loading={loading}
              query={query}
              input={input}
              onInput={setInput}
              onSearch={submitSearch}
              onClear={clearSearch}
              onPage={(nextPage) => {
                setStatus('loading');
                setError('');
                setPage(nextPage);
              }}
            />
            <Stores />
          </div>
        )}
        <footer className="page-footer">
          <span>COSMORA · Amministrazione</span>
          <span>
            <ShieldCheck size={13} /> Dati riservati · Sola lettura
          </span>
        </footer>
      </main>
    </div>
  );
}
