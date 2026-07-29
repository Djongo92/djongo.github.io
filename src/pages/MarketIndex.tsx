// A single, unified "how visible is this firm" list — not a numbered
// ranking. Reachable at either of two legacy URLs (both routes point at
// this same component; see App.tsx) since nothing else in the app needed
// to change. Combines every firm with a real, externally-sourced measure —
// firms that ran and published a full audit, plus every Chambers/Legal
// 500/IFLR1000-tracked firm that hasn't — into one list, deduplicated by
// domain, grouped into qualitative visibility tiers instead of an ordinal
// #1/#2/#3 position. The point isn't "who's winning" (an ordinal position
// turns everyone below #1 into a loser by construction, even when the real
// gap between #4 and #5 is a single point) — it's "how visible are you
// today, and what would move that."
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, ArrowRight, Eye, Download, ShieldCheck, Flag, Sparkles, TrendingUp, Clock, Users,
} from "lucide-react";
import { PEER_GROUPS } from "@/lib/marketVisibilityConfig";
import { toCsv, downloadCsv } from "@/lib/csv";
import { setPageMeta } from "@/lib/pageMeta";
import { isDemoMode } from "@/lib/demoMode";
import { DEMO_RANKINGS, DEMO_DOMAIN } from "@/data/demoData";
import { setAuditPrefill } from "@/lib/auditPrefill";
import {
  mergeVisibilityRows, type CombinedVisibilityRow, type MergeAuditRow, type MergeDirectoryFirm,
} from "@/lib/mergeVisibilityRows";
import { visibilityTierFor, VISIBILITY_TIER_ORDER, VISIBILITY_TIER_META, type VisibilityTier } from "@/lib/visibilityTiers";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const DIRECTORY_MAX = 45;

const PEER_GROUP_LABEL: Record<string, string> = Object.fromEntries(PEER_GROUPS.map((p) => [p.value, p.label]));

interface FlatExportRow {
  [key: string]: unknown;
  firmName: string;
  firmDomain: string;
  peerGroup: string;
  hasFullAudit: string;
  domainVerified: string;
  visibilityPercent: number;
  measuredScore: number;
  measuredMax: number;
  categoriesMeasured: string;
  weakestCategory: string;
  needsRefresh: string;
  thinPeerGroup: string;
}

