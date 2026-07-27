# Production deployment

Use PostgreSQL 15 or newer. Build an immutable release with `npm ci`, `npx prisma generate`, and `npm run build`. Back up PostgreSQL and run `npx prisma migrate deploy` once before shifting traffic.

The Docker image requires the public canonical URL at build time so Next.js can generate correct metadata, robots, and sitemap URLs:

```powershell
docker build --build-arg NEXT_PUBLIC_APP_URL="https://academy.example.com" -t mr-me-trading-academy .
```

Provide all server-only variables to the running container or deployment platform at runtime. Do not pass database, JWT, payment, email, or Telegram destinations as Docker build arguments.

Required production variables:

- `DATABASE_URL`: TLS-enabled PostgreSQL connection.
- `JWT_SECRET`: at least 32 cryptographically random characters.
- `PAYMENTS_ENABLED` and `EMAIL_ENABLED`: explicit `true` or `false` feature flags.
- `APP_URL` and `NEXT_PUBLIC_APP_URL`: the same public HTTPS origin.
- When `EMAIL_ENABLED=true`: `EMAIL_PROVIDER=resend`, `EMAIL_FROM`, and `RESEND_API_KEY`.
- When `PAYMENTS_ENABLED=true`: `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, and `NOWPAYMENTS_CALLBACK_URL`.

Optional variables:

- `COURSE_API_URL`
- `TRUST_PROXY`

Set `TRUST_PROXY=true` only when a trusted reverse proxy overwrites `X-Forwarded-For` and the application origin cannot be reached directly. Preserve the public host, terminate TLS at the proxy, and ensure `APP_URL` matches the browser origin. Secure cookies are enabled automatically in production.

Use `/api/health` for liveness and `/api/ready` for readiness. Enable encrypted daily backups, point-in-time recovery, and regular restore drills.

Test-only email adapters are forbidden in production. `E2E_EMAIL_CODE` is ignored by production code and should not be configured on Netlify. Provider setup is documented in `EMAIL_VERIFICATION.md` and `USDT_PAYMENTS.md`.

For Neon, preview migration status without changing data, then apply pending migrations during an approved maintenance/release step:

```powershell
npx prisma migrate status
npx prisma migrate deploy
```

After migration, an administrator must add a valid `https://t.me/...` destination to each product before publishing it. Telegram destinations are never returned by public product APIs.

After the email-auth migration, review all `MIGRATION_REQUIRED` users before launch. Never activate one without verifying ownership and assigning a real unique email.
