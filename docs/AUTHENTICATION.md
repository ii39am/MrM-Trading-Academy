# Authentication architecture

Email is the only public login identifier. `normalizeEmail` trims and lowercases every address before a database lookup. `User.normalizedEmail` is required and uniquely indexed, so mixed-case and whitespace variants cannot create multiple accounts.

Registration accepts name, email, password, password confirmation, and terms acceptance. It creates or reuses only a pending unverified user and creates a hashed verification challenge in a serializable transaction. Registration never creates a session.

Passwords use bcrypt with cost 12. Login uses a dummy bcrypt hash for unknown users, generic invalid-credential errors, PostgreSQL-backed IP/account rate limits, five-attempt temporary lockout, verified-email/status checks, and security audit events.

Sessions use a seven-day HS256 JWT with fixed issuer and audience plus a random `jti`. The matching `Session` row, current `sessionVersion`, current database role, `ACTIVE` status, and verified email are checked on every protected server request. Logout revokes the current database session. Password resets and email changes revoke all sessions and increment `sessionVersion`.

The middleware performs an early JWT check for navigation only. Pages and API routes independently revalidate identity and authorization from PostgreSQL.

## Existing phone accounts

Migration `20260723210000_email_auth_admin` preserves the old number in nullable `legacyPhoneE164`. Accounts without an already verified unique email receive an internal `@migration.invalid` address and status `MIGRATION_REQUIRED`. They cannot log in. An operator must verify ownership, assign a real unique normalized email, set `emailVerifiedAt`, and change status to `ACTIVE`. The application never treats the legacy number as authentication material.
