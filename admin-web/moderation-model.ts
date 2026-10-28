import {
  moderationActions,
  moderationTargetTypes,
  type ModerationAction,
  type ModerationItem,
  type ModerationQueue,
} from '../lib/moderation.ts';

export type AdminModerationItem = ModerationItem & {
  authorDisplayName?: string;
  createdAt?: string;
};
export type AdminModerationQueue = Omit<ModerationQueue, 'items'> & {
  items: AdminModerationItem[];
};
export type HistoryEntry = {
  id: string;
  target_type: string;
  target_id: string;
  action: ModerationAction;
  reason: string;
  created_at: string;
  previous_state: { status?: string } | null;
  next_state: { status?: string } | null;
};
export const approvalReason = 'Contenuto conforme alle regole della community.';
export const actionLabels: Record<ModerationAction, string> = {
  APPROVE: 'Approva',
  REJECT: 'Rifiuta',
  HIDE: 'Nascondi',
  RESTORE: 'Ripristina',
  SUSPEND: 'Sospendi account',
  DISMISS: 'Archivia segnalazioni non fondate',
  RESOLVE: 'Chiudi segnalazioni',
};
export const targetLabels: Record<string, string> = {
  POST: 'Post',
  SQUAD: 'Crew',
  MEETUP: 'Incontro',
  LISTING: 'Annuncio',
  USER: 'Utente',
};
export const statusLabels: Record<string, string> = {
  DRAFT: 'Bozza',
  PENDING_REVIEW: 'Da approvare',
  ACTIVE: 'Attivo',
  PUBLISHED: 'Pubblicato',
  FULL: 'Completo',
  ARCHIVED: 'Archiviato',
  SUSPENDED: 'Sospeso',
  REMOVED: 'Rimosso',
  MODERATED: 'Nascosto',
  SOLD: 'Venduto',
  MISSING: 'Non disponibile',
};
export const reportLabels: Record<string, string> = {
  SPAM: 'Spam',
  SCAM: 'Possibile truffa',
  HARASSMENT: 'Molestie',
  SEXUAL_CONTENT: 'Contenuti sessuali',
  HATE: 'Odio',
  VIOLENCE: 'Violenza',
  COPYRIGHT: 'Diritto d’autore',
  COUNTERFEIT: 'Contraffazione',
  OTHER: 'Altro',
};
export const reasons: Partial<Record<ModerationAction, string[]>> = {
  REJECT: [
    'Spam o pubblicità non pertinente',
    'Contenuto offensivo o inappropriato',
    'Dati personali esposti',
    'Possibile violazione dei diritti d’autore',
    'Contenuto non conforme alle regole della community',
  ],
  HIDE: [
    'Contenuto da verificare dopo una segnalazione',
    'Possibile violazione delle regole della community',
    'Dati personali da proteggere',
  ],
  RESTORE: [
    'Verifica completata: ripristino dello stato precedente',
    'Problema segnalato risolto dopo la verifica',
  ],
  SUSPEND: [
    'Violazioni ripetute delle regole della community',
    'Sospensione per proteggere la community dopo la verifica',
  ],
  DISMISS: [
    'Segnalazioni esaminate: nessuna violazione riscontrata',
    'Segnalazioni duplicate già esaminate',
  ],
  RESOLVE: [
    'Segnalazioni esaminate: nessuna modifica al contenuto necessaria',
    'Problema risolto senza modificare il contenuto',
  ],
};
export const actionDescriptions: Record<ModerationAction, string> = {
  APPROVE:
    'Il contenuto diventerà visibile alla community. Controlla tutto il testo e tutti i file prima di confermare.',
  REJECT:
    'Il contenuto verrà rifiutato e non sarà visibile alla community. Scegli il motivo da conservare nel registro.',
  HIDE: 'Il contenuto verrà nascosto alla community. Scegli il motivo della decisione.',
  RESTORE:
    'Ripristina lo stato precedente alla rimozione. Un contenuto già pubblico tornerà visibile.',
  SUSPEND:
    'Blocca l’accesso alle funzioni dell’account. L’eliminazione dell’account resta disponibile. I contenuti pubblici già caricati vanno esaminati separatamente.',
  DISMISS:
    'Archivia le segnalazioni presenti come non fondate. Il contenuto e lo stato dell’account restano invariati.',
  RESOLVE:
    'Chiude le segnalazioni presenti senza approvare, nascondere o modificare il contenuto e senza cambiare lo stato dell’account.',
};
export function itemKey(item: ModerationItem) {
  return `${item.targetType}:${item.targetId}`;
}
export function availableActions(item: ModerationItem): ModerationAction[] {
  const status = item.status.toUpperCase();
  const hidden = ['SUSPENDED', 'REMOVED', 'MODERATED'].includes(status);
  const actions: ModerationAction[] = ['MISSING', 'DRAFT', 'SOLD'].includes(
    status,
  )
    ? []
    : item.targetType === 'USER'
      ? [hidden ? 'RESTORE' : 'SUSPEND']
      : hidden
        ? ['RESTORE']
        : status === 'PENDING_REVIEW'
          ? ['APPROVE', 'REJECT']
          : ['HIDE', 'REJECT'];
  if (item.reports.length) actions.push('DISMISS', 'RESOLVE');
  return actions;
}
export function decisionReason(
  action: ModerationAction,
  selected: string,
  custom: string,
) {
  if (action === 'APPROVE') return approvalReason;
  if (selected === 'other') return custom.trim();
  return reasons[action]?.includes(selected) ? selected : '';
}
export function canSubmitDecision(
  item: ModerationItem,
  action: ModerationAction,
  reason: string,
  mediaReady: boolean,
) {
  return (
    availableActions(item).includes(action) &&
    reason.trim().length >= 5 &&
    reason.trim().length <= 2000 &&
    (action !== 'APPROVE' || (!item.mediaUnavailable && mediaReady))
  );
}
function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
const uuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const text = (value: unknown): value is string => typeof value === 'string';
const date = (value: unknown): value is string =>
  text(value) && Number.isFinite(Date.parse(value));
