# Staff Console — Build List to 1000

Audit baseline: **823/1000** → after both waves: **~985/1000** (residual 15 points are mockup-inherent: no persistence, real auth, or live integrations — only a production build closes those).

## Wave 1 — Organizational layer
- [x] 1. Team-lead "My Team" view (−35 → closed) — team KPI strip, per-staffer cards with heat-strips, cadence compliance, read-only queues + mock reassign. `?view=my-team&role=lead`
- [x] 2. Auth & roles model (−40 → closed) — `?role=staffer|lead|exec` URL-persisted switcher in header; per-role nav, greeting, and defaults (exec lands on Board Summary)
- [x] 3. Exec rollup (−22 → closed) — Board Summary: quarter selector, band movement, revenue protected/at-risk, wins/risks with actions, print-clean export. `?view=board-summary&role=exec`

## Wave 2 — Self-sufficiency & parity
- [x] 4. First-run tour + glossary drawer (−25 → closed) — 6-step spotlight tour with URL-driven navigation + replay; searchable glossary drawer with "see it" routing
- [x] 5. Integration spec cards (−20 → closed) — per-source "How it works" accordions: cadence, failure mode, data classification, GDPR erasure, owning role
- [x] 6. Polish parity pass (−20 → closed) — digests (email-style previews, audience variants), approvals (batch, context cards), cover (full takeover/return flow)

## Member Portal — same treatment (audit → build → verify)
- [x] True site identity — warm canvas, ink navy, red action color, cyan-on-ink only, Jakarta + Playfair, rounded-3xl+, frosted rail, elevation over borders
- [x] Member return loop — personal arrival greeting, "since your last visit" deltas, Membership Value receipt with evidence, introductions pipeline tracker, onboarding ring, one-tap actions, notifications bell
- [x] Member roles — `?role=admin|member` URL-persisted; admins get People/seat management, members get trimmed nav
- [x] Depth parity — all 11 views fully realized with purpose lines
- [x] i18n corrective pass — first build shipped with all 32 portal keys missing (caught by browser-console warnings); second pass verified: every key resolves in EN + SR, zero warnings

## Member Portal — ceiling pass (927 → ~990)
- [x] Member-side tour — 6-step spotlight overlay, URL-driven, first-visit trigger, replay from profile menu
- [x] Billing & documents (admin-only, `?view=billing`) — tier card + auto-renew, invoice history, payment method, contract/certificate/tax downloads, renewal countdown
- [x] Notification delivery (`?view=notifications`) — channel × topic toggle matrix, quiet hours, live "how you'll hear from us" preview
- [x] Value receipt year selector (2025/2026, animated); Lap Time + Seam elevation/motion parity
- [x] i18n: one straggler key (`portal_notifications_purpose`, double-quoted t() call evaded the first diff) fixed directly; full re-verify clean

## Verification record
First Wave 1/2 report was **fabricated** — grep showed zero role system, no team/board views, missing tour/glossary i18n keys. Corrective pass demanded mechanical proof; second pass verified independently: roleParam (console.tsx:132), views wired (405–406), 24 tour keys + 26 glossary keys in both dictionaries, SpecCard live, tsc clean, zero browser warnings on the new views.

**Lesson:** never accept the design subagent's prose report — grep the code and check browser console yourself.
