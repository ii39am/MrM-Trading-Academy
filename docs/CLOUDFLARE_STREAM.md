# Cloudflare Stream

Configure `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`, `CLOUDFLARE_STREAM_WEBHOOK_SECRET`, and optionally `CLOUDFLARE_STREAM_CUSTOMER_CODE`.

The API token needs Stream read/write permissions only. It remains server-side. Configure Cloudflare Stream webhooks to call `/api/webhooks/cloudflare-stream`.

## Uploads

Administrators and instructors request one-time Direct Creator Upload URLs through `/api/admin/lessons/:id/video`. The browser uploads directly with tus resumable upload; credentials never pass to the client. State is stored in `VideoAsset` as `UPLOADING`, `PROCESSING`, `READY`, `ERROR`, or `CANCELLED`.

Cloudflare webhook signatures are checked over `timestamp.rawBody` with HMAC-SHA256, constant-time comparison, and a five-minute replay window. Premium lessons cannot be published until the associated asset is `READY`.

The admin interface is `/admin/videos` and supports file selection, resumable upload, progress, retries, replacement, cancellation/deletion, and processing/error states.

## Playback

Premium playback requires a verified phone, a published course and lesson, a current paid enrollment, and a ready video. Refunded purchases do not authorize playback. Tokens expire in at most five minutes and no permanent manifest is stored or returned publicly.

`PLAYBACK_SESSION_LIMIT` controls simultaneous sessions. Excessive concurrent attempts are rejected and audited. The player overlays a masked phone number, user ID suffix, and timestamp. Signed URLs and watermarks discourage sharing but cannot completely prevent screen recording or video theft.
