#!/usr/bin/env node
// One-off re-score of every stored audit onto methodology v3 (500 points),
// entirely from stored raw_metrics — no PSI, SEO-provider, AI or news
// re-fetch, so it costs nothing and the inputs stay exactly the latest
// measured data.
//
// What v3 needs that pre-v3 rows don't carry, and where it comes from:
//   - Thought Leadership's own-site split (articles vs own news) and
//     publishing consistency: derived from the classified items already
//     stored on each row, measured as of that row's updated_at.
//   - Peer stats for those two counts: rebuilt from the same rows, per
//     market + peer_group, widened to the whole market when a group is
//     thinner than MIN_PEER_SAMPLE — the same widening rule live audits use.
// Every other category reuses the peer stats frozen at audit time.
//
// Usage (dry run prints a summary; --apply writes):
//   SUPABASE_ACCESS_TOKEN=… npx tsx scripts/census/recompute-v3.mjs [--apply]
import { recomputeFromRawMetrics } from "../../supabase/functions/_shared/recomputeFromRawMetrics.ts";
import { aggregateContentItems, filterToWindow } from "../../supabase/functions/_shared/thoughtLeadershipFormula.ts";
import { computePeerStats, MIN_PEER_SAMPLE } from "../../supabase/functions/_shared/percentileFormula.ts";
import { DMV_MARKETS } from "../../supabase/functions/_shared/marketVisibilityConfig.ts";
import { METHODOLOGY_VERSION } from "../../supabase/functions/_shared/methodology.ts";

const PROJECT_REF = "kosmxczrwrhzmmloxobq";
const APPLY = process.argv.includes("--apply");

async function sql(query) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is required (Management API)");
  const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!resp.ok) throw new Error(`Management API HTTP ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  return resp.json();
}

const lit = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);

/** Own-site counts + consistency for one row, as of when it was measured. */
export function ownOutputSignals(tl, windowDays, measuredAtMs) {
  const items = Array.isArray(tl?.items) ? tl.items : [];
  return aggregateContentItems(filterToWindow(items, windowDays, measuredAtMs), windowDays, measuredAtMs);
}

/** Peer values for one metric: same peer group, widened to the market when thin. */
export function peerPool(rows, row, metric) {
  const others = rows.filter((r) => r.market === row.market && r.audited_domain !== row.audited_domain);
  const group = others.filter((r) => r.peer_group === row.peer_group);
  const pool = group.length + 1 >= MIN_PEER_SAMPLE ? group : others;
  return { values: [...pool.map((r) => r.signals[metric]), row.signals[metric]], widened: pool !== group };
}

async function main() {
  const rows = await sql(`
    SELECT id, client_id, audited_domain, market, peer_group, raw_metrics, provenance,
           seo_authority_score, methodology_version, updated_at, sample_size, confidence_score,
           data_window_start, data_window_end
      FROM public.market_visibility_audits`);
  console.log(`${rows.length} audit rows`);

  for (const r of rows) {
    const windowDays = DMV_MARKETS[r.market]?.contentWindowDays ?? 90;
    const measuredAt = Date.parse(r.updated_at);
    r.signals = ownOutputSignals(r.raw_metrics?.thoughtLeadership, windowDays, measuredAt);
  }

  const out = [];
  for (const r of rows) {
    const raw = structuredClone(r.raw_metrics ?? {});
    const tl = raw.thoughtLeadership;
    if (tl && (tl.postsStats || tl.articlesStats || tl.newsStats)) {
      const now = new Date(r.updated_at);
      const a = peerPool(rows, r, "articlesCount");
      const o = peerPool(rows, r, "ownNewsCount");
      Object.assign(tl, {
        articlesCount: r.signals.articlesCount,
        ownNewsCount: r.signals.ownNewsCount,
        activeMonths: r.signals.activeMonths,
        windowMonths: r.signals.windowMonths,
        measuredAt: r.updated_at,
        articlesStats: computePeerStats(a.values, r.signals.articlesCount, { widened: a.widened, now }),
        ownNewsStats: computePeerStats(o.values, r.signals.ownNewsCount, { widened: o.widened, now }),
      });
    }
    const scores = recomputeFromRawMetrics(r.market, raw, {
      // Only a carried-forward Search Authority score has no stored stats;
      // it moves onto the v3 scale share-for-share.
      seoAuthority: (Number(r.seo_authority_score) || 0) * (r.methodology_version >= 3 ? 1 : 100 / 60),
    });
    out.push({ row: r, raw, scores });
  }

  out.sort((x, y) => y.scores.total_score - x.scores.total_score);
  for (const { row, scores } of out.slice(0, 15)) {
    console.log(`${String(scores.total_score).padStart(7)}  ${row.peer_group.padEnd(13)} ${row.audited_domain}`);
  }
  if (!APPLY) {
    console.log("Dry run — re-run with --apply to write.");
    return;
  }

  for (const { row, raw, scores } of out) {
    const set = `
      performance_score = ${scores.performance_score},
      social_score = ${scores.social_score},
      seo_authority_score = ${scores.seo_authority_score},
      thought_leadership_score = ${scores.thought_leadership_score},
      reputation_score = ${scores.reputation_score},
      methodology_version = ${METHODOLOGY_VERSION},
      raw_metrics = ${lit(JSON.stringify(raw))}::jsonb`;
    // total_score is a generated column — never written directly. updated_at
    // is left alone: the measurement date hasn't changed, only the scoring.
    await sql(`
      UPDATE public.market_visibility_audits SET ${set} WHERE id = ${lit(row.id)};
      INSERT INTO public.market_visibility_audit_history
        (client_id, audited_domain, market, peer_group, performance_score, social_score,
         seo_authority_score, thought_leadership_score, reputation_score, total_score,
         methodology_version, data_window_start, data_window_end, sample_size,
         confidence_score, raw_metrics, provenance, source)
      SELECT client_id, audited_domain, market, peer_group, performance_score, social_score,
             seo_authority_score, thought_leadership_score, reputation_score, total_score,
             methodology_version, data_window_start, data_window_end, sample_size,
             confidence_score, raw_metrics, provenance, 'rescore'
        FROM public.market_visibility_audits WHERE id = ${lit(row.id)};`);
  }
  console.log(`Re-scored ${out.length} rows onto methodology v${METHODOLOGY_VERSION}.`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
