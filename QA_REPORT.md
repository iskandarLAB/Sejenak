# Owner and guest simulation report

## Verified
77 automated checks across 15 test files pass. Simulations use isolated in-memory storage and mocked owner identities. No production customer records or real paid entitlements were changed. Native hosting deployment status is used to verify publication.

Journeys covered:
- Anonymous access, owner sign-in boundary, separate owner accounts, trial E-Wed creation and retrying creation without duplicates.
- Editing date/time/location, validating real calendar dates, saving private checklist tasks and maintaining premium locks.
- Multiple E-Weds: restoring an owned selected event and keeping dashboard counts and manual gift totals scoped to that selection.
- Guest photo/wish submission, retry handling, trial and paid limits, storage accounting, moderation, hidden media and closing collection.
- Paid invitation settings, RSVP counts/deadlines/privacy and guest poster visibility using the submitted attending name.
- Payment QR ownership/visibility controls and private manual received-gift amounts stored in integer sen.
- Poster text wrapping, Malaysia-time countdown, horizontal gallery/wish navigation, reduced motion, and separate E-Kad creation.
- Browser preference storage failures, onboarding and absence of unavailable voice/ZIP features in pricing.

## Fixes applied
- Added the approved three-step onboarding guide and scoped E-Wed picker/refresh control.
- Corrected paid photo/wish limits and displayed storage usage; trial remains 20 photos and 5 wishes.
- Added request IDs to event creation, photo/wish submissions and manual gift records so retries reuse a record.
- Validated actual calendar dates and malformed JSON/form requests; invalid requests return useful 400 responses.
- Disabled media caching so hiding a photo is respected on subsequent requests.
- Removed unsupported voice and ZIP listings, clarified purchase availability and retained clear manual gift accounting.
- Made preference storage tolerant of blocked localStorage and fixed the test runner to execute every test file.

## Verification limits / remaining launch work
No browser-control tool is available, so real-device visual checks, hosted login redirects and Canvas PNG rendering have not been exercised in a browser. Google login and online checkout are still unavailable. Existing platform sign-in remains ChatGPT-based. Bank transfers are not automatically verified; the gift total is guest-declared and unverified. Paid plan upgrades were only simulated in local test fixtures.

Before opening paid sales: integrate verified checkout/webhooks, implement the advertised collection/retention policy and notifications, and migrate metadata/quota reservations to transactional storage with rate limiting for simultaneous uploads. R2 list-and-count limits are checked sequentially and are not an atomic reservation under concurrent distinct requests. Voice recording and ZIP downloads remain outside the offered feature list.

## Guest simulation follow-up
User approved remembering RSVP name/status/counts on this device, with opt-out and a forget control. Notes are not stored locally; forgetting device fields preserves the original RSVP token to avoid duplicate server responses. User declined batch uploads and a contributions history. Fixed successful-submission receipts disappearing on gallery refresh failure, and blocked photo/wish entry when collection is closed.

## Latest guest and invitation updates
Guests enter a name and amount before the payment QR unlocks. Their declaration automatically appears in the private dashboard, refreshed every 15 seconds while visible. Owner manual entry is disabled; legacy records are separated. A declaration does not verify a bank transfer. RSVP notes are removed, invitation utility actions are in the footer, Duit Salam is absent from e-cards, and the date is prominent. Onboarding now explains E-Wed and changes according to whether an event exists: create first, then try the gallery, share, and review submissions.

## Follow-up simulation after gallery management changes
Verified guest RSVP/photo/wish and owner creation/moderation/payment declarations using isolated test storage. Fixed gallery selection responses arriving out of order, preserved the current owner section when switching gallery, restored the RSVP name in the matching event gallery without exposing another event profile, and corrected the obsolete Duit Salam e-card wording. Dashboard shows every owned gallery after removal of the active selector. Successful deletion remains successful if the next gallery fails to load. Added regression coverage for selection ordering and RSVP-to-gallery name reuse; deletion ownership/cascading coverage also passes. Checklist entry points remain hidden with data preserved. Visual browser verification remains unavailable.

