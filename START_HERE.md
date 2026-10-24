# Sejenak → Claude handover

Prepared 24 October 2026 (Malaysia). Snapshot of commit `3251ca023ecf34696bd29db5c5e6aa5e0da2c96c`, live version 48 before this handover download was published.

Start with **CLAUDE_HANDOVER.md**, then **MIGRATION.md**. `README.md` and `QA_REPORT.md` contain historical entries; the current status in this handover takes precedence over old claims about trials, manual gifts, Google setup and demo routes.

## What you have
- Full tracked application source, image assets, lockfile and automated tests.
- `.openai/hosting.json` identifies the existing Sites project; do not create a new Sites project or deploy to that project unintentionally.
- No `.git`, dependencies, customer data, payment secrets, session cookies or production storage export.
- No compiled build: generate it with `npm ci && npm run build`.
- One intentional packaging adaptation: `scripts/build.mjs` disables the embedded source-download ZIP. This removes a stale nested archive and lets the exported project build independently. App functionality otherwise matches the source snapshot. A stale demo-label test assertion was updated from Sage to the current Burgundy label.

## Quick start
Use Node.js 22 or newer:

```sh
npm ci
npm test
npm run build
```

The output is `dist/server/index.js`, a Cloudflare Worker ES module. This is **not** a WordPress project, a React/Vite application or a static-only site. A static server cannot run its APIs.

For local UI preview with a separate local R2 store, copy `wrangler.example.jsonc` to `wrangler.jsonc`, install Wrangler as a dev dependency, then run `npx wrangler dev --config wrangler.jsonc`. Do not deploy this example directly: read the authentication migration blocker in MIGRATION.md. Local OAuth requires separately permitted redirect URLs; never change production redirects just to test locally.

## Paste into Claude

> Continue development of Sejenak from this ZIP. Read START_HERE.md, CLAUDE_HANDOVER.md and MIGRATION.md first. Inspect the actual code before making changes. Preserve existing package IDs, entitlements, customer ownership and saved card designs. First run npm ci, npm test and npm run build, and report any failures. Do not enable live payments, replace production auth, modify DNS, delete storage or deploy publicly until I specifically request that step. Explain migration requirements and help me choose the simplest hosting setup. Never ask me to paste secret keys into chat; use hosting secrets or local ignored environment files.
