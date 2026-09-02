# Telegram access certification

This checklist certifies secure Telegram fulfillment in a disposable test chat. It does not authorize production payments or production Telegram credentials.

## Test environment

1. Create a private Telegram test group or channel.
2. Create or select a disposable Bot API bot. Store its token only in the staging secret manager as `TELEGRAM_BOT_TOKEN`; never paste it into source, tickets, screenshots, or logs.
3. Add the bot as an administrator of the test chat. Grant only the permission needed to invite users (`can_invite_users` / invite-link management). Do not grant message, deletion, promotion, or ownership permissions.
4. Set `TELEGRAM_ACCESS_ENABLED=true` in staging and restart the Node runtime so instrumentation registers the bot client.
5. In the admin product editor, configure the numeric private chat ID (normally beginning with `-100`) or the appropriate `@channel` identifier and enable secure Telegram access. Never configure a permanent invite URL.
6. Confirm the test course is published and a test user has an Enrollment whose associated Purchase is `PAID`.

## Issuance checks

1. Sign in as the enrolled test user and open My Courses / the paid purchase page.
2. Confirm the rendered HTML contains `Access Course` but no `t.me` invite before clicking.
3. Click `Access Course`; confirm the UI displays `Preparing secure access...` and prevents a same-page duplicate click.
4. Confirm `Open Telegram` appears only after the authenticated POST succeeds.
5. Inspect the invite in Telegram administration and verify:
   - method behavior corresponds to `createChatInviteLink`;
   - the name uses only short course/grant identifiers and contains no personal data;
   - expiration is approximately 15 minutes after issuance;
   - `member_limit` is 1;
   - the bot used the configured course chat.
6. Confirm the database grant stores status, safe invite name, timestamps, and error code only. It must not contain the usable invite URL.
7. Confirm application and platform logs contain no invite URL or bot token.

## Usage, expiration, and abuse checks

1. Join from the first test account. Verify Telegram applies its one-member link semantics.
2. Attempt to use the same invite from a second Telegram account. Record Telegram's actual group/channel behavior; do not infer stronger identity guarantees than observed.
3. Create a new invite and allow it to expire. Confirm it cannot be used after Telegram's expiration time.
4. Request access four times within one hour for the same web user/course. Confirm the fourth request returns HTTP 429 and no fourth Telegram API call occurs.
5. Send two simultaneous access requests. Confirm only one in-flight provider issuance exists; the competing request receives the safe in-progress response.
6. Disable Telegram access globally and per-course in separate checks. Both must fail closed without changing Purchase or Enrollment.

## Revocation and failure checks

1. Revoke an invite immediately while its URL is still available in the controlled manual test and confirm Telegram rejects it afterward.
2. Refund the related Purchase. Confirm Enrollment is removed and outstanding grant metadata becomes `REVOKED`; the user cannot generate another invite.
3. Note the platform limitation: because invite URLs are not retained, the application cannot later call `revokeChatInviteLink` for an already-returned link. The 15-minute lifetime and one-member limit bound this risk.
4. Note the identity limitation: revoking a link does not remove a member who already joined. The application does not link web users to Telegram user IDs, so it cannot reliably remove that Telegram member.
5. Remove the bot's invite permission, use an invalid test token, simulate timeout, and simulate Telegram 429/500 responses one at a time. Confirm each attempt records only a safe failure code, leaves Enrollment and Purchase unchanged, and shows the retryable customer message.
6. Restore valid staging configuration after testing and confirm no test secret or invite appears in `git status`.

Record PASS, FAIL, or NOT EXECUTED for every item, with safe grant/course IDs only. Do not record credentials or invite URLs.
