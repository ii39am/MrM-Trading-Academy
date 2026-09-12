# NOWPayments validation and verification

The existing server-owned pricing, provider integration and transactional
enrollment architecture are preserved. Only a finished provider status can
settle as PAID, after every binding and received-amount check succeeds.

Quotes use Decimal comparisons: finite, greater than zero, less than 10^18,
at most 12 fractional places, using plain decimal input. Stored expected
amounts must also be finite and positive. actually_paid maps to receivedAmount;
outcome_amount is ignored.

Provided network accepts only case-insensitive trx/trc20 and becomes TRC20.
Unknown values and null are rejected. Omission is allowed because the official
NOWPayments IPN example omits network; validated usdttrc20 remains mandatory.
See https://nowpayments.zendesk.com/hc/en-us/articles/21395546303389-IPN-and-how-to-setup

Null payin_hash and expiration_estimate_date normalize to undefined. Unused
payout, invoice, extra-ID and precision metadata is stripped, including nulls.
Required payment identity, asset, address, price and quote stay validated.

Only the exact AMOUNT_MINIMAL_ERROR code from a provider 4xx becomes the safe
PAYMENT_AMOUNT_BELOW_PROVIDER_MINIMUM response (422). No provider messages
escape to customers. HTTP bodies are bounded while streaming. No minimum is
hardcoded or charge increased. There is no preflight; Create Payment remains
authoritative. Failed creation releases the coupon reservation.

After received funds are detected on a pending purchase, full-payment
instructions, amount-copy and payment QR are hidden. Customers are asked to
wait/contact support before sending more. This UI rule never grants access.

Webhook settlement, fulfillment and transactional audits commit before response.
Best-effort email uses Next.js after(callback), not an untracked promise.
Persistent Node supports this lifecycle; serverless adapters must support
Next.js after/waitUntil. Process shutdown can lose email, never committed
fulfillment. Reconciliation callers still await best-effort email.
Invalid payload/signature/bindings return 400; oversized bodies 413; unexpected
internal/database failures a generic 503. Manual reconciliation explicitly
checks PAYMENTS_ENABLED. Transition rules and automatic candidate scope remain.

## Disposable PostgreSQL requirement

Integration tests write fixtures and must never use production or an existing
real database. The development compose service has a persistent volume; it is
not an isolated test environment. Use a new disposable PostgreSQL 15+ instance
(17-alpine matches development), unique database and dedicated loopback port.
Pass its DATABASE_URL only to test child processes, apply Prisma migrations
with npx prisma migrate deploy, run npm test, then remove only that disposable
instance/data. Never copy production environment files.

The original database blocker was resolved with EDB PostgreSQL 17.11 Windows
binaries extracted to the user's LocalAppData/MrM-Test-Tools/PostgreSQL-17.
A disposable cluster under Windows Temp bound exclusively to 127.0.0.1:55432,
using mrm_academy_test, random test credentials and SCRAM authentication.
All 10 repository migrations applied; migration status was up to date.

payment-lifecycle.test.ts additionally exercises signed webhook settlement,
coupon redemption, duplicate refund, concurrent webhook/reconciliation,
and purchase ownership using signed JWTs backed by real database sessions.
Only request-context adapters and provider status lookup are mocked; no
external payment requests are made. Transient failure/P2034 injection wraps
the transaction method before returning to the real database implementation.


## Database verification results

PostgreSQL 17.11: all 10 migrations applied; schema up to date.
Final npm test: 34 suites, 294 tests passed, 0 failed, 0 skipped.
Eight suites containing 80 tests exercised PostgreSQL: payment-enrollment,
payment-reconciliation, payment-lifecycle, coupons, telegram-access,
email-auth, verification, and sessions. The separate admin-authorization
integration suite also passed (one test).

No application defect was discovered. The added lifecycle fixture required
correctly wrapping Prisma's proxied, overloaded transaction method for fault
injection. Application source was not changed during database verification.

Lint, typecheck and production build: PASS. The disposable cluster was stopped.
Automatic approval review blocked recursive cleanup; stopped test data remains in
Windows Temp/mrm-pg-verification-8fcb891e75ca48f5975896d9706202ff.
No production/remote database, real payment, push or deployment was used.
