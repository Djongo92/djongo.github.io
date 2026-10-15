---
name: Visibility naming canon
description: Marketing must mirror the app's canonical five score categories; the product surface is "Visibility Index", never "Directory".
---

Two naming rules that have lapsed before and were both user-corrected:

1. **Score categories** — the canonical five live in the app's `visibilityCategories.ts`: Performance, Social Media, SEO & Authority, Thought Leadership, Reputation. Any marketing/app copy listing categories must mirror these names exactly.
2. **Product surface** — the public leaderboard is the **Visibility Index**. Never call it "The Directory" in user-facing copy. "Directory" is only correct for the legal directories themselves (Chambers, Legal 500, IFLR1000) or the internal tracked-firm list.

**Why:** The marketing copy pre-dates the rename and no test guards naming, so drift reappears whenever landing copy is rewritten.

3. **Copy language (user-directed, 2026-08)** — Uvid is a *measurement*, not a ranking or a marketing service. User-facing copy says "score / standing / position / visible / measured / benchmark" — never "rank / outrank / re-rank / claim your rank" about Uvid itself. "Peer group" never appears in user-facing copy (say "the market" / "in your market"). Marketing-industry vocabulary ("marketing", "promotion", "lead gen") is minimized — the audience includes firms in advertising-restricted European jurisdictions, and the explicit posture is "we measure, we don't promote" (dedicated FAQ entry). References to *external* rankings (Chambers, Legal 500, award submissions) stay — they are factual data inputs.

**How to apply:** Before writing or editing any marketing copy about scoring or rankings, check `visibilityCategories.ts` for category names, use "Visibility Index" for the leaderboard, and run the copy through rule 3's vocabulary. Internal identifiers (edge function `directory-standing-index`, table `market_directory_data`) are legacy names — don't propagate them into copy.
