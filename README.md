# Sejenak wedding platform

Cloudflare Worker app with a public guest experience and protected owner dashboard. Hosting supplies server-verified ChatGPT identity headers. Google OAuth is not available in this runtime. Storage uses the platform R2 BUCKET; no Google Drive integration is required.

## Packages and availability

| Server entitlement | Package | Once per event | Photos | Written wishes | Photo storage |
| --- | --- | --- | --- | --- | --- |
| detik | Detik | RM79 | 200 | 500 | 1 GB |
| cerita-kita | Cerita Kita — recommended | RM149 | 1,000 | 2,000 | 5 GB |
| seindah-kenangan | Seindah Kenangan | RM249 | 3,000 | 5,000 | 15 GB |

| Feature | Detik RM79 | Cerita Kita RM149 | Seindah Kenangan RM249 |
| --- | --- | --- | --- |
| Gallery, wishes, QR, moderation | Included | Included | Included |
| E-Kad with six artwork options | — | Included | Included |
| RSVP and attendance counts | — | Included | Included |
| Instagram Story poster | — | Included | Included |
| Custom colors, font and text | — | Included | Included |
| Duit Salam QR and declarations | — | Included | Included |
| Upload personal cover photo | — | — | Included |
| Export RSVP to CSV | — | — | Included |

Detik uses the default Sage theme. Cerita Kita and Seindah Kenangan support up to 2,000 RSVP responses and 2,000 gift declarations. Photo-count and storage ceilings both apply; each photo is limited to 8 MB. Server feature permissions match the frontend matrix. Cover writes/serving are upper-tier-only; a protected export endpoint checks the CSV entitlement. Lower tiers cannot grant themselves a plan or feature by PATCH. Unavailable features show actionable Locked buttons rather than package/price labels; clicking opens package comparison and highlights the first tier that includes the feature. The same interaction works on public pricing and owner pages.

Checkout and paid activation are not implemented and are explicitly marked unavailable. New real event creation returns 402, including requests with client-supplied paid plans. Only the isolated demo can create new sample galleries. No free plan is offered. Existing trial records remain readable, editable and usable under their historical 20-photo/5-wish/160-MB limits; no records are migrated, deleted or silently upgraded. Legacy idempotent creation requests may return their existing event. A future verified payment workflow must assign paid entitlements server-side; PATCH cannot set a plan.

The recommended RM149 middle package adds invitation/RSVP/poster, custom design and Duit Salam to the basic gallery, plus five times RM79 photo/storage capacity for RM70 more. RM249 adds personal cover upload, CSV export and three times RM149 capacity. There are no fabricated discounts, purchase counts or scarcity claims. Conversion impact has not been measured.

## Demo and real journeys

- /dashboard-demo: anonymous owner demo with photos, wishes, RSVP and gift samples. All API mutations stay in memory and reset on reload. A demo package picker lets reviewers switch feature permissions between all three paid tiers.
- /demo: sample public guest gallery with separate horizontal photo/wish panels.
- /invitation-demo: sample E-Kad and RSVP; template query accepts ivory, pearl, garden, rosewater, azure or songket; historical botanical/minimal/classic/midnight/terracotta links remain supported.
- /dashboard: sign-in for managing existing owner galleries. Empty accounts are guided to demo/package comparison.
- /e/:id: guest photo/wish sharing, without login; /i/:id: paid invitation and anonymous RSVP.

For paid invitation tiers, E-Kad & RSVP is the single editor for shared couple name, date/time/location and invitation details. Gallery styling shows these details as a read-only summary linking to that editor. Detik/legacy gallery-only owners retain basic detail editing. Gallery settings edit only gallery colors/font, cover, welcome text and collection/moderation controls, with a gallery photo/wish preview. Public responses expose only public fields. Gallery deletion requires ownership and removes event-scoped objects and the owner index. The private checklist implementation remains preserved but temporarily hidden in navigation.

Guests upload one JPG/PNG/WebP photo or submit a written wish. Submission IDs make retries idempotent. Moderation keeps unapproved media private. Closed collections prevent new submissions.

E-Kad owners select one of six artwork backgrounds using a phone carousel or desktop card grid, preview live event details in its palette/type style, then save the selected template. Ivory Royale and Sutra Pearl replace the Art Deco and Modern options with ivory/gold embossed floral and flowing paper styles. Every option, live preview and public invitation displays accurate Arabic Bismillah as live RTL text in Amiri; the generated backgrounds contain no personal data or embedded lettering. Exported invitation posters also include the Arabic line. Selection updates the preview without replacing the carousel or resetting its scroll/focus. Existing saved legacy templates remain valid. Guests can answer/update RSVP using a random per-device token stored only as a hash server-side. Optional local memory restores name/status/counts with a forget control. Public payloads do not expose RSVP records; owner CSV neutralizes spreadsheet formulas.

