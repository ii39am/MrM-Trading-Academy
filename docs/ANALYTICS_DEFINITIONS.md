# Analytics definitions

The executable definitions live in `lib/analytics.ts`.

- Customer: a non-deleted user record.
- Verified customer: customer with `emailVerifiedAt`.
- New customer: created inside the selected UTC range.
- Successful purchase: `Purchase.status = PAID`.
- Gross revenue: sum of final `amountCents` for paid purchases, grouped by currency.
- Average order value: paid revenue divided by paid orders in the same currency.
- Conversion rate: paid purchases divided by unique purchase/checkout attempts.
- Refunded payment: `Purchase.status = REFUNDED`. Refund subtraction uses `refundedAmountCents` only when a verified or authorized process has populated it.
- Active session: unrevoked session whose expiry is in the future.
- Top-selling product: purchase-item count restricted to paid purchases.

Different currencies are never summed without an explicit conversion system.