## Mobile responsive update
Added phone layouts through 760px, a compact layout below 380px and tablet adjustments through 1050px. Dashboard actions wrap below the title; flexible grid tracks prevent content from forcing wider layouts. Forms use 16px input text on phones, controls use 44px minimum targets, dialogs scroll within dynamic viewport height, guest navigation accounts for safe-area insets, invitation actions use two columns, and very narrow photo/metric cards stack. All 65 existing behavior checks pass and the Worker builds successfully. CSS changes have not been visually exercised in a real browser or device; device-specific rendering remains unverified.

## Public owner demonstration
Added /dashboard-demo with six example photos, four written wishes (two pending items overall), five RSVP responses and RM500 of unverified gift declarations. It needs no sign-in and routes all owner API calls to an isolated in-memory adapter, including moderation, text/theme edits, gallery creation and deletion. Reset/reload restores fixtures; real account state is untouched. Sample guest/invitation links use existing public demos. File upload actions are explicitly unavailable in this demonstration. Three regression tests cover anonymous opening, moderation/edit/deletion/reset and ensuring API requests never reach production or real record IDs. All 68 behavior checks pass; no visual browser check is available.

## Reversible Wedding Studio redesign
Added an editorial ivory/plum owner-demo design, with a photographic event hero, four actionable statistics, pending-content review, grouped shortcuts and a phone bottom navigation. A comparison toolbar switches between the previous liquid-glass layout and Wedding Studio without resetting sample data. Lock saves the design preference on this browser; explicit style URLs can override the preview and switching remains available. The redesign is scoped to /dashboard-demo; real account and public guest layouts retain their existing behavior. The prior source snapshot is c290cab9677369e31569ee3fec7ac3cd5933f05e, published as version 23. Two additional regressions cover comparison state, inline-handler validity and locking. All 70 behavior checks pass. Visual browser/device verification is still unavailable.

## Pricing and package clarity
Retained two options: the free trial (20 photos, 5 wishes, 160 MB) and the proposed RM149 one-time package for one event (1,000 photos, 2,000 written wishes, 5 GB). Pricing leads with outcomes, demonstrates the paid experience, provides a comparison and answers common purchase questions. Checkout is still unavailable and is clearly labelled; no fake discounts, scarcity or sales claims were added. Removed fixed retention promises until policy enforcement is implemented. All 70 existing behavior checks pass; conversion impact has not been measured and visual browser checks remain unavailable.

## Approved Sejenak style and E-Kad templates
Promoted the approved editorial layout to all owner dashboards, retained Sejenak branding and converted the palette to sage/forest green. Removed demo design-comparison controls; historical source versions remain available. Phone dock and controls use translucent layered gradients, blur, highlights, safe-area spacing, reduced-transparency fallback and accessible focus states. Refined SVG icons with rounded forms and subtle tint layers. Real account monograms and gallery links derive from selected event data.
Added Botanical, Minimal and Klasik E-Kad choices with clickable design cards and a preview. The paid invitation API persists and validates the template enum; trial owners remain blocked. Public invitations render the selected structure while preserving RSVP behavior. Demo invitation links carry a safe template preview parameter. Regression checks cover saved template persistence, ownership, invalid-template rejection and all three public layouts. All 72 tests pass across 13 test files. No real-device/browser visual check has been performed.

## Artwork-only invitation templates and landing poster
Generated and visually inspected three text-free invitation backgrounds: Botanical Ivory, Sage Atelier and Klasik Gold. The template picker shows artwork alone; an event-name/date/location preview appears after selection. Generation requires choosing an image, persists the existing paid template ID, and offers the finished invitation link plus optional IG poster. Added a regression for this choice-to-generation flow. Original generated PNG assets are retained outside the source checkout; WebP encoding preserves composition and reduces the four served artworks to about 900 KB combined. The landing hero now uses a separate botanical invitation poster with live HTML name/date text. Worker serves all four bundled WebP assets and missing assets return 404; valid image MIME and RIFF signatures verified locally. All 73 behavior tests pass. Artwork itself was inspected; browser rendering remains unverified.

