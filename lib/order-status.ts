// A shared vocabulary prevents refunds and failures being displayed as pending.
export function orderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pagamento da confermare',
    paid: 'Pagamento confermato',
    expired: 'Sessione scaduta',
    failed: 'Pagamento non riuscito',
    refunded: 'Rimborsato',
    partially_refunded: 'Rimborso parziale',
  };
  return labels[status] ?? 'Stato da verificare con l’assistenza';
}
