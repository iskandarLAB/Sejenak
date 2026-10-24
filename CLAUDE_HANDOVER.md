# Current application handover

## Product and design
Sejenak is a Malay-language wedding platform: couple-owned guest photo/wish galleries, paid digital invitations and RSVP, plus guest-declared Duit Salam. Public website: https://sejenak.space. Sites hostname: https://sejenak.epicbuddy128.chatgpt.site.

Approved brand is Burgundy Romance: burgundy #6f283d, cream #fbf6ef, soft gold accents. Keep liquid-glass dock and buttons, reduced-motion support, responsive layouts and the Sejenak wordmark. Saved premium custom colours and the six E-Kad template designs are preserved. Bismillah Arabic remains on cards. The central guest button is **plus only**, no Hantar text. Dashboard footer support link was removed; support remains in Menu and other contextual entry points.

Owner navigation: Utama / Galeri / E-Kad / Kongsi / Menu. Dashboard offers one next action and compact event-scoped summaries. Menu holds event management, gallery design, Duit Salam, package/storage, support and logout. E-Kad has one editing destination; exported poster follows the saved invitation design. Sharing distinguishes invitation links from photo/wish gallery QR.

Only `/demo` is public demo, using Basic sample data. `/dashboard-demo`, `/invitation-demo`, `/admin-demo` redirect to it. Basic demo does not show Duit Salam. Checklist is hidden. Do not add multi-photo batch uploads or a “Sumbangan saya” section; user declined those.

## Packages — keep internal IDs stable
| Public name | ID | RM / event | Photos | Wishes | Storage | Extra capabilities |
|---|---|---:|---:|---:|---:|---|
| Basic | detik | 79 | 200 | 500 | 1 GB | gallery only |
| Pro | cerita-kita | 149 | 1000 | 2000 | 5 GB | design, invitation, RSVP, poster, Duit Salam |
| Max | seindah-kenangan | 249 | 3000 | 5000 | 15 GB | all Pro, own cover, CSV |

No new free plan. Locked features use soft-gold Locked buttons linking to packages. Server enforces entitlements. Photo max 8 MB. Both file-count and storage caps apply. Paid access ends 40 days after the originally purchased wedding date, end of day Malaysia; editing the date does not extend retention. Physical cleanup is currently explicit admin work, not a scheduled purge.

## Actual implementation
- `worker/app.html`: HTML shell, base styles and CSS insertion markers.
- `worker/app.js`: vanilla JavaScript UI and owner/guest/invitation flows (large file, global state and inline handlers).
- `worker/editorial.css`, `sales.css`, `ui-polish.css`: shared presentation.
- `worker/api.mjs`: event ownership, media, upload quotas, moderation, RSVP, gifts.
- `worker/auth.mjs`, `login.js`: server-side Supabase PKCE and provider UI.
- `worker/chip.mjs`, `checkout.js`: purchase creation, verified payment status and fulfillment.
- `worker/admin.mjs`, `admin.js`: platform administration, support, storage and customer operations.
- `worker/support.js`: public support page, configured channels.
- `worker/boundary.mjs`: strips forged Sites identity headers unless `SEJENAK_TRUST_SITES_IDENTITY=true`.
- `worker/ratelimit.mjs`: per-device throttling of anonymous guest writes.
- `worker/preview.mjs`, `worker/assets/og-*.jpg`: server-injected link previews (WhatsApp/Facebook) for `/i/:id` and `/e/:id`; regenerate the JPEGs if card artwork changes.
- `worker/imagemeta.mjs`: strips GPS/EXIF/XMP/comments from every uploaded JPEG/PNG/WebP (guest photos, cover, Duit Salam QR), keeping JPEG orientation. Guest photos are also resized to 2560px and given a 720px thumbnail in the browser before upload; media is served `private, no-cache` with ETag so hiding a photo still takes effect immediately.
- `worker/poster-layout.mjs`, `countdown.mjs`, `qrcode.js`: poster, Malaysia countdown and QR support.
- `worker/assets`: local E-Kad and marketing artwork. Some sample gallery images use external Unsplash URLs.
- `scripts/build.mjs`: esbuild bundles Worker, embeds client JS, CSS, HTML and local images. Build output is not a conventional public assets folder.
- `tests/*.test.mjs`: isolated Node/VM/API tests using fake identities and in-memory storage.

