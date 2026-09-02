# Payment reconciliation

## Purpose

NOWPayments IPNs remain the primary near-real-time payment notification. Reconciliation is a second, server-only path that recovers a Purchase when an IPN is delayed or never delivered. It reads NOWPayments through the configured `PaymentProvider`, applies the provider's runtime-validated response, and sends it through the same transaction and state-transition code used by verified webhooks.

The browser, checkout countdown, redirects, and blockchain explorers are never payment authorities.

## Failure windows

1. A local Purchase and coupon reservation commit before remote payment creation. A crash before receiving the remote response leaves no known provider payment ID.
2. NOWPayments can create a payment before its identifiers are persisted locally. The checkout route makes a second best-effort persistence attempt and leaves the Purchase `PENDING` with `persistence_recovery_pending` when that attempt succeeds.
3. If the database is unavailable for both persistence attempts, only the structured server diagnostic containing the safe Purchase and provider payment IDs remains. A recovery row in the same unavailable database would not close this failure domain.
4. A payment may settle without a usable IPN. Scheduled reconciliation repairs the local state and fulfillment atomically.
5. A process or database failure during finalization rolls back Purchase status, transaction history, enrollment, coupon state, audit records, and webhook processed state together.
6. Concurrent webhook and reconciliation updates are handled with serializable transactions, bounded transaction retries, uniqueness constraints, and idempotent Enrollment upserts.

The current official NOWPayments public API command description documents payment-status lookup by transaction/payment ID, not deterministic recovery by merchant `order_id`. Therefore a crash after remote creation but before the application learns the provider payment ID cannot be recovered automatically by broad remote discovery. Do not scrape the dashboard or enumerate all merchant payments. See the [official NOWPayments API command overview](https://nowpayments.io/help/what-is/what-is-api).

## Canonical transition path

Webhook and reconciliation updates share one internal transition function. It verifies:

- provider and internal Purchase binding;
- provider payment ID and immutable `order_id` binding;
- `usdttrc20` and `TRC20` settlement terms;
- USD price amount and currency;
- payment address and expected USDT amount;
- decimal-safe, monotonic received amount;
- conservative state transitions and full payment before `PAID`.

The same serializable database transaction updates Purchase state, `PaymentTransaction`, Enrollment, coupon redemption/release, timestamps, audits, and—only for actual IPNs—`WebhookEvent` processing. API reconciliation never creates a fake webhook record. Transaction history records `WEBHOOK` or `RECONCILIATION` as its source.

## Eligibility and schedule

`POST /api/internal/reconcile-payments` scans only Purchases that:

- use `nowpayments`;
- have a stored provider payment ID;
- are `PENDING` or `EXPIRED`;
- are no more than seven days old;
- have no `nextReconcileAt`, or are due.

Candidates are ordered by `createdAt`, then Purchase ID. The normal batch limit is 50, the hard maximum is 100, and a run stops starting new provider calls after 45 seconds. `PAID`, `FAILED`, `REFUNDED`, and `CANCELLED` rows are excluded from scheduled scans.

Recommended scheduler cadence: invoke the endpoint every two minutes. Recent payments are eligible again after two minutes, payments from one to 24 hours old after ten minutes, and older eligible payments after one hour. Provider failures use exponential backoff capped at six hours. No provider request is retried aggressively within the same run.

The repository deploys through the Netlify Next.js adapter but does not currently define a scheduler. Configure a Netlify-compatible or external scheduler to send an HTTPS `POST` request to the endpoint. Do not use a query-string secret.

## Cron security

Configure a unique random `CRON_SECRET` of at least 32 characters. Send it only as:

```text
x-cron-secret: <secret>
```

The endpoint uses a timing-safe digest comparison, is disabled when payments or the secret are not configured, and returns only `scanned`, `reconciled`, `changed`, and `errors`. Never log the header or secret. Rotate the secret if request logs or scheduler configuration are exposed.

## Late and partial payments

- `partially_paid` remains `PENDING`; received USDT may increase but never decrease.
- `EXPIRED -> PAID` is allowed only after a runtime-validated provider response is fully bound and reports a full final settlement.
- `PAID -> PENDING` and `REFUNDED -> PAID` are rejected and audited as reconciliation anomalies.
- Overpayment remains eligible for `PAID`.

## Coupons and stale data

Each batch releases only `RESERVED` coupon rows whose explicit `expiresAt` has passed. Payment, webhook, transaction, reconciliation, and audit history are not automatically deleted. Purchases outside the seven-day provider-query window remain available for admin diagnosis but are not queried forever.

## Manual operation

An active administrator can send a same-origin `POST` to:

```text
/api/admin/purchases/<internal-purchase-id>/reconcile
```

The browser supplies only the internal Purchase ID. The route is CSRF-protected, rate-limited, audited, and returns a safe status result. It does not accept provider IDs or settlement fields.

## Troubleshooting

- `PROVIDER_TIMEOUT`, `PROVIDER_RATE_LIMITED`, or `PROVIDER_UNAVAILABLE`: verify provider availability and allow scheduled backoff to retry.
- `PROVIDER_INVALID_RESPONSE`: compare the validated integration with current official sandbox behavior; do not bypass validation.
- `BINDING_MISMATCH`: investigate the Purchase and provider payment IDs, order ID, asset, amount, address, and currency. Do not force the Purchase to `PAID`.
- `INVALID_TRANSITION`: provider truth conflicts with a terminal local state. Preserve the local state and investigate audit history.
- `LOCAL_PERSISTENCE_FAILED`: the remote payment identifiers were recovered by the checkout fallback and the row is queued for reconciliation.

Safe logs may contain Purchase ID, provider payment ID, status, and diagnostic code. They must never contain API keys, IPN secrets, cron secrets, authentication tokens, or raw provider/webhook bodies.
