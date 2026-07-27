# Significant technical decisions

Short records of calls that shaped the codebase and why — not a full
changelog, just the ones a newcomer would otherwise have to reconstruct by
reading commit history.

## Two authorization systems run side by side, not unified

The original product sold the guidebook/workshop via a shared password
(`_shared/access.ts`, HMAC-signed scoped tokens). The Market Visibility
Score needed real per-user identity (audit ownership, history, team
sharing) that a shared password can't provide, so real Supabase Auth
(`useAuth.ts`) was added *alongside* it rather than replacing it. Reason:
the shared-password flow is live and may be generating revenue; migrating
it in place risked breaking a working purchase flow for a feature (real
accounts) that most of the product doesn't strictly need yet. Anonymous
`client_id` usage still works for everything that doesn't need a durable
identity. See `docs/ARCHITECTURE.md`.

## `market_visibility_audit_history` is append-only by construction

Rather than relying on "please don't update this table" as a convention,
immutability is enforced structurally: RLS blocks all non-service-role
access outright, and exactly one code path (`runVisibilityAudit.ts`)
writes to it, via `INSERT` only. This was deliberate specifically so a
future methodology change could never retroactively alter a firm's past
recorded score — see the "Scoring methodology v2" decision below, which
depended on this already being true.

## Peer-maximum normalization → 90th-percentile normalization

v1.0 of the scoring formulas (see `CLAUDE.md`) normalized every
peer-relative metric by dividing by the peer group's observed maximum.
This has three real failure modes: one outlier firm compresses every other
firm's score, a firm can improve in absolute terms and still lose points
because a rival improved more, and small peer groups swing wildly on a
single new data point. Replaced with 90th-percentile benchmarking
(`_shared/percentileFormula.ts`) — full marks at or above the 90th
percentile — plus a minimum-sample rule (widen the comparison set below 5
firms, then flag low confidence rather than presenting a precise-looking
number that isn't). `METHODOLOGY_VERSION` (`_shared/auditMetadata.ts`)
exists so this kind of change is always a new version scored forward, per
the immutability decision above.

## AI provider: Claude direct, not `ai.gateway.lovable.dev`/Gemini

Every LLM-backed Workshop tool and the Thought Leadership content
classifier originally routed through a Lovable-hosted AI gateway to
Gemini 2.5 Flash. Migrated to calling Anthropic's API directly
(`_shared/anthropic.ts`, `ANTHROPIC_API_KEY`) to remove a dependency on a
third-party gateway this project doesn't control.

## Demo mode is fully sandboxed from the real backend

Early in the Market Visibility Score build, demo mode's intake form called
the real `visibility-audit-*` edge functions, which meant typing an
arbitrary firm name could fuzzy-match a real seed firm in
`market_directory_data` and silently overwrite the demo's cached Battle
Plan sample with unrelated, real, low-scoring data. Every demo-mode
surface now either locks its intake to the fixed sample firm and replays a
canned result locally, or (for the six tools without a real-data
misattribution risk) still runs for real but skips the save-to-Battle-Plan
call so a demo session's Battle Plan sample is never silently overwritten.

## GitHub Pages base path + SPA fallback

The production URL is a project Pages site (`/djongo.github.io/`), not a
custom domain root. Vite's `base` config, React Router's basename, and a
`404.html`-based SPA fallback all had to agree on this exact path — a
mismatch in any one of them breaks either asset loading or client-side
routing on a hard refresh.

## `npx tsc --noEmit` checked zero files for an unknown stretch of this
project's history

The root `tsconfig.json` has `"files": []` and only `references` to
`tsconfig.app.json`/`tsconfig.node.json`. A bare `tsc --noEmit` invocation
(no `-b`, no `-p`) against that config compiles nothing and reports
success unconditionally — every "typecheck clean" claim made against that
invocation before this was discovered was meaningless. Discovered while
verifying an unrelated change, at which point real, pre-existing type
errors surfaced (a stale generated Supabase schema type file, a jsPDF API
misuse, a pdf.js parameter mismatch) and were fixed. Always use
`-p tsconfig.app.json`; see `docs/TESTING.md`.

## Rename to "LegalOS"

The product was renamed from a working title reflecting "guidebook +
Workshop" to LegalOS once the Market Visibility Score's benchmark/audit
layer became the strategic center rather than the book. User-facing copy,
`package.json`, and this README changed; internal identifiers
(`firm_benchmarks`, hook names, table names predating the rename) were
deliberately left alone — renaming them would have been a wide, risky
refactor with no user-facing value.