const MarketIndex = () => {
  const { market } = useParams();
  const navigate = useNavigate();

  const [rows, setRows] = useState<CombinedVisibilityRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removalOpen, setRemovalOpen] = useState(false);
  const [removalFirmName, setRemovalFirmName] = useState("");
  const [removalNote, setRemovalNote] = useState("");
  const [removalSubmitting, setRemovalSubmitting] = useState(false);
  const [removalDone, setRemovalDone] = useState(false);

  const showDemoRankings = isDemoMode() && market === "serbia";

  useEffect(() => {
    if (!market) return;
    setLoading(true);
    (async () => {
      // Demo mode: the real list is cold-start empty until real firms
      // publish, so show an illustrative (clearly fictional, clearly
      // labeled) sample instead of the real query. Demo rows are flat
      // /200 numbers with no per-category breakdown to merge — bypasses
      // mergeVisibilityRows entirely rather than feeding it data it can't
      // fairly interpret.
      if (showDemoRankings) {
        setRows(
          DEMO_RANKINGS.map((r) => ({
            firmName: r.displayName,
            firmDomain: r.domain,
            peerGroup: "regional",
            hasFullAudit: true,
            verified: r.domain === DEMO_DOMAIN,
            measuredScore: r.score,
            measuredMax: 200,
            visibilityPercent: Math.round((r.score / 200) * 100),
            measuredCategoryCount: 5,
            weakestCategoryLabel: null,
            isStale: false,
            isLowConfidence: false,
            peerGroupSampleSize: DEMO_RANKINGS.length,
          })),
        );
        setLoading(false);
        return;
      }

      try {
        const [auditResult, dirResp] = await Promise.all([
          supabase
            .from("market_visibility_audits")
            .select("audited_domain, display_name, peer_group, verified_at, performance_score, social_score, seo_authority_score, thought_leadership_score, reputation_score, provenance")
            .eq("market", market)
            .eq("is_public", true),
          fetch(`${SUPABASE_URL}/functions/v1/directory-standing-index`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
            body: JSON.stringify({ market }),
          }).then((r) => r.json()),
        ]);

        if (auditResult.error) {
          setError("Couldn't load the visibility list.");
          return;
        }
        const auditRows = (auditResult.data ?? []) as MergeAuditRow[];
        const directoryFirms = (dirResp.firms ?? []) as MergeDirectoryFirm[];
        setRows(mergeVisibilityRows(auditRows, directoryFirms, DIRECTORY_MAX));
      } catch {
        setError("Couldn't reach the visibility service.");
      } finally {
        setLoading(false);
      }
    })();
  }, [market, showDemoRankings]);

  useEffect(() => {
    const marketLabel = market ? market[0].toUpperCase() + market.slice(1) : "Market";
    setPageMeta({
      title: `${marketLabel} Visibility Index · LegalOS`,
      description: `How visible is each law firm in ${marketLabel} today — a real, externally-sourced measure combining full audited scores and legal-directory standing (Chambers, Legal 500, IFLR1000), grouped by visibility tier, not ranked head-to-head.`,
    });
  }, [market]);

  const grouped: Record<VisibilityTier, CombinedVisibilityRow[]> = {
    highly_visible: [], visible: [], emerging: [], not_yet_visible: [],
  };
  (rows ?? []).forEach((r) => {
    grouped[visibilityTierFor(r.visibilityPercent)].push(r);
  });
  const tiersWithData = VISIBILITY_TIER_ORDER.filter((t) => grouped[t].length > 0);

  const exportCsv = () => {
    if (!rows || rows.length === 0) return;
    const flat: FlatExportRow[] = rows.map((r) => ({
      firmName: r.firmName,
      firmDomain: r.firmDomain ?? "",
      peerGroup: r.peerGroup,
      hasFullAudit: r.hasFullAudit ? "Yes" : "No",
      domainVerified: r.verified ? "Yes" : "No",
      visibilityPercent: r.visibilityPercent,
      measuredScore: Math.round(r.measuredScore * 10) / 10,
      measuredMax: r.measuredMax,
      categoriesMeasured: `${r.measuredCategoryCount} of 5`,
      weakestCategory: r.weakestCategoryLabel ?? "",
      needsRefresh: r.isStale ? "Yes" : "No",
      thinPeerGroup: r.isLowConfidence ? `Yes (n=${r.peerGroupSampleSize})` : "No",
    }));
    const csv = toCsv(flat, [
      { key: "firmName", header: "Firm" },
      { key: "firmDomain", header: "Domain" },
      { key: "peerGroup", header: "Peer group" },
      { key: "hasFullAudit", header: "Ran a full audit" },
      { key: "domainVerified", header: "Domain verified" },
      { key: "visibilityPercent", header: "Visibility %" },
      { key: "measuredScore", header: "Measured score" },
      { key: "measuredMax", header: "Measured max" },
      { key: "categoriesMeasured", header: "Categories measured" },
      { key: "weakestCategory", header: "Highest-leverage next step" },
      { key: "needsRefresh", header: "Needs refresh" },
      { key: "thinPeerGroup", header: "Thin peer group" },
    ]);
    downloadCsv(`legalos-visibility-index-${market}.csv`, csv);
  };

  const claimScore = (row: CombinedVisibilityRow) => {
    setAuditPrefill({ displayName: row.firmName, auditedDomain: row.firmDomain ?? undefined, market });
    navigate("/");
  };

  const submitRemovalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removalFirmName.trim() || removalSubmitting) return;
    setRemovalSubmitting(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/directory-removal-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
        body: JSON.stringify({ market, firmName: removalFirmName.trim(), note: removalNote.trim() || undefined }),
      });
      if (resp.ok) setRemovalDone(true);
    } catch {
      // Silent — this is a low-stakes courtesy request, not core functionality.
    } finally {
      setRemovalSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="text-[10px] tracking-[0.3em] uppercase text-primary font-body">LegalOS</Link>
          <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-500 font-body flex items-center gap-1">
            <Eye className="w-3 h-3" /> Visibility, not a leaderboard
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-4xl text-foreground mb-2 leading-tight capitalize">{market} Visibility Index</h1>

        {showDemoRankings && (
          <p className="text-xs text-amber-500 font-body mb-3 flex items-center gap-1.5">
            Demo mode — this list is illustrative sample data, not real firms.
          </p>
        )}

        <p className="text-xs text-muted-foreground font-body mb-1">
          Not a ranking — every firm here is grouped by how visible it is today, not pitted against the others.
          Combines full audited scores (firms that ran one) with legal-directory standing — Chambers, Legal 500,
          IFLR1000 — for every tracked firm, whether or not they've run one.
          <span className="inline-flex items-center gap-1 ml-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> = domain ownership verified.
          </span>
        </p>
        <p className="text-xs text-muted-foreground font-body mb-6">
          Every percentage is measured-only — a firm isn't marked down for a category nobody's measured yet.
        </p>

        {!loading && !error && rows && rows.length > 0 && (
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-body mb-6"
          >
            <Download className="w-3 h-3" /> Export as CSV
          </button>
        )}

        {loading && (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        )}

        {!loading && error && <p className="text-sm text-destructive font-body">{error}</p>}

        {!loading && !error && (!rows || rows.length === 0) && (
          <div className="bg-card border border-border/50 rounded-sm p-6">
            <p className="text-sm text-foreground font-body mb-1">No data for this market yet.</p>
            <p className="text-xs text-muted-foreground font-body mb-6">
              This covers markets reviewed against Chambers and Legal 500's own published rankings, or firms that
              have run and published a full audit — this market has neither yet.
            </p>
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-gold-light font-body">
              Run your own audit <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {!loading && !error && tiersWithData.map((tier) => (
          <div key={tier} className="mb-10">
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-emerald-500 font-body">
              {VISIBILITY_TIER_META[tier].label}
            </h2>
            <p className="text-[11px] text-muted-foreground font-body mb-3">{VISIBILITY_TIER_META[tier].blurb}</p>
            <div className="bg-card border border-border/50 rounded-sm divide-y divide-border/40">
              {grouped[tier].map((r) => (
                <div key={`${r.firmDomain}-${r.firmName}`} className="flex items-center justify-between px-4 py-3 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground font-body flex items-center gap-1.5 flex-wrap">
                      {r.firmName}
                      {r.verified && <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" aria-label="Domain verified" />}
                      <span className="text-[10px] text-muted-foreground font-body">{PEER_GROUP_LABEL[r.peerGroup] ?? "Firm"}</span>
                      {r.isStale && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-body"
                          title={r.hasFullAudit ? "This audit hasn't been re-verified in over 90 days" : "This directory data hasn't been re-reviewed in over 120 days"}
                        >
                          <Clock className="w-2.5 h-2.5" /> Needs refresh
                        </span>
                      )}
                      {r.isLowConfidence && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 font-body"
                          title="Fewer than 5 firms share this peer group so far — treat the percentage as approximate"
                        >
                          <Users className="w-2.5 h-2.5" /> Thin peer group (n={r.peerGroupSampleSize})
                        </span>
                      )}
                    </p>
                    {r.hasFullAudit ? (
                      <p className="text-[10px] text-muted-foreground font-body mt-0.5">
                        {r.measuredCategoryCount} of 5 categories measured
                        {r.weakestCategoryLabel && (
                          <span className="inline-flex items-center gap-1 ml-1.5 text-primary">
                            <TrendingUp className="w-2.5 h-2.5" /> Highest-leverage next step: {r.weakestCategoryLabel}
                          </span>
                        )}
                      </p>
                    ) : (
                      <button
                        onClick={() => claimScore(r)}
                        className="text-[10px] text-primary hover:text-gold-light font-body inline-flex items-center gap-1 mt-0.5"
                      >
                        <Sparkles className="w-2.5 h-2.5" /> Only directory standing measured — claim your full picture
                      </button>
                    )}
                  </div>
                  <span className="font-display text-base text-emerald-500 font-semibold shrink-0">
                    {r.visibilityPercent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {!loading && !error && rows && rows.length > 0 && (
          <div className="mb-6">
            {!removalOpen ? (
              <button
                onClick={() => setRemovalOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground font-body inline-flex items-center gap-1.5"
              >
                <Flag className="w-3 h-3" /> Is your firm listed here without an audit, and you'd like it reviewed for removal?
              </button>
            ) : removalDone ? (
              <p className="text-xs text-emerald-500 font-body">
                Thanks — logged for manual review. This isn't instant since we verify requests before removing anything.
              </p>
            ) : (
              <form onSubmit={submitRemovalRequest} className="bg-card border border-border/50 rounded-sm p-4 space-y-2 max-w-sm">
                <p className="text-xs text-muted-foreground font-body mb-2">
                  Directory standing comes from Chambers/Legal 500's own public rankings — we're not able to remove a
                  firm from those directories, but we can review whether it should appear in this list.
                </p>
                <input
                  value={removalFirmName}
                  onChange={(e) => setRemovalFirmName(e.target.value)}
                  placeholder="Your firm's name"
                  className="w-full bg-secondary/80 border border-border text-foreground placeholder:text-muted-foreground text-sm font-body px-3 py-2 rounded-sm focus:outline-none focus:border-primary"
                />
                <textarea
                  value={removalNote}
                  onChange={(e) => setRemovalNote(e.target.value)}
                  placeholder="Optional note"
                  rows={2}
                  className="w-full bg-secondary/80 border border-border text-foreground placeholder:text-muted-foreground text-sm font-body px-3 py-2 rounded-sm focus:outline-none focus:border-primary resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!removalFirmName.trim() || removalSubmitting}
                    className="px-3 py-1.5 rounded-sm text-xs font-body bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
                  >
                    {removalSubmitting ? "Sending…" : "Send request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemovalOpen(false)}
                    className="px-3 py-1.5 rounded-sm text-xs font-body border border-border/50 text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-body mt-4 mb-6">
          {showDemoRankings ? "Sample data — for demo purposes, not real firms" : "Live list · updates as firms publish · directory data reviewed quarterly"}
        </p>

        <footer className="pt-6 border-t border-border/40 flex items-center justify-end">
          <Link to="/" className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1">
            Run your own <ArrowRight className="w-3 h-3" />
          </Link>
        </footer>
        <p className="mt-6 text-[10px] text-muted-foreground font-body text-center">
          © {new Date().getFullYear()} LegalOS. Audited scores are self-published by each firm and peer-normalized
          within market and peer group; directory standing is aggregated from Chambers Europe and Legal 500's own
          published rankings.
        </p>
      </main>
    </div>
  );
};

export default MarketIndex;
