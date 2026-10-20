export type TransactionKind = 'sale' | 'rental' | 'commission';

export const SALE_FEE_POLICY_VERSION = '2026-10-09-sale-5pct';

export const PLATFORM_FEE_RULES = {
  sale: {
    rateBps: 500,
    label: 'Vendita',
    description: '5% sul prezzo del prodotto; spedizione esclusa e costi del pagamento separati',
  },
  rental: {
    rateBps: 1200,
    label: 'Noleggio',
    description: '12% sul prezzo del noleggio; cauzione esclusa',
  },
  commission: {
    rateBps: 1000,
    label: 'Commissione personalizzata',
    description: '10% sul lavoro concordato',
  },
} as const;

export function calculateMarketplaceQuote({
  kind,
  amountCents,
  depositCents = 0,
}: {
  kind: TransactionKind;
  amountCents: number;
  depositCents?: number;
}) {
  const safeAmount = Math.max(0, Math.round(amountCents));
  const safeDeposit = Math.max(0, Math.round(depositCents));
  const rateBps = PLATFORM_FEE_RULES[kind].rateBps;
  const platformFeeCents = Math.round((safeAmount * rateBps) / 10_000);
  const sellerAmountBeforeProcessingFeesCents = safeAmount - platformFeeCents;

  return {
    kind,
    amountCents: safeAmount,
    depositCents: safeDeposit,
    rateBps,
    platformFeeCents,
    sellerAmountBeforeProcessingFeesCents,
    // Compatibility alias: this amount is before Stripe fees, not the final payout.
    sellerNetCents: sellerAmountBeforeProcessingFeesCents,
    buyerTotalCents: safeAmount + safeDeposit,
  };
}

export function cents(value: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value / 100);
}
