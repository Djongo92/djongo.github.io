import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X, Loader2, TrendingUp, Share2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useMarketVisibility } from "@/hooks/useMarketVisibility";
import { saveVisibilityScore } from "@/hooks/useBattlePlanCache";
import { DMV_MARKETS, PEER_GROUPS } from "@/lib/marketVisibilityConfig";

const CATEGORY_LABELS: Record<string, { label: string; max: number }> = {
  performance: { label: "Performance", max: 20 },
  social: { label: "Social Media", max: 20 },
  seoAuthority: { label: "SEO & Authority", max: 60 },
  thoughtLeadership: { label: "Thought Leadership", max: 45 },
  reputation: { label: "Reputation", max: 55 },
};

const PROVENANCE_LABEL: Record<string, string> = {
  api: "Verified",
  ai_classified: "AI-classified",
  self_reported: "Self-reported",
  missing: "Pending setup",
};

const MarketVisibilityScore = () => {
  const [open, setOpen] = useState(false);
  const [auditedDomain, setAuditedDomain] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [market, setMarket] = useState("serbia");
  const [peerGroup, setPeerGroup] = useState("regional");
  const [gbpListed, setGbpListed] = useState(false);
  const { loading, publishing, result, error, run, publish, reset } = useMarketVisibility();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditedDomain.trim() || loading) return;
    const audit = await run({ auditedDomain: auditedDomain.trim(), displayName: displayName.trim() || undefined, market, peerGroup, gbpListed });
    if (!audit) {
      toast.error(error || "Couldn't run the audit");
      return;
    }
    saveVisibilityScore({
      auditedDomain: auditedDomain.trim(),
      market,
      peerGroup,
      totalScore: audit.totalScore,
      categories: audit.categories,
      percentile: audit.percentile,
      peerCount: audit.peerCount,
    });
  };

  const handlePublish = async () => {
    if (!result) return;
    const ok = await publish(result.id, true);
    if (ok) toast.success("Published to the public ranking");
    else toast.error("Couldn't publish");
  };

  const startOver = () => {
    reset();
    setAuditedDomain("");
    setDisplayName("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group w-full p-5 bg-gradient-to-br from-emerald-500/10 via-card to-card border border-emerald-500/30 rounded-sm text-left hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10 transition-all relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 px-2 py-0.5 bg-emerald-600 text-white text-[9px] tracking-[0.2em] uppercase font-body">
          Verified
        </div>
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-sm bg-emerald-500/15 text-emerald-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg text-foreground mb-1">Market Visibility Score</h3>
            <p className="text-xs text-muted-foreground font-body">
              Externally-sourced, peer-group-normalized — PageSpeed, directory rankings, thought leadership. Not an AI opinion.
            </p>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => !loading && setOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-2xl max-h-[90vh] bg-card border border-border rounded-t-lg sm:rounded-lg shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-display text-lg text-foreground">Market Visibility Score</h3>
                </div>
                <button onClick={() => !loading && setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground" disabled={loading}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {!result && (
                  <form onSubmit={submit} className="space-y-4">
                    <p className="text-sm text-muted-foreground font-body">
                      Runs a real, externally-sourced audit — PageSpeed, legal-directory presence, thought-leadership cadence — and
                      benchmarks it against your peer group. Persisted centrally, so it gets more meaningful as more firms run it.
                    </p>

                    <div>
                      <label className="block text-xs text-muted-foreground font-body mb-1.5">Firm domain</label>
                      <input
                        type="text"
                        value={auditedDomain}
                        onChange={(e) => setAuditedDomain(e.target.value)}
                        placeholder="yourlawfirm.com"
                        className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-emerald-500/50"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-muted-foreground font-body mb-1.5">Firm name (optional)</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your Firm LLP"
                        className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-emerald-500/50"
                        disabled={loading}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-muted-foreground font-body mb-1.5">Market</label>
                        <select
                          value={market}
                          onChange={(e) => setMarket(e.target.value)}
                          className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-emerald-500/50"
                          disabled={loading}
                        >
                          {Object.keys(DMV_MARKETS).map((m) => (
                            <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground font-body mb-1.5">Peer group</label>
                        <select
                          value={peerGroup}
                          onChange={(e) => setPeerGroup(e.target.value)}
                          className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-emerald-500/50"
                          disabled={loading}
                        >
                          {PEER_GROUPS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
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
                      disabled={!auditedDomain.trim() || loading}
                      className="w-full bg-emerald-600 text-white py-3 rounded-sm font-body text-sm disabled:opacity-30 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Running audit…</>) : "Run Market Visibility Score"}
                    </button>
                    {loading && (
                      <p className="text-xs text-muted-foreground font-body italic text-center">
                        Fetching PageSpeed data, matching directory rankings, scanning for thought leadership… (15-30s)
                      </p>
                    )}
                  </form>
                )}

                {result && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="text-center mb-6 pb-6 border-b border-border/50">
                      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-emerald-500/30 mb-3 relative">
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                          <circle cx="48" cy="48" r="44" fill="none" stroke="rgb(16 185 129)" strokeWidth="4"
                            strokeDasharray={`${(result.totalScore / 200) * 276.4} 276.4`} strokeLinecap="round" />
                        </svg>
                        <span className="font-display text-2xl font-semibold text-foreground">{Math.round(result.totalScore)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-body mb-1">Score / 200 · {auditedDomain}</p>
                      {result.percentile !== null ? (
                        <p className="font-display text-base text-foreground italic flex items-center justify-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                          Better than {result.percentile}% of {result.peerCount} other {PEER_GROUPS.find((p) => p.value === peerGroup)?.label.toLowerCase()} firms in {market}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground font-body italic">
                          Not enough public audits in this peer group yet to rank against — publish yours to help build it.
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 mb-6">
                      {Object.entries(result.categories).map(([key, cat]) => {
                        const meta = CATEGORY_LABELS[key];
                        const pct = meta ? Math.min(100, (cat.score / meta.max) * 100) : 0;
                        return (
                          <div key={key}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-body text-foreground">{meta?.label ?? key}</span>
                              <span className="text-[10px] font-body text-muted-foreground">
                                {Math.round(cat.score * 10) / 10} / {meta?.max ?? "—"} · {PROVENANCE_LABEL[cat.provenance] ?? cat.provenance}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${cat.provenance === "missing" ? "bg-muted-foreground/30" : "bg-emerald-500"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {result.isPublic ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-500 text-sm font-body py-3">
                        <CheckCircle2 className="w-4 h-4" /> Published to the public ranking
                      </div>
                    ) : (
                      <button
                        onClick={handlePublish}
                        disabled={publishing}
                        className="w-full bg-emerald-600 text-white py-3 rounded-sm font-body text-sm disabled:opacity-30 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
                      >
                        {publishing ? (<><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>) : (<><Share2 className="w-4 h-4" /> Publish to the public ranking</>)}
                      </button>
                    )}

                    <button onClick={startOver} className="mt-4 text-xs text-emerald-600 hover:text-emerald-500 font-body block mx-auto">
                      ← Run another audit
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

export default MarketVisibilityScore;
