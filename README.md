# Mr.ME Trading Academy

A bilingual Next.js 15 commerce application for premium trading-education products with protected Telegram community access.

## Core flow

1. A verified user selects a published product.
2. The server loads its USD price and creates a NOWPayments invoice.
3. A signed, idempotent IPN webhook confirms payment.
4. The transaction creates product ownership.
5. Only an enrolled owner backed by a PAID Purchase can request a short-lived, one-member Telegram invite from the protected purchase page.

Run `npm install`, configure `.env.local` from `.env.example`, apply migrations with `npx prisma migrate deploy`, and start with `npm run dev`.
