import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { DMV_MARKETS } from "@/lib/marketVisibilityConfig";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface TeaserResult {
  url: string;
  performance: { score: number; provenance: string };
  reputation: { score: number; provenance: string; directory: string; matchedFirmName?: string };
  teaserTotal: number;
  teaserMax: number;
}

interface LiveScoreTeaserProps {
  /** Hero: bigger type, built to be the first thing a visitor sees. Compact: for reuse on a dedicated page. */
  variant?: "hero" | "compact";
  onGetFullScore?: () => void;
}

/**
 * The real interaction behind the free public teaser (Performance + GBP,
 * two of the five Market Visibility Score categories) — real PageSpeed +
 * directory data, no password, IP-rate-limited server-side. Shared between
 * the SignInGate hero and the standalone /teaser page so there's one
 * implementation of "type a domain, watch a real score compute."
 */
const LiveScoreTeaser = ({ variant = "compact", onGetFullScore }: LiveScoreTeaserProps) => {
  const [url, setUrl] = useState("");
  const [firmName, setFirmName] = useState("");
  const [market, setMarket] = useState("serbia");
  const [gbpListed, setGbpListed] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TeaserResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isHero = variant === "hero";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/visibility-teaser`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ url: url.trim(), firmName: firmName.trim() || undefined, market, gbpListed }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Couldn't run the teaser");
        return;
      }
      setResult(data);
    } catch {
      setError("Couldn't reach the audit service");
    } finally {
      setLoading(false);
    }
  };

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
            <div className="text-center mb-5">
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className={`font-display text-primary font-semibold ${isHero ? "text-6xl" : "text-5xl"}`}
              >
                {Math.round(result.teaserTotal)}<span className="text-xl text-muted-foreground">/{result.teaserMax}</span>
              </motion.div>
              <p className="text-xs text-muted-foreground font-body mt-1">Teaser score · {result.url}</p>
            </div>
            <div className="space-y-2 text-sm font-body">
              <div className="flex items-center justify-between">
                <span className="text-foreground">Performance (PageSpeed)</span>
                <span className="text-muted-foreground">
                  {result.performance.provenance === "missing" ? "Pending setup" : `${Math.round(result.performance.score * 10) / 10} / 20`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Reputation</span>
                <span className="text-muted-foreground">
                  {Math.round(result.reputation.score * 10) / 10} / {result.reputation.directory === "matched" ? 55 : 10}
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
            <div className="mt-5 pt-5 border-t border-border/40 text-center space-y-3">
              <p className="text-xs text-muted-foreground font-body">
                This is 2 of 5 categories. The full Market Visibility Score adds Social Media, SEO &amp; Authority,
                and Thought Leadership, peer-group-normalized against other firms in your market.
              </p>
              {onGetFullScore ? (
                <button
                  onClick={onGetFullScore}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-gold-light font-body font-medium"
                >
                  Get the full score <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : null}
              <button
                onClick={() => { setResult(null); setUrl(""); }}
                className="block mx-auto text-xs text-muted-foreground hover:text-foreground font-body"
              >
                Try another domain
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveScoreTeaser;
