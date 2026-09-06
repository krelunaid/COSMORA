alter table public.marketplace_orders
  add column fulfillment_status text not null default 'awaiting_shipment'
    check (fulfillment_status in ('awaiting_shipment', 'shipped', 'delivered')),
  add column carrier text,
  add column tracking_number text,
  add column issue_reason text,
  add column issue_opened_at timestamptz,
  add column fulfillment_version integer not null default 0;

-- Preserve owner-only reads; all mutations go through authenticated server routes.
alter table public.marketplace_orders enable row level security;
revoke insert, update, delete on public.marketplace_orders from anon, authenticated;
