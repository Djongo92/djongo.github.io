---
name: Cron failure alerting
description: How scheduled edge-function failures alert, and the rules that keep alerting safe and quiet.
---

Scheduled edge functions share one alerting path (`_shared/cronAlert.ts`); new cron functions adopt the wrapper per the functions README checklist.

Rules worth keeping:
- Only requests carrying the correct `x-cron-secret` may trigger automatic alerts — dual-mode functions must never alert on user-facing 5xxs.
- One alert per failing run: partial failures that deliberately return 200 (per-row errors, cut-short cursor batches, 202-then-background sweeps) send a single aggregate alert, never per-row.
- The helper must never throw — alerting can't be the thing that takes a job down.
- `sendCronAlert` always sends `x-cron-secret` in its POST so the internal `cron-alert-inbox` function can validate the source. External receivers (Slack/Discord) ignore the header.
- The internal inbox (`cron-alert-inbox`) writes to `public.cron_alerts`. The `check:cron-alerts` script (tests/cron-alert-check.mjs) queries that table and exits non-zero when recent alerts exist — run it as a monitoring workflow to surface active failures.
- `firm-signals-refresh` is special: foreground is wrapped by `withCronAlert`; background crashes use `.catch(sendCronAlert)`; chain handoff failures use `onChainFailure` dep in `SweepDeps`.
- Delivery target is the `CRON_ALERT_WEBHOOK_URL` Supabase function secret (Slack/Discord-compatible payload, or the inbox URL). When unset, alerts are loudly logged but NOT delivered — check that secret before assuming alerting works.

**Why:** cron failures previously landed only in cron.job_run_details + console.error, which nobody watches; per-row alerts would spam.
