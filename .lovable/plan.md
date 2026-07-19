# Plan: Ship the 12 Picks

Grouped by layer so each batch can ship and be QA'd together. Roughly 4 ship-batches.

---

## Batch A — Design polish (no backend)

**1. Chapter cover-page reveal**
- New `ChapterCover.tsx`: thin gold rule draws across (SVG path animation, ~600ms), then chapter number fades in, then title rises with a slight blur-clear.
- Mount inside `ChapterView` above existing hero. Runs once per chapter visit (per session).

**2. Ambient reading mode**
- New `useAmbientMode.ts` hook: detects local time, after 21:00 applies a `.ambient` class to `<html>` that nudges `--background` warmer (~+8 hue, slightly lower lightness) via existing HSL tokens.
- Tie scroll velocity → particle speed: extend `GoldParticles.tsx` to read a shared `useScrollVelocity` and dampen drift when velocity is low/ambient is on.

**3. Custom monoline workshop icons**
- New `src/components/workshop/icons/` with 7 hand-built SVG components (Autopsy, Audit, Headlines, Teardown, Pitch, Bio, Calendar) + Rewriter + Copywriter. Stroke 1.25, no fill, gold currentColor.
- Replace Lucide usage in `Workshop.tsx` tool cards.

---

## Batch B — Wiring (in-app handoff & history)

**5. Battle Plan canonical export**
- Extend `BattlePlan.tsx` builder UI with optional checkboxes: Maturity Score, Headline Lab winner, Bio rewrite. Pulls latest from new history store (see #7).
- Update edge function (or client assembly) to render those sections into the markdown export.

**6. Cross-tool handoff**
- New `src/lib/handoff.ts`: tiny pub/sub + `sendTo(toolId, payload)` writes to `sessionStorage` key and dispatches event.
- Each Workshop tool reads handoff payload on mount and prefills inputs. Add "Send to →" dropdown button on every result card (Rewriter → Headline Lab/Autopsy; Steal Homepage → Autopsy; Calendar month → Implementation checklist).

**7. Workshop run history (per browser)**
- New `useWorkshopHistory.ts` hook (localStorage, capped at 50 runs, JSON). Each tool calls `saveRun({tool, inputs, output, ts})` on completion.
- New `MyWorkshopDrawer.tsx` (Sheet) accessible from Workshop header — list, search, replay, delete, send-to.

---

## Batch C — Backend (auth, share links, caching)

**8. Optional sign-in (Lovable Cloud)**
- Keep `PasswordGate`. After unlock, add subtle "Save across devices" CTA → opens auth dialog (email/password + Google).
- Migration: `profiles` table (id uuid PK = auth.uid, created_at, display_name nullable) + `user_state` table (user_id, key text, value jsonb, updated_at, unique(user_id,key)) for syncing bookmarks/annotations/checklists/history.
- New `useCloudSync.ts`: when signed-in, mirror localStorage keys ↔ `user_state` with last-write-wins.
- Configure Google social auth.

**9. Share links `/share/:id`**
- Migration: `shared_artifacts` table (id uuid PK, kind text, title text, content_md text, firm_context jsonb nullable, created_at, expires_at nullable). Public SELECT policy; insert via edge fn only.
- Edge fn `create-share`: validates payload, inserts row, returns id.
- New route `/share/:id` in `App.tsx` → `SharedView.tsx` renders branded read-only page (logo, "Generated with The Legal Web Playbook", content as markdown, no nav chrome).
- Add "Share" button on every AI output card.

**10. Edge-function URL cache**
- Migration: `url_cache` table (url_hash text PK, fn_name text, payload jsonb, created_at). 24h TTL via timestamp check.
- Helper in `roast-homepage`, `score-website`, `competitor-analysis`, `workshop-practice-audit`, `workshop-competitor-teardown`: hash(url+fn), check cache, return on hit (with `cached:true` flag); on miss, run + insert.
- UI shows "Cached result · refresh" affordance when `cached:true`.

---

## Batch D — Deepen & broaden

**14. Firm Context v2**
- Extend `useFirmContext` schema: add `icp`, `antiIcp`, `wonDeals: string[3]`, `lostDeals: string[3]`, `voice` (optional).
- Expand `PersonalizeOnboarding.tsx` into multi-step wizard (3 steps). Existing single-shot users get a non-blocking "Upgrade your firm profile" banner.
- Update every workshop edge fn system prompt to consume the new fields when present.

**16. Evidence mode for Roast / Teardown**
- Update `roast-homepage` and `workshop-competitor-teardown` system prompts: every claim MUST cite a verbatim ≤200-char quote from fetched HTML, formatted as `[claim] — "evidence"`.
- Strip script/style before passing HTML; cap at 80KB context.
- Result UI renders evidence as a small monospaced footnote under each finding.

**18. Practice-area skins**
- New `src/lib/skins.ts`: 4 skins (Litigation, Transactional, IP, Boutique) defining accent token overrides + example library swaps.
- New `useSkin.ts` (reads from FirmContext.practiceArea or manual override in settings).
- Apply via CSS variable scope on `<html data-skin="...">` in `index.css`. Swap example case studies in `chapters.ts` consumers via a `skin` selector helper.

---

## Technical notes

- All new tables include `GRANT` block and explicit RLS per project rules.
- Cloud sync uses `service_role` only via edge fns; client uses authenticated role + RLS scoped to `user_id = auth.uid()`.
- All new edge fns: `verify_jwt = false` in config.toml + in-code `getClaims` where user identity matters (sync, create-share authoring); public for cache reads where unauthenticated workshop usage is allowed.
- Address security finding `firm_benchmarks` public exposure: tighten RLS to `client_id = auth.uid()` in same Batch C migration.

---

## Order of execution

1. Batch A (pure frontend, fast wins, visible immediately)
2. Batch B (frontend infra; history powers Battle Plan)
3. Batch C (migrations + edge fns + new route; biggest)
4. Batch D (prompt + onboarding upgrades; ride on Batch C profiles)

Each batch ends with build verification before moving to the next.
