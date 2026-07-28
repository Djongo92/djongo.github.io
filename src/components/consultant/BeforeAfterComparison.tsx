// §11 — Consultant layer: compares the current audit against a saved,
// named snapshot — the before/after view an engagement report needs, using
// audit_snapshots (an explicit, labeled bookmark) rather than an
// unlabeled point on the trend line.
import { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { CATEGORY_META, CATEGORY_ORDER, type CategoryKey } from "@/lib/visibilityCategories";
import type { AuditSnapshot } from "@/hooks/useAuditSnapshots";

interface Props {
  snapshots: AuditSnapshot[];
  currentTotalScore: number;
  currentCategories: Record<CategoryKey, { score: number }>;
}

const BeforeAfterComparison = ({ snapshots, currentTotalScore, currentCategories }: Props) => {
  const [selectedId, setSelectedId] = useState(snapshots[0]?.id ?? "");
  if (snapshots.length === 0) return null;

  const before = snapshots.find((s) => s.id === selectedId) ?? snapshots[0];
  const totalDelta = Math.round((currentTotalScore - before.total_score) * 10) / 10;

  return (
    <div className="bg-card border border-border/50 rounded-sm p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-wide">Before / After</p>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="bg-secondary/80 border border-border text-foreground text-xs font-body px-2.5 py-1.5 rounded-sm focus:outline-none focus:border-primary"
        >
          {snapshots.map((s) => (
            <option key={s.id} value={s.id}>{s.label} · {new Date(s.created_at).toLocaleDateString()}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-center gap-6 mb-4 text-center">
        <div>
          <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wide">{before.label}</p>
          <p className="font-display text-2xl text-foreground">{Math.round(before.total_score)}</p>
        </div>
        <div className={`flex items-center gap-1 font-body text-sm ${totalDelta > 0 ? "text-emerald-500" : totalDelta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
          {totalDelta > 0 ? <TrendingUp className="w-4 h-4" /> : totalDelta < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          {totalDelta > 0 ? "+" : ""}{totalDelta}
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wide">Now</p>
          <p className="font-display text-2xl text-foreground">{Math.round(currentTotalScore)}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {CATEGORY_ORDER.map((key) => {
          const beforeScore = before.categories[key] ?? 0;
          const nowScore = currentCategories[key]?.score ?? 0;
          const delta = Math.round((nowScore - beforeScore) * 10) / 10;
          return (
            <div key={key} className="flex items-center justify-between text-xs font-body py-1 border-b border-border/20 last:border-0">
              <span className="text-secondary-foreground/70">{CATEGORY_META[key].label}</span>
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">{Math.round(beforeScore * 10) / 10} → {Math.round(nowScore * 10) / 10}</span>
                {delta !== 0 && (
                  <span className={delta > 0 ? "text-emerald-500" : "text-destructive"}>{delta > 0 ? "+" : ""}{delta}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BeforeAfterComparison;
