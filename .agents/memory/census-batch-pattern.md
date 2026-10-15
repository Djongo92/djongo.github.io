---
name: Bulk import pattern for external firm data
description: How to run bulk audits for imported firm cohorts (system identity, secret gate, publish semantics) + the ingest traps that bite
---

Bulk imports of external firm cohorts run audits under a dedicated system identity via a secret-guarded internal path, never a real account, and publish results explicitly — the audit table's private-by-default is correct for self-serve intake but wrong for imported market data. Batch drivers must treat client timeouts as "maybe completed server-side" and rely on server-side idempotency rather than retrying expensive audits blindly.

**Why:** per-client audit rate limits exist to cap spend from leaked credentials, so a batch needs a controlled bypass that public HTTP callers can never set; isolating batch rows under their own identity keeps them out of real client workspaces and makes the cohort identifiable/deletable as a unit.

**How to apply:** any future bulk/batch import (new market, refreshed census). Four traps already paid for: (1) Serbian đ has no NFD decomposition — name normalization must map đ→d by hand or dedupe misses matches; (2) any SQL generator whose output is later replayed by a parser must round-trip through that parser in a test, or re-ingestion silently "forgets" its own writes (this includes mapping the bare NULL literal to null, or "NULL" becomes a junk domain); (3) directory firm_type codes are curated judgements, not brand tiers (global networks can be typed "regional") — derive types for new firms conservatively and show them for human review before applying; (4) multi-hour batch drivers must run as a managed workflow — a nohup'd background process from a shell call gets silently reaped mid-run (~15 min in), with nothing in the log.
