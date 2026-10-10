import type { Locale } from './i18n/config';
// A shared vocabulary prevents refunds and failures being displayed as pending.
export function orderStatusLabel(
  status: string,
  locale: Locale = 'it',
): string {
  const labels: Record<string, string> = {
    pending: 'Pagamento da confermare',
    paid: 'Pagamento confermato',
    expired: 'Sessione scaduta',
    failed: 'Pagamento non riuscito',
    refunded: 'Rimborsato',
    partially_refunded: 'Rimborso parziale',
  };
  const translated: Record<Exclude<Locale, 'it'>, Record<string, string>> = {
    en: {
      pending: 'Payment awaiting confirmation',
      paid: 'Payment confirmed',
      expired: 'Session expired',
      failed: 'Payment failed',
      refunded: 'Refunded',
      partially_refunded: 'Partially refunded',
      unknown: 'Check the status with support',
    },
    fr: {
      pending: 'Paiement à confirmer',
      paid: 'Paiement confirmé',
      expired: 'Session expirée',
      failed: 'Échec du paiement',
      refunded: 'Remboursé',
      partially_refunded: 'Remboursement partiel',
      unknown: 'Statut à vérifier avec l’assistance',
    },
    de: {
      pending: 'Zahlung zu bestätigen',
      paid: 'Zahlung bestätigt',
      expired: 'Sitzung abgelaufen',
      failed: 'Zahlung fehlgeschlagen',
      refunded: 'Erstattet',
      partially_refunded: 'Teilweise erstattet',
      unknown: 'Status mit dem Support klären',
    },
    es: {
      pending: 'Pago pendiente de confirmación',
      paid: 'Pago confirmado',
      expired: 'Sesión caducada',
      failed: 'Pago fallido',
      refunded: 'Reembolsado',
      partially_refunded: 'Reembolso parcial',
      unknown: 'Consulta el estado con ayuda',
    },
  };
  return locale === 'it'
    ? (labels[status] ?? 'Stato da verificare con l’assistenza')
    : (translated[locale][status] ?? translated[locale].unknown);
}
