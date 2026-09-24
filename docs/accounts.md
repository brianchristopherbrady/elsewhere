# Accounts And Saved Days

## User Flow

- Guests can discover places, browse events and music, bookmark places, and edit/share a day without registering. Continue as guest closes account prompts without changing the draft. Only account-backed saved days require sign-in.
- Open Sign in in the header, then Create account. Registration and password reset require 10-128 characters including at least one punctuation or symbol character. Unicode punctuation and symbols are accepted; whitespace alone does not satisfy the special-character requirement. Existing passwords remain valid for sign-in. Registration does not automatically sign in; the form returns to Sign in. With mail configured, verify the emailed link first. Resend verification email is available from Sign in.
- Forgot password sends a single-use recovery link valid for one hour. Choose and confirm a new password, then sign in again. Resetting revokes existing login sessions, not saved days: all saved days remain unchanged and available after signing in with the new password. Invalid/expired links offer another request; recovery responses do not disclose whether an email is registered.
- Save day prompts guests to sign in and then resumes the naming dialog without discarding their itinerary.
- My Calendar reads the signed-in user's saved days into a monthly calendar. Each snapshot is independent of the working draft. Edit/save updates the same owner-scoped record; drag or date-input rescheduling also uses PUT. Notes, tags, source snapshots and optional arrival/departure times persist. A maximum of 200 days can be saved per account.
- A fresh browser can retrieve those same days by signing in to the same deployment. Clearing site storage does not delete account days.
- Older browser-only collections remain readable while signed out. When signed in, Import to this account explicitly uploads them. Local originals are removed only after a successful server response. Repeating an import with the same IDs does not create duplicates.
- Saved items, their tags/notes, and the working Create a Day draft are browser-local, not account-synced. Signing out clears the working itinerary, metadata and undo state, not the item library or account days. Unsaved draft edits should be saved before signing out.
- The header Settings gear contains display-name editing, password recovery and sign-out. Profile changes use Better Auth's authenticated update-user endpoint and refresh the session. Failed saves retain entered text for retry. Reset password opens the existing recovery flow with the signed-in email prefilled; actual delivery still requires the mail settings below. Guests can sign in or request recovery from Settings.

## Local Development

Run `npm run dev` and use the printed `http://127.0.0.1:<port>` URL. Development and preview serve `/api/auth/*` and `/api/days` alongside the app. Use the printed hostname consistently; origin checks reject other hostnames unless `BETTER_AUTH_URL` is configured to match them.

By default the server creates `.data/elsewhere.sqlite` and a random `.data/auth-secret` used across restarts. These files, SQLite journals, and local environment files are excluded from Git. Never publish or commit the database or secret. Back up the database and retain the secret if local accounts matter.

## Production Setup

Set these server environment variables through the hosting platform, not through client-side `VITE_` variables:

| Variable | Purpose |
| --- | --- |
| `BETTER_AUTH_URL` | The exact public HTTPS origin, for example `https://elsewhere.example` |
| `BETTER_AUTH_SECRET` | A stable, cryptographically random secret of at least 32 characters, held in a secret manager |
| `DATABASE_PATH` | A persistent writable SQLite path outside the public web root |
| `RESEND_API_KEY` | Server-only Resend API key for account email delivery |
| `ACCOUNT_EMAIL_FROM` | Sender on a verified Resend domain, for example `Elsewhere <accounts@example.com>` |
| `HOST`, `PORT` | Internal listener; defaults are `127.0.0.1`, `5174`. Container platforms usually need `HOST=0.0.0.0` |
| `TRUST_PROXY` | Set to `true` behind a reverse proxy or platform load balancer so rate limits use the visitor's `X-Forwarded-For` address |
| `TICKETMASTER_API_KEY` | Optional; enables live concert listings |

See [.env.example](../.env.example) for a template.

The production entrypoint refuses to start without the HTTPS origin and secret. Runtime settings come from the process environment; environment files are not automatically loaded. Provision the secret securely and keep it stable across restarts. The app never needs to print it.

## Email Setup