## Sejenak sales-page redesign
Rebuilt the public landing page around a clear product proposition, three concrete wedding-planning problems, an interactive before/during/after product walkthrough, a three-step trial path and the existing transparent package comparison/FAQ. Retained the botanical poster and sage palette. Sample photos, RSVP counts and dashboard statistics are labelled as demo data, with no invented testimonials or conversion claims. Paid E-Kad/RSVP availability remains explicit; primary calls to action open the public owner demo or real free-trial dashboard. Added accessible keyboard tab navigation, a phone menu and a safe-area-aware phone CTA bar. Two regression checks verify complete page rendering, working destinations/inline handlers and ARIA/focus behavior for the walkthrough. All 75 behavior tests pass; conversion uplift and real-device visual rendering have not been measured.

## Welcome guide, shared logo and liquid navigation
Moved the open usage guide above dashboard headings, with a Selamat datang greeting, plain three-step instructions, direct actions and progress based on gallery creation, link/QR preparation and reviewing received content. Guide progress is scoped per gallery and demo reset clears its sample progress. Unified the SVG/wordmark used in sales-page, owner and guest headers/footers and small product previews. Added a single sliding liquid-glass dock indicator with an elastic transition, smooth continuity under interrupted clicks, correct Menu state and reduced-motion support; switching owner sections opens the new content at the top. Two regressions verify guide placement/shared logos and dock motion/accessibility state. All 77 tests pass across 15 files. Browser/device animation appearance has not been visually verified.

## Three paid packages and demo-only acquisition
Replaced the free package with three proposed one-time, per-event packages: Detik RM79 (200 photos, 500 written wishes, 1 GB), Cerita Kita RM149 (1,000 photos, 2,000 wishes, 5 GB) and Seindah Kenangan RM249 (3,000 photos, 5,000 wishes, 15 GB). All include existing core paid features; the middle package is marked recommended with a factual RM70/5× capacity comparison. No invented purchase popularity, discounts or urgency are used. Shared hard caps remain 2,000 RSVP responses, 2,000 guest gift declarations and 8 MB per photo. Both photo-count and byte quotas apply.

Updated landing navigation, mobile CTA, walkthrough copy, pricing cards/comparison/FAQ, detail modals, owner package page, legacy labels and empty-account onboarding. Public and real-owner free acquisition paths now lead to demo/package review. New production event creation returns 402 until a paid activation workflow exists; client-supplied plan IDs cannot bypass this. Existing trial data and legacy idempotent replays remain supported. Isolated demo creation now grants a full sample package rather than a limited trial. No checkout was added and purchase availability is explicit.

Historical event tests now seed their fixtures directly in the in-memory bucket rather than provisioning a discontinued free account. Five new regressions verify catalog consistency, all package modals/inline handlers, closed real creation, demo creation, all paid entitlements, actual photo/wish quota boundaries and storage-byte ceilings. All 82 tests pass across 16 files. Build and JavaScript syntax checks pass. Conversion impact and browser/device rendering remain unmeasured; no browser tool is available.

## Guest navigation motion, compact countdown and invitation utility icons
Guest navigation now uses one persistent transform-only sliding glass indicator with stable button dimensions, higher surface opacity and reduced-motion/transparency fallbacks. The selected destination stays locked while native smooth scrolling is in progress, preventing early scroll events from reverting it. Panel-height notifications no longer issue instant scroll commands; only actual viewport-width changes realign the panel. Swipe/trackpad interactions can interrupt movement; the indicator follows the actual swipe position. Taller panel height is retained during programmatic movement before settling to the destination.

Moved the wedding countdown outside the decorative E-Kad into a compact row immediately below the page header for all three templates. Reduced typography/padding and retained date/timezone context and tabular timer numerals. Invitation-footer actions now include location-pin, navigation-arrow, calendar, QR and native-share icons with their original text labels and destinations.

Added a regression reproducing partial smooth-scroll events, same-width image resize notifications, rapid destination changes and viewport resize; extended invitation markup checks for countdown placement and icon rendering. All 83 tests pass across 16 files; Worker build and JavaScript syntax checks pass. Browser/device visual and animation verification remains unavailable.

