# NOWPayments sandbox certification

Complete this checklist against a disposable staging deployment before using production credentials. Never paste API keys, IPN secrets, signed payloads, or payment addresses into tickets, commits, screenshots, or shared logs.

## 1. Prepare the sandbox account and staging callback

1. Sign in to the NOWPayments sandbox account and create a sandbox API key.
2. Generate a separate sandbox IPN secret. Do not reuse the production secret.
3. Confirm that USDT on TRON is available under provider code `usdttrc20`.
4. Deploy the current commit to an HTTPS staging origin.
5. Confirm `GET /api/ready` returns HTTP 200.
6. Set the staging environment variables:

   ```dotenv
   PAYMENTS_ENABLED=true
   NOWPAYMENTS_API_KEY=<sandbox secret in the host secret store>
   NOWPAYMENTS_IPN_SECRET=<sandbox secret in the host secret store>
   NOWPAYMENTS_CALLBACK_URL=https://<staging-host>/api/webhooks/payments
   NOWPAYMENTS_API_BASE_URL=https://api-sandbox.nowpayments.io/v1
   ```

7. Restart or redeploy staging so startup validation and provider registration run.
8. Verify neither NOWPayments secret has a `NEXT_PUBLIC_` prefix and neither appears in generated browser bundles or deployment logs.

## 2. Certify Create Payment

1. Create and verify a disposable student account.
2. Select one published, unowned course and record its displayed USD price.
3. Click Pay once and capture only the internal Purchase ID and NOWPayments payment ID.
4. In the database, verify the Purchase remains `PENDING` and contains:
   - `provider=nowpayments`
   - matching `providerSessionId` and `providerPaymentId`
   - `payCurrency=usdttrc20`
   - `network=TRC20`
   - a validated TRON payment address
   - decimal `expectedAmount`
   - `providerStatus=waiting`
   - provider expiration when returned
5. In the NOWPayments sandbox dashboard, open that payment and verify:
   - `order_id` exactly equals the immutable Purchase ID
   - price currency is USD and price amount equals `amountCents / 100`
   - pay currency is `usdttrc20`
   - payment ID, pay address, and expected amount match the Purchase
   - IPN callback is the configured staging URL
6. Call the provider's internal `getPaymentStatus` method from a server-only diagnostic shell or test and verify the same binding fields. Do not expose it as a public unauthenticated route.

## 3. Certify the successful IPN lifecycle

1. Use the sandbox payment-case controls, if available, to select a successful payment. Otherwise follow the current sandbox instructions for its emulated payment.
2. Observe every delivered status. `waiting`, `confirming`, `confirmed`, and `sending` must leave the Purchase `PENDING` with no Enrollment.
3. Confirm each callback includes `x-nowpayments-sig` and receives HTTP 200 only when its signature and purchase bindings are valid.
4. Wait for `finished`.
5. Verify the Purchase becomes `PAID` only when `actually_paid >= expectedAmount`.
6. Verify `providerStatus=finished`, `receivedAmount`, transaction hash, and `paidAt` are persisted.
7. Verify exactly one PaymentTransaction records the transition and exactly one Enrollment exists for each PurchaseItem using the Purchase's user and course IDs.
8. Verify a related coupon reservation becomes `REDEEMED` once.

## 4. Certify idempotency and rejection behavior

1. Replay the exact signed `finished` request to the staging callback.
2. Verify HTTP 200 reports a duplicate, with no additional Enrollment, redemption, or PaymentTransaction.
3. Reuse the derived event identity with a changed payload in an automated or staging fixture; verify rejection and no state change.
4. Change one byte in a captured payload while retaining the old signature. Verify HTTP 400 and no state change.
5. Remove `x-nowpayments-sig`. Verify HTTP 400 and no state change.
6. Send a payload larger than 64 KiB. Verify HTTP 413.
7. Test mismatched order ID, payment ID, pay currency, address, quoted amount, and USD price using signed sandbox fixtures where supported. Each must fail closed.

## 5. Certify partial, excess, expired, failed, and refunded cases

1. Select or simulate `partially_paid`; verify the Purchase remains `PENDING`, the exact decimal amount is stored, and no Enrollment exists.
2. Test an amount below expected by the smallest supported USDT unit; verify it never becomes `PAID`.
3. Test an overpayment; a final `finished` event may become `PAID` when all bindings match.
4. Select or simulate `expired`; verify `EXPIRED`, coupon release, and no Enrollment.
5. If the sandbox supports a real late settlement, pay the same expired payment and require a fully signed, bound `finished` event before `EXPIRED -> PAID`.
6. Select or simulate `failed`; verify `FAILED` and no Enrollment.
7. Select or simulate `refunded` after a paid payment; verify `REFUNDED` and removal of only that Purchase's Enrollment.
8. Replay the old `finished` event after refund and verify access is not restored.

## 6. Record certification evidence

Record the staging commit SHA, date, sandbox account identifier, internal Purchase IDs, provider payment IDs, observed status sequence, HTTP results, and database assertions. Redact addresses and transaction hashes if the record will be shared. Certification passes only when every applicable item above succeeds; mocked automated tests alone are not certification.
