# Edge function inventory

All functions live in `supabase/functions/<name>/index.ts`, run on Deno,
have `verify_jwt = false` in `config.toml` (authorization is handled by
`_shared/access.ts` and/or server-side identity resolution, not Supabase's
own JWT check), and share code from `supabase/functions/_shared/`.

## Guidebook / interactive book

| Function | Purpose |
|---|---|
| `ask-the-book` | Q&A over the guidebook's chapter content |
| `chapter-chat` | Chat scoped to a single chapter |
| `generate-quiz` | Generates a comprehension quiz for a chapter |
| `verify-access` | Verifies a shared password against `GUIDEBOOK_PASSWORD`/`WORKSHOP_PASSWORD`, issues an HMAC-signed scoped token (see `_shared/access.ts`) |

## Workshop (AI tools)

| Function | Purpose |
|---|---|
| `workshop-copywriter` | Drafts marketing copy from a brief |
| `workshop-rewrite` | Rewrites existing copy |
| `workshop-autopsy` | Critiques copy the user already has |
| `workshop-bio-rewrite` | Rewrites a lawyer bio |
| `workshop-headlines` | Generates/tests headline variants |
| `workshop-competitor-teardown` | Analyzes a named competitor's site |
| `workshop-pitch-deck` | Drafts pitch-deck slide markdown |
| `workshop-deck-roast` | Critiques an uploaded `.pptx` (extracted client-side, critiqued here) |
| `workshop-practice-audit` | Audits a practice-area page |
| `workshop-calendar` | Generates a content calendar |
| `workshop-style-feedback` | Captures approve/edit/reject feedback on a generated draft, feeding the "style memory" recency + embedding system so later generations match a firm's actual voice |
| `roast-homepage` / `score-website` / `steal-homepage` | Single-shot LLM judgment on a scraped homepage — critique, score, and "steal this element" respectively |
| `competitor-analysis` | Compares the user's site against named competitors |
| `generate-roadmap` | Generates a 30/60/90-day marketing roadmap |
| `firm-maturity-plan` | Turns a 12-question maturity diagnostic into a tailored plan |
| `global-advisor` | General open-ended marketing Q&A |
| `personalize-actions` | Tailors guidebook action items to the firm's self-reported practice area/size/goal (`useFirmContext`) |

## Market Visibility Score

| Function | Purpose |
|---|---|
| `visibility-audit-run` | HTTP entrypoint — calls `_shared/runVisibilityAudit.ts`, the one shared orchestration path |
| `visibility-audit-rerun-due` | Scheduled (pg_cron) re-run for audits with `auto_rerun` set — calls the same shared path |
| `visibility-audit-performance` | (Called in-process, not as a standalone HTTP path) PageSpeed Insights scoring |
| `visibility-audit-reputation` | Chambers/Legal 500/IFLR1000 directory-standing scoring, fuzzy-matched against `market_directory_data` |
| `visibility-audit-social` | Self-reported LinkedIn metrics scoring |
| `visibility-audit-thought-leadership` | Scrapes + LLM-classifies a firm's own content, cross-checks press mentions via Google News RSS |
| `visibility-audit-seo` | SEO & Authority — hard-stopped pending `AHREFS_API_KEY`/`MOZ_API_KEY` |
| `visibility-audit-get` | Returns a client's own audits + history, scoped server-side by resolved identity |
| `visibility-audit-publish` / `visibility-audit-schedule` / `visibility-audit-verify-domain` | Publish to the public leaderboard, opt into auto-rerun, verify domain ownership (required before publishing) |
| `visibility-audit-claim` / `visibility-audit-share-with-firm` | Re-key anonymous `client_id` rows to a real account, or share a personal account's audits into a firm |
| `visibility-audit-narrative` | Turns scores + site health into a short written narrative |
| `visibility-teaser` | The one genuinely public, no-password surface — Performance + GBP-binary only, IP-rate-limited |
| `directory-standing-index` | Public, no-password Recognition Index — directory breadth/depth computed straight from `market_directory_data`, no audit required |
| `directory-removal-request` | Consent/notice mechanism for a firm that wants reviewed for removal from the Recognition Index |

## Team / firm

| Function | Purpose |
|---|---|
| `firm-invite` | Creates (owner only) or redeems a shareable firm-join link |
| `notifications-get` / `notifications-mark-read` | Real notification history for a signed-in account |

## Product features

| Function | Purpose |
|---|---|
| `campaigns-get` / `campaigns-save` / `campaigns-delete` | Light campaign/PM layer, with an honest (correlation, not causation) score tie-back |
| `client-win-log` / `client-wins-get` | Self-reported new-client win log |
| `competitor-alerts-check` | Scheduled — detects when a tracked competitor overtakes the user's score |
| `create-share` | Creates a shareable artifact link (score card, etc.) |
| `user-state-get` / `user-state-set` | Server-backed per-client app state (survives a cleared browser once a real account exists) |

## Internal / ops (not linked from any nav)

| Function | Purpose |
|---|---|
| `ops-directory-queue` | Reviews the `directory_lookup_requests` queue (firms that didn't fuzzy-match `market_directory_data`) |
| `ops-rate-limits` | Inspects/clears rate-limit table state |

## Shared modules (`_shared/`, not directly invocable)

Pure formulas (importable from the frontend too, no Deno dependency):
`percentileFormula.ts`, `socialFormula.ts`, `thoughtLeadershipFormula.ts`,
`performanceFormula.ts`, `siteHealthFormula.ts`, `pressMentionsFormula.ts`,
`auditMetadata.ts`.

Impure helpers (Deno/network/Supabase-client dependent):
`access.ts` (HMAC tokens), `anthropic.ts` (Claude API), `cache.ts`
(`url_cache` read/write), `rateLimit.ts`, `safeFetch.ts` (SSRF-safe outbound
fetch), `verifiedClientId.ts` (resolves a trusted identity from an access
token, never a client-asserted id), `peerStats.ts`, `reputationScore.ts`,
`directoryStandingIndex.ts`, `socialScore.ts`, `thoughtLeadershipScore.ts`,
`performanceScore.ts`, `seoScore.ts`, `siteHealth.ts`, `pressMentions.ts`,
`marketVisibilityConfig.ts`, `domainVerification.ts`, `embeddings.ts`
(Voyage AI), `styleMemory.ts`, `runVisibilityAudit.ts` (the orchestrator).
