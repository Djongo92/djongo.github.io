---
name: Google Places (GBP) wiring & paused weekly refresh
description: GOOGLE_PLACES_API_KEY is set and GBP data feeds Reputation; the weekly firm-signals-refresh cron is deliberately PAUSED until paid clients — don't assume it's broken.
---

`GOOGLE_PLACES_API_KEY` is set in Supabase secrets (a dedicated GCP key with Places API enabled — the generic `GOOGLE_API_KEY`/`GOOGLE_API_KEY2` Replit secrets return REQUEST_DENIED for Places). GBP signals (`firm_signals.signal_type='google_places'`) feed the Reputation category via `calculateGbpScore`; both the weekly batch and the on-demand "Refresh GBP data" button consume them.

**Operational state:** the pg_cron job `firm-signals-refresh` (Sundays 02:00) is **paused** (`cron.job.active = false`) by product decision until paid clients arrive. GBP was backfilled once for the whole Serbia directory via a manual `{ only: "places" }` sweep (90/90 firms, ~37s).

**Why:** user asked to defer recurring spend until revenue; the full PSI+Places sweep also OOM-crashes the edge worker at ~90-firm scale (WORKER_RESOURCE_LIMIT, deterministic — multi-MB Lighthouse payloads in isolate memory; BATCH_SIZE 2 does NOT fix it). Re-enable runbook is in `firm-signals-refresh/index.ts` header comment; the PSI memory fix is tracked as a queued task.

**How to apply:** if GBP/PSI signals look stale, check `cron.job.active` before assuming a bug. To backfill one signal type: POST firm-signals-refresh with `x-cron-secret` (Vault `cron_secret`) and body `{ "only": "places" }` or `{ "only": "psi" }`.
