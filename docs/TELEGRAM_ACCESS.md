# Secure Telegram fulfillment

`Enrollment` is the entitlement source of truth. Telegram only delivers a temporary access mechanism.

The paid user opens their private purchase page and explicitly requests access. `POST /api/courses/[slug]/access` derives the user from the authenticated, active, email-verified session and accepts only the public Course slug. The route resolves that slug server-side and passes the immutable internal Course ID into the entitlement service. The service loads the unique user/course Enrollment by internal ID, follows that Enrollment's Purchase, requires `PAID`, and reads the chat ID only from server-side Course configuration. The slug is never used as the entitlement or relationship key.

The server calls Telegram Bot API `createChatInviteLink` over HTTPS with a non-personal administrative name, `expire_date` 15 minutes in the future, and `member_limit=1`. Telegram documents `member_limit` as the maximum number of users who can be members after joining through that link; it is not a web-user-to-Telegram-identity binding.

## Grants and limits

`CourseAccessGrant` stores metadata only. It never stores the usable invite URL or bot token. Each access request creates a new link because an unexpired URL cannot be safely reused without retaining it. The limit is three grant attempts per authenticated user/course in a rolling hour.

A PostgreSQL partial unique index permits only one `PENDING` grant per user/course. Stale pending claims become `FAILED` after two minutes. This prevents parallel provider calls across multiple application instances while avoiding a database transaction held open during Telegram I/O.

Grant statuses are `PENDING`, `ACTIVE`, `EXPIRED`, `REDEEMED`, `REVOKED`, and `FAILED`. `REDEEMED` is reserved for a future Telegram identity-linking mechanism; this phase cannot observe which Telegram user joined.

## Configuration

- `TELEGRAM_ACCESS_ENABLED` is a server-side rollout switch and defaults to false.
- `TELEGRAM_BOT_TOKEN` is required when access is enabled and must never use a `NEXT_PUBLIC_` prefix.
- `Course.telegramChatId` and `Course.telegramAccessEnabled` are administered through the protected product editor.
- `Course.telegramAccessUrl` remains as a deprecated legacy column for migration history only. It is not selected by public/customer APIs, rendered, emailed, or used for fulfillment.

The bot must be an administrator in the target private chat with only invite-link permission. Current [official Bot API documentation](https://core.telegram.org/bots/api#createchatinvitelink) requires appropriate administrator rights for `createChatInviteLink` and permits `member_limit` values from 1 to 99,999.

## Refunds and revocation limits

A verified refund marks pending/active grant records `REVOKED` before deleting the Purchase's Enrollment. Subsequent issuance is denied. Usable invite URLs are intentionally not retained, so the system cannot asynchronously revoke a previously returned link; expiry and the one-member limit bound that residual window.

Telegram link revocation does not remove a person who already joined. Removing an existing member would require a deliberate web-account-to-Telegram-user identity link, which is out of scope.

## Troubleshooting

Safe audit events are `COURSE_ACCESS_REQUESTED`, `COURSE_ACCESS_GRANTED`, `COURSE_ACCESS_FAILED`, `COURSE_ACCESS_RATE_LIMITED`, and `COURSE_ACCESS_REVOKED`. Inspect grant status, timestamps, and `lastErrorCode`; never add invite URLs, full Telegram responses, tokens, request headers, emails, or names to audit metadata.
