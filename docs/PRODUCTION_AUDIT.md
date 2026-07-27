# Mr.ME production architecture

Mr.ME Trading Academy sells bilingual digital-access products. Public product responses contain descriptions, images, and server-authoritative prices; they never contain Telegram destinations.

NOWPayments checkout is created server-side. Its signed IPN webhook is the only authority that can move a purchase to `PAID` and create an `Enrollment`. Webhook event IDs and payload hashes provide idempotency and replay detection.

`/dashboard/purchases/[purchaseId]` requires authentication and purchase ownership. Telegram redirects additionally require `PAID`, an active published product, and a purchase item for that product. Pending, failed, expired, cancelled, refunded, and unrelated purchases receive no destination.

The former lesson, progress, playback, upload, and Cloudflare Stream system was removed in migration `20260727120000_bilingual_telegram_products`.

## Authentication hardening — 2026-07-27

- Neon PostgreSQL remains the only account store; MongoDB was not introduced.
- Passwords remain bcrypt cost 12 hashes. Verification and reset codes remain purpose-bound HMAC hashes with expiry, attempt limits, resend cooldown, replacement invalidation, and single-use consumption.
- JWTs remain HS256 with explicit issuer, audience, and seven-day expiry. The database now stores only a SHA-256 digest of each random JWT session identifier.
- Successful authentication records `lastLoginAt`; registration records the user’s `en` or `ar` preference.
- Account-specific rate-limit keys hash normalized email addresses instead of duplicating plaintext identifiers.
- Admin customer reads use explicit safe selects. Server-authorized account suspension, reactivation, and session revocation endpoints exclude hashes, tokens, and secrets.
- Final-admin protection and session revocation now occur inside serializable role-change transactions.
- Migration `20260727143000_customer_auth_metadata` is intentionally pending for the production Neon database until an approved `npx prisma migrate deploy`.
