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
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, ArrowRight, Eye, Download, ShieldCheck, Flag, Sparkles, TrendingUp, Clock, Users,
  Search, Share2, Linkedin, Twitter, ChevronDown, FlaskConical, Check,
} from "lucide-react";
import { toCsv, downloadCsv } from "@/lib/csv";
import { setPageMeta } from "@/lib/pageMeta";
import { isDemoMode, exitDemoInPlace } from "@/lib/demoMode";
import { MARKETING_HOME } from "@/lib/marketingSite";
import { CATEGORY_META, CATEGORY_COLOR_CLASSES, categoryScoreLabel500 } from "@/lib/visibilityCategories";
import { DEMO_RANKINGS, DEMO_DOMAIN } from "@/data/demoData";
import { setAuditPrefill } from "@/lib/auditPrefill";
import {
  mergeVisibilityRows, type CombinedVisibilityRow, type MergeAuditRow, type MergeDirectoryFirm,
} from "@/lib/mergeVisibilityRows";
import { visibilityTierFor, VISIBILITY_TIER_ORDER, VISIBILITY_TIER_META, type VisibilityTier } from "@/lib/visibilityTiers";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const DIRECTORY_MAX = 45;

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
  const [query, setQuery] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyFailedKey, setCopyFailedKey] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  // ?live=1 forces the real list even in a demo-flagged browser — the
  // marketing site's index CTAs promise the real rankings, so those links
  // must never land on sample rows.
  const showDemoRankings = isDemoMode() && market === "serbia" && searchParams.get("live") !== "1";

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
            .select("audited_domain, display_name, peer_group, verified_at, performance_score, social_score, seo_authority_score, thought_leadership_score, reputation_score, provenance, raw_metrics")
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
      title: `${marketLabel} Visibility Index · Uvid`,
      description: `How visible is each law firm in ${marketLabel} today — a real, externally-sourced measure combining full audited scores and legal-directory standing (Chambers, Legal 500, IFLR1000), grouped by visibility tier, not ranked head-to-head.`,
    });
  }, [market]);

  const marketLabelText = market ? market[0].toUpperCase() + market.slice(1) : "Market";
  const rowKey = (r: CombinedVisibilityRow) => `${r.firmDomain}-${r.firmName}`;

  // Peer groups stay internal (scoring + CSV export only) — the public list
  // deliberately doesn't classify firms by type.
  const filtered = (rows ?? []).filter((r) => {
    const q = query.trim().toLowerCase();
    if (q && !r.firmName.toLowerCase().includes(q) && !(r.firmDomain ?? "").toLowerCase().includes(q)) return false;
    return true;
  });

  const grouped: Record<VisibilityTier, CombinedVisibilityRow[]> = {
    highly_visible: [], visible: [], emerging: [], not_yet_visible: [],
  };
  filtered.forEach((r) => {
    grouped[visibilityTierFor(r.visibilityPercent)].push(r);
  });
  // Nearest-rivals window: the index is deliberately not a ranking, but a
  // firm looking at itself wants to know who sits just above and below it on
  // measured visibility — a sliding ±5 window over the full score ordering.
  const byVisibility = [...(rows ?? [])].sort((a, b) => b.visibilityPercent - a.visibilityPercent);
  const rivalsFor = (row: CombinedVisibilityRow) => {
    const i = byVisibility.findIndex((x) => rowKey(x) === rowKey(row));
    return {
      above: i === -1 ? [] : byVisibility.slice(Math.max(0, i - 5), i),
      below: i === -1 ? [] : byVisibility.slice(i + 1, i + 6),
    };
  };

  const tiersWithData = VISIBILITY_TIER_ORDER.filter((t) => grouped[t].length > 0);

  // Sharing points at the live index itself — a firm's row is a claim about
  // the whole list, so the link lands on the list, not a per-firm URL that
  // doesn't exist.
  const indexShareUrl = `${window.location.origin}${import.meta.env.BASE_URL}visibility-index/${market}`;
  const shareTextFor = (r: CombinedVisibilityRow) =>
    `${r.firmName} — ${r.visibilityPercent}% measured visibility on the Uvid ${marketLabelText} Visibility Index (${
      r.hasFullAudit ? `${r.measuredCategoryCount} of 5 categories measured` : "legal-directory standing measured"
    }).`;
  const shareToLinkedIn = () =>
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(indexShareUrl)}`,
      "_blank",
      "noopener,noreferrer",
    );
  const shareToX = (r: CombinedVisibilityRow) =>
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(`${shareTextFor(r)} ${indexShareUrl}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  const copyShareLine = async (r: CombinedVisibilityRow) => {
    const key = rowKey(r);
    try {
      await navigator.clipboard.writeText(`${shareTextFor(r)}\n${indexShareUrl}`);
      setCopyFailedKey(null);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 2000);
    } catch {
      // Clipboard can be unavailable (permissions, non-secure context,
      // embedded browsers) — never fail silently: surface a selectable
      // field with the exact share text so the action stays completable.
      setCopiedKey(null);
      setCopyFailedKey(key);
    }
  };

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
    downloadCsv(`uvid-visibility-index-${market}.csv`, csv);
  };

  const claimScore = (row: CombinedVisibilityRow) => {
    setAuditPrefill({ displayName: row.firmName, auditedDomain: row.firmDomain ?? undefined, market });
    // #signin opens the auth form directly (SignInGate honors the hash) — a
    // visitor claiming their firm from the public index shouldn't land on a
    // second teaser hero first.
    navigate("/#signin");
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
          <a
            href={MARKETING_HOME}
            aria-label="Back to the Uvid website"
            className="eyebrow text-[10px] text-primary"
          >
            Uvid
          </a>
          <span className="eyebrow text-[10px] text-emerald-500 flex items-center gap-1">
            <Eye className="w-3 h-3" /> Visibility, not a leaderboard
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-4xl text-foreground mb-2 leading-tight capitalize">{market} Visibility Index</h1>

        {showDemoRankings && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-sm border border-amber-500/40 bg-amber-500/10 px-4 py-3">
            <p className="text-xs text-amber-500 font-body flex items-start gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 mt-px shrink-0" />
              <span>
                Demo mode — this list is illustrative sample data, not real firms. The live {marketLabelText} index
                is already published; you're seeing the sample because demo mode is switched on in this browser.
              </span>
            </p>
            <button
              onClick={exitDemoInPlace}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-body text-amber-500 hover:text-amber-400 border border-amber-500/40 hover:border-amber-500/70 rounded-sm px-2.5 py-1.5 transition-colors"
            >
              Exit demo — show the real list
            </button>
          </div>
        )}

        <p className="text-xs text-muted-foreground font-body mb-1">
          Not a ranking — every firm here is grouped by how visible it is today, not pitted against the others.
          Nearly every firm has a full measured audit behind its percentage; the few without an auditable
          website show their Chambers, Legal 500 and IFLR1000 standing — which also feeds the Reputation category.
          <span className="inline-flex items-center gap-1 ml-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> = domain ownership verified.
          </span>
        </p>
        <p className="text-xs text-muted-foreground font-body mb-6">
          Every percentage is measured-only — a firm isn't marked down for a category nobody's measured yet.
        </p>

        {!loading && !error && rows && rows.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a firm by name or domain…"
                aria-label="Find a firm by name or domain"
                className="w-full bg-card border border-border/50 rounded-sm pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-body focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground font-body">
                {filtered.length === rows.length
                  ? `${rows.length} firms — expand any row for the breakdown and share links.`
                  : `${filtered.length} of ${rows.length} firms match.`}
              </p>
              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-body"
              >
                <Download className="w-3 h-3" /> Export as CSV
              </button>
            </div>
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground font-body">
                No firms match "{query.trim()}".
              </p>
            )}
          </div>
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
            <h2 className="eyebrow text-[10px] text-emerald-500">
              {VISIBILITY_TIER_META[tier].label}
            </h2>
            <p className="text-[11px] text-muted-foreground font-body mb-3">{VISIBILITY_TIER_META[tier].blurb}</p>
            <div className="bg-card border border-border/50 rounded-sm divide-y divide-border/40">
              {grouped[tier].map((r) => {
                const key = rowKey(r);
                const expanded = expandedKey === key;
                // Demo rows are flat /200 numbers with no per-category truth
                // behind them — rendering a fabricated breakdown would
                // contradict the sample-data label, so they don't expand.
                const expandable = !!r.categoryBreakdown || !r.hasFullAudit;
                const rivals = rivalsFor(r);
                return (
                  <div key={key} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground font-body flex items-center gap-1.5 flex-wrap">
                          {r.firmName}
                          {r.verified && <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" aria-label="Domain verified" />}
                          {r.isStale && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-body"
                              title={r.hasFullAudit ? "This audit hasn't been re-verified in over 90 days, or the Chambers/Legal 500/IFLR1000 data behind its Reputation score hasn't been re-reviewed in over 120 days" : "This directory data hasn't been re-reviewed in over 120 days"}
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
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-display text-base text-emerald-500 font-semibold">
                          {r.visibilityPercent}%
                        </span>
                        {expandable && (
                          <button
                            onClick={() => setExpandedKey(expanded ? null : key)}
                            aria-expanded={expanded}
                            aria-label={`${expanded ? "Hide" : "Show"} details for ${r.firmName}`}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                          </button>
                        )}
                      </div>
                    </div>

                    {expanded && (
                      <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
                        {r.categoryBreakdown ? (
                          <div className="space-y-1.5">
                            {r.categoryBreakdown.map((c) => {
                              const colorClasses = CATEGORY_COLOR_CLASSES[CATEGORY_META[c.key].color];
                              const pct = c.measured && c.max > 0 ? Math.min(100, (c.score / c.max) * 100) : 0;
                              return (
                                <div key={c.key} className="flex items-center gap-2">
                                  <span className="w-32 shrink-0 text-[10px] text-muted-foreground font-body truncate">{c.label}</span>
                                  <div className="flex-1 h-1.5 bg-secondary/60 rounded-sm overflow-hidden">
                                    <div
                                      className={`h-full ${colorClasses.bg}`}
                                      style={{ width: `${pct}%` }}
                                      role="img"
                                      aria-label={c.measured ? `${c.label}: ${categoryScoreLabel500(c.score, c.key)}` : `${c.label}: not measured`}
                                    />
                                  </div>
                                  <span className="w-20 shrink-0 text-right text-[10px] font-body text-muted-foreground">
                                    {c.measured ? categoryScoreLabel500(c.score, c.key) : "Not measured"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground font-body">
                            Only legal-directory standing is measured for this firm — {Math.round(r.measuredScore * 2.5)} of {Math.round(r.measuredMax * 2.5)} directory points from Chambers, Legal 500, and IFLR1000's published rankings. A full audit measures the other four categories.
                          </p>
                        )}

                        {(rivals.above.length > 0 || rivals.below.length > 0) && (
                          <div>
                            <p className="eyebrow text-[9px] text-muted-foreground/70 mb-1.5">
                              Closest firms by measured visibility
                            </p>
                            <div className="space-y-1">
                              {rivals.above.map((n) => {
                                const gap = n.visibilityPercent - r.visibilityPercent;
                                return (
                                  <p key={rowKey(n)} className="flex items-baseline justify-between gap-3 text-[11px] font-body">
                                    <span className="text-muted-foreground truncate">{n.firmName}</span>
                                    <span className="shrink-0 tabular-nums text-muted-foreground">
                                      {n.visibilityPercent}% <span className="text-amber-500/80">{gap > 0 ? `+${gap} ahead` : "level"}</span>
                                    </span>
                                  </p>
                                );
                              })}
                              <p className="flex items-baseline justify-between gap-3 text-[11px] font-body">
                                <span className="text-foreground font-medium truncate">{r.firmName}</span>
                                <span className="shrink-0 tabular-nums text-emerald-500 font-semibold">{r.visibilityPercent}%</span>
                              </p>
                              {rivals.below.map((n) => {
                                const gap = r.visibilityPercent - n.visibilityPercent;
                                return (
                                  <p key={rowKey(n)} className="flex items-baseline justify-between gap-3 text-[11px] font-body">
                                    <span className="text-muted-foreground truncate">{n.firmName}</span>
                                    <span className="shrink-0 tabular-nums text-muted-foreground">
                                      {n.visibilityPercent}% <span className="text-emerald-600/80">{gap > 0 ? `−${gap} behind` : "level"}</span>
                                    </span>
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Share2 className="w-3 h-3 text-muted-foreground" />
                            <button
                              onClick={shareToLinkedIn}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border/50 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Linkedin className="w-3 h-3" /> LinkedIn
                            </button>
                            <button
                              onClick={() => shareToX(r)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border/50 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Twitter className="w-3 h-3" /> X
                            </button>
                            <button
                              onClick={() => copyShareLine(r)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-border/50 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {copiedKey === key ? <Check className="w-3 h-3 text-emerald-500" /> : null}
                              {copiedKey === key ? "Copied" : "Copy line + link"}
                            </button>
                          </div>
                          <button
                            onClick={() => claimScore(r)}
                            className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-gold-light font-body"
                          >
                            <Sparkles className="w-3 h-3" />
                            {r.hasFullAudit ? "Is this your firm? Run a fresh audit" : "Claim your full picture"}
                          </button>
                        </div>

                        {copyFailedKey === key && (
                          <div aria-live="polite">
                            <p className="text-[10px] text-amber-500 font-body mb-1">
                              Automatic copy isn't available in this browser — select and copy the text below.
                            </p>
                            <input
                              readOnly
                              value={`${shareTextFor(r)} ${indexShareUrl}`}
                              onFocus={(e) => e.currentTarget.select()}
                              aria-label={`Share text for ${r.firmName} — copy manually`}
                              className="w-full bg-secondary/80 border border-border text-foreground text-[11px] font-body px-2 py-1.5 rounded-sm focus:outline-none focus:border-primary"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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

        <p className="eyebrow text-[10px] text-muted-foreground mt-4 mb-6">
          {showDemoRankings ? "Sample data — for demo purposes, not real firms" : "Live list · updates as firms publish · directory data reviewed quarterly"}
        </p>

        <footer className="pt-6 border-t border-border/40 flex items-center justify-end">
          <Link to="/" className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1">
            Run your own <ArrowRight className="w-3 h-3" />
          </Link>
        </footer>
        <p className="mt-6 text-[10px] text-muted-foreground font-body text-center">
          © {new Date().getFullYear()} Uvid. Audited scores are self-published by each firm and peer-normalized
          within market and peer group; directory standing is aggregated from Chambers Europe and Legal 500's own
          published rankings.
        </p>
      </main>
    </div>
  );
};

export default MarketIndex;