## Storage
Cloudflare R2 binding **BUCKET** stores BOTH metadata JSON and files. No D1 binding; Supabase is currently authentication, not customer/photo storage.

Main namespaces: `events/<id>/event.json`, `events/<id>/posts/`, `events/<id>/files/`, `events/<id>/gifts/`, and `owners/<encoded-owner-id>/`. RSVP, QR and cover records also live under event-related keys; inspect API source for exact keys. Private payment namespaces: `private/chip/config-<mode>.json`, `orders/`, `status/`, `paid/`, `fulfilled/`; support: `private/settings/support.json`.

No real R2 records are included in this archive. A source ZIP is not a data backup. Media routes enforce visibility; do not expose the raw bucket publicly.

## Identity
Google is configured through Supabase project `https://mhkgtotccgrlbjzuidyn.supabase.co`. Apple is not configured; user does not yet have Apple Developer setup. No email/password login; recovery belongs to provider.

`@supabase/ssr` handles PKCE and secure HttpOnly cookies. `/auth/start` uses same-origin POST; `/auth/return` exchanges code and verifies identity. Server calls getUser; do not trust cookie metadata. Google Cloud callback is the project's Supabase `/auth/v1/callback`; production app callback permitted by Supabase is `https://sejenak.space/auth/return`.

Supabase owner IDs are `supabase:<id>`. Older Sites ChatGPT owners keep their original IDs. Legacy login remains available; no automatic email-based merging. Platform admin and CHIP administration still use trusted Sites identity headers and an email allowlist, NOT Google identity. See migration security blocker.

## Payments and gifts
CHIP integration exists, but last known deployment remains **test mode, live sales disabled**. Public UI says purchasing is not open. No claim of live commercial readiness. CHIP merchant secrets are configured through the authenticated admin flow and encrypted in R2 using CHIP_CONFIG_KEY. Separate test/live records. Never embed or log credentials.

Server re-fetches a CHIP purchase and checks identity/reference/brand/currency/amount/mode before fulfillment. Test transactions do not activate a real purchase. Callback replay protection and stable purchase/event IDs exist. Creation-unknown records require merchant portal review before retry; no automatic refund/recurring payment system.

Duit Salam is separate from CHIP package purchases: guest declares amount BEFORE bank QR becomes visible. Dashboard records the declaration automatically. It is **not bank-verified revenue**. Owner manual amount-entry is disabled. QR requires Pro/Max and an uploaded enabled QR from the couple.

## Remaining launch work
1. Actual customer Google sign-in/return/logout tests on real devices; consent-screen public availability and Apple setup if needed.
2. Real CHIP merchant sandbox checkout and callback verification, then separately approved live configuration and purchase fulfillment tests.
3. Public support number/email from owner. Do not reuse admin personal email as public support.
4. Transactional quota/reservation/idempotency design for concurrent distinct uploads. Current R2 list/count checks are not atomic.
5. Scheduled retention cleanup/notifications and backup/restore procedures; present admin cleanup is manual.
6. Browser/mobile visual/accessibility checks (no browser-control tool available during recent changes).
7. Secure identity migration if hosting outside Sites.

Latest recorded full suite: 27/27 test files passed during Burgundy update. Footer removal subsequently passed syntax/build checks. Automated tests are not real bank, live identity, concurrent production-load or device/browser verification.

## Export verification
The exported source built successfully and its Worker passed syntax checking. All 27 test files were verified: the first run exposed one stale Sage label assertion, which was corrected to Burgundy and its six-test file rerun successfully. No runtime behaviour changed for that correction. Source secrets-pattern scan found no private-key/token patterns; runtime secrets and production R2 data were never fetched for this export.
