import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, ShieldCheck, Trophy } from "lucide-react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { DMV_MARKETS } from "@/lib/marketVisibilityConfig";
import { setAuditPrefill } from "@/lib/auditPrefill";
import { computePeerRank, type DirectoryFirmEntry, type PeerRank } from "@/lib/peerRank";
import { computeMeasuredTotals, toScale500 } from "@/lib/measuredScore";
import { categoryScoreLabel500 } from "@/lib/visibilityCategories";
import { CATEGORY_MAX, REPUTATION_WEIGHTS } from "../../supabase/functions/_shared/methodology";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function readTeaserResponse(resp: Response): Promise<Record<string, unknown>> {
  const text = await resp.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (!resp.ok) {
      return { error: `The scoring service returned ${resp.status} ${resp.statusText || "without details"}. Please try again.` };
    }
    throw new Error("The scoring service returned an unreadable response. Please try again.");
  }
}

interface TeaserResult {
  url: string;
  performance: { score: number; provenance: string };
  reputation: { score: number; provenance: string; directory: string; matchedFirmName?: string };
  teaserTotal: number;
  teaserMax: number;
}

/**
 * Reuses the public, already-real directory-standing-index (same data that
 * powers the Recognition Index leaderboard) purely client-side to find where
 * a matched firm sits within its own peer group — no new backend endpoint,
 * no write, just a second read of data that's already public.
 */
