import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, Eye, Download, ShieldCheck } from "lucide-react";
import { PEER_GROUPS } from "@/lib/marketVisibilityConfig";
import { toCsv, downloadCsv } from "@/lib/csv";
import { setPageMeta } from "@/lib/pageMeta";

interface AuditRow {
  audited_domain: string;
  display_name: string | null;
  peer_group: string;
  total_score: number;
  published_at: string | null;
  verified_at: string | null;
}

const PEER_GROUP_LABEL: Record<string, string> = Object.fromEntries(PEER_GROUPS.map((p) => [p.value, p.label]));
const PEER_GROUP_ORDER = PEER_GROUPS.map((p) => p.value);

const VisibilityIndex = () => {
  const { market } = useParams();
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!market) return;
      const { data, error } = await supabase
        .from("market_visibility_audits")
        .select("audited_domain, display_name, peer_group, total_score, published_at, verified_at")
        .eq("market", market)
        .eq("is_public", true)
        .order("total_score", { ascending: false });

      if (error) setError("Couldn't load the index.");
      else setRows((data ?? []) as AuditRow[]);
      setLoading(false);
    })();
  }, [market]);

  useEffect(() => {
    const marketLabel = market ? market[0].toUpperCase() + market.slice(1) : "Market";
    setPageMeta({
      title: market ? `${marketLabel} Visibility Index · LegalOS` : "Visibility Index · LegalOS",
      description: `Externally-sourced, peer-group-normalized Market Visibility Scores for law firms in ${marketLabel} — PageSpeed, legal-directory presence, thought-leadership cadence, benchmarked against peers.`,
    });
  }, [market]);

  const grouped: Record<string, AuditRow[]> = {};
  (rows ?? []).forEach((r) => {
    (grouped[r.peer_group] ??= []).push(r);
  });
  const peerGroupsWithData = PEER_GROUP_ORDER.filter((pg) => grouped[pg]?.length > 0);

  const exportCsv = () => {
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="text-[10px] tracking-[0.3em] uppercase text-primary font-body">LegalOS</Link>
          <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-500 font-body flex items-center gap-1">
            <Eye className="w-3 h-3" /> Audited &amp; published
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-4xl text-foreground mb-2 leading-tight capitalize">{market} Visibility Index</h1>
        <p className="text-xs text-muted-foreground font-body mb-1">
          Externally-sourced, peer-group-normalized Market Visibility Scores — firms that opted to run a full audit
          and publish it.
          <span className="inline-flex items-center gap-1 ml-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> = domain ownership verified.
          </span>
        </p>
        <p className="text-xs text-muted-foreground font-body mb-4">
          This is a firm's complete 200-point score. A lighter, directory-only slice that needs no audit to appear —
          the Recognition Index — covers every firm tracked by Chambers or Legal 500, whether or not they've run one.
        </p>

        {!loading && !error && peerGroupsWithData.length > 0 && (
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
                      <p className="text-sm text-foreground font-body flex items-center gap-1.5">
                        {r.display_name || r.audited_domain}
                        {r.verified_at && (
                          <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" aria-label="Domain verified" />
                        )}
                      </p>
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
            Live index · updates as firms publish
          </p>
          <div className="flex items-center gap-4">
            {market && (
              <Link to={`/recognition-index/${market}`} className="text-xs text-muted-foreground hover:text-foreground font-body inline-flex items-center gap-1">
                Recognition Index <ArrowRight className="w-3 h-3" />
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

export default VisibilityIndex;
