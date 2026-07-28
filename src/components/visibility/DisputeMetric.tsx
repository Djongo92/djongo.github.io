// §6 — Evidence and corrections: lets a member dispute one specific metric
// on their own audit. The `metrics` list a category breakdown passes in
// mirrors (but doesn't share code with — no shared build step between the
// Vite app and the Deno edge functions) the whitelist enforced server-side
// in supabase/functions/_shared/metricCorrections.ts; the server is the
// real boundary, this is just what's offered in the UI.
import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useMetricCorrection } from "@/hooks/useMetricCorrection";
import type { CategoryKey } from "@/lib/visibilityCategories";

export interface CorrectableMetric {
  path: string;
  label: string;
  kind: "number" | "percent" | "boolean" | "rank";
  current: number | boolean | null;
  max?: number;
}

interface Props {
  category: CategoryKey;
  auditId: string;
  metrics: CorrectableMetric[];
  onSubmitted: () => void;
}

const DisputeMetric = ({ category, auditId, metrics, onSubmitted }: Props) => {
  const [open, setOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState(metrics[0]?.path ?? "");
  const [value, setValue] = useState("");
  const [boolValue, setBoolValue] = useState(false);
  const [reason, setReason] = useState("");
  const [success, setSuccess] = useState(false);
  const { submit, submitting, error } = useMetricCorrection();

  if (metrics.length === 0) return null;
  const selected = metrics.find((m) => m.path === selectedPath) ?? metrics[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) return;
    let correctedValue: number | boolean;
    if (selected.kind === "boolean") {
      correctedValue = boolValue;
    } else {
      const n = Number(value);
      if (!Number.isFinite(n)) return;
      correctedValue = n;
    }
    const ok = await submit(auditId, category, selected.path, correctedValue, reason);
    if (ok) {
      setSuccess(true);
      onSubmitted();
      setTimeout(() => { setOpen(false); setSuccess(false); setReason(""); setValue(""); }, 2000);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-body text-muted-foreground hover:text-primary transition-colors mt-2"
      >
        <AlertTriangle className="w-3 h-3" /> Dispute a data point
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 bg-secondary/30 border border-border/40 rounded-sm p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-body">Report incorrect data</span>
        <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {success ? (
        <p className="text-xs text-emerald-500 font-body">Correction applied — your score has been recomputed.</p>
      ) : (
        <>
          <select
            value={selectedPath}
            onChange={(e) => { setSelectedPath(e.target.value); setValue(""); setBoolValue(false); }}
            className="w-full bg-background border border-border text-foreground text-xs font-body px-2 py-1.5 rounded-sm focus:outline-none focus:border-primary"
          >
            {metrics.map((m) => (
              <option key={m.path} value={m.path}>
                {m.label} (currently {typeof m.current === "boolean" ? (m.current ? "yes" : "no") : m.current ?? "—"})
              </option>
            ))}
          </select>

          {selected.kind === "boolean" ? (
            <label className="flex items-center gap-2 text-xs font-body text-secondary-foreground/80">
              <input type="checkbox" checked={boolValue} onChange={(e) => setBoolValue(e.target.checked)} />
              Correct value is &quot;{boolValue ? "yes" : "no"}&quot;
            </label>
          ) : (
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={
                selected.kind === "percent" ? "Correct value (0-100)"
                  : selected.kind === "rank" ? `Correct rank (1-${selected.max ?? 4})`
                  : "Correct value"
              }
              min={0}
              max={selected.kind === "rank" ? selected.max : selected.kind === "percent" ? 100 : undefined}
              className="w-full bg-background border border-border text-foreground text-xs font-body px-2 py-1.5 rounded-sm focus:outline-none focus:border-primary"
            />
          )}

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this wrong? (required)"
            rows={2}
            className="w-full bg-background border border-border text-foreground text-xs font-body px-2 py-1.5 rounded-sm focus:outline-none focus:border-primary"
          />

          {error && <p className="text-[11px] text-destructive font-body">{error}</p>}

          <button
            type="submit"
            disabled={submitting || reason.trim().length < 5}
            className="text-xs font-body bg-primary text-primary-foreground px-3 py-1.5 rounded-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {submitting ? "Submitting…" : "Submit correction"}
          </button>
        </>
      )}
    </form>
  );
};

export default DisputeMetric;
