# Running and moving Sejenak

## Lowest-change architecture
Cloudflare Workers + a private R2 bucket preserve the existing Worker API and BUCKET interface. Keep Supabase Auth and CHIP. Another host is possible but requires adapting the Request/Response runtime, R2 binding and authentication; it is not a static upload. Costs depend on usage and provider terms, not included estimates.

## Identity boundary (fixed) and remaining admin gap
Sites injects trusted `oai-authenticated-user-id` and `oai-authenticated-user-email` headers. On any other host a client could send these headers itself. The Worker entry (`worker/boundary.mjs`, applied first in `scripts/build.mjs`) now **strips both headers on every request unless `SEJENAK_TRUST_SITES_IDENTITY` is exactly `true`**. Customer identity off Sites therefore comes only from server-verified Supabase sessions. `tests/identity-boundary.test.mjs` proves forged headers cannot read, edit or delete events, open admin, change support settings or reach CHIP admin.

**Before the next Sites deploy, set `SEJENAK_TRUST_SITES_IDENTITY=true` in Sites runtime configuration.** Without it, legacy ChatGPT owners and the admin panel appear signed out (fail closed, not insecure). Never set it on Cloudflare, a VPS or any host that does not strip and re-inject these headers itself.

Still to do before running outside Sites: admin and CHIP administration still authorize only through the Sites identity, so they are unavailable elsewhere until a verified admin path exists (for example an explicit allowlist of Supabase user IDs, never email matching alone). Legacy native-account owners also need an authenticated, auditable migration.

Legacy Sites sign-in/sign-out and admin login cannot be moved by copying source. Map old ownership only using an authenticated, auditable migration. Do not merge records merely by matching email strings.

## Guest anti-spam
`worker/ratelimit.mjs` throttles anonymous wishes, photos, RSVP and Duit Salam per event and per client IP (per 10 minutes / per day: wishes 10/30, photos 40/150, RSVP 10/30, Duit Salam 5/20). Blocked requests get 429 with Retry-After; only accepted submissions count; idempotent retries are free. IPs are stored only as truncated SHA-256 hashes under `events/<id>/limits/`, removed with the event. It relies on Cloudflare's `CF-Connecting-IP`; **if that header is absent nothing is limited**, so confirm it is present on the target host. It does not stop an attacker rotating many IPs: that still needs Turnstile or owner bulk-cleanup tools.

## Environment / bindings
| Setting | Purpose |
|---|---|
| BUCKET | private R2 binding, metadata and media |
| SUPABASE_URL | public project URL |
| SUPABASE_PUBLISHABLE_KEY | public browser-compatible key; server verifies identity |
| SEJENAK_TRUST_SITES_IDENTITY | `true` only on ChatGPT Sites; unset everywhere else |
| SEJENAK_ADMIN_EMAILS | private admin allowlist, currently for trusted Sites identity |
| CHIP_CONFIG_KEY | secret encryption key; preserve securely to decrypt migrated config |
| CHIP_MODE | test initially |
| CHIP_SALES_ENABLED | false initially |
| SEJENAK_RETENTION_DAYS | 40 |

CHIP brand/API credentials are stored encrypted by the admin configuration API, not in this ZIP. Inspect chip.mjs for encryption key format before setting it. Reconfiguring fresh merchant credentials through a secure authenticated interface is an alternative to migrating encrypted records. Never rotate the old key without a re-encryption plan. Do not request service_role for browser login.

`.dev.vars.example` contains placeholders, not working credentials. Copy to ignored `.dev.vars` locally. Production secrets belong in the host's secret manager. No service credentials were exported.

## Data and cutover checklist
1. Create an isolated staging deployment and private storage binding. Keep live sales disabled.
2. Implement secure authentication boundary and admin authorization; test invalid cookies, forged headers, cross-account requests and logged-out access.
3. Obtain a separately authorized full R2 backup using actual hosting access. Preserve all object keys, bytes, content-type metadata and owner/event references. Source access does not imply R2 credentials.
4. Copy encrypted private data only through a secure channel. Preserve needed keys separately; verify counts, checksums, access restrictions and restore behavior. Do not put customer backups in a public repo or chat archive.
5. Reconfigure Supabase allowed origins/redirects and Google OAuth as needed; preserve existing production login until staging succeeds. Configure CHIP callbacks and verify payment status using server-side provider API calls.
6. Update hard-coded canonical origins in `scripts/build.mjs` and other URL references only if changing domain. Existing `.chatgpt.site` page routes redirect to sejenak.space. Supabase redirect validation and native Sites auth routes also need review.
7. Verify complete guest upload/moderation/name reuse, RSVP, poster download, QR gating, package limits, checkout/callback/retry and retention journeys.
8. Schedule cutover: freeze writes or synchronize deltas, switch DNS only after approval, retain backups and an operational rollback path. Do not remove old hosting/storage at cutover.

## Local preview
After build, install Wrangler locally (`npm install --save-dev wrangler`), copy `wrangler.example.jsonc` to `wrangler.jsonc`, and run `npx wrangler dev --config wrangler.jsonc`. R2 local emulation is empty; no production customers are present. The public `/demo` works with sample data. Dashboard APIs need a valid identity. A local preview does not prove production authentication or merchant integration.
