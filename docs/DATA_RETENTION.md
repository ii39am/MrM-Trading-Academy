# Data retention and cleanup

`runRetentionCleanup` in `lib/retention.ts` implements the safe cleanup unit but is not automatically scheduled.

- Expired or revoked sessions: removed after 30 days.
- Login history: retained for 180 days.
- Expired verification and reset challenges: removed after 30 days.
- Expired rate-limit buckets: removed after 7 days.
- Expired coupon reservations: released without deleting purchase history.
- Audit logs: retained until an administrative/legal retention period is approved.
- Purchases, payment transitions, enrollments, and refund records: never deleted by cleanup.
- Accounts awaiting deletion: not automatically anonymized. An operator must approve the recovery period and financial/legal policy first.

Run the service from a protected Netlify scheduled function or an authenticated operational job. Do not expose it as a public unauthenticated route. Log only returned counts, never deleted row contents.
