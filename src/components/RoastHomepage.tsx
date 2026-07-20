import { useState } from "react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Loader2, X, ArrowRight, Sparkles, Copy, Check } from "lucide-react";
import { useFirmContext } from "@/hooks/useFirmContext";
import { saveRoast } from "@/hooks/useBattlePlanCache";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Annotation {
  element: string;
  whatYouSaid: string;
  whatItSounds: string;
  rewrite: string;
}
interface RoastResult {
  verdict: string;
  grade: "A" | "B" | "C" | "D" | "F";
  burn: string;
  annotations: Annotation[];
  topThreeFixes: string[];
  redemption: string;
  url: string;
  pageTitle?: string;
  screenshotUrl?: string;
}

interface RewriteResult {
  hero: { headline: string; subhead: string; primaryCta: string; secondaryCta?: string };
  sections: { heading: string; body: string; bullets: string[] }[];
  socialProof: { headline: string; stats: { value: string; label: string }[] };
  finalCta: { headline: string; button: string };
  whyItWorks: string;
}

const gradeStyles: Record<string, string> = {
  A: "text-primary bg-primary/10 border-primary/40",
  B: "text-primary bg-primary/10 border-primary/40",
  C: "text-gold-light bg-gold/10 border-gold/30",
  D: "text-destructive bg-destructive/10 border-destructive/30",
  F: "text-destructive bg-destructive/15 border-destructive/40",
};

