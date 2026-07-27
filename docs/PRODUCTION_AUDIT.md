# Mr.ME production architecture

Mr.ME Trading Academy sells bilingual digital-access products. Public product responses contain descriptions, images, and server-authoritative prices; they never contain Telegram destinations.

NOWPayments checkout is created server-side. Its signed IPN webhook is the only authority that can move a purchase to `PAID` and create an `Enrollment`. Webhook event IDs and payload hashes provide idempotency and replay detection.

`/dashboard/purchases/[purchaseId]` requires authentication and purchase ownership. Telegram redirects additionally require `PAID`, an active published product, and a purchase item for that product. Pending, failed, expired, cancelled, refunded, and unrelated purchases receive no destination.

The former lesson, progress, playback, upload, and Cloudflare Stream system was removed in migration `20260727120000_bilingual_telegram_products`.
