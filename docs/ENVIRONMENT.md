# Environment variables & secrets

Two different places, two different trust levels — don't mix them up.

## Frontend (`.env`, `VITE_*`, bundled into the client build — never secret)

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | This project's Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase's anon/publishable key — safe to expose client-side; Row Level Security is what actually protects data, not this key |
| `VITE_SUPABASE_PROJECT_ID` | Project ref, used by a couple of build scripts |

Copy `.env.example` to `.env` and fill in your own project's values to run
locally. This file **is** checked into this repo — that's intentional for
the publishable key (see above), but don't add a real secret to it.

## Backend (Supabase project secrets — set via `supabase secrets set` or the
dashboard, never committed, never logged)

| Secret | Used by | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Every LLM-backed edge function (`_shared/anthropic.ts`) | Claude API |
| `ACCESS_TOKEN_SECRET` | `_shared/access.ts`, `verify-access` | HMAC key for the legacy shared-password token system |
| `RATE_LIMIT_IP_SALT` | `_shared/rateLimit.ts` | Salts the IP hash used for anonymous rate limiting — never store a raw IP |
| `CRON_SECRET` | Scheduled functions (`visibility-audit-rerun-due`, `competitor-alerts-check`) | Checked against an `x-cron-secret` header set by the pg_cron job that invokes them, so the endpoint can't be triggered by an outside caller |
| `PAGESPEED_API_KEY` | `visibility-audit-performance` | Free Google PageSpeed Insights key |
| `VOYAGE_API_KEY` | Workshop style-memory embeddings (`_shared/embeddings.ts`) | Optional — style memory degrades gracefully (recency-based, no semantic search) if absent |
| `AHREFS_API_KEY` / `MOZ_API_KEY` | `visibility-audit-seo` | **Hard stop, deliberately not configured** — paid subscriptions this project hasn't wired up; SEO & Authority stays `"not_configured"` and every other category scores in full regardless |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_URL` | Every edge function | Auto-provided by the Supabase runtime, never set manually |

**Never** put a real secret value in a commit, a code comment, a PR
description, or a chat/agent session transcript. Secrets live in the
Supabase dashboard's secrets store only.

## Adding a new secret

1. `supabase secrets set YOUR_SECRET_NAME=value` against the real project
   (needs a Supabase access token — ask whoever holds project admin access).
2. Read it in the function via `Deno.env.get("YOUR_SECRET_NAME")`.
3. If the feature should degrade gracefully without it (the established
   pattern here — see `AHREFS_API_KEY`/`VOYAGE_API_KEY` above), check for
   its presence and return a `"missing"`/`"not_configured"` result rather
   than throwing.
4. Document it in the table above.
