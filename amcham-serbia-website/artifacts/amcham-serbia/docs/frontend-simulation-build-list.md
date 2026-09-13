# Frontend Simulation Build List

Last updated: 2026-09-13 (pass 2 — mechanical action conversion)

## Scope rule

This platform pass is frontend-only. Do not add authentication, backend persistence, external delivery, or production integrations. Every action must produce a truthful, visible simulated state change in the current UI. Toasts may accompany state changes, but must not be the only effect.

## Closed in this pass

- [x] Removed stale duplicate lowercase console modules (canonical PascalCase modules active via `views/index.ts`).
- [x] Portal: unknown `?view=` renders a "Page Not Found" state with a Back to Home action instead of blank content.
- [x] Portal: direct member access to `people`/`billing` renders a Restricted Area state instead of blank content.
- [x] Console: unknown `?view=` renders a "Page Not Found" state instead of blank workspace.
- [x] Committee: RSVP toggles an "Attending ✓" state; document downloads show per-doc "Downloaded ✓"; Join Discussion opens an inline composer that posts visible replies.
- [x] Onboarding: Contact Manager opens a drafted-message modal; sending shows a persistent "Message Sent" state.
- [x] Billing: invoice PDF buttons become per-invoice "Downloaded" states; Request Billing Support produces a visible ticket confirmation (#SUP-2481) instead of a bare toast.
- [x] Events: Add to Calendar becomes a persistent "Added to Calendar" state per event.
- [x] Lap Time: download button transitions through Downloading → "Report Downloaded ✓".
- [x] My Team: Auto-Balance Workload actually rebalances workload percentages and locks with "Workload Balanced ✓"; Coach becomes per-member "Coached ✓".
- [x] Digests: Send Test becomes a per-variant "Test Sent" state; Edit Draft opens a real subject-line editor that updates the preview.
- [x] Ask: replaced canned IT-exporter response with a deterministic fixture-data query engine (sector/tier/location/exporter/engagement keyword parsing), visible "Applied filters" explanation, honest demo-data provenance labels, per-company "Queued" state, and an Export CSV state that reflects the result set.
- [x] Matchmaking: Dismiss removes the pair with an empty state; Request Opt-in / Schedule Introduction now mutate consent and outcome state (pending → approved → scheduled).

## Code-review fixes (pass 2, architect findings)

- [x] Ask: replaced raw substring matching with word-boundary regex (longest-first) so "Logistics companies with low engagement" no longer matches IT via "wITh"; renewal filter now honors an explicit "in N days" window via a real date predicate.
- [x] Matchmaking: stable `pairId` (`from-to`) keys and mutations replace array-index identity, so dismiss/exit animations no longer morph the wrong card.
- [x] My Team: auto-balance now clamps every member to ±5 of the true team average and refuses to lock unless the resulting spread is ≤10 — no false "Balanced" claim.
- [x] Dialog accessibility on all four new overlays (onboarding email, billing payment, event details, digest editor): `role="dialog"` + `aria-modal`, labelled titles, aria-labels on icon-only close buttons and form fields, and Escape-to-close.

## Verified

- [x] `pnpm --filter @workspace/amcham-serbia run typecheck` — passes
- [x] `PORT=5000 BASE_PATH=/amcham-serbia pnpm --filter @workspace/amcham-serbia run build` — passes (pre-existing Google Fonts @import ordering warning and tooltip sourcemap warning remain; chunk-size warning is informational)

## Closed in pass 3 (remaining open items)

- [x] EN/SR localization for all newly added member-facing copy — 24 portal keys and 22 console_v2 keys added to both dictionaries in `src/lib/i18n.tsx` and wired via t() in committee, onboarding, billing, events, laptime, matchmaking, MyTeam, digests, and ask views. Verified mechanically: all keys present in en and sr blocks.
- [x] Notification deep links — notifications carry a `view` mapping (intro→seam, event→events, value→score); clicking one in the header dropdown or the notifications view marks it read and navigates to the destination.
- [x] Ask "Queue Next Touch" now shares state with Outreach via a new `console-state.tsx` provider: queued companies appear in the Outreach queue with a "From Ask" badge and count toward the queue total.
- [x] Ask suggested-question chips produce distinct parsed results (third chip was changed to "IT companies with low engagement" — the old Logistics variant resolved to zero fixture matches).
- [x] Dialog accessibility polish (from pass 2): role/aria-modal, labelled fields, Escape-to-close on all four new overlays.

## Verified

- [x] `pnpm --filter @workspace/amcham-serbia run typecheck` — passes
- [x] `PORT=5000 BASE_PATH=/amcham-serbia pnpm --filter @workspace/amcham-serbia run build` — passes
- [x] i18n key parity check (en/sr) — all keys present

## Closed in pass 4 (portal depth sweep)

- [x] Audited every remaining portal view (Glance, Home, Directory, Marketplace, Seam, People, Value receipt, Notifications) for toast-only actions.
- [x] Marketplace "Respond" → per-listing "Response Sent" confirmation state on the card.
- [x] People "Resend invite" → per-row "Resent ✓" state.
- [x] Confirmed all other toasts in these views already accompany real local-state changes (save toggles, inbox triage, preference persistence, correction submission).

## Still open (genuine future work, not regressions)

- [ ] Full focus-trapping inside modals (Tab cycling) — current state has labels/Escape but not a complete trap.
- [ ] Deeper localization sweep of older pre-existing view copy (longer content paragraphs in score-view, laptime-view).
- [ ] Route/role/state regression checks (automated) — deferred as a separate testing effort.

## How to continue

When picking up an open item, mark it `[x]`, add anything newly discovered under "Still open", and rerun both verification commands before closing the session.