Verify a sending domain with Resend, then configure both `RESEND_API_KEY` and `ACCOUNT_EMAIL_FROM` in the server environment and restart the server. This applies to development, preview and production; the account service does not load `.env.local`. Never prefix these settings with `VITE_` or put them in client code. Links use the configured account origin and must point to the deployed app.

Without both settings, local registration/sign-in remain available without email verification, and recovery/resend explicitly report that account email is unavailable. This mode is for development, not public enrollment. With both configured, new and existing unverified accounts must verify before password sign-in. Existing users can request a verification email; existing sessions remain valid until expiration/sign-out. Configure and exercise real delivery before collecting public accounts.

Delivery uses Resend's HTTPS API with a bounded timeout. Neither email bodies nor reset tokens are logged by the mail adapter. Recovery links are removed from the visible app URL after opening; configure proxy/access-log redaction for token-bearing auth URLs, and avoid third-party analytics on account screens. Tests capture messages in memory and exercise actual Better Auth tokens; no live email provider was authenticated during implementation.

Deploy the repository (without `node_modules`, `.data`, `dist` and test output), then run `npm ci`, `npm run build` and `npm start` on the target. The server imports shared TypeScript files from `src/` using Node's type stripping, so Node.js 22.18+ is required. The SQLite driver needs a native binary appropriate for the deployment OS and Node version; install dependencies on the target platform.

The production server adds a Content-Security-Policy and other security headers, serves precompressed assets with long-lived caching for hashed files, compresses API responses, answers `GET /healthz` for platform health checks, and shuts down cleanly on `SIGTERM`.

Use one server instance with durable local storage, HTTPS termination, regular SQLite-aware backups, restricted filesystem permissions, and monitored disk capacity. Ephemeral/serverless filesystems and independent replicas are not supported by this SQLite setup. Authentication migrations and saved-day table creation run when the account service first starts; back up existing data before version upgrades.

## Security And Boundaries

- Better Auth handles scrypt password hashing, HttpOnly/SameSite session cookies, origin checking for authentication, and session expiration/revocation. Production cookies are Secure. Sessions last seven days and are renewed at most daily.
- Saved-day reads, updates and deletes always include the session's user ID; the API never trusts a client-supplied owner. Writes validate curated IDs or bounded source snapshots with safe HTTPS URLs, unique stops, dates, optional times, note lengths and tags. Writes require the configured Origin, and JSON bodies are limited to 256 KB. POST remains idempotent for imports; PUT requires one record matching the URL ID and returns 404 for an unavailable or other-account record.
- Auth rate limits are persisted in SQLite: 10 sign-in attempts and 5 registrations per minute per socket IP, plus a general auth limit. The Node adapter overwrites the internal IP header to prevent spoofing. Behind a reverse proxy, set `TRUST_PROXY=true` so the first `X-Forwarded-For` address is used; otherwise every visitor shares the proxy's limit. Only enable it when a proxy you control sets that header.
- Registration does not reveal whether an email already exists. With mail configured, Better Auth verifies email ownership and handles signed verification tokens and stored single-use reset tokens. Recovery and resend are limited to three requests per minute per socket IP; reset submissions to five. Without mail configuration, do not collect real users without a recovery path.
- Display-name editing is supported; email changes, account deletion UI, social login, MFA, and a privacy/retention policy are not included. Account days are not cached in localStorage. Previously shared day URLs still intentionally contain their itinerary and are not private account links.

## Verification

`npm test` includes real SQLite and Better Auth tests for registration, email verification, single-use password reset, reset session revocation, password sign-in, request-origin rejection, account isolation, malformed input, idempotent imports, restart persistence, logout revocation, and rate limiting. Mail-adapter tests cover configuration and provider failures without sending real email.

`npx playwright test tests/accounts.spec.ts tests/saved-days.spec.ts` covers the account forms, save-after-sign-in, local import, a clean second browser without copied storage, separate accounts, failed saves, deletion, responsive layouts, keyboard focus, and automated accessibility checks. Playwright starts a dedicated server on port 5179 with a unique ignored database, so it does not use or modify development accounts.