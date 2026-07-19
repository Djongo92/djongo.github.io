import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Loader2, ArrowRight } from "lucide-react";
import { edgeHeaders } from "@/lib/edgeAuth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface TeaserResult {
  url: string;
  performance: { score: number; provenance: string };
  gbp: { score: number };
  teaserTotal: number;
  teaserMax: number;
}

const Teaser = () => {
  const [url, setUrl] = useState("");
  const [gbpListed, setGbpListed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TeaserResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ url: url.trim(), gbpListed }),
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="text-[10px] tracking-[0.3em] uppercase text-primary font-body">LegalOS</Link>
          <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-500 font-body flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Free teaser
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="font-display text-4xl text-foreground mb-3 leading-tight">Market Visibility Score — free teaser</h1>
        <p className="text-sm text-muted-foreground font-body mb-10">
          A quick, real look at two of the five categories in the full Market Visibility Score: your site's actual PageSpeed
          performance, plus whether you have a claimed Google Business Profile. No password, no account — just real data.
        </p>

        <form onSubmit={submit} className="space-y-4 mb-10">
          <div>
            <label className="block text-xs text-muted-foreground font-body mb-1.5">Firm domain</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="yourlawfirm.com"
              className="w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-emerald-500/50"
              disabled={loading}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-body text-secondary-foreground/80 cursor-pointer">
            <input
              type="checkbox"
              checked={gbpListed}
              onChange={(e) => setGbpListed(e.target.checked)}
              disabled={loading}
              className="accent-emerald-600"
            />
            We have a claimed, active Google Business Profile
          </label>
          <button
            type="submit"
            disabled={!url.trim() || loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-sm font-body text-sm disabled:opacity-30 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Running…</>) : "Run free teaser"}
          </button>
          {error && <p className="text-xs text-destructive font-body">{error}</p>}
        </form>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border/50 rounded-sm p-6"
            >
              <div className="text-center mb-6">
                <div className="font-display text-5xl text-emerald-500 font-semibold">
                  {Math.round(result.teaserTotal)}<span className="text-xl text-muted-foreground">/{result.teaserMax}</span>
                </div>
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
                  <span className="text-foreground">Google Business Profile</span>
                  <span className="text-muted-foreground">{result.gbp.score} / 10</span>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border/40 text-center">
                <p className="text-xs text-muted-foreground font-body mb-3">
                  This is 2 of 5 categories (30 of 200 points). The full Market Visibility Score adds Social Media, SEO &
                  Authority, Thought Leadership, and Reputation — peer-group-normalized against other firms in your market.
                </p>
                <Link to="/" className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-500 font-body">
                  Explore the full guidebook <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-10 text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60 font-body text-center">
          For Authorized Use Only
        </p>
      </main>
    </div>
  );
};

export default Teaser;
