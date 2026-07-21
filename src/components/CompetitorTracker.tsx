import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Plus, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTrackedCompetitors } from "@/hooks/useTrackedCompetitors";
import type { AuditRow } from "@/components/dashboard/CommandCenter";

interface Props {
  open: boolean;
  onClose: () => void;
  primaryAudit?: AuditRow;
}

interface PublicRow {
  audited_domain: string;
  display_name: string | null;
  total_score: number;
}

const CompetitorTracker = ({ open, onClose, primaryAudit }: Props) => {
  const { competitors, add, remove, maxReached, max } = useTrackedCompetitors();
  const [domainInput, setDomainInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [publicRows, setPublicRows] = useState<Record<string, PublicRow>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !primaryAudit || competitors.length === 0) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("market_visibility_audits")
        .select("audited_domain, display_name, total_score")
        .eq("market", primaryAudit.market)
        .eq("is_public", true)
        .in("audited_domain", competitors.map((c) => c.domain));
      if (!cancelled && !error && data) {
        const map: Record<string, PublicRow> = {};
        (data as PublicRow[]).forEach((r) => { map[r.audited_domain] = r; });
        setPublicRows(map);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, primaryAudit, competitors]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;
    const ok = add(domainInput, nameInput);
    if (ok) {
      setDomainInput("");
      setNameInput("");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[85vh] bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-display text-lg text-foreground">Competitor Tracking</h3>
              </div>
              <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {!primaryAudit ? (
                <p className="text-sm text-muted-foreground font-body">
                  Run your own Market Visibility audit first — competitor comparisons are scoped to your market.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground font-body">
                    Track up to {max} rivals by domain. If they've published their own audit in {primaryAudit.market},
                    you'll see their score side by side with yours; otherwise they show as not yet published.
                  </p>

                  <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      placeholder="competitor-domain.com"
                      disabled={maxReached}
                      className="flex-1 bg-secondary/80 border border-border text-foreground placeholder:text-muted-foreground text-sm font-body px-3 py-2 rounded-sm focus:outline-none focus:border-primary disabled:opacity-50"
                    />
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Display name (optional)"
                      disabled={maxReached}
                      className="flex-1 bg-secondary/80 border border-border text-foreground placeholder:text-muted-foreground text-sm font-body px-3 py-2 rounded-sm focus:outline-none focus:border-primary disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={maxReached || !domainInput.trim()}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-sm font-body bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" /> Track
                    </button>
                  </form>
                  {maxReached && (
                    <p className="text-[11px] text-muted-foreground font-body -mt-2">
                      You're tracking the max of {max} — remove one to add another.
                    </p>
                  )}

                  {loading && (
                    <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                  )}

                  {competitors.length === 0 ? (
                    <p className="text-sm text-muted-foreground font-body italic">No competitors tracked yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {competitors.map((c) => {
                        const row = publicRows[c.domain];
                        const delta = row ? Math.round(primaryAudit.total_score) - Math.round(row.total_score) : null;
                        return (
                          <div key={c.domain} className="flex items-center justify-between gap-3 bg-secondary/40 border border-border/40 rounded-sm px-4 py-3">
                            <div className="min-w-0">
                              <p className="text-sm font-body text-foreground truncate">{c.displayName || row?.display_name || c.domain}</p>
                              <p className="text-xs text-muted-foreground font-body truncate">{c.domain}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {row ? (
                                <div className="text-right">
                                  <p className="font-display text-base text-foreground font-semibold">
                                    {Math.round(row.total_score)} <span className="text-xs text-muted-foreground font-body">/200</span>
                                  </p>
                                  {delta !== null && delta !== 0 && (
                                    <p className={`text-[10px] font-body inline-flex items-center gap-0.5 ${delta > 0 ? "text-emerald-500" : "text-destructive"}`}>
                                      {delta > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                      {delta > 0 ? "+" : ""}{delta} vs you
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground font-body italic">Not published</span>
                              )}
                              <button onClick={() => remove(c.domain)} className="p-1 text-muted-foreground hover:text-destructive">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CompetitorTracker;
