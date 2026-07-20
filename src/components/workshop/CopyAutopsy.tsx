import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Stethoscope, AlertTriangle, CheckCircle2, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { fnUrl, authHeaders, handleHttpError } from "./shared";
import HandoffButton from "./HandoffButton";
import { useHandoffReceive } from "@/lib/handoff";
import { recordRun } from "@/hooks/useWorkshopHistory";

interface Axis { name: string; score: number; note: string; }
interface WeakSpot { quote: string; issue: string; fix: string; }
interface Result {
  overallScore: number;
  oneLineVerdict: string;
  axes: Axis[];
  weakSpots: WeakSpot[];
  strengths: string[];
  topPriority: string;
}

const CopyAutopsy = () => {
  const [copy, setCopy] = useState("");
  const [context, setContext] = useState("");
  const [audience, setAudience] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useHandoffReceive("autopsy", (p) => {
    if (p.kind === "text") setCopy(p.text);
  });

  const run = async () => {
    if (copy.trim().length < 20 || loading) return;
    setLoading(true); setResult(null);
    try {
      const resp = await fetch(fnUrl("workshop-autopsy"), {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ copy, context, audience }),
      });
      const err = await handleHttpError(resp);
      if (err) { toast.error(err); return; }
      const r: Result = await resp.json();
      setResult(r);
      recordRun({
        toolId: "autopsy",
        toolLabel: "Copy Autopsy",
        title: `Autopsy · ${r.overallScore}/100`,
        preview: r.oneLineVerdict,
        output: copy,
        payload: r,
      });
    } catch (e) { console.error(e); toast.error("Couldn't run autopsy."); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body mb-2">Your copy</label>
        <textarea
          value={copy}
          onChange={(e) => setCopy(e.target.value)}
          rows={8}
          placeholder="Paste a headline, hero section, bio paragraph, email, ad — anything you want graded."
          className="w-full bg-card border border-border rounded-sm px-4 py-3 text-sm font-body focus:outline-none focus:border-primary resize-none leading-relaxed"
        />
        <button onClick={() => setAdvanced(!advanced)} className="text-[11px] text-primary hover:text-gold-light font-body mt-2">
          {advanced ? "− Hide" : "+ Add"} context (sharpens the critique)
        </button>
        {advanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <input value={context} onChange={(e) => setContext(e.target.value)} placeholder="Where does this copy live? (homepage hero, LinkedIn DM…)" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
            <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Who's it for? (GC of mid-market SaaS…)" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button onClick={run} disabled={copy.trim().length < 20 || loading} className="bg-primary text-primary-foreground px-8 py-3 text-sm font-body font-medium tracking-widest uppercase hover:bg-gold-light transition-all rounded-sm disabled:opacity-40 flex items-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Diagnosing…</> : <><Stethoscope className="w-4 h-4" /> Run autopsy</>}
        </button>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-card border border-border/50 rounded-sm p-6 text-center">
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body mb-2">Overall</div>
            <div className="font-display text-6xl text-primary mb-2">{result.overallScore}</div>
            <p className="font-display text-lg text-foreground italic">"{result.oneLineVerdict}"</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {result.axes.map((a) => (
              <div key={a.name} className="bg-card border border-border/50 rounded-sm p-4">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">{a.name}</span>
                  <span className={`font-display text-xl ${a.score >= 7 ? "text-primary" : a.score >= 4 ? "text-foreground" : "text-destructive"}`}>{a.score}<span className="text-xs text-muted-foreground">/10</span></span>
                </div>
                <div className="h-1 bg-muted/40 rounded-full overflow-hidden mb-2">
                  <div className={`h-full ${a.score >= 7 ? "bg-primary" : a.score >= 4 ? "bg-foreground/60" : "bg-destructive/70"}`} style={{ width: `${a.score * 10}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground font-body leading-relaxed">{a.note}</p>
              </div>
            ))}
          </div>

          <div className="bg-primary/5 border border-primary/30 rounded-sm p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-body mb-1">Fix this first</div>
                <p className="text-sm font-body text-foreground/90">{result.topPriority}</p>
                <div className="mt-3">
                  <HandoffButton payload={{ kind: "text", text: result.topPriority, source: "Autopsy fix" }} exclude="autopsy" label="Rewrite with →" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body mb-3 flex items-center gap-2"><AlertTriangle className="w-3 h-3" /> Weak spots</h3>
            <div className="space-y-3">
              {result.weakSpots.map((w, i) => (
                <div key={i} className="bg-card border border-border/50 rounded-sm p-4">
                  <blockquote className="text-sm font-display italic text-destructive/90 border-l-2 border-destructive/40 pl-3 mb-3">"{w.quote}"</blockquote>
                  <p className="text-xs text-muted-foreground font-body mb-3"><span className="text-foreground/80 font-medium">Why it hurts:</span> {w.issue}</p>
                  <div className="bg-primary/5 border border-primary/20 rounded-sm p-3 flex items-start justify-between gap-3">
                    <p className="text-xs font-body text-foreground/90"><span className="text-primary font-medium">Try:</span> {w.fix}</p>
                    <button onClick={() => { navigator.clipboard.writeText(w.fix); toast.success("Copied"); }} className="text-primary hover:text-gold-light flex-shrink-0"><Copy className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {result.strengths.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body mb-3 flex items-center gap-2"><CheckCircle2 className="w-3 h-3" /> What works</h3>
              <ul className="space-y-2">
                {result.strengths.map((s, i) => (
                  <li key={i} className="text-sm font-body text-foreground/80 flex items-start gap-2">
                    <span className="text-primary mt-1">▸</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default CopyAutopsy;