## Distinct feature tiers and honest middle-package recommendation
Revised the previous capacity-only pricing into three functional tiers. RM79 Detik provides the standard Sage gallery, photo/wish collection, links/QR and moderation. RM149 Cerita Kita adds E-Kad, three invitation artworks, RSVP/counts, IG poster, custom colors/font/text and QR Duit Salam/declarations. RM249 Seindah Kenangan adds personal cover upload and RSVP CSV export, alongside the existing larger quotas. Prices, photo/wish/storage capacities and purchase-unavailable status are unchanged. Cards/detail modals and a full comparison show both included and unavailable features; middle-tier copy explains the concrete RM70 additional value without invented popularity or discounts.

Server permission checks now reject lower-tier invitation/RSVP/Duit Salam/custom-design access, cover upload/serving/focus and CSV export requests. Public payloads suppress stale restricted cover metadata. Owner forms preserve basic editing for Detik/legacy galleries; middle design drafts omit the upper-only cover field. CSV export uses a protected tier-checked endpoint and retains spreadsheet formula neutralization. Demo package selection lets reviewers simulate all three tiers without production API writes or persistence.

Updated matching catalog tests and full-design fixture to use its appropriate upper entitlement. Added regressions for disabled versus enabled cover editing, safe middle design drafts, basic-tier settings, demo reset/selection and tier-specific CSV export/formula safety. Entitlement tests exercise every plan's features, quotas, cover visibility and owner-only export route. All 85 tests pass across 16 files. Build/syntax checks pass. Browser/device rendering and conversion effects remain unmeasured.

## Six distinct E-Kad artworks and responsive selection
Generated six new text-free 3:4 invitation backgrounds and inspected every image: Sage Herbarium (sage/ivory botanical), Rosewater Romance (blush watercolor), Midnight Celestial (navy/gold art deco), Terracotta Modern (warm paper-cut arches), Porcelain Blue (blue/white porcelain florals), and Songket Emerald (emerald/gold Malay geometric textile). Original PNGs remain in generated_images and copied artwork archives; served WebP encodings total about 1.33 MB for the six new images. Historical artwork assets and stored template IDs remain supported.

Replaced the old three compact choices with six large artwork cards: swipe/snap carousel with arrow controls on phones, a three-column card grid on desktop, style badges/swatches and accessible selection status. Selecting a card updates only the hidden field, pressed state and preview; carousel position, focus and other invitation fields remain intact. Matching ink/paper/accent/type styles are used for the new live previews and generated public invitation cards, including readable light text and button contrast for navy. Names/date/location remain live HTML, with no data embedded in artwork.

Extended backend/demo validation, public template links, marketing artwork samples and package descriptions to six options. Existing saved botanical/minimal/classic designs remain valid without migration. Two new regressions cover six distinct palettes/assets, contrast, selection-state preservation, carousel arrows/keyboard/reduced motion and historic links. Expanded persistence/public-render tests cover all six new and three historical IDs. All 87 tests pass across 17 files; build and syntax checks pass. Locally executed built Worker routes serve valid WebP/MIME for every new artwork and the historical classic asset. Browser/device layout rendering remains unverified.

## Ivory reference styles and Arabic Bismillah on every invitation
Replaced the selectable Art Deco/Midnight and Modern/Terracotta directions with two newly generated and inspected designs inspired by the supplied visual references: Ivory Royale (champagne-gold sculpted floral arch and satin) and Sutra Pearl (flowing layered ivory paper and gold botanical outlines). The six-choice carousel/grid now leads with these two designs. Source PNGs are preserved; served WebP assets are about 351 KB combined. Removed styles remain readable only as historical stored/template links, rather than appearing among new choices.

Added accurate Arabic Bismillah as live RTL text with lang=ar on all six chooser cards, personalized previews and public invitation cards, including historical layouts. Loaded the Amiri font, adjusted preview spacing, and added the same line to generated IG invitation posters and the landing invitation sample. Background artwork contains no user data or embedded lettering; live type preserves spelling and editable event text.

Expanded persistence/public-render coverage to the two new IDs plus historic IDs. Updated carousel generation regressions to assert six Arabic labels and the absence of removed styles from the picker. All 87 tests pass across 17 files; build/syntax checks pass. Built Worker routes serve valid WebP/MIME for both new artworks and include the Arabic font stylesheet. Both generated images were inspected; browser/device Arabic layout and Canvas raster rendering remain unverified.

