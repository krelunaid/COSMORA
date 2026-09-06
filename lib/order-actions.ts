export type OrderAction =
  | { action: 'ship'; carrier: string; trackingNumber: string }
  | { action: 'received' }
  | { action: 'report'; reason: string };
export type FulfillmentOrder = {
  buyer_id: string; seller_id: string; status: string;
  fulfillment_status: string; issue_opened_at: string | null;
};

export function orderActionPatch(order: FulfillmentOrder, userId: string, action: OrderAction, now: string) {
  if (order.status !== 'paid') throw new Error('Il pagamento deve essere confermato prima di gestire la consegna.');
  if (action.action === 'ship') {
    if (userId !== order.seller_id) throw new Error('Solo il venditore può registrare la spedizione.');
    if (order.fulfillment_status !== 'awaiting_shipment' || order.issue_opened_at)
      throw new Error('La spedizione non può essere modificata in questo stato.');
    return { fulfillment_status: 'shipped', carrier: action.carrier, tracking_number: action.trackingNumber };
  }
  if (userId !== order.buyer_id) throw new Error('Questa operazione è riservata all’acquirente.');
  if (action.action === 'received') {
    if (order.fulfillment_status !== 'shipped') throw new Error('Non risulta ancora una spedizione.');
    return { fulfillment_status: 'delivered' };
  }
  if (order.issue_opened_at) throw new Error('È già presente una segnalazione per questo ordine.');
  return { issue_reason: action.reason, issue_opened_at: now };
}
