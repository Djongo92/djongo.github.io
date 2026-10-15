---
name: Directory-sourced social numerics ("directory" provenance)
description: Rules for ingesting researcher-verified social numerics into the market directory so unverified pages can never enter scores or the peer pool.
---

Social data ladder: intake self-report → directory numerics ("directory") → homepage presence detection ("detected", presence-only, no numerics persisted) → missing.

Rules that keep this honest:
- Only ingest numerics attributable to the firm's OWN claimed company page, and stamp that attribution per row, based on recorded evidence — never blanket-stamp a whole batch as confirmed. Unclaimed, estimated, global-office, or "maybe applicable" pages are unknowns, never zeros.
- Researcher annotations must live in their own field (e.g. a `note` key), never appended inside the URL — an annotated URL is the tell that a row was NOT cleanly confirmed, and a regression test enforces that every attributed row has a bare URL.
- Enforce the shape + attribution flag with both a DB CHECK constraint and an independent runtime gate in the audit reader, and cover the gate with an orchestration-level test (unattributed row → provenance falls through to detection, sentinel numerics appear nowhere in persisted payloads).
- A blank intake object is NOT a self-report; explicit numeric zeros ARE.

**Why:** the 2026-08 ingest twice leaked unverified rows — first unclaimed pages recorded as 0/0, then a blanket attribution stamp that falsely confirmed rows whose URLs carried doubt annotations. Both required prod data cleanup plus force re-audits of the affected firms.
**How to apply:** any bulk social import gets per-row attribution evidence, a bare-URL check, a companion re-audit of firms whose published audits used the old rows, and the migration applied to prod with a ledger record.