## Actionable Locked controls and one E-Kad source for IG posters
Replaced price/package-labelled feature locks with consistent Locked buttons and lock icons in owner feature pages, cover controls, CSV actions, package feature lists and the public comparison table. Clicking opens the package page/comparison, explains the selected feature and highlights the lowest tier that includes it. Existing feature permissions and unavailable checkout remain unchanged; locked controls do not activate entitlements.

Rebuilt IG poster rendering to use the saved E-Kad artwork, palette, typography and event/invitation details. Removed the independent generic flower/arch composition and unrelated gallery cover. The source artwork's ornamental upper/lower regions keep their proportions while the quiet middle extends to 1080x1920. Demo QR links carry the selected template. Saved-card and dirty-form guards prevent exporting an unrelated/default design before generating or saving the E-Kad.

E-Kad & RSVP now owns shared couple name, date, time and venue editing in the same save as template/hosts/message/RSVP settings. Gallery styling shows a read-only detail summary linking to that single editor, edits only gallery-specific style/copy/collection controls and has a photo/wish gallery preview. Entry/legacy gallery-only owners retain basic detail editing. Public E-Kad artwork and IG posters no longer inherit a gallery cover. Updated gallery menu/action labels to distinguish them from invitation editing.

Regression checks cover Locked navigation/highlighting on public and owner views, saved metadata propagation, ornamental slice geometry, poster artwork/palette/content/QR selection, no gallery-cover substitution, one-editor field boundaries, distinct gallery preview and export save guards. All 92 tests pass across 18 files; build and syntax checks pass. Canvas draw operations were verified in an isolated mock; actual browser raster output and phone layout remain visually unverified.

## Final journey audit — 22 October 2026
- Reviewed guest/owner navigation, RSVP, contributions, package gates, saved-card/export boundary, responsive rules and motion.
- Unsaved invitation edits now require explicit discard on section/event changes and trigger browser refresh protection.
- Guest demo contribution receipt explains simulated versus saved results and links to owner review demo. Demo entry links avoid unintended login; date standardized to 22 February 2027.
- Search/filter empty states distinguish no results from an empty gallery. Photo zoom keyboard access, live feedback and form error announcements improved.
- Manual carousel swipe retains maximum panel height between endpoints; modal entry uses short transform/opacity animation; global reduced-motion override added. Phone banner actions wrap and feedback stays above dock.
- Pricing legend clarifies Locked means excluded from the selected package. Existing prices, entitlements and purchase-unavailable state preserved.
- Validation: 96 tests across 19 files passed; Worker build, syntax and whitespace checks passed.
- Limitation: browser/computer QA unavailable in this session. No claim of actual mobile rendering, motion frame-rate or conversion uplift verification. Payment/new real-event acquisition remains closed.

## Private platform-admin implementation (not deployed)
- User requested runtime admin identity remain blank and deployment be deferred.
- Added /admin and server-enforced /api/admin routes. Fail-closed allowlist, authenticated identity required, existing same-origin and request-size checks preserved.
- List/search/filter loaded events, change paid package and collection/moderation controls, required audit reason and latest 20 audit entries. No destructive delete, owner impersonation or customer-data dump.
- 100 tests across 20 files pass, including anonymous/ordinary-owner denial, empty configuration denial, pagination, audit preservation, stale revision rejection and foreign-origin rejection. Worker build/syntax and diff checks pass.
- Browser visual and real hosting login verification remain pending. Runtime configuration unchanged; no push or deployment performed.

## Admin demo login
- Added isolated /admin-demo login simulation and three fictional customer events, with editing/history/reset/logout.
- Tests prove demo operations make zero real API calls and reject real customer IDs; /admin continues using server authorization.
- 102 tests across 21 files pass. Build, Worker syntax and diff checks pass. Browser visual QA unavailable. Not deployed pending clarification of the earlier deployment hold.

