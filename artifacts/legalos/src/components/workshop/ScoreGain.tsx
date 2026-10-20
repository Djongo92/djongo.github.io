// "Prove the gain": grades the original and the rewrite with the same Copy
// Autopsy engine and shows what actually moved — overall and per axis. A
// rewrite that merely sounds better isn't evidence; a measured gain is.
import { useState } from "react";
import { Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { toast } from "sonner";
import { fnUrl, authHeaders } from "./shared";
import { styleMemoryIdentity } from "@/lib/styleFeedback";
import { useFirmContext } from "@/hooks/useFirmContext";

export interface AutopsyScore {
  overallScore: number;
  axes: { name: string; score: number }[];
}

export async function gradeCopy(copy: string, firmContext: unknown): Promise<AutopsyScore | null> {
  try {
    const resp = await fetch(fnUrl("workshop-autopsy"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ copy, firmContext, ...styleMemoryIdentity() }),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as AutopsyScore;
  } catch {
    return null;
  }
}

export const Delta = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  if (value === 0) return <span className="inline-flex items-center gap-0.5 text-muted-foreground"><Minus className="w-3 h-3" />0{suffix}</span>;
  const up = value > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 ${up ? "text-emerald-500" : "text-destructive"}`}>
      <Icon className="w-3 h-3" />{up ? "+" : ""}{value}{suffix}
    </span>
  );
};

const ScoreGain = ({ original, rewritten }: { original: string; rewritten: string }) => {
  const { context } = useFirmContext();
  const [busy, setBusy] = useState(false);
  const [scores, setScores] = useState<{ before: AutopsyScore; after: AutopsyScore } | null>(null);

  const measure = async () => {
    if (busy) return;
    setBusy(true);
    const [before, after] = await Promise.all([gradeCopy(original, context), gradeCopy(rewritten, context)]);
    setBusy(false);
    if (!before || !after) { toast.error("Couldn't measure the gain right now."); return; }
    setScores({ before, after });
  };

  if (original.trim().length < 20 || rewritten.trim().length < 20) return null;

  if (!scores) {
    return (
      <div className="flex justify-center">
        <button
          onClick={measure}
          disabled={busy}
          className="text-xs text-primary hover:text-gold-light font-body border border-primary/40 rounded-sm px-4 py-2 inline-flex items-center gap-2 disabled:opacity-50"
        >
          {busy ? <><Loader2 className="w-3 h-3 animate-spin" /> Grading both versions…</> : "Measure the improvement (grade before vs after)"}
        </button>
      </div>
    );
  }

  const { before, after } = scores;
  return (
    <div className="bg-card border border-border/50 rounded-sm p-5">
      <div className="flex items-baseline justify-center gap-4 mb-4">
        <span className="font-display text-3xl text-muted-foreground">{before.overallScore}</span>
        <span className="text-muted-foreground">→</span>
        <span className="font-display text-4xl text-primary">{after.overallScore}</span>
        <span className="text-sm font-body"><Delta value={Math.round(after.overallScore - before.overallScore)} /></span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {after.axes.map((a) => {
          const b = before.axes.find((x) => x.name === a.name);
          return (
            <div key={a.name} className="flex items-center justify-between text-[11px] font-body border border-border/40 rounded-sm px-2.5 py-1.5">
              <span className="text-muted-foreground">{a.name}</span>
              <span>{b ? b.score : "–"} → {a.score} {b && <Delta value={a.score - b.score} />}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground font-body text-center mt-3">
        Graded by the same Copy Autopsy engine, one AI opinion each — a guide, not a conversion test.
      </p>
    </div>
  );
};

export default ScoreGain;
