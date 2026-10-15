// Internal operator tooling — deliberately not linked from any nav. Lets
// whoever operates this product see which firm lookups (fuzzy-matching
// misses during a real audit) and directory removal requests are pending,
// so market_directory_data actually gets maintained. Reached only by
// visiting /ops/directory-queue directly.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, X, Clock } from "lucide-react";
import { edgeHeaders } from "@/lib/edgeAuth";
import { isStale, DIRECTORY_STALE_AFTER_DAYS } from "@/lib/scoreFreshness";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface LookupRequest {
  id: string;
  market: string;
  firm_domain_or_name: string;
  requested_at: string;
}

interface RemovalRequest {
  id: string;
  market: string;
  firm_name: string;
  note: string | null;
  requested_at: string;
}

interface DirectoryRow {
  id: string;
  market: string;
  firm_name: string;
  last_verified_at: string;
}

const OpsDirectoryQueue = () => {
  const [lookupRequests, setLookupRequests] = useState<LookupRequest[]>([]);
  const [removalRequests, setRemovalRequests] = useState<RemovalRequest[]>([]);
  const [directoryRows, setDirectoryRows] = useState<DirectoryRow[]>([]);
  const [showAllDirectoryRows, setShowAllDirectoryRows] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/ops-directory-queue`, {
        method: "POST",
        headers: edgeHeaders("benchmark"),
        body: JSON.stringify({ action: "list" }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Couldn't load the queue.");
        return;
      }
      setLookupRequests(data.lookupRequests ?? []);
      setRemovalRequests(data.removalRequests ?? []);
      setDirectoryRows(data.directoryRows ?? []);
    } catch {
      setError("Couldn't reach the ops service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    document.title = "Directory Queue · Ops";
  }, []);

  const dismiss = async (action: "dismiss_lookup" | "dismiss_removal", id: string) => {
    await fetch(`${SUPABASE_URL}/functions/v1/ops-directory-queue`, {
      method: "POST",
      headers: edgeHeaders("benchmark"),
      body: JSON.stringify({ action, id }),
    });
    if (action === "dismiss_lookup") setLookupRequests((rows) => rows.filter((r) => r.id !== id));
    else setRemovalRequests((rows) => rows.filter((r) => r.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-3xl text-foreground mb-2">Directory Queue</h1>
        <p className="text-xs text-muted-foreground font-body mb-2">
          Internal tooling — not linked anywhere in the app. Resolve a lookup miss by adding the firm to
          market_directory_data; resolve a removal request by reviewing it manually, then dismiss either from here.
        </p>
        <Link to="/ops/rate-limits" className="text-xs text-primary hover:text-gold-light font-body">
          Rate Limits →
        </Link>

        <div className="mt-8">
        {loading && <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
        {!loading && error && <p className="text-sm text-destructive font-body">{error}</p>}

        {!loading && !error && (
          <>
            <section className="mb-10">
              <h2 className="eyebrow text-[10px] text-primary mb-3">
                Lookup misses ({lookupRequests.length})
              </h2>
              {lookupRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body italic">Nothing pending.</p>
              ) : (
                <div className="bg-card border border-border/50 rounded-sm divide-y divide-border/40">
                  {lookupRequests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground font-body truncate">{r.firm_domain_or_name}</p>
                        <p className="text-[10px] text-muted-foreground font-body">{r.market} · {new Date(r.requested_at).toLocaleString()}</p>
                      </div>
                      <button onClick={() => dismiss("dismiss_lookup", r.id)} className="p-1 text-muted-foreground hover:text-destructive shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-10">
              {(() => {
                const overdueDirectoryRows = directoryRows.filter((r) => isStale(r.last_verified_at, DIRECTORY_STALE_AFTER_DAYS));
                const visibleDirectoryRows = showAllDirectoryRows ? directoryRows : overdueDirectoryRows;
                return (
                  <>
                    <h2 className="eyebrow text-[10px] text-primary mb-1">
                      Directory review ({overdueDirectoryRows.length} of {directoryRows.length} overdue)
                    </h2>
                    <p className="text-xs text-muted-foreground font-body mb-3">
                      Chambers/Legal 500/IFLR1000 standing is reviewed quarterly, not refreshed automatically — rows past{" "}
                      {DIRECTORY_STALE_AFTER_DAYS} days since last_verified_at are due for the next review.
                    </p>
                    {directoryRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground font-body italic">No directory data loaded yet.</p>
                    ) : visibleDirectoryRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground font-body italic">Nothing overdue.</p>
                    ) : (
                      <div className="bg-card border border-border/50 rounded-sm divide-y divide-border/40 max-h-96 overflow-y-auto">
                        {visibleDirectoryRows.map((r) => {
                          const overdue = isStale(r.last_verified_at, DIRECTORY_STALE_AFTER_DAYS);
                          return (
                            <div key={r.id} className="flex items-center justify-between px-4 py-3 gap-3">
                              <div className="min-w-0">
                                <p className="text-sm text-foreground font-body truncate">{r.firm_name}</p>
                                <p className="text-[10px] text-muted-foreground font-body">
                                  {r.market} · last verified {new Date(r.last_verified_at).toLocaleDateString()}
                                </p>
                              </div>
                              {overdue && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-body shrink-0"
                                  title={`Past the ${DIRECTORY_STALE_AFTER_DAYS}-day quarterly review threshold`}
                                >
                                  <Clock className="w-2.5 h-2.5" /> Overdue
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {directoryRows.length > 0 && overdueDirectoryRows.length < directoryRows.length && (
                      <button
                        onClick={() => setShowAllDirectoryRows((v) => !v)}
                        className="text-xs text-primary hover:text-gold-light font-body mt-2"
                      >
                        {showAllDirectoryRows ? "Show only overdue" : `Show all ${directoryRows.length} rows`}
                      </button>
                    )}
                  </>
                );
              })()}
            </section>

            <section>
              <h2 className="eyebrow text-[10px] text-primary mb-3">
                Removal requests ({removalRequests.length})
              </h2>
              {removalRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body italic">Nothing pending.</p>
              ) : (
                <div className="bg-card border border-border/50 rounded-sm divide-y divide-border/40">
                  {removalRequests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground font-body truncate">{r.firm_name}</p>
                        {r.note && <p className="text-xs text-secondary-foreground/70 font-body truncate">{r.note}</p>}
                        <p className="text-[10px] text-muted-foreground font-body">{r.market} · {new Date(r.requested_at).toLocaleString()}</p>
                      </div>
                      <button onClick={() => dismiss("dismiss_removal", r.id)} className="p-1 text-muted-foreground hover:text-destructive shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
        </div>
      </main>
    </div>
  );
};

export default OpsDirectoryQueue;
