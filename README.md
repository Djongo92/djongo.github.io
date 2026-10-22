# Uvid (LegalOS)

Market visibility intelligence for law firms: a measured, peer-benchmarked
**Market Visibility Score** (500 points across Website Experience, Social
Presence, Search Authority, Thought Leadership and Recognition), plus the
Visibility Playbook guidebook, the AI Workshop, and the Battle Plan export.

## Repository layout

```
artifacts/
  legalos/              Web app (Vite + React + TS), served at /app/
    supabase/
      functions/        Deno edge functions — the entire backend
        _shared/        Pure formulas (methodology.ts = every scoring weight),
                        auth/access, rate limiting, shared helpers
      migrations/       Timestamped SQL migrations
  legalos-marketing/    Marketing site (Vite + Tailwind v4), served at /
  legalos-mobile/       Expo mobile app (source only; not deployed from here)
scripts/build-site.mjs  Builds marketing + app into one static site (site-dist/)
amcham-serbia-website/  Separate AmCham demo, hosted on Cloudflare Pages (amcham-demo.pages.dev)
docs/                   Project notes and screenshots
```

## Develop

```bash
pnpm install
pnpm run typecheck                                   # every package
pnpm --filter @workspace/uvid run test               # web app + edge-function formula tests
pnpm --filter @workspace/uvid run dev                # app at http://localhost:21341/app/
pnpm --filter @workspace/uvid-marketing run dev      # marketing site
```

Environment: `artifacts/legalos/.env` and `artifacts/legalos-marketing/.env`
carry only the public Supabase URL and publishable key. Every secret lives in
the Supabase dashboard (Edge Functions → Secrets), never in this repo.

## Hosting

Everything dynamic runs on Supabase (Postgres + edge functions), so the site
is plain static files:

- **GitHub Pages** — `.github/workflows/deploy-pages.yml` builds on every push
  to `main` (`SITE_BASE=/djongo.github.io/`) and publishes the marketing site
  at the root and the app at `/app/`; `/amcham-preview/` only forwards to the AmCham demo on Cloudflare Pages.
- **Vercel** (optional, root domain) — `vercel.json` runs the same build with
  `SITE_BASE=/`.

Local preview of exactly what ships: `SITE_BASE=/ node scripts/build-site.mjs`,
then serve `site-dist/`.

## Scoring methodology

All weights are defined once in
`artifacts/legalos/supabase/functions/_shared/methodology.ts` (v3, 500 points).
Every stored audit records the `methodology_version` that produced it, and
every display converts older readings rather than mixing scales. Scores are
recomputed from stored `raw_metrics` — no paid data re-fetch needed.

## License

Proprietary — all rights reserved.
