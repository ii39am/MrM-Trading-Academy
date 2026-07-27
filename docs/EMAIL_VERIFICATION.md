# Email verification

`EmailProvider` is provider-neutral. The production adapter uses Resend; automated tests use an in-memory provider that is forbidden under `NODE_ENV=production`.

Required production settings:

```text
EMAIL_PROVIDER=resend
EMAIL_FROM=Mr.ME Trading Academy <academy@example.com>
RESEND_API_KEY=...
APP_URL=https://academy.example.com
```

Verification codes are cryptographically generated six-digit values with a ten-minute lifetime. Only a keyed HMAC is stored. Challenges bind the user, normalized email, purpose, expiry, attempt count, and single-use consumption state. Purposes are `EMAIL_VERIFICATION`, `PASSWORD_RESET`, and `EMAIL_CHANGE`.

Issuing a replacement invalidates all older active challenges. Resend cooldown is 60 seconds. Routes additionally rate-limit IP, normalized email, account, and purpose. Five incorrect attempts exhaust a challenge. Plaintext codes are never logged, persisted, or returned by production APIs.

Configure and verify the sending domain in Resend before deployment. Run delivery tests for SPF, DKIM, DMARC, bounce handling, and the public sender address. Production startup fails if the Resend configuration is absent.
