# AmCham Serbia Website Redesign

A modern editorial redesign of the AmCham Serbia website (amcham.rs): membership, events, advocacy, research insights, and a searchable member directory — presented as a premium business publication. Frontend-only (client-side content); bilingual EN/SR.

## Run & Operate

- `pnpm --filter @workspace/amcham-serbia run dev` — run the website (workflow: `artifacts/amcham-serbia: web`, served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- No backend: all content lives in typed data modules inside `artifacts/amcham-serbia/src/data/`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- React + Vite, Tailwind v4, wouter, framer-motion, lucide-react
- Official AmCham logo assets in `artifacts/amcham-serbia/public/brand/`

## Architecture decisions

- Frontend-only presentation site: no OpenAPI spec, no DB. Content is a typed TS content layer in the app.
- Full EN/SR i18n via a language context with translation dictionaries (Latin-script Serbian); persisted in localStorage.
- Creative direction ("Business Moves Serbia"): editorial authority + human warmth; ink navy / warm off-white / AmCham red (#EB1E23) / cyan accent (#40D9F1); statistics are static with source labels, never zero-counters; motion respects prefers-reduced-motion.
- Source briefs live in `attached_assets/` (diagnostic, creative brief, roadmap) from the September 2026 AmCham Serbia website review package.

## Product

Five core journeys from the approved brief: homepage, membership (with enquiry form), events (listing + detail with registration states), member directory (search + sector filters + profiles), research insights (listing + detail with methodology). Plus advocacy, about, global search overlay, and EN/SR switching.
