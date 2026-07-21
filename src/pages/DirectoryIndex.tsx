import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, ShieldCheck, ArrowRight, Flag, Download } from "lucide-react";
import { PEER_GROUPS, FIRM_TYPE_TO_PEER_GROUP } from "@/lib/marketVisibilityConfig";
import { toCsv, downloadCsv } from "@/lib/csv";
import { setPageMeta } from "@/lib/pageMeta";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface FirmStanding {
  firmName: string;
  firmDomain: string | null;
  firmType: string | null;
  chambers: { points: number; count: number; avgRank: number | null };
  legal500: { points: number; count: number; avgRank: number | null };
  iflr1000: { points: number; count: number; avgRank: number | null };
  directoryPoints: number;
}

const PEER_GROUP_LABEL: Record<string, string> = Object.fromEntries(PEER_GROUPS.map((p) => [p.value, p.label]));

const DirectoryIndex = () => {
  const { market } = useParams();
  const [firms, setFirms] = useState<FirmStanding[] | null>(null);
  const [max, setMax] = useState(45);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removalOpen, setRemovalOpen] = useState(false);
  const [removalFirmName, setRemovalFirmName] = useState("");
  const [removalNote, setRemovalNote] = useState("");
  const [removalSubmitting, setRemovalSubmitting] = useState(false);
  const [removalDone, setRemovalDone] = useState(false);

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

  useEffect(() => {
    if (!market) return;
    (async () => {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/directory-standing-index`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
          body: JSON.stringify({ market }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          setError(data.error || "Couldn't load the directory index.");
          return;
        }
        setFirms(data.firms);
        setMax(data.max);
      } catch {
        setError("Couldn't reach the directory index service.");
      } finally {
        setLoading(false);
      }
    })();
  }, [market]);

  useEffect(() => {
    const marketLabel = market ? market[0].toUpperCase() + market.slice(1) : "Market";
    setPageMeta({
      title: market ? `${marketLabel} Directory Standing Index · LegalOS` : "Directory Standing · LegalOS",
      description: `Chambers Europe and Legal 500 rankings for law firms in ${marketLabel}, aggregated and peer-normalized — directory breadth and depth, computed directly from published rankings.`,
    });
  }, [market]);

  const grouped: Record<string, FirmStanding[]> = {};
  (firms ?? []).forEach((f) => {
    const pg = f.firmType ? FIRM_TYPE_TO_PEER_GROUP[f.firmType] ?? "other" : "other";
    (grouped[pg] ??= []).push(f);
  });
  const groupOrder = [...PEER_GROUPS.map((p) => p.value), "other"];
  const groupsWithData = groupOrder.filter((pg) => grouped[pg]?.length > 0);

  const exportCsv = () => {
    if (!firms || firms.length === 0) return;
    const flat = firms.map((f) => ({
      firmName: f.firmName,
      firmDomain: f.firmDomain ?? "",
      firmType: f.firmType ?? "",
      chambersPoints: Math.round(f.chambers.points * 10) / 10,
      legal500Points: Math.round(f.legal500.points * 10) / 10,
      iflr1000Points: Math.round(f.iflr1000.points * 10) / 10,
      directoryPoints: Math.round(f.directoryPoints * 10) / 10,
    }));
    const csv = toCsv(flat, [
      { key: "firmName", header: "Firm" },
      { key: "firmDomain", header: "Domain" },
      { key: "firmType", header: "Type" },
      { key: "chambersPoints", header: "Chambers points" },
      { key: "legal500Points", header: "Legal 500 points" },
      { key: "iflr1000Points", header: "IFLR1000 points" },
      { key: "directoryPoints", header: `Directory points (/${max})` },
    ]);
    downloadCsv(`legalos-directory-${market}.csv`, csv);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="text-[10px] tracking-[0.3em] uppercase text-primary font-body">LegalOS</Link>
          <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-500 font-body flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Directory standing
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-4xl text-foreground mb-2 leading-tight capitalize">{market} Directory Standing Index</h1>
        <p className="text-xs text-muted-foreground font-body mb-2">
          Chambers Europe 2026 and Legal 500 EMEA 2026 rankings, aggregated and peer-normalized — every firm tracked in
          either directory, computed directly from published rankings. No audit required to appear here.
        </p>
        <p className="text-xs text-muted-foreground font-body mb-10">
          This covers directory breadth and depth only (max {max} pts) — it excludes Google Business Profile and the
          Performance/Social/Thought Leadership categories, which need a firm to run its own audit.
        </p>

        {loading && (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        )}

        {!loading && error && <p className="text-sm text-destructive font-body">{error}</p>}

        {!loading && !error && groupsWithData.length === 0 && (
          <p className="text-sm text-muted-foreground font-body italic">No directory data for this market yet.</p>
        )}

        {!loading && !error && groupsWithData.length > 0 && (
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-body mb-8"
          >
            <Download className="w-3 h-3" /> Export as CSV
          </button>
        )}

        {!loading && !error && groupsWithData.map((pg) => (
          <div key={pg} className="mb-10">
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-emerald-500 font-body mb-3">
              {PEER_GROUP_LABEL[pg] ?? "Other"}
            </h2>
            <div className="bg-card border border-border/50 rounded-sm divide-y divide-border/40">
              {grouped[pg].map((f, i) => (
                <div key={f.firmName} className="flex items-center justify-between px-4 py-3 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-display text-lg text-muted-foreground w-6 text-right shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground font-body truncate">{f.firmName}</p>
                      <p className="text-[10px] text-muted-foreground font-body">
                        Chambers {Math.round(f.chambers.points * 10) / 10} · Legal 500 {Math.round(f.legal500.points * 10) / 10} · IFLR1000 {Math.round(f.iflr1000.points * 10) / 10}
                      </p>
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

        {!loading && !error && groupsWithData.length > 0 && (
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
                  This data comes from Chambers/Legal 500's own public rankings — we're not able to remove a firm from
                  those directories, but we can review whether it should appear in this index.
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

        <footer className="mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-body">
            Directory data reviewed quarterly
          </p>
          <Link to="/" className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1">
            See your full Market Visibility Score <ArrowRight className="w-3 h-3" />
          </Link>
        </footer>
        <p className="mt-6 text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60 font-body text-center">
          For Authorized Use Only
        </p>
      </main>
    </div>
  );
};

export default DirectoryIndex;
