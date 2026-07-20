import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { ArrowRight, ShieldCheck, TrendingUp, Hammer, AlertTriangle } from "lucide-react";
import { useNextBestAction } from "@/hooks/useNextBestAction";
import { PEER_GROUPS } from "@/lib/marketVisibilityConfig";
import MarketVisibilityScore from "@/components/MarketVisibilityScore";

const CATEGORY_LABELS: Record<string, { label: string; max: number }> = {
  performance: { label: "Performance", max: 20 },
  social: { label: "Social Media", max: 20 },
  seoAuthority: { label: "SEO & Authority", max: 60 },
  thoughtLeadership: { label: "Thought Leadership", max: 45 },
  reputation: { label: "Reputation", max: 55 },
};

export interface AuditRow {
  id: string;
  audited_domain: string;
  display_name: string | null;
  market: string;
  peer_group: string;
  performance_score: number;
  social_score: number;
  seo_authority_score: number;
  thought_leadership_score: number;
  reputation_score: number;
  total_score: number;
  provenance: Record<string, string>;
  raw_metrics?: {
    siteHealth?: {
      hasContactForm: boolean;
      copyrightYear: number | null;
      copyrightStale: boolean;
      brokenLinks: string[];
      checkedLinks: number;
    } | null;
  };
  updated_at: string;
}

export interface HistoryRow {
  audited_domain: string;
  market: string;
  total_score: number;
  recorded_at: string;
}

interface VisibilityDashboardProps {
  audits: AuditRow[];
  history: HistoryRow[];
  onOpenWorkshop: () => void;
}

const VisibilityDashboard = ({ audits, history, onOpenWorkshop }: VisibilityDashboardProps) => {
  const [rerunOpen, setRerunOpen] = useState(false);
  const primary = audits[0];

  const categories = useMemo(() => {
    if (!primary) return null;
    return {
      performance: { score: primary.performance_score, provenance: primary.provenance?.performance ?? "missing" },
      social: { score: primary.social_score, provenance: primary.provenance?.social ?? "missing" },
      seoAuthority: { score: primary.seo_authority_score, provenance: primary.provenance?.seoAuthority ?? "missing" },
      thoughtLeadership: { score: primary.thought_leadership_score, provenance: primary.provenance?.thoughtLeadership ?? "missing" },
      reputation: { score: primary.reputation_score, provenance: primary.provenance?.reputation ?? "missing" },
    };
  }, [primary]);

  const nextBestAction = useNextBestAction(categories);

  const siteHealthIssues = useMemo(() => {
    const health = primary?.raw_metrics?.siteHealth;
    if (!health) return [];
    const issues: string[] = [];
    if (!health.hasContactForm) issues.push("No contact form detected on your homepage.");
    if (health.copyrightStale && health.copyrightYear) {
      issues.push(`Your footer copyright year (${health.copyrightYear}) looks out of date.`);
    }
    if (health.brokenLinks.length > 0) {
      issues.push(`${health.brokenLinks.length} broken link${health.brokenLinks.length > 1 ? "s" : ""} found on your homepage.`);
    }
    return issues;
  }, [primary]);

  const trend = useMemo(() => {
    if (!primary) return [];
    return history
      .filter((h) => h.audited_domain === primary.audited_domain && h.market === primary.market)
      .map((h) => ({
        date: new Date(h.recorded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        score: Math.round(h.total_score),
      }));
  }, [history, primary]);

  if (!primary || !categories) {
    return (
      <div className="min-h-screen bg-background">
        <header className="max-w-4xl mx-auto px-6 pt-12 pb-8">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-500 font-body">Market Visibility</span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight mb-2">
            Let's see where you stand
          </h1>
          <p className="text-sm text-muted-foreground font-body max-w-md">
            Run a real, externally-sourced audit of your firm's digital footprint — PageSpeed, legal-directory
            presence, thought-leadership cadence — benchmarked against your peer group. This becomes your home
            once it's run.
          </p>
        </header>

        <div className="max-w-4xl mx-auto px-6 mb-10">
          <MarketVisibilityScore />
        </div>

        <div className="max-w-4xl mx-auto px-6 pb-16">
          <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/30 rounded-sm p-6">
            <div className="flex items-center gap-2 mb-3">
              <Hammer className="w-4 h-4 text-primary" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-body">In the meantime</span>
            </div>
            <p className="text-sm text-secondary-foreground/80 font-body mb-4">
              The Workshop's ten AI tools don't need an audit to be useful — draft copy, audit a page, generate a
              marketing calendar, whatever you need right now.
            </p>
            <button
              onClick={onOpenWorkshop}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-gold-light font-body"
            >
              Open the Workshop <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const peerGroupLabel = PEER_GROUPS.find((p) => p.value === primary.peer_group)?.label ?? primary.peer_group;

  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-4xl mx-auto px-6 pt-12 pb-8">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-500 font-body">Market Visibility</span>
        </div>
        <h1 className="font-display text-4xl font-semibold text-foreground tracking-tight mb-2">
          {Math.round(primary.total_score)} <span className="text-muted-foreground text-2xl">/ 200</span>
        </h1>
        <p className="text-sm text-muted-foreground font-body">
          {primary.audited_domain} · {peerGroupLabel} · {primary.market[0].toUpperCase() + primary.market.slice(1)}
        </p>
      </header>

      {trend.length > 1 && (
        <div className="max-w-4xl mx-auto px-6 mb-10">
          <div className="bg-card border border-border/50 rounded-sm p-5">
            <p className="text-xs text-muted-foreground font-body mb-3">Score over time</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 200]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={30} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 4, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="score" stroke="rgb(16 185 129)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 mb-10 grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(categories).map(([key, cat], i) => {
          const meta = CATEGORY_LABELS[key];
          const pct = meta ? Math.min(100, (cat.score / meta.max) * 100) : 0;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-card border border-border/50 rounded-sm p-5"
            >
              <p className="text-xs font-body text-foreground mb-2">{meta?.label ?? key}</p>
              <div className="font-display text-2xl text-foreground font-semibold mb-2">
                {Math.round(cat.score * 10) / 10}
                <span className="text-sm text-muted-foreground"> / {meta?.max ?? "—"}</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${cat.provenance === "missing" ? "bg-muted-foreground/30" : "bg-emerald-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {siteHealthIssues.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 mb-10">
          <div className="bg-card border border-amber-500/30 rounded-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-amber-500 font-body">Site health</span>
            </div>
            <ul className="space-y-1.5">
              {siteHealthIssues.map((issue) => (
                <li key={issue} className="text-sm text-secondary-foreground/80 font-body">{issue}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {nextBestAction && (
        <div className="max-w-4xl mx-auto px-6 mb-10">
          <div className="bg-gradient-to-br from-emerald-500/10 via-card to-card border border-emerald-500/30 rounded-sm p-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-500 font-body">Next best action</span>
            </div>
            <h3 className="font-display text-lg text-foreground mb-2">{nextBestAction.label}</h3>
            <p className="text-sm text-secondary-foreground/80 font-body mb-4">{nextBestAction.action}</p>
            <button
              onClick={onOpenWorkshop}
              className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-500 font-body"
            >
              <Hammer className="w-3.5 h-3.5" /> {nextBestAction.ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 pb-16">
        <button
          onClick={() => setRerunOpen(true)}
          className="text-xs text-muted-foreground hover:text-primary font-body inline-flex items-center gap-1.5"
        >
          Re-run my audit for a fresh score →
        </button>
        {rerunOpen && (
          <div className="mt-4">
            <MarketVisibilityScore />
          </div>
        )}
      </div>
    </div>
  );
};

export default VisibilityDashboard;