async function fetchPeerRank(market: string, matchedFirmName: string): Promise<PeerRank | null> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/directory-standing-index`, {
      method: "POST",
      headers: edgeHeaders(),
      body: JSON.stringify({ market }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const firms = (data.firms ?? []) as DirectoryFirmEntry[];
    return computePeerRank(firms, matchedFirmName);
  } catch {
    return null;
  }
}

interface LiveScoreTeaserProps {
  /** Hero: bigger type, built to be the first thing a visitor sees. Compact: for reuse on a dedicated page. */
  variant?: "hero" | "compact";
  /** Called with the real firm name (if directory-matched) so the caller can
   * personalize whatever comes next instead of falling back to generic copy. */
  onGetFullScore?: (matchedFirmName?: string) => void;
}

/**
 * The real interaction behind the free public teaser (Performance + GBP,
 * two of the five Market Visibility Score categories) — real PageSpeed +
 * directory data, no password, IP-rate-limited server-side. Shared between
 * the SignInGate hero and the standalone /teaser page so there's one
 * implementation of "type a domain, watch a real score compute."
 */
const LiveScoreTeaser = ({ variant = "compact", onGetFullScore }: LiveScoreTeaserProps) => {
  const [searchParams] = useSearchParams();
  const [url, setUrl] = useState(() => searchParams.get("domain") ?? "");
  const [firmName, setFirmName] = useState("");
  const [market, setMarket] = useState("serbia");
  const [gbpListed, setGbpListed] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TeaserResult | null>(null);
  const [peerRank, setPeerRank] = useState<PeerRank | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isHero = variant === "hero";

  // Tracks whether we've already auto-submitted so a re-render doesn't re-fire.
  const autoSubmittedRef = useRef(false);

  const runAudit = async (domainOverride?: string) => {
    const target = (domainOverride ?? url).trim();
    if (!target || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPeerRank(null);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-teaser`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ url: target, firmName: firmName.trim() || undefined, market, gbpListed }),
      });
      const data = await readTeaserResponse(resp);
      if (!resp.ok) {
        setError(typeof data.error === "string" ? data.error : "Couldn't run the teaser");
        return;
      }
      if (!data.url || !data.performance || !data.reputation) {
        setError("The score finished, but its result was incomplete. Please try again.");
        return;
      }
      const teaser = data as unknown as TeaserResult;
      setResult(teaser);
      if (teaser.reputation.directory === "matched" && teaser.reputation.matchedFirmName) {
        // Fire-and-forget: a second, independent public read, not on the
        // critical path for showing the score itself.
        fetchPeerRank(market, teaser.reputation.matchedFirmName).then(setPeerRank);
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(message || "Couldn't reach the audit service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    runAudit();
  };

  // Auto-submit when a domain query param is present on mount.
  useEffect(() => {
    const domainParam = searchParams.get("domain");
    if (domainParam && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      runAudit(domainParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.form
            key="form"
            onSubmit={submit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourlawfirm.com"
                aria-label="Firm domain"
                autoFocus={isHero}
                className={`flex-1 bg-secondary/80 backdrop-blur-sm border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all font-body ${isHero ? "px-5 py-4 text-base" : "px-3 py-2.5 text-sm"}`}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!url.trim() || loading}
                className={`bg-primary text-primary-foreground font-body font-medium tracking-wide rounded-lg hover:bg-gold-light transition-all disabled:opacity-30 flex items-center justify-center gap-2 tap-scale shrink-0 ${isHero ? "px-6 py-4 text-sm" : "px-4 py-2.5 text-sm"}`}
              >
                {loading ? (
                  <Loader2 className={isHero ? "w-4 h-4 animate-spin" : "w-3.5 h-3.5 animate-spin"} />
                ) : (
                  <>Get my free score <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="text-[11px] text-muted-foreground hover:text-foreground font-body"
            >
              {showMore ? "− Fewer options" : "+ Firm name, market, Google Business Profile"}
            </button>

            {showMore && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="Firm name (helps match your directory listing)"
                  className="bg-card border border-border rounded-sm px-3 py-2 text-xs font-body focus:outline-none focus:border-primary/50"
                  disabled={loading}
                />
                <div className="flex items-center gap-3">
                  <select
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    className="flex-1 bg-card border border-border rounded-sm px-3 py-2 text-xs font-body focus:outline-none focus:border-primary/50"
                    disabled={loading}
                  >
                    {Object.keys(DMV_MARKETS).map((m) => (
                      <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-[11px] font-body text-muted-foreground whitespace-nowrap cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gbpListed}
                      onChange={(e) => setGbpListed(e.target.checked)}
                      disabled={loading}
                      className="accent-primary"
                    />
                    Claimed GBP
                  </label>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-destructive font-body">{error}</p>}
            <p className="text-[11px] text-muted-foreground/70 font-body flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 shrink-0" /> Real PageSpeed + directory data. No account, no password.
            </p>
          </motion.form>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/50 rounded-xl p-6"
          >
            {/* Beat 1: the number itself, the payoff of hitting submit. */}
            <div className="text-center mb-5">
              {(() => {
                const teaserTotals = computeMeasuredTotals({
                  performance: result.performance,
                  reputation: result.reputation,
                });
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                    className={`font-display text-primary font-semibold ${isHero ? "text-6xl" : "text-5xl"}`}
                  >
                    {toScale500(result.teaserTotal, teaserTotals.fullMax)} / 500
                  </motion.div>
                );
              })()}
              <p className="text-xs text-muted-foreground font-body mt-1">Score so far · 2 of 5 categories measured · {result.url}</p>
            </div>

            {/* Beat 2: real peer standing, once the second read resolves — the
                specific, personal detail a generic score can't give you. */}
            <AnimatePresence>
              {peerRank && (
                <motion.div
                  initial={{ opacity: 0, y: 8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  transition={{ duration: 0.4 }}
                  className="mb-4 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-center gap-3"
                >
                  <Trophy className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs font-body text-foreground">
                    <strong>#{peerRank.rank} of {peerRank.peerGroupSize}</strong> {peerRank.peerGroupLabel.toLowerCase()} firms
                    tracked in {market[0].toUpperCase() + market.slice(1)} — ahead of {Math.max(0, peerRank.percentile)}% of your peer
                    group, out of {peerRank.marketSize} firms in the directory overall.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2 text-sm font-body">
              <div className="flex items-center justify-between">
                <span className="text-foreground">Website Experience (PageSpeed)</span>
                <span className="text-muted-foreground">
                  {result.performance.provenance === "missing" ? "Pending setup" : categoryScoreLabel500(result.performance.score, "performance")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Recognition</span>
                <span className="text-muted-foreground">
                  {categoryScoreLabel500(
                    result.reputation.score,
                    "reputation",
                  )}
                </span>
              </div>
              {result.reputation.directory === "matched" && result.reputation.matchedFirmName && (
                <p className="text-[11px] text-muted-foreground font-body">
                  Matched to "{result.reputation.matchedFirmName}" in the directory.
                </p>
              )}
              {result.reputation.directory === "pending" && (
                <p className="text-[11px] text-muted-foreground font-body">
                  No directory match found yet — try adding your firm name, or this market isn't tracked yet.
                </p>
              )}
            </div>

            {/* Beat 3: the one sentence that turns two numbers into a reason to act. */}
            {(() => {
              if (result.performance.provenance === "missing") return null;
              const reputationMax = result.reputation.directory === "matched" ? CATEGORY_MAX.reputation : REPUTATION_WEIGHTS.googleBusinessProfile;
              const perfRatio = result.performance.score / CATEGORY_MAX.performance;
              const repRatio = result.reputation.score / reputationMax;
              const weaker = perfRatio <= repRatio ? "performance" : "reputation";
              const message =
                weaker === "performance"
                  ? "Your site's real-world speed is the softer of the two — that's costing you visibility before a single click happens."
                  : "Your legal-directory standing is the softer of the two — Chambers and Legal 500 recognition is usually the fastest lever available to close that gap.";
              return (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 text-xs text-muted-foreground font-body italic"
                >
                  {message}
                </motion.p>
              );
            })()}

            {/* Beat 4: the ask. */}
            <div className="mt-5 pt-5 border-t border-border/40 text-center space-y-3">
              <p className="text-xs text-muted-foreground font-body">
                This is 2 of 5 categories. The full Market Visibility Score adds Social Presence, Search Authority,
                and Thought Leadership — the most heavily weighted category — each compared against similar firms in your market.
              </p>
              {onGetFullScore ? (
                <button
                  onClick={() => {
                    // Carries this exact result forward into the real intake
                    // form (MarketVisibilityScore.tsx already consumes this
                    // on mount) so signing up doesn't mean retyping the same
                    // domain/firm name that was just measured.
                    setAuditPrefill({
                      displayName: result.reputation.matchedFirmName || firmName || undefined,
                      auditedDomain: result.url,
                      market,
                    });
                    onGetFullScore(result.reputation.matchedFirmName);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-gold-light font-body font-medium"
                >
                  Get the full score + a concrete 30-day plan <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : null}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => { setResult(null); setPeerRank(null); setUrl(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground font-body"
                >
                  Try another domain
                </button>
                <Link
                  to={`/recognition-index/${market}`}
                  className="text-xs text-muted-foreground hover:text-foreground font-body"
                >
                  See the full {market[0].toUpperCase() + market.slice(1)} index →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveScoreTeaser;
