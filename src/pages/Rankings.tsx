import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, Trophy } from "lucide-react";
import { PEER_GROUPS } from "@/lib/marketVisibilityConfig";

interface AuditRow {
  audited_domain: string;
  display_name: string | null;
  peer_group: string;
  total_score: number;
  published_at: string | null;
}

const PEER_GROUP_LABEL: Record<string, string> = Object.fromEntries(PEER_GROUPS.map((p) => [p.value, p.label]));
const PEER_GROUP_ORDER = PEER_GROUPS.map((p) => p.value);

const Rankings = () => {
  const { market } = useParams();
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!market) return;
      const { data, error } = await supabase
        .from("market_visibility_audits")
        .select("audited_domain, display_name, peer_group, total_score, published_at")
        .eq("market", market)
        .eq("is_public", true)
        .order("total_score", { ascending: false });

      if (error) setError("Couldn't load the ranking.");
      else setRows((data ?? []) as AuditRow[]);
      setLoading(false);
    })();
  }, [market]);

  useEffect(() => {
    document.title = market ? `${market[0].toUpperCase() + market.slice(1)} rankings · LegalOS` : "Rankings · LegalOS";
  }, [market]);

  const grouped: Record<string, AuditRow[]> = {};
  (rows ?? []).forEach((r) => {
    (grouped[r.peer_group] ??= []).push(r);
  });
  const peerGroupsWithData = PEER_GROUP_ORDER.filter((pg) => grouped[pg]?.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="text-[10px] tracking-[0.3em] uppercase text-primary font-body">LegalOS</Link>
          <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-500 font-body flex items-center gap-1">
            <Trophy className="w-3 h-3" /> Public ranking
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-4xl text-foreground mb-2 leading-tight capitalize">{market} Market Visibility Ranking</h1>
        <p className="text-xs text-muted-foreground font-body mb-10">
          Externally-sourced, peer-group-normalized Market Visibility Scores — firms that opted to publish their audit.
        </p>

        {loading && (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        )}

        {!loading && error && <p className="text-sm text-destructive font-body">{error}</p>}

        {!loading && !error && peerGroupsWithData.length === 0 && (
          <p className="text-sm text-muted-foreground font-body italic">
            No published audits in this market yet — be the first to publish yours.
          </p>
        )}

        {!loading && !error && peerGroupsWithData.map((pg) => (
          <div key={pg} className="mb-10">
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-emerald-500 font-body mb-3">{PEER_GROUP_LABEL[pg] ?? pg}</h2>
            <div className="bg-card border border-border/50 rounded-sm divide-y divide-border/40">
              {grouped[pg].map((r, i) => (
                <div key={r.audited_domain} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg text-muted-foreground w-6 text-right">{i + 1}</span>
                    <div>
                      <p className="text-sm text-foreground font-body">{r.display_name || r.audited_domain}</p>
                      {r.display_name && <p className="text-[10px] text-muted-foreground font-body">{r.audited_domain}</p>}
                    </div>
                  </div>
                  <span className="font-display text-base text-emerald-500 font-semibold">{Math.round(r.total_score)} <span className="text-xs text-muted-foreground">/200</span></span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <footer className="mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-body">
            Live ranking · updates as firms publish
          </p>
          <div className="flex items-center gap-4">
            {market && (
              <Link to={`/directory/${market}`} className="text-xs text-muted-foreground hover:text-foreground font-body inline-flex items-center gap-1">
                Directory Standing Index <ArrowRight className="w-3 h-3" />
              </Link>
            )}
            <Link to="/" className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1">
              Run your own <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </footer>
        <p className="mt-6 text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60 font-body text-center">
          For Authorized Use Only
        </p>
      </main>
    </div>
  );
};

export default Rankings;
