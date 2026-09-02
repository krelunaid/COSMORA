export type TransactionKind = 'sale' | 'rental' | 'commission';

export const PLATFORM_FEE_RULES = {
  sale: {
    rateBps: 1000,
    label: 'Vendita',
    description: '10% sul prezzo del prodotto',
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

  return {
    kind,
    amountCents: safeAmount,
    depositCents: safeDeposit,
    rateBps,
    platformFeeCents,
    sellerNetCents: safeAmount - platformFeeCents,
    buyerTotalCents: safeAmount + safeDeposit,
  };
}

export function cents(value: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value / 100);
}
