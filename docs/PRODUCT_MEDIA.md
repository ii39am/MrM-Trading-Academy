# Product image uploads

The admin editor uploads images through `POST /api/admin/uploads/product-image`.
The existing required `Course.image` URL field is unchanged; no migration is needed.
The public `GET /media/products/<uuid>.webp` route serves persistent files, independent
of Next.js's build-time public directory snapshot. Uploaded URLs use the configured
APP_URL origin, never request Host or forwarded headers. HTTPS is required.

## Storage and lifecycle

Set `PRODUCT_IMAGE_DIRECTORY` to an absolute persistent directory **outside the
repository and all release/build directories**, recommended `/var/www/mrm-media/products`.
There is deliberately no default relative to the process working directory. Missing
or invalid storage configuration fails uploads safely with a generic 503 response.
Do not configure it under `.next`, `public`, a temporary directory, or a deployment checkout.

PNG, JPEG and WebP inputs are limited to 5 MiB, 16 million decoded pixels and one
frame. MIME, extension, magic bytes, decoder format and complete pixel decoding are
checked. Images are auto-oriented, resized only when larger than 2400x2400 (aspect
ratio retained), and re-encoded as WebP at quality 85 with metadata removed. Original
filenames are never used for storage. UUID filenames use exclusive creation.

Replace uploads a new immutable file. Remove clears only the editor draft. Because
an image is required by existing business rules, saving without an image is rejected.
The database changes only on product Save. Failed uploads preserve the prior image.
Cancelling or switching products never deletes existing files. Old and abandoned
uploads are retained intentionally; there is no delete API or automatic garbage
collection. Monitor capacity and back up media alongside database backups. Future
cleanup must check every Course reference, pending edits, and backup retention; do
not simply delete images when they are replaced or when an editor is closed.

## Required VPS steps — documentation only, not executed

The repository workflow invokes `/usr/local/bin/deploy-mrm-academy`, but that script,
the active Nginx configuration and systemd unit are not in this repository. Their
actual contents were not accessed. Before deploying, the VPS operator must:

1. Identify the Node systemd service user/group. Create `/var/www/mrm-media/products`
   owned by that user/group, mode 0750. The application creates files with mode 0640.
   Do not make it world-writable. If systemd uses filesystem sandboxing, add this
   directory to `ReadWritePaths`. Ensure the service can write/read after restart.
2. Configure `PRODUCT_IMAGE_DIRECTORY=/var/www/mrm-media/products` in the service
   environment using the existing configuration process. Keep `APP_URL` and
   `NEXT_PUBLIC_APP_URL` equal to the existing public HTTPS origin. The same origin
   must be present at build time: Next/Image's remote pattern allows only that
   origin's `/media/products/**` path, in addition to the existing Unsplash rule.
3. Inspect the deploy script. Any `git clean`, `rsync --delete`, release replacement,
   chown or cleanup operation must stay within the checkout/release paths and never
   include `/var/www/mrm-media`. Do not copy media into standalone build artifacts.
   If the script only replaces `/var/website/MrM-Trading-Academy`, no media-copy or
   exclusion change is needed for the recommended external directory. Confirm this
   from the actual script before release; it cannot be certified from the workflow.
4. Nginx must allow **6m** request bodies for the upload location (5 MiB file plus
   multipart overhead), and proxy it to the same upstream as the rest of Next.js.
   Keep the application's own smaller file limit. Preserve the existing proxy headers
   and TLS settings. A typical addition inside the existing HTTPS server block is:

   ```nginx
   location = /api/admin/uploads/product-image {
       client_max_body_size 6m;
       client_body_timeout 30s;
       # Include the existing application's proxy headers/settings here.
       proxy_pass http://127.0.0.1:3000; # Substitute the ACTUAL existing upstream.
   }
   location ^~ /media/products/ {
       # Include the existing application's proxy headers/settings here.
       proxy_pass http://127.0.0.1:3000; # Substitute the ACTUAL existing upstream.
   }
   ```

   The media prefix avoids a generic image-extension/static-assets location returning
   404. No Nginx filesystem alias is required; Next.js serves validated filenames.
   Merge with existing locations rather than creating duplicates. Run `nginx -t`
   before an operator-approved reload. Any additional proxy request limits must also
   allow the upload. Never disable origin/session checks or expose the private Node port.
5. Verify upload, public HTTPS fetch, Next/Image optimization, service restart and a
   subsequent rebuild/release all retain the saved image. Add media backups/disk alerts.

For local interactive development use a trusted local HTTPS reverse proxy, its origin
as APP_URL/NEXT_PUBLIC_APP_URL at startup, and a separate absolute local media directory.
Tests use temporary directories and an HTTPS fixture origin without contacting it.

## Security and operational scope

Upload requires an active admin session, the existing same-origin check, and a
per-admin database rate limit of 30 attempts/hour. Mutations are no-store. The request
stream is capped before multipart parsing, even without Content-Length. Only one image
field is accepted. Public reads accept only generated UUID WebP names and return
nosniff/immutable-cache headers. Errors never return local paths or exception messages.
CSP adds `blob:` solely to img-src for local previews; existing image sources remain.

This design is for the current single persistent VPS. Multiple application servers
would require shared persistent storage/object storage. Images are public: do not
upload confidential material. Upload abandonment consumes disk until reviewed cleanup.
