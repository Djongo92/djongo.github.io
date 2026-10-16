# Uvid

Market visibility intelligence for law firms — quantified audits, competitive benchmarking, and a structured Battle Plan for closing the gaps.

## Rebrand ground rules (LegalOS → Uvid)

- **User-facing copy says "Uvid"** everywhere (UI, meta/OG tags, emails, exported reports/pitch decks, share cards). The brand mark is a **U enclosed by a ring** (same geometry as the old L mark).
- **Deliberately still "legalos":** workspace package names (`@workspace/legalos*` — managed artifact.toml run commands reference them), artifact directories/ids, localStorage/session keys (changing them logs users out), verification tokens, export file names, and all `legalos.rs` URLs — **uvid.io / uvid-legal.rs are not registered yet** (user-side step; switch URLs once the domain is owned).

## Run & Operate

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/uvid run test` — web + edge-function unit tests
- `SITE_BASE=/ node scripts/build-site.mjs` — build the deployable static site into `site-dist/`
- Deploys: GitHub Pages (`.github/workflows/deploy-pages.yml`) or Vercel (`vercel.json`). Not Replit, not Render.

## Stack

- pnpm workspaces, Node.js 22, TypeScript 5.9
- Frontends: Vite + React (web, marketing), Expo (mobile)
- Backend: Supabase only — Postgres + Deno edge functions (`artifacts/legalos/supabase`)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- **The demo is the real app, not a mock.** `/app/demo` boots the actual product
  against fixture data (`src/data/demoData.ts`) rather than a separate mocked
  build. A forked demo drifts silently; a conditional inside the real component
  tree breaks at compile time instead.
- **Demo-only deviations go through `<DemoOnly>`** (`src/components/DemoOnly.tsx`).
  Use it for staged copy, narrated asides, or teasing something unbuilt. Deviate
  in presentation, never in substance — reframe a number, don't invent one.
- **Showcase access is server-verified.** Codes live in the `DEMO_ACCESS_CODES`
  secret and are checked by the `showcase-access` edge function, so they are never present in
  the client bundle. The endpoint fails closed when unconfigured.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `DEMO_ACCESS_CODES` format is comma-separated `CODE` or `CODE:Who it went to`.
  The label is shown back in the showcase bar. Revoke by deleting one entry.

