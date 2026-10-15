---
name: Audit spend controls
description: Three-layer guard so audits never silently burn paid provider budget — quarterly census cadence, per-firm 24h fresh-serve, per-client daily cap.
---

Every full audit spends real money (PSI / DataForSEO / Gemini), and the market's external signals (backlinks, directory standings, press) move quarterly at best. Three layers enforce that, cheapest first:

1. **Census cadence gate** — full `--force` sweeps are refused within 90 days of the last full-market completion, keyed on `.census-last-full-sweep.json` (written only when a non-`--only` run leaves the whole manifest done). `--only` refreshes are exempt; `--override-cadence` is the deliberate escape hatch.
2. **Per-firm fresh-serve behind an expiring lease** — `runVisibilityAudit` serves an audit younger than 24h unchanged. Refreshes are coordinated by the `audit_refresh_leases` table + atomic `claim_audit_refresh` RPC (serve_fresh / claimed / held in one round trip; service-role only; ~15 min TTL), released on success AND failure — so parallel requests, including first-ever audits with no row to read, yield exactly one paid run, and a crashed run self-heals at lease expiry instead of locking the firm out. `market_visibility_audits.updated_at` means "last successful measurement" only — a BEFORE UPDATE trigger (`trg_market_visibility_audits_updated_at`) forces it on every write, so it must never be used as a lock.
3. **Per-client daily cap** — 20 audits/24h bounds what remains.

**Why:** a `--force`-by-default census workflow overwrote a good SEO dataset with zeros after the DataForSEO balance lapsed, and nothing stopped a firm from re-measuring itself 20×/day; the first cooldown design (claim via `updated_at` bump) was both raceable and un-rollbackable because of the trigger, so a crashed run locked the firm out for 24h.
**How to apply:** never key the cadence gate on per-row `updated_at` (targeted refreshes bump it); never put a read-then-run check in front of paid work (races) — reserve via the lease RPC first, fail closed on RPC error, release in a `finally`; never store a reservation in a column a trigger rewrites; internal batch paths keep `skipRateLimit: true` (lease bypassed) and are cadence-gated instead.
