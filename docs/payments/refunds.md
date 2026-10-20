# Test refunds: partial amounts and remaining balance

Implementation prepared in source. No migration has been applied, no Stripe payment API has been called, and no test, build or deployment has been performed in this task. Release/payment flags and Stripe credentials were not changed. See [current payment readiness](./readiness-20261010.md) for the overall state and release boundary.

## API contract

Seller-authenticated `POST /api/orders/{orderId}/refund` accepts either:

```json
{"requestId":"<uuid>","mode":"partial","amountCents":2500,"confirmRefund":true}
```

```json
{"requestId":"<uuid>","mode":"remaining","confirmRefund":true}
```

Amounts are integer minor currency units. `remaining` does not accept an amount: the server calculates it from the actual connected-account charge and its complete refund history. The old native request `{ "confirmFullRefund": true }` maps to one stable remaining-refund request whose request ID is the order ID; it cannot be used for multiple independent partial refunds. An optional `requestId` is supported on that legacy body.

The client must create its request UUID once, keep it with the exact mode/amount, and reuse all of them after a timeout, a pending result, a reload or an ambiguous error. A changed mode/amount under the same request ID returns `REFUND_REQUEST_CONFLICT` (409). Do not generate a fresh ID automatically after an error. Separate intentional partial refunds use separate UUIDs after the earlier request reaches a terminal state.

Successful HTTP responses include `requestId`, `refundId`, `status`, `amountCents`, `remainingCents` and `isTest: true`. HTTP 200 does not itself mean the refund succeeded: inspect `status`. A `failed` or `canceled` refund remains that same refund on retries; another attempt requires a new intentional request. `pending`, `requires_action` or `unknown` requires refreshing the same request. Error responses include the request ID and a stable code.

## Persistent state and concurrency

Apply `supabase/migrations/20261009200000_test_refund_requests.sql` to the intended test backend before deploying this route. Without the table/RPC, it fails closed before any Stripe refund creation.

- `marketplace_refund_requests` is server-only, with RLS enabled and no client grants. Its RPC uses invoker permissions and grants execution only to `service_role`.
- The RPC locks the order, repeats seller ownership/test-order checks, and binds the request ID to its mode, requested amount, connected account and PaymentIntent. Existing requests can be read after the order becomes refunded.
- The order can have only one nonterminal refund request. This includes an uncertain request whose external response was lost; a new ID cannot bypass it.
- A compare-and-set from `reserved` to `processing` freezes charge ID, exact amount and first-attempt timestamp before the Stripe POST. A competing worker cannot overwrite the plan or reject a plan already being processed.
- Stripe uses the persisted ledger row ID in the idempotency key and receives both order ID and request ID as metadata. Replays retrieve the stored refund ID; lost-response recovery searches the full charge history for that metadata before considering another POST.
- Stripe documents idempotency retention of at least 24 hours. This implementation retries an uncertain POST for at most 23 hours from the frozen first-attempt time. After that it searches for evidence but does not create another refund. `manual_review` keeps the order slot locked pending reconciliation; do not clear it merely because time elapsed.
- Pending/requires-action and unfamiliar nonterminal Stripe refunds consume the refundable budget. Failed/canceled refunds do not. The charge's recorded refunded total is also respected. More than 1,000 history entries or inconsistent totals fails closed instead of using a truncated balance.
- An external Dashboard refund can race the application. The server calculation is refreshed before planning; Stripe remains the final authority on the charge's refundable balance. A creation failure/timeout leaves the plan reserved for the same idempotent retry instead of permitting a second request.
- Terminal ledger results cannot be downgraded by a late pending response. `reconcileRefund` updates the ledger from verified Stripe objects and applies monotonic confirmed totals to the order. Delivery actions remain blocked while a refund is active or a confirmed refund has not yet been reflected in the order.

## Integration points

`runTestOrderRefund({ admin, stripe, order, actorId, input })` handles reservation, Stripe verification, creation/recovery and the persisted result. Its return also contains the validated charge/account for the route's existing reconciliation call; those objects are not returned to the client.

`getTestOrderRefundSnapshot(stripe, order)` supplies `{ charge, refunds, remainingCents }` for authenticated server-side order reads. Full charge/refund objects are not exposed to clients. The order-detail endpoint returns safe totals and the seller's active ledger request so the client can resume it after reload. Order reads and signed refund webhooks refresh the ledger through `syncTestRefundLedger` and reconcile confirmed totals. Pending amounts consume the remaining refundable budget but are not displayed as completed refunds.

## Test boundary and historical fees

All orders must be marked `is_test`. Both PaymentIntent and charge must be non-live, succeeded/captured, match the stored order ID, amount, currency and historical application-fee amount, and be retrieved in the original seller's connected account. `getStripe()` retains the existing test-key restriction.

No fee is recalculated using today's 5% rule. `platform_fee_cents` stored on each historical order is compared with Stripe and used only to decide whether to request `refund_application_fee: true`. For direct charges Stripe returns the corresponding application-fee share on a partial refund and the full applicable fee on a full refund. There is no second manual application-fee refund, transfer reversal or fee-rule mutation in this flow.

## Documentation consulted

- Stripe, [direct-charge refunds](https://docs.stripe.com/connect/direct-charges#issue-refunds): connected-account scope and proportional application-fee refunds.
- Stripe, [idempotent requests](https://docs.stripe.com/api/idempotent_requests) and [low-level errors](https://docs.stripe.com/error-low-level#idempotency): same-key retry semantics and the retention window.
- Stripe, [refunds](https://docs.stripe.com/refunds): partial/refund lifecycle and pending results.
- Installed Stripe Node SDK 22.6.0, `Refunds.d.ts`: `refund_application_fee` explicitly documents proportional partial refunds.

Source inspection is not runtime validation. Concurrency, provider failures, migration behavior, partial/residual totals, native UI and webhook integration still need authorized verification before enabling any customer payment flow.
