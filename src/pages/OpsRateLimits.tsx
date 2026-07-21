// Internal operator tooling — deliberately not linked from any nav. Read-only
// visibility into the three rate-limit tables (_shared/rateLimit.ts) so
// whoever operates this product can tell whether the current thresholds are
// actually being hit, and by whom, without needing direct database access.
// Reached only by visiting /ops/rate-limits directly.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { edgeHeaders } from "@/lib/edgeAuth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface RateLimitRow {
  ip_hash?: string;
  client_id?: string;
  window_start: string;
  request_count: number;
  updated_at: string;
}

const Table = ({ title, rows, keyField, limit }: { title: string; rows: RateLimitRow[]; keyField: "ip_hash" | "client_id"; limit: number }) => (
  <section className="mb-10">
    <h2 className="text-[10px] tracking-[0.3em] uppercase text-primary font-body mb-3">
      {title} ({rows.length})
    </h2>
    {rows.length === 0 ? (
      <p className="text-sm text-muted-foreground font-body italic">No activity recorded.</p>
    ) : (
      <div className="bg-card border border-border/50 rounded-sm divide-y divide-border/40">
        {rows.map((r) => {
          const key = r[keyField] ?? "—";
          const atLimit = r.request_count >= limit;
          return (
            <div key={key} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm text-foreground font-body truncate font-mono">{key}</p>
                <p className="text-[10px] text-muted-foreground font-body">
                  Window started {new Date(r.window_start).toLocaleString()}
                </p>
              </div>
              <span className={`text-sm font-body shrink-0 ${atLimit ? "text-destructive" : "text-muted-foreground"}`}>
                {r.request_count} / {limit}
              </span>
            </div>
          );
        })}
      </div>
    )}
  </section>
);

const OpsRateLimits = () => {
  const [data, setData] = useState<{ teaser: RateLimitRow[]; directoryIndex: RateLimitRow[]; benchmark: RateLimitRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Rate Limits · Ops";
    (async () => {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/ops-rate-limits`, {
          method: "POST",
          headers: edgeHeaders("benchmark"),
        });
        const json = await resp.json();
        if (!resp.ok) {
          setError(json.error || "Couldn't load rate limits.");
          return;
        }
        setData(json);
      } catch {
        setError("Couldn't reach the ops service.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-3xl text-foreground mb-2">Rate Limits</h1>
        <p className="text-xs text-muted-foreground font-body mb-2">
          Internal tooling — not linked anywhere in the app. Top callers by request count for each limiter; entries at
          or near their cap are highlighted.
        </p>
        <Link to="/ops/directory-queue" className="text-xs text-primary hover:text-gold-light font-body">
          ← Directory Queue
        </Link>

        <div className="mt-8">
          {loading && <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
          {!loading && error && <p className="text-sm text-destructive font-body">{error}</p>}
          {!loading && !error && data && (
            <>
              <Table title="Public teaser (per IP, 5/hour)" rows={data.teaser} keyField="ip_hash" limit={5} />
              <Table title="Directory index (per IP, 60/10min)" rows={data.directoryIndex} keyField="ip_hash" limit={60} />
              <Table title="Benchmark audits (per client, 20/24h)" rows={data.benchmark} keyField="client_id" limit={20} />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default OpsRateLimits;
