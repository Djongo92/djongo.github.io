// Merged Visibility Index (full 200-pt audited score) + Recognition Index
// (directory-only /45, no audit required) into one page with a toggle,
// reachable at either of its two original URLs — reported as confusing
// when they were two separate top-level pages/nav entries with similar-
// sounding brand names and no visible relationship to each other. Same
// data, same two fetch paths, same every other capability (CSV export,
// claim-your-score, removal request, cross-links) — just presented as one
// destination with two views instead of two destinations.
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, ArrowRight, Eye, Download, ShieldCheck, Gauge, TrendingUp,
  FlaskConical, Landmark, Flag, Sparkles,
} from "lucide-react";
import { PEER_GROUPS, FIRM_TYPE_TO_PEER_GROUP } from "@/lib/marketVisibilityConfig";
import { toCsv, downloadCsv } from "@/lib/csv";
import { setPageMeta } from "@/lib/pageMeta";
import { isDemoMode } from "@/lib/demoMode";
import { DEMO_RANKINGS, DEMO_DOMAIN } from "@/data/demoData";
import { computeMeasuredTotals } from "@/lib/measuredScore";
import type { CategoryKey } from "@/lib/visibilityCategories";
import { setAuditPrefill } from "@/lib/auditPrefill";
import { SegmentedControl } from "@/components/ui/segmented-control";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type View = "full" | "directory";

const EMPTY_STEPS = [
  { n: 1, label: "Run a full Market Visibility audit of your firm", icon: Gauge },
  { n: 2, label: "Get a real score across five categories, benchmarked to peers", icon: TrendingUp },
  { n: 3, label: "Publish it — your firm appears here, ranked", icon: Eye },
] as const;

export interface AuditRow {
  [key: string]: unknown;
  audited_domain: string;
  display_name: string | null;
  peer_group: string;
  total_score: number;
  published_at: string | null;
  verified_at: string | null;
  // Present on real rows only — demo rows are illustrative flat numbers with
  // no per-category breakdown to compute a measured-only percentage from.
  performance_score?: number;
  social_score?: number;
  seo_authority_score?: number;
  thought_leadership_score?: number;
  reputation_score?: number;
  provenance?: Record<string, string>;
}

interface FirmStanding {
  firmName: string;
  firmDomain: string | null;
  firmType: string | null;
  chambers: { points: number; count: number; avgRank: number | null };
  legal500: { points: number; count: number; avgRank: number | null };
  iflr1000: { points: number; count: number; avgRank: number | null };
  directoryPoints: number;
  hasPublishedAudit: boolean;
}

interface FlatFirmRow {
  [key: string]: unknown;
  firmName: string;
  firmDomain: string;
  firmType: string;
  chambersPoints: number;
  legal500Points: number;
  iflr1000Points?: number;
  directoryPoints: number;
}

/**
 * Percentage headline for a full-score row: real rows use the same
 * measured-categories-only denominator the private dashboard already
 * applies (a firm with SEO & Authority not yet configured shouldn't read as
 * artificially low just because that category is an unmeasured 0, not an
 * earned one) — demo rows fall back to a flat /200 since there's no
 * per-category provenance to fabricate for illustrative fictional firms.
 */
export function measuredPercentage(row: AuditRow): number {
  if (row.provenance === undefined) return Math.round((row.total_score / 200) * 100);
  const categories: Record<CategoryKey, { score: number; provenance: string }> = {
    performance: { score: row.performance_score ?? 0, provenance: row.provenance?.performance ?? "missing" },
    social: { score: row.social_score ?? 0, provenance: row.provenance?.social ?? "missing" },
    seoAuthority: { score: row.seo_authority_score ?? 0, provenance: row.provenance?.seoAuthority ?? "missing" },
    thoughtLeadership: { score: row.thought_leadership_score ?? 0, provenance: row.provenance?.thoughtLeadership ?? "missing" },
    reputation: { score: row.reputation_score ?? 0, provenance: row.provenance?.reputation ?? "missing" },
  };
  const measured = computeMeasuredTotals(categories);
  return measured.measuredMax > 0 ? Math.round((measured.score / measured.measuredMax) * 100) : 0;
}