An attending guest can generate a personalized 1080 × 1920 PNG invitation poster using the submitted name. Owners can also generate posters. Both use the saved E-Kad artwork, palette and event details; ornamental top/bottom regions retain their proportions while the quiet middle extends to 9:16. Gallery covers are not substituted into cards or posters. Owners must generate/save their card before exporting, and unsaved invitation changes prompt them to save first. Downloads and supported native sharing do not post automatically to Instagram.

## Duit Salam

Owners upload their own bank/e-wallet QR. Guests enter name and amount before the QR appears. Their declarations automatically update the private owner dashboard; amounts are integer sen and remain unverified by the bank. Manual owner entry is disabled. QR retrieval requires a matching guest access token or owner identity and an enabled paid entitlement. Sejenak neither processes money nor claims to verify transfers. Demo pages have no real payment QR.

## UI and validation

Approved sage/forest Sejenak styling is shared across sales and owner pages. Shared wordmark, liquid-glass mobile navigation, reduced-motion/transparency fallbacks, safe-area spacing and mobile form sizing remain in place.

npm run build embeds HTML, CSS, JS, QR library and WebP artwork into the Worker.
npm test runs isolated owner/guest, entitlement/quota, private-data, RSVP/poster, navigation and sales-page regressions. Browser/device visual QA is unavailable in this execution environment.

## Launch requirements

Before enabling purchases, implement a verified payment provider/webhook, published retention policy and enforced retention scheduling. R2 JSON metadata currently lacks transactional quota reservations under simultaneous writes; atomic quotas and abuse rate limits are required for wider commercial launch. ZIP export and voice messages are not advertised. Guest links can be reshared; photos have file-signature validation but no malware scanning.

Final journey polish includes guarded unsaved E-Kad navigation, clear demo submission receipts, filter-specific recovery states, keyboard photo zoom, stable manual carousel swipe height, and reduced-motion support. See QA_REPORT.md for verification limits.

## Platform admin (local, not deployed)
- Route: /admin. Separate from customer /dashboard.
- Runtime configuration: SEJENAK_ADMIN_EMAILS, comma-separated exact authenticated ChatGPT email addresses. Currently intentionally unset; all admin access is denied until configured. Requires both hosting authenticated user ID and email headers.
- Admin can browse 50 owner-index records per page, search/filter loaded records, inspect a record, change its paid package, toggle collection/moderation and view the latest 20 audit entries.
- Required reasons and actor/before/after are stored under admin-audit/<event-id>/. Pending audit entries identify incomplete operations. R2 is not transactional; revision checks detect already-saved stale admin edits but do not guarantee mutual exclusion of truly simultaneous writes.
- No new free packages, deletion, account reassignment or payment verification. Package assignment grants access only; no checkout or revenue claim.
- Later: set the admin allowlist with Sites runtime configuration, deploy the saved source, then verify actual login with the intended admin account and denial for an ordinary account. Do not deploy before the user requests it.

### Admin login demo (local)
/admin-demo provides an explicitly simulated login, three fictional customers, editable package/collection/moderation controls, audit history, reset and logout. No credentials are requested. All demo operations stay in memory, never call the real admin API, and reset on refresh. Real /admin still requires the configured server allowlist. Deployment remains deferred per user instruction.

Admin support update: per-event storage reports count photo objects against the package photo-byte allowance, while total event object bytes are shown separately (not hosting billing). Admin-only 0–50 GB storage bonus is enforced by upload limits; photo-count limits remain unchanged. Event tickets support priority, status and append-only notes (latest 50), stored separately from public/customer event payloads. Admin can reopen RSVP, explicitly clearing its old deadline. List totals describe loaded records, not the entire platform. Demo seeds near-full storage and support cases; real admin remains unconfigured/denied.

### CHIP sandbox (admin only)
Open `/admin` with the allowlisted ChatGPT account, then **Bayaran CHIP · Test mode**.
Enter the merchant's **test** API secret and Brand ID there, never in chat/source.
Credentials are AES-256-GCM encrypted in `private/chip/config.json` in R2;
`CHIP_CONFIG_KEY` is a secret runtime environment variable containing a base64 32-byte key.
Preserve this key across deployments; replacing it makes the saved credentials unreadable.
`CHIP_MODE=test` and `SEJENAK_ADMIN_EMAILS` are also required. Only admin can configure,
create checkouts, list records or request verification. Test purchases use server-priced
RM79 / RM149 / RM249 products. A non-test purchase response is blocked before exposing
its checkout URL. Do not enter a live key (an unpaid provider purchase could still be created).

