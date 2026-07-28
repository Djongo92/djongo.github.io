# Architecture

## Stack

- **Frontend**: Vite + React 18 + TypeScript + shadcn/ui + Tailwind, deployed
  as a static site to GitHub Pages (`vite build` → `dist/`, pushed via the
  repo's Pages workflow). React Router with a base path (`/djongo.github.io/`
  in production) and a SPA 404 fallback.
- **Backend**: Supabase — Postgres (tables + RLS) and Deno-runtime edge
  functions (`supabase/functions/*`). No traditional application server;
  every server-side operation is either a direct RLS-scoped Postgres query
  from the client or a call to an edge function.
- **AI**: Anthropic's Claude API (`supabase/functions/_shared/anthropic.ts`)
  via `ANTHROPIC_API_KEY`, used for every LLM-backed Workshop tool and for
  Thought Leadership content classification. (Historically routed through
  `ai.gateway.lovable.dev`/Gemini in this project's early build; migrated to
  calling Anthropic directly — see `docs/DECISIONS.md`.)

## Two identity systems, on purpose

1. **HMAC-signed access tokens** (`_shared/access.ts`) gate the original
   shared-password guidebook/workshop purchase flow. `verify-access` issues
   a scoped, 12-hour token from a shared password; every AI-spending
   function checks it via `requireAccess()`. Currently bypassed
   (`BYPASS_ACCESS_CONTROL = true`) while the product is private/pre-launch.
   `verify_jwt = false` on every function in `config.toml` — Supabase's own
   JWT check is not what authorizes anything here.
2. **Real Supabase Auth** (`useAuth.ts`) — email/password accounts with a
   real session, used for anything that needs a persistent identity across
   devices/sessions: Battle Plan history, firm membership, audit
   ownership, evidence disputes. `firms` + `firm_members` (with a `role`
   column) is this project's "organization" model.

Anonymous usage (no account at all) is still fully supported via a
per-browser `client_id` (`src/lib/clientId.ts`, localStorage-persisted) —
most audits and Workshop runs work anonymously; a real account is what lets
that history survive a cleared browser or be shared with a team.

## Data model shape

- `market_visibility_audits` — one row per (client, domain, market): the
  *current* score. Upserted on every re-run.
- `market_visibility_audit_history` — append-only, one row per completed
  run, never updated or deleted. This is what makes "historical scores are
  immutable" true structurally, not just by convention (see
  `docs/DECISIONS.md`).
- `market_directory_data` — reference data (Chambers/Legal 500/IFLR1000
  standing per firm), reviewed quarterly, not scraped live per request.
- `firms` / `firm_members` — organizations and membership/roles.
- Everything else is feature-scoped: `campaigns`, `client_wins`,
  `notifications`, `workshop_style_examples` (AI memory), rate-limit
  tables, etc. — see `docs/EDGE_FUNCTIONS.md` for which function owns which
  table.

## Pure-logic sharing between frontend and backend

Several `supabase/functions/_shared/*Formula.ts` files (e.g.
`socialFormula.ts`, `percentileFormula.ts`, `performanceFormula.ts`) are
deliberately dependency-free TypeScript — no Deno globals, no network, no
Supabase client. The frontend imports them directly via a relative path
(e.g. `src/components/visibility/WhatIfSimulator.tsx` imports
`../../../supabase/functions/_shared/socialFormula`) so a live "what-if"
simulator or a shared display component can run the *exact* formula the
backend scores with, not a hand-copied approximation that can drift.

## Scoring pipeline (Market Visibility Score)

`supabase/functions/_shared/runVisibilityAudit.ts` orchestrates all five
categories (Performance, Social, SEO & Authority, Thought Leadership,
Reputation) in parallel, assembles the total, computes the live peer
percentile, and persists to both `market_visibility_audits` and
`..._history`. `visibility-audit-run` (a live request) and
`visibility-audit-rerun-due` (a scheduled re-run via pg_cron) both call this
one shared path, so there is exactly one place the scoring logic lives.

Every peer-normalized metric is benchmarked against its peer group's 90th
percentile (`_shared/percentileFormula.ts`), not the group's raw maximum —
see `docs/DECISIONS.md` for why, and `CLAUDE.md` for the original per-
category point breakdown.