const RoastHomepage = () => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoastResult | null>(null);
  const [rewrite, setRewrite] = useState<RewriteResult | null>(null);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { context } = useFirmContext();

  const roast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/roast-homepage`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ url, firmContext: context }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || "Couldn't roast that site");
        return;
      }
      setResult(data);
      try {
        saveRoast({
          url: data.url,
          grade: data.grade,
          verdict: data.verdict,
          burn: data.burn,
          topThreeFixes: data.topThreeFixes || [],
          annotations: data.annotations || [],
          redemption: data.redemption,
          pageTitle: data.pageTitle,
        });
      } catch { /* non-fatal */ }
    } catch {
      toast.error("Couldn't reach the AI service");
    } finally {
      setLoading(false);
    }
  };

  const generateRewrite = async () => {
    if (!result || rewriteLoading) return;
    setRewriteLoading(true);
    setRewrite(null);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/steal-homepage`, {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ roast: result, firmContext: context }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || "Couldn't generate rewrite");
        return;
      }
      setRewrite(data);
    } catch {
      toast.error("Couldn't reach the AI service");
    } finally {
      setRewriteLoading(false);
    }
  };

  const copyRewrite = () => {
    if (!rewrite) return;
    const lines: string[] = [];
    lines.push(`# HERO\n${rewrite.hero.headline}\n${rewrite.hero.subhead}\nCTA: ${rewrite.hero.primaryCta}`);
    if (rewrite.hero.secondaryCta) lines.push(`Secondary CTA: ${rewrite.hero.secondaryCta}`);
    lines.push("");
    rewrite.sections.forEach((s, i) => {
      lines.push(`# SECTION ${i + 1}: ${s.heading}\n${s.body}`);
      s.bullets.forEach((b) => lines.push(`• ${b}`));
      lines.push("");
    });
    lines.push(`# PROOF: ${rewrite.socialProof.headline}`);
    rewrite.socialProof.stats.forEach((s) => lines.push(`${s.value} — ${s.label}`));
    lines.push("");
    lines.push(`# FINAL CTA\n${rewrite.finalCta.headline}\nButton: ${rewrite.finalCta.button}`);
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group w-full p-5 bg-gradient-to-br from-destructive/10 via-card to-card border border-destructive/30 rounded-sm text-left hover:border-destructive/60 hover:shadow-lg hover:shadow-destructive/10 transition-all"
      >
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-sm bg-destructive/15 text-destructive">
            <Flame className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg text-foreground mb-1">Roast My Homepage</h3>
            <p className="text-xs text-muted-foreground font-body">
              Brutally honest AI critique of your homepage · Annotated screenshot · Rewrites included
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-destructive opacity-0 group-hover:opacity-100 transition-opacity self-center" />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => !loading && setOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-3xl max-h-[92vh] bg-card border border-border rounded-t-lg sm:rounded-lg shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-destructive" />
                  <h3 className="font-display text-lg text-foreground">Roast My Homepage</h3>
                </div>
                <button onClick={() => !loading && setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground" disabled={loading}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {!result && (
                  <form onSubmit={roast}>
                    <p className="text-sm text-muted-foreground font-body mb-2">
                      Paste your homepage URL. AI will critique it in detail — headline, CTAs, copy, trust signals, design.
                    </p>
                    <p className="text-[11px] text-destructive/80 font-body italic mb-4">
                      Warning: this is the candid critique your team won't give you.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text" value={url} onChange={(e) => setUrl(e.target.value)}
                        placeholder="yourlawfirm.com"
                        className="flex-1 bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-destructive/50"
                        disabled={loading}
                      />
                      <button
                        type="submit" disabled={!url.trim() || loading}
                        className="bg-destructive text-destructive-foreground px-5 py-2 rounded-sm font-body text-sm disabled:opacity-30 hover:bg-destructive/90 transition-colors min-w-[100px]"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Roast it"}
                      </button>
                    </div>
                    {loading && (
                      <p className="text-xs text-muted-foreground font-body mt-3 italic">
                        Loading site, capturing screenshot, generating critique… (15-30s)
                      </p>
                    )}
                  </form>
                )}

                {result && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Verdict */}
                    <div className="flex items-start gap-4 mb-6">
                      <div className={`shrink-0 w-16 h-16 rounded-sm border-2 flex items-center justify-center font-display text-3xl font-semibold ${gradeStyles[result.grade]}`}>
                        {result.grade}
                      </div>
                      <div className="flex-1">
                        <p className="font-display text-xl text-foreground italic leading-snug mb-1">"{result.verdict}"</p>
                        <p className="text-[11px] text-muted-foreground font-body">{result.url}</p>
                      </div>
                    </div>

                    {result.screenshotUrl && (
                      <div className="mb-6 border border-border/40 rounded-sm overflow-hidden bg-muted/20">
                        <img src={result.screenshotUrl} alt="Homepage screenshot" className="w-full h-auto"
                          onError={(e) => { (e.currentTarget.style.display = "none"); }} />
                      </div>
                    )}

                    {/* The burn */}
                    <div className="bg-destructive/5 border-l-4 border-destructive p-5 rounded-r-sm mb-6">
                      <p className="text-[10px] tracking-[0.2em] uppercase font-body text-destructive mb-2">The Burn</p>
                      <p className="font-body text-sm text-foreground leading-relaxed">{result.burn}</p>
                    </div>

                    {/* Top 3 fixes */}
                    <div className="mb-6">
                      <h4 className="font-display text-base text-foreground mb-3">Top 3 Fixes (in order)</h4>
                      <ol className="space-y-2">
                        {result.topThreeFixes.map((f, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm font-body text-secondary-foreground/85">
                            <span className="font-display text-lg text-destructive/60 min-w-[1.5rem]">{i + 1}.</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Annotations */}
                    <div className="mb-6">
                      <h4 className="font-display text-base text-foreground mb-3">Element-by-element</h4>
                      <div className="space-y-3">
                        {result.annotations.map((a, i) => (
                          <div key={i} className="border border-border/40 rounded-sm p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[9px] tracking-[0.2em] uppercase font-body font-medium px-2 py-0.5 rounded-sm bg-primary/10 text-primary">
                                {a.element}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground font-body mb-1">
                              <span className="text-foreground/70 font-medium">What you said:</span> {a.whatYouSaid}
                            </p>
                            <p className="text-xs text-destructive/90 font-body italic mb-2">
                              <span className="font-medium">What it sounds like:</span> {a.whatItSounds}
                            </p>
                            <p className="text-xs text-primary font-body">
                              <span className="font-medium">Try instead:</span> "{a.rewrite}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Redemption */}
                    <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-sm mb-6">
                      <p className="text-[10px] tracking-[0.2em] uppercase font-body text-primary mb-2">Credit where it's due</p>
                      <p className="font-body text-xs text-secondary-foreground/85">{result.redemption}</p>
                    </div>

                    <button
                      onClick={generateRewrite}
                      disabled={rewriteLoading}
                      className="w-full mb-4 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-gold-light text-primary-foreground py-3 rounded-sm font-body text-sm font-medium hover:opacity-95 transition-opacity disabled:opacity-50"
                    >
                      {rewriteLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Generating rewrite…</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Steal this homepage — generate the rewrite</>
                      )}
                    </button>

                    {rewrite && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="border border-primary/30 rounded-sm bg-gradient-to-br from-primary/5 to-card p-5 mb-6"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-display text-base text-primary">Your rewritten homepage</h4>
                          <button
                            onClick={copyRewrite}
                            className="flex items-center gap-1.5 text-[11px] font-body text-muted-foreground hover:text-primary"
                          >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? "Copied" : "Copy all"}
                          </button>
                        </div>

                        {/* Hero */}
                        <div className="border-l-2 border-primary/40 pl-4 mb-5">
                          <p className="text-[9px] tracking-[0.2em] uppercase font-body text-muted-foreground mb-1">Hero</p>
                          <p className="font-display text-2xl text-foreground leading-tight mb-2">{rewrite.hero.headline}</p>
                          <p className="font-body text-sm text-secondary-foreground/80 mb-3">{rewrite.hero.subhead}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1.5 bg-primary text-primary-foreground rounded-sm text-xs font-body">{rewrite.hero.primaryCta}</span>
                            {rewrite.hero.secondaryCta && (
                              <span className="px-3 py-1.5 border border-border text-foreground rounded-sm text-xs font-body">{rewrite.hero.secondaryCta}</span>
                            )}
                          </div>
                        </div>

                        {/* Sections */}
                        {rewrite.sections.map((s, i) => (
                          <div key={i} className="border-l-2 border-border/40 pl-4 mb-4">
                            <p className="text-[9px] tracking-[0.2em] uppercase font-body text-muted-foreground mb-1">Section {i + 1}</p>
                            <p className="font-display text-base text-foreground mb-1.5">{s.heading}</p>
                            <p className="font-body text-xs text-secondary-foreground/80 mb-2">{s.body}</p>
                            <ul className="space-y-1">
                              {s.bullets.map((b, j) => (
                                <li key={j} className="text-xs font-body text-secondary-foreground/85 flex gap-2">
                                  <span className="text-primary">•</span><span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}

                        {/* Social proof */}
                        <div className="border-l-2 border-gold/40 pl-4 mb-4">
                          <p className="text-[9px] tracking-[0.2em] uppercase font-body text-muted-foreground mb-1">Proof</p>
                          <p className="font-display text-base text-foreground mb-2">{rewrite.socialProof.headline}</p>
                          <div className="grid grid-cols-3 gap-3">
                            {rewrite.socialProof.stats.map((st, i) => (
                              <div key={i} className="text-center">
                                <p className="font-display text-xl text-primary">{st.value}</p>
                                <p className="text-[10px] text-muted-foreground font-body">{st.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Final CTA */}
                        <div className="border-l-2 border-primary/40 pl-4 mb-4">
                          <p className="text-[9px] tracking-[0.2em] uppercase font-body text-muted-foreground mb-1">Final CTA</p>
                          <p className="font-display text-base text-foreground mb-2">{rewrite.finalCta.headline}</p>
                          <span className="px-3 py-1.5 bg-primary text-primary-foreground rounded-sm text-xs font-body inline-block">{rewrite.finalCta.button}</span>
                        </div>

                        <div className="bg-primary/5 border border-primary/20 rounded-sm p-3">
                          <p className="text-[9px] tracking-[0.2em] uppercase font-body text-primary mb-1">Why this works</p>
                          <p className="font-body text-xs text-secondary-foreground/85">{rewrite.whyItWorks}</p>
                        </div>
                      </motion.div>
                    )}

                    <button
                      onClick={() => { setResult(null); setRewrite(null); setUrl(""); }}
                      className="text-xs text-primary hover:text-gold-light font-body"
                    >
                      ← Roast another site
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RoastHomepage;