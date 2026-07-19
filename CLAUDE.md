# CLAUDE.md — LegalOS Build Brief

**Read this file in full before touching any code.** It is the single source
of truth for this build and supersedes ad-hoc exploration where the two
disagree.

## How to execute this

Work through Batches A–F below, in order. After each batch: run the build
(`npm run build`) and the existing test suite (`npm run test`), commit with a
message naming the batch, then write a short summary (what shipped, which
"Decided" defaults you actually hit, anything you couldn't finish and why)
before starting the next one. This mirrors the pattern already proven in
this repo's own `.lovable/plan.md` history — don't skip verification just
because nobody's watching in real time. That file's own history includes a
security finding caught *after* the fact and fixed in a later migration —
the batch checkpoints are what caught it. Keep them.

**Hard stops — do not proceed past these without the human:**
- Any item needing a new external API key or paid subscription
  (`PAGESPEED_API_KEY`, `AHREFS_API_KEY`/`MOZ_API_KEY`) that isn't already
  present in Supabase secrets. Note what's needed and why, skip to whatever
  else in the current batch doesn't depend on it, keep going.
- Anything touching `GUIDEBOOK_PASSWORD`, `WORKSHOP_PASSWORD`, or their
  existing edge functions or tokens. Out of scope, full stop — this is a
  live purchase flow.
- Never place a real secret value in a commit, code comment, or summary.
  Secrets live in Supabase's dashboard only.

Everything else — schema, RLS, new functions, new components — proceed
without waiting for confirmation. The judgment calls that would normally
need a human are pre-resolved under "Decided," below, precisely so this
doesn't stall on them.

## What this is

This repo is being renamed **LegalOS**, reflecting that the benchmark/audit
layer this build adds is now the strategic center, not the book. "LegalOS"
here means *this specific, already-real build*: the existing interactive
guidebook, the ten-tool Workshop, and the Battle Plan PDF export — plus what
this document adds, an externally verified, peer-group-normalized market
visibility score. It does **not** mean a full "operating system for law firm
growth" with a CRM, a Knowledge Hub, a Webflow content pipeline, an
executive dashboard, and a roster of named AI agents. That's a real,
larger roadmap, listed under "Out of scope" at the bottom so it's deferred
on purpose, not forgotten. Building a thin slice of eight modules in one
unattended pass produces something shallow everywhere instead of solid
where it's actually fully specified. Don't reach for it.

## Repo orientation (context — you also have full read access)

Vite + React 18 + TypeScript + shadcn/ui + Tailwind + Supabase (Postgres +
Deno edge functions). No Supabase Auth users yet — `verify_jwt = false`
everywhere; all real authorization is a custom HMAC-signed token layer in
`supabase/functions/_shared/access.ts`, with two existing scopes
(`guidebook`, `workshop`) sold as two separate one-time shared passwords via
`verify-access`. Fifteen chapters (`src/data/chapters.ts`) power an
interactive book (`ChapterView` and friends). Ten AI tools live under
`src/components/workshop/`, each backed by its own edge function calling
Gemini 2.5 Flash via `ai.gateway.lovable.dev` (`LOVABLE_API_KEY`, already
configured — reuse it, don't add a new AI provider). Every analysis tool
that exists today (`ScoreWebsite`, `RoastHomepage`, `CompetitorAnalysis`,
`FirmMaturityScore`) is single-shot LLM judgment on scraped page text or
user self-report — none call an external metrics API, none persist a
comparable score anywhere. `BattlePlan.tsx` is the flagship output: a
client-side PDF (jsPDF) assembling whatever the user has run this session,
via `useBattlePlanCache` (localStorage). The one existing cross-session
table, `firm_benchmarks`, tracks reading engagement only (chapters read,
implementation %) — not visibility. Its RLS was already tightened once
after a security review; treat that as precedent, not a one-off.

## Mission for this build

Add a sixth analysis surface, categorically different from the other five:
not an LLM's opinion, but a real, externally-sourced, peer-group-normalized
score — PageSpeed, legal-directory presence (Chambers, Legal 500, IFLR1000),
thought-leadership cadence, and (self-reported where no clean API exists)
social presence — persisted centrally so it's comparable firm to firm and
gets more meaningful as more firms run it.

## Scoring reference (v1.0, condensed)

200 pts, five categories.

| Category | Pts | Formula shape |
|---|---|---|
| Performance | 20 | PSI Lighthouse: 10×(desktop+mobile perf avg)/100 + 5×(access avg)/100 + 5×(seo avg)/100 |
| Social Media | 20 | LinkedIn followers/posts/ER peer-normalized (5+5+6) + 4×binary platform presence |
| SEO & Authority | 60 | 6 Ahrefs/Moz metrics, each 10×value/peer-group-max |
| Thought Leadership | 45 | 25×posts/peer-max + 5×byline% + 15×news/peer-max, over a content window |
| Reputation | 55 | 10×GBP binary + Chambers (band avg + count/N) + IFLR1000 (count/N + tier avg) + Legal500 (count/N + tier avg) |

Peer-group-normalized = proportion of the peer group's current maximum on
that metric. Band/tier averages invert (rank 1 = best) and normalize across
the peer group. Only the per-market denominators and peer-group maxima vary
by market — everything else is market-independent code.

## Decided — resolved for this build, not open questions

1. **Public teaser.** Nothing in this app is reachable today without a
   password (even Roast/Score Website require the guidebook token). Add one
   genuinely public, no-password surface: Performance + GBP-binary only,
   IP-rate-limited instead of gated. The full five-category audit stays
   behind access control per #2.
2. **Access scope.** Add a third scope, `"benchmark"`, its own
   `BENCHMARK_PASSWORD` secret — mirror `verify-access`'s existing
   guidebook/workshop handling exactly, don't invent a new pattern.
3. **Directory data freshness.** Treat `market_directory_data` as reviewed
   quarterly, not scraped live per request.

These were made without a human in the loop, on purpose, so the build
doesn't stall on them. Flag them in the Batch A summary so they get a look
after the fact.

## Seed data — Serbia, 44 firms

Verified live against Chambers Europe 2026 + Legal 500 EMEA 2026,
2026-07-19. Domains were not captured during harvest — rows are keyed on
`firmName`; have `visibility-audit-reputation` fuzzy-match on name until a
follow-up pass fills in `firm_domain`. Don't fabricate domains to fill the
gap. Codes: Chambers `BF` Banking & Finance · `CO` Competition/Antitrust ·
`CC` Corporate/Commercial · `DR` Dispute Resolution · `EM` Employment ·
`IP` IP & TMT · `PR` Projects/Infrastructure/Energy (band, 1=best). Legal
500 `BF` Banking and Finance · `CC` Commercial/Corporate/M&A · `CO`
Competition · `DR` Dispute Resolution · `EM` Employment · `IP` Intellectual
Property · `PE` Projects and Energy · `RE` Real Estate and Construction
(tier, 1=best).

```json
{
 "market": "serbia",
 "harvestedAt": "2026-07-19",
 "source": "Chambers Europe 2026 + Legal 500 EMEA 2026, verified live",
 "note": "Domains not yet captured during harvest — seed is keyed on firmName; visibility-audit-reputation should fuzzy-match on name until a domain-enrichment pass fills firm_domain in for each row.",
 "firms": [
  {"firmName":"Schoenherr (Moravčević Vojnović and Partners)","type":"R","chambers":{"rankedTables":{"BF":1,"CO":1,"CC":1,"DR":1,"EM":1,"IP":2,"PR":1}},"legal500":{"rankedTables":{"BF":1,"CC":1,"CO":1,"DR":1,"EM":1,"IP":2,"PE":1,"RE":1}}},
  {"firmName":"Karanović & Partners","type":"R","chambers":{"rankedTables":{"BF":1,"CO":2,"CC":1,"DR":1,"EM":1,"IP":2,"PR":1}},"legal500":{"rankedTables":{"BF":1,"CC":1,"CO":1,"DR":1,"EM":1,"IP":2,"PE":1,"RE":1}}},
  {"firmName":"BDK Advokati","type":"L","chambers":{"rankedTables":{"BF":2,"CO":3,"CC":3,"DR":3,"EM":2,"IP":2,"PR":1}},"legal500":{"rankedTables":{"BF":2,"CC":2,"CO":2,"DR":2,"EM":2,"IP":3,"PE":1,"RE":1}}},
  {"firmName":"Wolf Theiss (Law Office Miroslav Stojanović)","type":"R","chambers":{"rankedTables":{"BF":2,"CO":3,"CC":2,"DR":4,"EM":3,"PR":3}},"legal500":{"rankedTables":{"BF":1,"CC":1,"CO":3,"DR":2,"EM":2,"IP":3,"PE":2,"RE":2}}},
  {"firmName":"CMS (Petrikić & Partneri AOD)","type":"I","chambers":{"rankedTables":{"BF":3,"CO":3,"CC":3,"DR":4,"EM":2,"PR":2}},"legal500":{"rankedTables":{"BF":2,"CC":1,"CO":3,"DR":2,"EM":1,"PE":1,"RE":1}}},
  {"firmName":"JPM & Partners","type":"L","chambers":{"rankedTables":{"CO":3,"CC":3,"DR":2,"IP":3,"PR":3}},"legal500":{"rankedTables":{"BF":2,"CC":1,"CO":1,"DR":1,"EM":1,"IP":3,"PE":1,"RE":2}}},
  {"firmName":"Kinstellar (SOG)","type":"R","chambers":{"rankedTables":{"BF":2,"CC":2,"DR":4,"EM":3,"PR":3}},"legal500":{"rankedTables":{"BF":1,"CC":3,"CO":3,"DR":3,"EM":3,"PE":3,"RE":3}}},
  {"firmName":"Gecić Law","type":"L","chambers":{"rankedTables":{"BF":3,"CO":2,"DR":4,"PR":3}},"legal500":{"rankedTables":{"BF":3,"CC":2,"CO":1,"DR":4,"PE":3}}},
  {"firmName":"Drašković Popović & Partners","type":"L","chambers":{"rankedTables":{"CC":3,"EM":3}},"legal500":{"rankedTables":{"BF":3,"CC":3,"CO":3,"DR":3,"EM":1,"PE":3,"RE":2}}},
  {"firmName":"Doklestić Repić & Gajin","type":"L","chambers":{"rankedTables":{"CO":3,"CC":4,"EM":3}},"legal500":{"rankedTables":{"BF":3,"CC":3,"CO":2,"DR":3,"EM":2,"RE":2}}},
  {"firmName":"Stanković & Partners (NSTLAW)","type":"L","chambers":{"rankedTables":{"DR":3}},"legal500":{"rankedTables":{"BF":3,"CC":3,"CO":3,"DR":2,"EM":3,"IP":3,"PE":3,"RE":4}}},
  {"firmName":"NKO Partners","type":"L","chambers":{"rankedTables":{"CC":3,"DR":4,"EM":3}},"legal500":{"rankedTables":{"CC":2,"CO":2,"DR":3,"EM":4,"RE":3}}},
  {"firmName":"Mikijelj Janković & Bogdanović","type":"L","chambers":{"rankedTables":{"DR":2,"IP":1}},"legal500":{"rankedTables":{"DR":2,"EM":2,"IP":1}}},
  {"firmName":"Radovanović Stojanović & Partners","type":"L","chambers":{"rankedTables":{"CO":3,"CC":4,"EM":3}},"legal500":{"rankedTables":{"CC":4,"CO":1,"EM":3,"RE":4}}},
  {"firmName":"Harrisons Solicitors","type":"L","chambers":{"rankedTables":{"BF":2,"CC":4}},"legal500":{"rankedTables":{"BF":2,"CC":4,"DR":4,"EM":3,"RE":4}}},
  {"firmName":"Joksović, Stojanović & Partners","type":"L","chambers":{"rankedTables":{}},"legal500":{"rankedTables":{"BF":2,"CC":3,"CO":3,"DR":2,"EM":2,"IP":3,"PE":2,"RE":2}}},
  {"firmName":"MVJ Marković Vukotić Jovković","type":"L","chambers":{"rankedTables":{"CC":4,"PR":3}},"legal500":{"rankedTables":{"BF":3,"CC":2,"PE":2,"RE":2}}},
  {"firmName":"BOPA Bojanović & Partners","type":"L","chambers":{"rankedTables":{}},"legal500":{"rankedTables":{"BF":2,"CC":3,"CO":3,"DR":4,"EM":3,"IP":2,"PE":3,"RE":3}}},
  {"firmName":"MMD Advokati","type":"L","chambers":{"rankedTables":{"CC":4,"EM":3}},"legal500":{"rankedTables":{"CC":3,"DR":3,"EM":3,"RE":3}}},
  {"firmName":"Mihaj, Ilić & Milanović","type":"L","chambers":{"rankedTables":{"DR":2}},"legal500":{"rankedTables":{"CC":4,"DR":1,"PE":3}}},
  {"firmName":"CWB","type":"L","chambers":{"rankedTables":{"IP":2}},"legal500":{"rankedTables":{"IP":1}}},
  {"firmName":"MSA IP (Milojević Sekulić & Associates)","type":"L","chambers":{"rankedTables":{"IP":1}},"legal500":{"rankedTables":{"IP":2}}},
  {"firmName":"Živko Mijatović & Partners","type":"R","chambers":{"rankedTables":{"IP":2}},"legal500":{"rankedTables":{"IP":1}}},
  {"firmName":"Prica & Partners","type":"L","chambers":{"rankedTables":{}},"legal500":{"rankedTables":{"BF":3,"CC":2,"CO":2,"DR":3,"EM":2,"PE":3}}},
  {"firmName":"Živković Samardžić","type":"L","chambers":{"rankedTables":{"DR":4}},"legal500":{"rankedTables":{"CC":3,"DR":3,"EM":3,"RE":4}}},
  {"firmName":"Nikčević Kapor","type":"L","chambers":{"rankedTables":{"DR":3}},"legal500":{"rankedTables":{"DR":4,"PE":2,"RE":4}}},
  {"firmName":"ZSP Advokati","type":"L","chambers":{"rankedTables":{"BF":3,"CC":4}},"legal500":{"rankedTables":{"BF":3}}},
  {"firmName":"Vujinović & Partners","type":"L","chambers":{"rankedTables":{"IP":3}},"legal500":{"rankedTables":{"EM":4,"IP":3}}},
  {"firmName":"BIT Law Office","type":"L","chambers":{"rankedTables":{}},"legal500":{"rankedTables":{"CC":4,"DR":3,"EM":4,"PE":3,"RE":3}}},
  {"firmName":"Djokić + Partners","type":"L","chambers":{"rankedTables":{}},"legal500":{"rankedTables":{"BF":3,"DR":4,"IP":3}}},
  {"firmName":"Vuković & Partners (act legal Serbia)","type":"R","chambers":{"rankedTables":{}},"legal500":{"rankedTables":{"CC":4,"EM":3,"RE":3}}},
  {"firmName":"Zunić Law","type":"L","chambers":{"rankedTables":{}},"legal500":{"rankedTables":{"EM":3,"IP":2}}},
  {"firmName":"Atanasković Božović","type":"L","chambers":{"rankedTables":{}},"legal500":{"rankedTables":{"CC":4,"DR":4,"EM":3}}},
  {"firmName":"BnB Law Firm","type":"L","chambers":{"rankedTables":{"CO":2}},"legal500":{"rankedTables":{}}},
  {"firmName":"AVS Legal","type":"L","chambers":{"rankedTables":{}},"legal500":{"rankedTables":{"EM":3,"RE":3}}},
  {"firmName":"Jusufović & Partners","type":"L","chambers":{"rankedTables":{}},"legal500":{"rankedTables":{"DR":2}}},
  {"firmName":"PR Legal","type":"L","chambers":{"rankedTables":{}},"legal500":{"rankedTables":{"EM":3,"IP":3}}},
  {"firmName":"CT Legal (Caković Tomić)","type":"L","chambers":{"rankedTables":{"EM":3}},"legal500":{"rankedTables":{}}},
  {"firmName":"Popović, Popović & Partners","type":"L","chambers":{"rankedTables":{"IP":3}},"legal500":{"rankedTables":{}}},
  {"firmName":"Deloitte Legal Serbia","type":"C","chambers":{"rankedTables":{}},"legal500":{"rankedTables":{"CC":3}}},
  {"firmName":"PSG Legal","type":"L","chambers":{"rankedTables":{}},"legal500":{"rankedTables":{"CC":4,"RE":4}}},
  {"firmName":"Cvetković Skoko & Jovičić","type":"L","chambers":{"rankedTables":{}},"legal500":{"rankedTables":{"RE":4}}},
  {"firmName":"Golubović Simić & Marinković","type":"L","chambers":{"rankedTables":{}},"legal500":{"rankedTables":{"DR":4}}},
  {"firmName":"Vulić Law","type":"L","chambers":{"rankedTables":{}},"legal500":{"rankedTables":{"RE":4}}}
 ]
}
```

## Build plan

### Batch A — Data model

**1. `market_visibility_audits` table.** Columns: `id` uuid PK, `client_id`
uuid (same anonymous-identity pattern as `firm_benchmarks`),
`audited_domain` text not null (the firm-identity key; comparisons are
domain-to-domain), `display_name` text, `market` text not null,
`peer_group` text not null (`international` | `regional` | `local` |
`localized_page` | `consultancy`), five numeric category-score columns + a
`total_score` generated column, `raw_metrics` jsonb (every input value, so
re-normalizing later never requires re-fetching), `provenance` jsonb
(per-metric: `api` | `ai_classified` | `self_reported` | `missing`),
`is_public` boolean default false, `published_at` timestamptz,
`created_at`/`updated_at`. Unique on `(client_id, audited_domain, market)`.

**2. `market_directory_data` table.** Reference data, not per-audit data:
`market`, `firm_name` text, `firm_domain` text nullable, `chambers` jsonb,
`legal500` jsonb, `iflr1000` jsonb, `last_verified_at`. Seed Serbia's rows
from the JSON above.

**3. `directory_lookup_requests` table.** Tiny queue: `market`,
`firm_domain_or_name`, `requested_at`. `visibility-audit-reputation`
inserts here on a miss instead of failing.

**Security — deliberately not copying `firm_benchmarks`' precedent:**
That table's public-SELECT policy was fine because `client_id` is anonymous
and the content (chapters read, implementation %) isn't sensitive. A
specific firm's real directory standing is different — a firm may not want
that exposed just because someone ran an audit against their domain. So:
- `market_visibility_audits` SELECT: `using (is_public = true)` only. No
  identity-scoped read policy — there's no real session/JWT to safely
  scope one to (`verify_jwt = false` throughout, no Supabase Auth users).
  "See your own unpublished result" goes through a
  `visibility-audit-get` edge function (service_role, scoped by `client_id`
  server-side) — same pattern already used correctly for `url_cache` and
  `shared_artifacts` writes.
- INSERT/UPDATE: `with check (false)` for anon/authenticated. All writes via
  `visibility-audit-run` / `visibility-audit-publish` (service_role only).
  A client never sets `is_public` directly.
- `market_directory_data`, `directory_lookup_requests`: service_role only,
  no anon/authenticated grants — mirrors `url_cache` exactly.
- All new tables get the GRANT block + explicit RLS this project's rules
  already require.

**4. Rename to LegalOS.** `package.json` name/description, `README.md`,
`PasswordGate.tsx` title text. Don't touch internal identifiers
(`firm_benchmarks`, hook names, table names) — see "Branding note" below.

### Batch B — Deterministic scoring, no LLM

**5. `visibility-audit-performance` edge function.** New secret
`PAGESPEED_API_KEY` (free Google API key). Call PSI for `strategy=desktop`
and `strategy=mobile`, extract `lighthouseResult.categories.{performance,
accessibility,seo}.score` (0–1 → ×100), apply the formulas above. Use
existing `safeFetch` + `getCached`/`setCached` (24h TTL is fine — PSI
scores don't move hour to hour).

**6. `visibility-audit-reputation` edge function.** Look up
`audited_domain` (fuzzy-match on `firm_name` per the seed note above) in
`market_directory_data`. Found → compute Reputation sub-scores using
`marketVisibilityConfig.ts` (#7). Not found → insert into
`directory_lookup_requests`, return zeros with `directory: "pending"`
rather than erroring; the rest of the audit should still complete.

**7. `src/lib/marketVisibilityConfig.ts`.** Same pattern as the existing
`skins.ts`. One entry per market:
```ts
export const DMV_MARKETS: Record<string, MarketConfig> = {
  serbia:  { chambers: { n: 7,  deepestBand: 4 }, legal500: { n: 8,  deepestTier: 4 }, iflr1000: { n: 2, deepestTier: 3 }, contentWindowDays: 60 },
  hungary: { chambers: { n: 13, deepestBand: 4 }, legal500: { n: 11, deepestTier: 4 }, iflr1000: { n: 4, deepestTier: 3 }, contentWindowDays: 60 },
  romania: { chambers: { n: 10, deepestBand: 4 }, legal500: { n: 15, deepestTier: 4 }, iflr1000: { n: 5, deepestTier: 3 }, contentWindowDays: 60 },
};
```
Serbia's numbers are independently verified table-by-table. Hungary/Romania
are as published by a third party, not re-verified — comment this
distinction in the code; treat them as reference values only.

**8. GBP — self-report, not an API call.** A binary worth 10 pts doesn't
justify a Places API key and billing setup. Ask it as a checkbox in the
audit intake instead.

### Batch C — AI-assisted scoring (existing pattern, no new secret)

**9. `visibility-audit-thought-leadership` edge function.** Same shape as
`roast-homepage`: `safeFetch` the firm's blog/news pages, strip tags, pass
to Gemini 2.5 Flash via `ai.gateway.lovable.dev` (reuse `LOVABLE_API_KEY`)
with forced tool-calling returning `{ title, date, type: "blog"|"news"|
"other", hasNamedByline }[]`. Filter to `contentWindowDays`, compute the
three Thought Leadership sub-scores. Use a longer cache TTL here than 24h —
content doesn't change hour to hour; 7 days is reasonable.

### Batch D — Paid-tier scoring, explicitly optional at launch

**10. `visibility-audit-seo` edge function.** New secrets
`AHREFS_API_KEY`/`MOZ_API_KEY` — a hard stop per the top of this file until
they exist. Until configured, return `{ status: "not_configured" }` rather
than failing the whole audit; Performance/Reputation/Thought Leadership
should score in full regardless.

**11. Social — self-report form, not scraping.** No clean LinkedIn API.
Form fields: followers, posts in the last 30 days, and optionally the
firm's own true impression-based engagement rate from their own LinkedIn
analytics if they have it (more accurate than any scraping proxy) — plus
the four binary platform-presence checkboxes. `visibility-audit-social`
applies the peer-group math to whatever's submitted.

### Batch E — Orchestration, UI, integration

**12. `visibility-audit-run` edge function.** Calls B/C/D's functions,
assembles the total, computes the peer-group percentile (query other
`is_public = true` rows sharing `market`+`peer_group` at read time — this
is the payoff: a live, self-improving number). Writes via service_role.

**13. `visibility-audit-publish` edge function.** Flips
`is_public = true, published_at = now()`, server-side `client_id` check.
Mirrors `create-share`'s posture.

**14. `MarketVisibilityScore.tsx` + `useMarketVisibility.ts`.** Same
card-and-modal shape as `ScoreWebsite`/`RoastHomepage`/`CompetitorAnalysis`,
visually distinct (different badge — "Verified" vs. the other tools' more
playful framing — so score disagreement between this and Roast doesn't
read as a bug). Intake: domain, market, peer-group picker, GBP checkbox,
social self-report fields. Runs #12, renders the breakdown + percentile +
"Publish to the public ranking" button (calls #13).

**15. Battle Plan integration.** Extend `useBattlePlanCache` with a
`visibilityScore` slot; add it to `BattlePlan.tsx`'s existing optional-
inputs checklist (already built to be extended this way). One new PDF
section in `buildPdf`.

**16. `/rankings/:market` route.** Public leaderboard reading
`market_visibility_audits` where `is_public = true`, ordered by
`total_score` within `peer_group`. Small addition to `App.tsx`'s router —
same posture as the existing `Share.tsx` page: branded, read-only, no nav
chrome.

**17. Public teaser surface (per "Decided" #1).** No-password route/
component: Performance + GBP binary only, IP-rate-limited edge function
variant rather than password-gated.

### Batch F — Home IA reweighting (do not bundle into this run)

Not required for the above to work. `Index.tsx`'s default view could
become a lightweight dashboard (score, percentile, this week's move) for
users with an existing audit row, falling back to `TableOfContents` for
first-time visitors. Real, worth doing, changes what every visitor sees
first — leave it out of an unattended run. Note it as a suggestion in your
final summary; don't build it.

## Technical notes

- All new tables: GRANT block + explicit RLS, per this project's existing
  rule (see Batch A security note for the one deliberate deviation from
  `firm_benchmarks`' precedent, and why).
- `verify_jwt = false` on every new function, consistent with the rest of
  `config.toml` — authorization stays entirely in `_shared/access.ts`.
- No function fabricates a total when an input is missing — partial scores
  render with an explicit `pending`/`missing` provenance flag per metric,
  never a silent zero dressed up as a real measurement.
- Reuse `_shared/safeFetch.ts`, `_shared/cache.ts`, `_shared/access.ts`
  everywhere; no new shared-infra pattern.
- `raw_metrics`/`provenance` jsonb exist so a future methodology tweak can
  re-derive scores from stored inputs without re-fetching anything.

## Order of execution

1. Batch A — schema + RLS + rename (everything else depends on this)
2. Batch B — free, deterministic (Performance + most of Reputation, zero spend)
3. Batch C — Thought Leadership (existing AI infra, no new secret)
4. Batch E items 12–15 (private working score + Battle Plan integration,
   before the public layer)
5. Batch D — bring in as secrets/self-report data become available; the
   audit already degrades gracefully without them
6. Batch E items 16–17 (publish flow, public rankings, public teaser) once
   there's enough real data for a ranking page to be worth looking at

## Out of scope for this build (real roadmap, not this pass)

Full BD/CRM hub, Knowledge Hub, Webflow publish pipeline, executive
dashboard, the named "AI Agent" roster, Chambers/Legal500/IFLR1000
submission drafting, conference-opportunity tracking, per-firm recurring
billing/accounts, Batch F.

## Branding note

"LegalOS" = user-facing copy, `package.json`, `README.md`, the
`PasswordGate.tsx` title text — done in Batch A alongside the schema work,
not as its own batch. Don't rename internal identifiers purely for
cosmetic consistency; that's a wide, risky refactor with no user-facing
value.
