---
name: Score-history peer stats, confidence, and demo data parity
description: How peer normalization is frozen per audit, and why fixture/demo data must mirror real audit rows field-for-field
---

**PeerStats (value, peerMedian, p90Threshold, highestObserved, sampleSize, comparisonDate, lowConfidence, widened) is computed once at scoring time and frozen inside `raw_metrics` JSONB** on both the current audit row and its immutable history row. Re-viewing a past audit already reads the frozen value, not a live recompute against today's peer group — corrections/reruns (`recomputeFromRawMetrics.ts`) reuse the stored PeerStats too. So "peer group drift vs. your own progress" is mostly a *display* problem (surface the frozen raw metric + confidence next to the point), not a recompute-architecture problem — check whether the freeze already exists before assuming you need to add persistence.

**Why:** confirmed by reading `percentileFormula.ts`, `peerStats.ts`, `recomputeFromRawMetrics.ts`, and the `market_visibility_audit_history` migrations — the columns (`raw_metrics`, `provenance`, `confidence_score`, `sample_size`) were already being written well before anything read them back out for history display.

**How to apply:** when a task asks to "stop conflating X with Y" or "make past state honest" in this scoring system, first check whether the DB/backend already stores the needed field and the gap is purely that a SELECT or a UI surface never reads it — that's a much smaller fix than it sounds.

---

**Demo/fixture data (`artifacts/legalos/src/data/demoData.ts`) must carry the same fields as real audit/history rows, not just the current-audit shape.** When a feature adds new per-history-point fields (e.g. `confidence_score`, `sample_size`, `raw_metrics`, `provenance` on `HistoryRow`), the demo dataset is usually the *only* way a reviewer or the user sees the feature without a real multi-week audit trail. If `DEMO_HISTORY` only has `{ total_score, recorded_at, ... }` per point, the new UI silently renders as if the feature doesn't exist — not a code bug, but reads as one.

**Why:** first pass of task 39 (score-history confidence/raw-metric display) shipped working code that a testing subagent reported as "confidence line never appears" — root cause was `DEMO_HISTORY` predating the new fields, not the rendering logic. Fixed by giving every demo history row realistic frozen `raw_metrics`/`provenance`/`confidence_score`/`sample_size`, including deliberately thin-sampled early rows so the "low confidence" treatment has something to show.

**How to apply:** whenever a task adds fields to a row type that also has a demo/seed/fixture counterpart, grep for that fixture and check it has the new fields populated (with some deliberately-imperfect values, e.g. low-confidence points) before considering the feature demo-verifiable.