const mediaURL = (value: unknown) => {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:';
  } catch {
    return false;
  }
};
export function parseModerationQueue(value: unknown): AdminModerationQueue {
  if (
    !isObject(value) ||
    !Array.isArray(value.items) ||
    value.items.length > 1000 ||
    typeof value.more !== 'boolean'
  )
    throw new Error('invalid-response');
  for (const item of value.items) {
    if (
      !isObject(item) ||
      !moderationTargetTypes.includes(item.targetType as never) ||
      !uuid(item.targetId) ||
      !text(item.status) ||
      !text(item.title) ||
      !text(item.body) ||
      !Array.isArray(item.media) ||
      !Array.isArray(item.reports) ||
      (item.authorId !== undefined && !uuid(item.authorId)) ||
      (item.authorDisplayName !== undefined && !text(item.authorDisplayName)) ||
      (item.createdAt !== undefined && !date(item.createdAt)) ||
      (item.mediaUnavailable !== undefined &&
        typeof item.mediaUnavailable !== 'boolean')
    )
      throw new Error('invalid-response');
    for (const media of item.media)
      if (
        !isObject(media) ||
        !mediaURL(media.url) ||
        !['IMAGE', 'VIDEO'].includes(String(media.type))
      )
        throw new Error('invalid-response');
    for (const report of item.reports) {
      if (
        !isObject(report) ||
        !uuid(report.id) ||
        !text(report.reason) ||
        (report.details !== null && !text(report.details)) ||
        !date(report.created_at) ||
        (report.contextTargetId != null && !uuid(report.contextTargetId)) ||
        (report.contextTargetType != null &&
          !moderationTargetTypes.includes(report.contextTargetType as never)) ||
        (report.source !== undefined &&
          report.source !== 'USER_REPORT' &&
          report.source !== 'USER_BLOCK')
      )
        throw new Error('invalid-response');
      if (
        report.contextMessage != null &&
        (!isObject(report.contextMessage) ||
          !text(report.contextMessage.body) ||
          !date(report.contextMessage.created_at))
      )
        throw new Error('invalid-response');
    }
  }
  return value as unknown as AdminModerationQueue;
}
export function parseModerationHistory(value: unknown): HistoryEntry[] {
  if (
    !isObject(value) ||
    !Array.isArray(value.history) ||
    value.history.length > 100
  )
    throw new Error('invalid-response');
  for (const entry of value.history) {
    if (
      !isObject(entry) ||
      !uuid(entry.id) ||
      !uuid(entry.target_id) ||
      !text(entry.target_type) ||
      !moderationActions.includes(entry.action as never) ||
      !text(entry.reason) ||
      !date(entry.created_at)
    )
      throw new Error('invalid-response');
    for (const state of [entry.previous_state, entry.next_state])
      if (
        state !== null &&
        (!isObject(state) ||
          (state.status !== undefined && !text(state.status)))
      )
        throw new Error('invalid-response');
  }
  return value.history as HistoryEntry[];
}