const PEER_GROUP_LABEL: Record<string, string> = Object.fromEntries(PEER_GROUPS.map((p) => [p.value, p.label]));
const PEER_GROUP_ORDER = PEER_GROUPS.map((p) => p.value);

const MarketIndex = () => {
  const { market } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Whichever of the two original URLs got you here sets which view opens
  // first — both are still live routes (see App.tsx), just rendering this
  // one component now instead of two separate pages.
  const [view, setView] = useState<View>(location.pathname.startsWith("/recognition-index") ? "directory" : "full");
  const showDemoRankings = isDemoMode() && market === "serbia";

  // Full-score view state
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [fullLoading, setFullLoading] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [fullError, setFullError] = useState<string | null>(null);

  // Directory-only view state
  const [firms, setFirms] = useState<FirmStanding[] | null>(null);
  const [max, setMax] = useState(45);
  const [dirLoading, setDirLoading] = useState(false);
  const [dirLoaded, setDirLoaded] = useState(false);
  const [dirError, setDirError] = useState<string | null>(null);
  const [removalOpen, setRemovalOpen] = useState(false);
  const [removalFirmName, setRemovalFirmName] = useState("");
  const [removalNote, setRemovalNote] = useState("");
  const [removalSubmitting, setRemovalSubmitting] = useState(false);
  const [removalDone, setRemovalDone] = useState(false);

  // Fetch each view's data lazily, once, the first time it's actually
  // opened — switching tabs after that is instant, no refetch.
  useEffect(() => {
    if (!market || view !== "full" || fullLoaded) return;
    setFullLoading(true);
    (async () => {
      if (showDemoRankings) {
        setRows(
          DEMO_RANKINGS.map((r) => ({
            audited_domain: r.domain,
            display_name: r.displayName,
            peer_group: "regional",
            total_score: r.score,
            published_at: new Date().toISOString(),
            verified_at: r.domain === DEMO_DOMAIN ? new Date().toISOString() : null,
          })),
        );
        setFullLoaded(true);
        setFullLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("market_visibility_audits")
        .select("audited_domain, display_name, peer_group, total_score, published_at, verified_at, performance_score, social_score, seo_authority_score, thought_leadership_score, reputation_score, provenance")
        .eq("market", market)
        .eq("is_public", true)
        .order("total_score", { ascending: false });

      if (error) setFullError("Couldn't load the index.");
      else setRows((data ?? []) as AuditRow[]);
      setFullLoaded(true);
      setFullLoading(false);
    })();
  }, [market, view, fullLoaded, showDemoRankings]);

  useEffect(() => {
    if (!market || view !== "directory" || dirLoaded) return;
    setDirLoading(true);
    (async () => {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/directory-standing-index`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
          body: JSON.stringify({ market }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          setDirError(data.error || "Couldn't load the directory standing.");
          return;
        }
        setFirms(data.firms);
        setMax(data.max);
      } catch {
        setDirError("Couldn't reach the directory standing service.");
      } finally {
        setDirLoaded(true);
        setDirLoading(false);
      }
    })();
  }, [market, view, dirLoaded]);

  useEffect(() => {
    const marketLabel = market ? market[0].toUpperCase() + market.slice(1) : "Market";
    setPageMeta({
      title: `${marketLabel} Rankings · LegalOS`,
      description: `Law firm rankings for ${marketLabel} — the full, externally-verified, peer-normalized Market Visibility Score for firms that have run and published an audit, plus legal-directory standing (Chambers, Legal 500, IFLR1000) for every tracked firm whether or not they've run one.`,
    });
  }, [market]);

  const grouped: Record<string, AuditRow[]> = {};
  (rows ?? []).forEach((r) => {
    (grouped[r.peer_group] ??= []).push(r);
  });
  const peerGroupsWithData = PEER_GROUP_ORDER.filter((pg) => grouped[pg]?.length > 0);

  const dirGrouped: Record<string, FirmStanding[]> = {};
  (firms ?? []).forEach((f) => {
    const pg = f.firmType ? FIRM_TYPE_TO_PEER_GROUP[f.firmType] ?? "other" : "other";
    (dirGrouped[pg] ??= []).push(f);
  });
  const dirGroupOrder = [...PEER_GROUP_ORDER, "other"];
  const dirGroupsWithData = dirGroupOrder.filter((pg) => dirGrouped[pg]?.length > 0);
  const hasIflr1000Data = (firms ?? []).some((f) => f.iflr1000.count > 0);

  const exportFullCsv = () => {
    if (!rows || rows.length === 0) return;
    const csv = toCsv(
      [...rows].sort((a, b) => b.total_score - a.total_score),
      [
        { key: "display_name", header: "Firm" },
        { key: "audited_domain", header: "Domain" },
        { key: "peer_group", header: "Peer group" },
        { key: "total_score", header: "Total score (/200)" },
        { key: "published_at", header: "Published at" },
      ],
    );
    downloadCsv(`legalos-visibility-index-${market}.csv`, csv);
  };

  const exportDirCsv = () => {
    if (!firms || firms.length === 0) return;
    const flat: FlatFirmRow[] = firms.map((f) => ({
      firmName: f.firmName,
      firmDomain: f.firmDomain ?? "",
      firmType: f.firmType ?? "",
      chambersPoints: Math.round(f.chambers.points * 10) / 10,
      legal500Points: Math.round(f.legal500.points * 10) / 10,
      ...(hasIflr1000Data ? { iflr1000Points: Math.round(f.iflr1000.points * 10) / 10 } : {}),
      directoryPoints: Math.round(f.directoryPoints * 10) / 10,
    }));
    const columns: { key: keyof FlatFirmRow; header: string }[] = [
      { key: "firmName", header: "Firm" },
      { key: "firmDomain", header: "Domain" },
      { key: "firmType", header: "Type" },
      { key: "chambersPoints", header: "Chambers points" },
      { key: "legal500Points", header: "Legal 500 points" },
      ...(hasIflr1000Data ? [{ key: "iflr1000Points" as const, header: "IFLR1000 points" }] : []),
      { key: "directoryPoints", header: `Directory points (/${max})` },
    ];
    const csv = toCsv(flat, columns);
    downloadCsv(`legalos-recognition-index-${market}.csv`, csv);
  };

  const claimScore = (firm: FirmStanding) => {
    setAuditPrefill({ displayName: firm.firmName, auditedDomain: firm.firmDomain ?? undefined, market });
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

  const isFull = view === "full";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="text-[10px] tracking-[0.3em] uppercase text-primary font-body">LegalOS</Link>
          <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-500 font-body flex items-center gap-1">
            {isFull ? <><Eye className="w-3 h-3" /> Audited &amp; published</> : <><Landmark className="w-3 h-3" /> No audit required</>}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-4xl text-foreground mb-2 leading-tight capitalize">{market} Rankings</h1>

        {/* Always-visible, view-agnostic explainer of why there are two
            tabs at all — the confusion this merge exists to fix wasn't the
            two data sets, it was two unexplained separate destinations. */}
        <p className="text-xs text-muted-foreground font-body mb-4">
          Two ways to see where firms stand in {market}: the full audited score for firms that ran one, or bare
          legal-directory standing — Chambers, Legal 500, IFLR1000 — for every tracked firm whether or not they have.
        </p>

        <SegmentedControl<View>
          ariaLabel="Ranking view"
          value={view}
          onChange={setView}
          options={[
            { value: "full", label: "Full Score · /200" },
            { value: "directory", label: "Directory Only · /45" },
          ]}
          className="mb-6"
        />

        {isFull ? (
          <>
            {showDemoRankings && (
              <p className="text-xs text-amber-500 font-body mb-3 flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" /> Demo mode — this leaderboard is illustrative sample data, not real firms.
              </p>
            )}
            <p className="text-xs text-muted-foreground font-body mb-1">
              Externally-sourced, peer-group-normalized Market Visibility Scores — firms that opted to run a full
              audit and publish it.
              <span className="inline-flex items-center gap-1 ml-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> = domain ownership verified.
              </span>
            </p>
            <p className="text-xs text-muted-foreground font-body mb-6">
              This is a firm's complete 200-point score across all five categories.
            </p>

            {!fullLoading && !fullError && peerGroupsWithData.length > 0 && (
              <button
                onClick={exportFullCsv}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-body mb-6"
              >
                <Download className="w-3 h-3" /> Export as CSV
              </button>
            )}

            {fullLoading && (
              <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            )}

            {!fullLoading && fullError && <p className="text-sm text-destructive font-body">{fullError}</p>}

            {!fullLoading && !fullError && peerGroupsWithData.length === 0 && (
              <div className="bg-card border border-border/50 rounded-sm p-6">
                <p className="text-sm text-foreground font-body mb-1">No published audits in this market yet.</p>
                <p className="text-xs text-muted-foreground font-body mb-6">Be the first firm to appear here.</p>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  {EMPTY_STEPS.map(({ n, label, icon: StepIcon }) => (
                    <div key={n} className="flex-1 flex items-start gap-3">
                      <div className="shrink-0 w-7 h-7 rounded-full border border-primary/40 flex items-center justify-center text-xs font-body text-primary">
                        {n}
                      </div>
                      <div className="min-w-0">
                        <StepIcon className="w-3.5 h-3.5 text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground font-body leading-snug">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-gold-light font-body">
                  Run your own audit <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {!fullLoading && !fullError && peerGroupsWithData.map((pg) => (
              <div key={pg} className="mb-10">
                <h2 className="text-[10px] tracking-[0.3em] uppercase text-emerald-500 font-body mb-3">{PEER_GROUP_LABEL[pg] ?? pg}</h2>
                <div className="bg-card border border-border/50 rounded-sm divide-y divide-border/40">
                  {grouped[pg].map((r, i) => (
                    <div key={r.audited_domain} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-display text-lg text-muted-foreground w-6 text-right">{i + 1}</span>
                        <div>
                          <p className="text-sm text-foreground font-body flex items-center gap-1.5">
                            {r.display_name || r.audited_domain}
                            {r.verified_at && (
                              <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" aria-label="Domain verified" />
                            )}
                          </p>
                          {r.display_name && <p className="text-[10px] text-muted-foreground font-body">{r.audited_domain}</p>}
                        </div>
                      </div>
                      <span className="text-right">
                        <span className="font-display text-base text-emerald-500 font-semibold block">{measuredPercentage(r)}%</span>
                        <span className="text-[10px] text-muted-foreground font-body">{Math.round(r.total_score)}/200</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-body mt-4 mb-6">
              {showDemoRankings ? (
                <span className="inline-flex items-center gap-1"><FlaskConical className="w-3 h-3" /> Sample data — for demo purposes, not real firms</span>
              ) : (
                "Live index · updates as firms publish"
              )}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground font-body mb-2">
              Chambers Europe 2026 and Legal 500 EMEA 2026 rankings, aggregated and peer-normalized — every firm
              tracked in either directory, computed directly from published rankings. No audit required to appear here.
            </p>
            <p className={`text-xs text-muted-foreground font-body ${!dirLoading && !hasIflr1000Data ? "mb-2" : "mb-6"}`}>
              This covers directory breadth and depth only (max {max} pts) — it excludes Google Business Profile and
              the Performance/Social/Thought Leadership categories, which need a firm to run its own audit.
            </p>
            {!dirLoading && !hasIflr1000Data && (
              <p className="text-xs text-muted-foreground font-body mb-6">
                IFLR1000 rankings haven't been collected for this market yet — omitted below rather than shown as a zero.
              </p>
            )}

            {dirLoading && (
              <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            )}

            {!dirLoading && dirError && <p className="text-sm text-destructive font-body">{dirError}</p>}

            {!dirLoading && !dirError && dirGroupsWithData.length === 0 && (
              <div className="bg-card border border-border/50 rounded-sm p-6">
                <p className="text-sm text-foreground font-body mb-1">No directory data for this market yet.</p>
                <p className="text-xs text-muted-foreground font-body">
                  This view only covers markets we've reviewed against Chambers and Legal 500's own published
                  rankings — this one isn't seeded yet, and there's no user action that changes that.
                </p>
              </div>
            )}

            {!dirLoading && !dirError && dirGroupsWithData.length > 0 && (
              <button
                onClick={exportDirCsv}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-body mb-8"
              >
                <Download className="w-3 h-3" /> Export as CSV
              </button>
            )}

            {!dirLoading && !dirError && dirGroupsWithData.map((pg) => (
              <div key={pg} className="mb-10">
                <h2 className="text-[10px] tracking-[0.3em] uppercase text-emerald-500 font-body mb-3">
                  {PEER_GROUP_LABEL[pg] ?? "Other"}
                </h2>
                <div className="bg-card border border-border/50 rounded-sm divide-y divide-border/40">
                  {dirGrouped[pg].map((f, i) => (
                    <div key={f.firmName} className="flex items-center justify-between px-4 py-3 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-display text-lg text-muted-foreground w-6 text-right shrink-0">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm text-foreground font-body truncate">{f.firmName}</p>
                          <p className="text-[10px] text-muted-foreground font-body">
                            Chambers {Math.round(f.chambers.points * 10) / 10} · Legal 500 {Math.round(f.legal500.points * 10) / 10}
                            {hasIflr1000Data && <> · IFLR1000 {Math.round(f.iflr1000.points * 10) / 10}</>}
                          </p>
                          {f.hasPublishedAudit ? (
                            <button
                              onClick={() => setView("full")}
                              className="text-[10px] text-emerald-500 hover:text-emerald-400 font-body inline-flex items-center gap-1 mt-0.5"
                            >
                              <ShieldCheck className="w-2.5 h-2.5" /> Full score published — view it
                            </button>
                          ) : (
                            <button
                              onClick={() => claimScore(f)}
                              className="text-[10px] text-primary hover:text-gold-light font-body inline-flex items-center gap-1 mt-0.5"
                            >
                              <Sparkles className="w-2.5 h-2.5" /> Claim your full score
                            </button>
                          )}
                        </div>
                      </div>
                      <span className="font-display text-base text-emerald-500 font-semibold shrink-0">
                        {Math.round(f.directoryPoints)} <span className="text-xs text-muted-foreground">/{max}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {!dirLoading && !dirError && dirGroupsWithData.length > 0 && (
              <div className="mb-6">
                {!removalOpen ? (
                  <button
                    onClick={() => setRemovalOpen(true)}
                    className="text-xs text-muted-foreground hover:text-foreground font-body inline-flex items-center gap-1.5"
                  >
                    <Flag className="w-3 h-3" /> Is this your firm, and you'd like it reviewed for removal?
                  </button>
                ) : removalDone ? (
                  <p className="text-xs text-emerald-500 font-body">
                    Thanks — logged for manual review. This isn't instant since we verify requests before removing anything.
                  </p>
                ) : (
                  <form onSubmit={submitRemovalRequest} className="bg-card border border-border/50 rounded-sm p-4 space-y-2 max-w-sm">
                    <p className="text-xs text-muted-foreground font-body mb-2">
                      This data comes from Chambers/Legal 500's own public rankings — we're not able to remove a firm
                      from those directories, but we can review whether it should appear in this index.
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
              Directory data reviewed quarterly
            </p>
          </>
        )}

        <footer className="pt-6 border-t border-border/40 flex items-center justify-end">
          <Link to="/" className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1">
            Run your own <ArrowRight className="w-3 h-3" />
          </Link>
        </footer>
        <p className="mt-6 text-[10px] text-muted-foreground font-body text-center">
          © {new Date().getFullYear()} LegalOS. {isFull
            ? "Scores are self-published by each firm and peer-normalized within market and peer group."
            : "Methodology: Chambers Europe and Legal 500 rankings, aggregated and peer-normalized as described above."}
        </p>
      </main>
    </div>
  );
};

export default MarketIndex;