## Admin support and storage
- Storage progress/balance, >=80% warning filter, loaded-object storage total and separate photo quota; additional GB enforced by backend upload limits and excluded from owner mutation fields.
- Private event tickets with notes, priority/status and stale-revision rejection; diagnostic checks for collection/RSVP/package/photo-count limits. Reopening RSVP explicitly clears deadline.
- Demo remains in-memory with near-full quota and ticket scenarios. Actual admin allowlist unchanged.
- 104 tests across 21 files pass, including unauthorized support denial, ticket history/stale edits, storage bonus owner visibility and customer inability to grant bonus. Build/syntax checks pass. No browser visual verification available.
- R2 operations are not transactional; revision checks reject already-stale requests but simultaneous writes are not serialized. No platform billing, revenue or actual upload-error telemetry claimed; diagnostic checks use current configuration.

## CHIP sandbox integration
- Admin allowlist; authenticated settings and checkout; cross-origin write protection.
- AES-GCM secret storage with separate runtime encryption key; API never returns secret.
- Server-controlled prices; non-test purchase URLs blocked; callback verified with authenticated lookup.
- Test paid marker survives stale callbacks; no event or owner entitlements written.
- Six integration tests use mocked CHIP HTTP. Real merchant checkout and browser interaction
  remain unverified until the admin supplies test credentials in the secured settings page.

## CHIP configuration readiness fix
- Official CHIP schema checked at https://swagger.chip-in.asia/json.
- Read-only readiness now validates the configured Brand ID + MYR payment methods,
  rather than just fetching the callback public key. Empty methods cannot report ready.
- Configuration is verified before encrypted replacement; a failed replacement preserves prior credentials.
- Pasted Bearer prefixes normalized, including previously saved credentials; product quantity follows string schema.
- Admin opens trigger the read-only check automatically; payment secrets remain server-side.
- Merchant checkout outcome remains unverified without a fresh authenticated attempt.
- Root code defect identified against Cloudflare's Request documentation: Workers rejects
  redirect:"error" at request construction. Replaced with supported manual mode and explicit
  rejection of all 3xx responses, retaining credential destination protection. Regression test
  emulates Workers' rejected mode and asserts redirects never cause a second request.


## Checkout, package consolidation, retention and support update

- 25 test files checked. The full run passed 24 files; the new retention test fixture had a syntax typo, corrected and rerun successfully (3 retention cases). All files now pass their latest executions.
- Tests cover verified-only CHIP fulfillment, replay-safe activation, admin sandbox restrictions, owner isolation, checkout review, 40-day expiry, admin-only purge, public support fields and protected support configuration.
- Built Worker and embedded browser JavaScript parse successfully. Local Worker route smoke checks returned 200 for home, checkout, status and support, and 302 to Basic demo for the three retired demos.
- Browser interaction/visual QA unavailable in this environment. No actual customer charge or provider OAuth login was performed.
- Sales remain off and CHIP remains test mode. Support contact is unset until supplied or configured in admin.


## Google auth and domain update

- 27/27 test files passed; auth tests rerun after restricting customer identities to Google/Apple.
- Official SDK exercised against mocked provider endpoints: PKCE challenge, callback exchange, HttpOnly cookies, verified user identity, destination allowlist, cancellation/missing verifier, logout, and native-admin separation.
- Login UI tests cover preserved checkout return path, disabled Apple, provider failures, support/account recovery and legacy account access.
- Native hosting slug change completed successfully to `sejenak`; canonical domain remains https://sejenak.space.
- Browser-based Google consent and a real Google account login cannot be completed from this environment. Provider test status does not mean a real person has completed login.

## Simplified ecosystem UX — 23 October 2026

The owner dashboard now presents one next action and compact, event-scoped summaries. Navigation is Utama, Galeri, E-Kad, Kongsi, and Menu on desktop/mobile. Secondary account, event, design, gift, package and support actions are grouped in Menu. Empty accounts get a single package-first path instead of duplicate creation prompts and misleading zero statistics. Sharing explains invitation links versus photo/wish gallery links. Pending moderation resets the guide review step correctly; Basic guests no longer see a premium gift entry. The guest submit button is labelled Hantar.

Verification uses isolated Node/VM journey tests, the production Worker build, and HTTP checks. No customer data or payment configuration was modified. Browser/device visual review is unavailable in this environment. Earlier report sections are historical; current authentication and commerce limitations are described in README.
