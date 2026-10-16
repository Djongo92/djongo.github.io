---
name: LegalOS marketing site
description: Conventions and known limitations of artifacts/legalos-marketing
---

- Tailwind **v4** here (the app uses v3) — don't cross-contaminate config or class conventions.
- Design language: gold `43 57% 49%` primary on dark navy, Fraunces serif headlines, Inter body. Labels and the logo mark follow [brand-typography.md](brand-typography.md) — read it before adding any section header or badge.
- Legal pages (privacy/terms) are hash-routed (`#/privacy`, `#/terms`) inside the single-page App — no router library.
- Hero + bottom CTA domain inputs forward to `/app/teaser?domain=...`, which auto-runs the audit (flow from the campaign-link task).
- Email capture POSTs to the api-server (`/api/report-leads`, stored in Postgres `report_leads`, deduped by email); failures surface an error instead of false success.
- **Known intentional limits:** firm checker matches only the public top-7 firms (full 44-firm list lives in Supabase — task filed).
- **Root-mounted artifact:** the marketing site's preview path is `/` (BASE_PATH unset, unlike the app at `/app/`). Verify its static pages via proxy-ROOT URLs (`curl localhost:80/benchmarks/x.html`), never `/legalos-marketing/...` — prefixed paths silently hit the SPA fallback and return 200 with the wrong HTML. Vite dev also won't serve directory index.html from `public/` (`/guidebook/` falls back to the SPA); explicit file paths (`/guidebook/index.html`) work in dev, and directory URLs work in production static hosting.
- **Open seam:** the app artifact still uses the monospace label trope this site dropped, so the marketing → showcase handoff currently changes typographic voice mid-journey.
- **Photo-background hierarchy:** every photographic section background uses the "whisper" recipe (opacity-20/25 + parallax + heavy veil) — EXCEPT the closing CTA (`#start`), which is the deliberate climax: still image (no parallax), opacity-60, lighter center veil. **Why:** uniform subtlety flattened the page's build; one loud section only works if it's the only one. **How to apply:** never give a second section the louder treatment without demoting the CTA back to whisper first.