The success callback `/api/chip/callback?order=<uuid>` never trusts posted payment data:
it fetches the purchase using server-side CHIP credentials and matches purchase ID,
brand, reference, MYR total and `is_test`. A redirect alone is not confirmation.
Admin can click **Semak dengan CHIP** after returning to verify pending, cancelled or
failed checkouts too. Paid test markers are monotonic and isolated from customer events.
There is deliberately no production fulfillment, customer checkout or real entitlement
activation in this sandbox release. Enable live commerce only in a subsequent release
with approved retention terms and tested fulfillment. The public pricing remains closed.
If a create request times out, the record is `creation_unknown`; inspect the CHIP portal
before retrying. No automated retries, refunds or recurring charges are performed.


## Release preparation: Basic / Pro / Max, checkout and support

- Public prices are Basic RM79, Pro RM149, Max RM249. Internal plan IDs remain stable for existing records.
- `/checkout?plan=detik` (or `cerita-kita`, `seindah-kenangan`) saves a tab-local draft, reviews the wedding, and returns from CHIP to `/checkout/status?order=...`.
- Only `/demo` remains a public Basic gallery demo. Old owner, invitation and admin demo URLs redirect there.
- Live payments remain disabled. Launch requires separate live CHIP credentials, `CHIP_MODE=live`, `CHIP_SALES_ENABLED=true`, and `SEJENAK_RETENTION_DAYS=40`. Test mode is admin-only and never activates real plans.
- Server verifies purchase ID, reference, brand, currency, amount and test/live mode before fulfillment. Replayed callbacks preserve existing wedding edits.
- Paid galleries expire 40 days after the original wedding date at Malaysia end-of-day. Editing the wedding does not extend purchased retention. Access expiry is enforced server-side. Physical expired-file deletion is currently an explicit admin action; no automatic scheduled purge has been configured. Payment audit and ownership metadata are retained.
- `/support` is public. Admin → Tetapan sokongan sets WhatsApp, email and optional service hours, stored under `private/settings/support.json`. No personal/admin email is published automatically. Contact links open the visitor's messaging application; they do not create an internal support ticket automatically.
- Google/Apple login is requested but not configured. Existing Sites ChatGPT identity remains in service until a supported external provider integration is completed. User wants social login only, with account recovery handled by Google/Apple. Supabase project URL has been supplied; publishable key and Google OAuth configuration are pending; Apple Developer account is not yet available.
- Before sale: complete social login setup, real merchant test checkout and callback verification, live payment configuration, public support contact, and scheduled retention operations. Do not claim public-sale readiness based on simulated payment tests alone.


## Google sign-in (Supabase)

- Main URL: https://sejenak.space. Hosting slug is now `sejenak`; hosted page visits redirect to the custom domain.
- `/login` offers providers reported enabled by Supabase. Google is configured. Apple stays disabled until its provider is configured. No email/password signup is offered.
- Runtime values `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are configured through Sites; no provider client secrets are embedded in the application.
- Official `@supabase/ssr` SDK handles PKCE, session cookies and refresh. `/auth/start` is a same-origin POST; `/auth/return` exchanges the code and verifies the user with Supabase before continuing. The callback URL registered in Supabase is `https://sejenak.space/auth/return`. Google Cloud uses the Supabase `/auth/v1/callback` URL.
- Session cookies are Secure, HttpOnly, SameSite=Lax, host-only; tokens are not stored in browser localStorage. Every authenticated customer API request uses server-verified Supabase identity, never cookie user metadata.
- New owner IDs use `supabase:<user-id>`. Existing Sites-owned records remain with the original identity and are accessible through the legacy ChatGPT option; no automatic email-based account merging.
- `/admin` and CHIP administration preserve Sites identity and the existing admin allowlist. A Google email matching the admin email does not grant platform admin access.
- Customer logout clears Supabase cookies and also navigates through the native Sites signout path to avoid falling back to another still-active identity.
- A real Google account login must still be exercised by the user. Google consent-screen testing mode may require adding the user's email to Google Auth Platform → Audience → Test users; public sale requires reviewing the Google publishing status.

## Simplified navigation

Owner primary sections: Utama, Galeri, E-Kad, Kongsi, Menu. Menu contains Majlis saya, Reka bentuk galeri, Duit Salam, Pakej & storan, support and logout. Dashboard recommendations follow pending moderation, collection status and local share progress; event data always determines moderation completion. Public guests use Galeri, the plus button and Ucapan; Basic hides paid Duit Salam actions. Sharing keeps E-Kad invitations separate from the gallery QR destination.

## Burgundy Romance colour scheme

Shared UI now uses burgundy (#6f283d), warm cream (#fbf6ef), and soft gold accents. Basic/default guest presentation follows this brand palette. Saved premium palette selections and custom colours, invitation artwork and template palettes remain unchanged. Burgundy Romance is also available in the gallery palette picker. Liquid-glass motion and gold Locked buttons are retained.
