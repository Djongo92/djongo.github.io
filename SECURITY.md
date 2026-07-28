# Security Policy

## Reporting a vulnerability

This is currently a private, pre-launch project. If you've found a
security issue, report it directly to the project owner rather than
opening a public GitHub issue — a public issue on a live product's
repository is itself a disclosure. Include what you found, how to
reproduce it, and its likely impact; you should get an acknowledgment
promptly and a fix or mitigation plan without unreasonable delay.

## Security posture (what's already in place, so a report can focus on
what's actually new)

- **RLS on every table.** No table is left with default-open access.
  Public-read policies are deliberate and scoped (e.g. `is_public = true`
  rows only) — see `docs/MIGRATIONS.md` for the rule this project holds
  every new table to.
- **No client-asserted identity in a write path.** Anywhere a client
  supplies a `client_id`, the real identity used for a write is resolved
  server-side from a verified access token when one is present
  (`_shared/verifiedClientId.ts`), never trusted as-is from the request
  body.
- **SSRF-safe outbound fetch.** Every server-side fetch of a user-supplied
  URL goes through `_shared/safeFetch.ts`, not a bare `fetch()`.
- **Rate limiting, salted.** Anonymous rate limits key off a salted hash of
  the caller's IP (`RATE_LIMIT_IP_SALT`), never the raw IP.
- **Secrets never committed.** Real secret values live in the Supabase
  project's secrets store only — never in a migration, a code comment, a
  commit message, or a PR description. See `docs/ENVIRONMENT.md`.
- **Two authorization systems, each scoped to what it protects.** The
  legacy HMAC-signed shared-password tokens (`_shared/access.ts`) gate the
  guidebook/workshop purchase flow; real Supabase Auth + firm membership
  roles gate anything needing a persistent per-user identity. See
  `docs/ARCHITECTURE.md`.
- **Historical data is genuinely immutable**, not just policy — RLS blocks
  all non-service-role writes to append-only history tables, and the only
  code path that writes to them is a single, audited `INSERT`.

## Known, deliberate gaps (not vulnerabilities — scope decisions)

- `BYPASS_ACCESS_CONTROL = true` in `_shared/access.ts` currently disables
  the shared-password gate while the product is private/pre-launch. This
  is a conscious, reversible flag, not an oversight — flip it back before
  any public launch that depends on the paid-access gate actually gating.
- SEO & Authority scoring is unimplemented pending a paid Ahrefs/Moz
  subscription (`AHREFS_API_KEY`/`MOZ_API_KEY`) — this is a feature gap,
  not a security gap.
