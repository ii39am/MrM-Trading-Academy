# Production-readiness audit

Audit date: 2026-07-23. Scope: authentication, sessions, recovery, roles, admin pages/APIs, and directly supporting persistence and deployment controls.

## Critical

- Phone/Twilio authentication remained the only working identity flow (`prisma/schema.prisma`, `lib/verification.ts`, and `app/api/auth/*`). Fixed by migration `20260723210000_email_auth_admin`, required normalized email identity, provider-neutral hashed email challenges, and removal of all phone authentication routes/providers.
- Password reset was UI-only (`app/api/auth/password-reset/route.ts`). Fixed with separate hashed `PASSWORD_RESET` challenges, confirmation endpoint, password replacement, session revocation, audit event, and confirmation email.
- No `/admin` dashboard existed. Fixed by `app/admin/page.tsx`, which selects live users, courses, modules, purchases, enrollments, contacts, payment status, and redacted audit records.

## High

- Registration created a user before issuing its verification and swallowed every error (`app/api/auth/register/route.ts`). Fixed by serializable user/challenge persistence, database uniqueness, bounded retry for concurrent `P2002`/`P2034`, fail-closed email delivery, and no session before verification.
- Any INSTRUCTOR could enumerate or mutate every lesson (`lib/admin.ts`, `app/admin/videos/page.tsx`, and lesson admin APIs). Fixed with `Course.instructorId`, `canManageLesson`, filtered queries, independent API authorization, and audit events.
- Sessions had no durable revocation record. Fixed with `Session`, random JWT `jti`, database/sessionVersion/status revalidation, logout revocation, and revoke-all behavior after password/email changes.
- User disablement, lockout, and failed-login state were absent. Fixed with `User.status`, `failedLoginAttempts`, `lockedUntil`, temporary lockout, and audit events.
- No controlled first-admin workflow existed. Fixed by `scripts/admin-role.mjs`, final-admin protection, explicit production confirmation, session invalidation, and transactional audit logging.

## Medium

- IP rate limits trusted unconditionally supplied forwarding headers (`lib/security.ts`). Fixed by ignoring forwarding headers unless `TRUST_PROXY=true`; deployment must then guarantee proxy overwrite and direct-origin isolation.
- Authentication UI lacked password confirmation, terms acceptance, paste-friendly OTP, accessible live errors, and complete email autofill metadata. Fixed in `components/auth-form.tsx`, `app/verify-email/page.tsx`, and `app/forgot-password/page.tsx`.

## Low and operational

- CSP still requires inline scripts/styles for the current Next.js runtime.
- Provider delivery, DNS authentication, bounces, and live webhooks require external production credentials and smoke tests.
- Legacy phone-only accounts are deliberately `MIGRATION_REQUIRED`; operator identity proof and email assignment remain manual.
- The nested Next.js PostCSS advisory remains subject to upstream remediation.

## Security invariants

- Public registration cannot select a role.
- Only verified `ACTIVE` users receive sessions.
- Every protected request reloads status, role, session version, and session revocation state from PostgreSQL.
- ADMIN is required for `/admin`; instructors are limited to explicitly assigned courses on `/admin/videos`.
- Payment, enrollment, premium-course, and signed-video authorization remain independent of admin UI visibility.
