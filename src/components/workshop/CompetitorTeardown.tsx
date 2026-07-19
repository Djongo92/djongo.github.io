import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Globe, Clipboard, Target, Crosshair, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { useFirmContext } from "@/hooks/useFirmContext";
import { fnUrl, authHeaders, handleHttpError } from "./shared";
import { SegmentedControl } from "../ui/segmented-control";
import { useHandoffReceive } from "@/lib/handoff";
import { recordRun } from "@/hooks/useWorkshopHistory";

interface Result {
  positioning: string;
  idealClient: string;
  proofTactics: string[];
  strongMoves: string[];
  weakSpots: string[];
  gaps: string[];
  differentiationAngles: { angle: string; proofWeWouldNeed: string }[];
  ifIWereThem: string;
  meta?: { source: string; url?: string };
}

const CompetitorTeardown = () => {
  const { context } = useFirmContext();
  const [input, setInput] = useState<"url" | "paste">("url");
  const [url, setUrl] = useState("");
  const [pasted, setPasted] = useState("");
  const [ourAngle, setOurAngle] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useHandoffReceive("teardown", (p) => {
    if (p.kind === "url") { setInput("url"); setUrl(p.url); }
    else if (p.kind === "text") { setInput("paste"); setPasted(p.text); }
  });

  const ready = input === "url" ? url.trim().length > 4 : pasted.trim().length > 50;

  const run = async () => {
    if (!ready || loading) return;
    setLoading(true); setResult(null);
    try {
      const resp = await fetch(fnUrl("workshop-competitor-teardown"), {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          competitorUrl: input === "url" ? url : undefined,
          pastedContent: input === "paste" ? pasted : undefined,
          ourAngle, firmContext: context,
        }),
      });
      const err = await handleHttpError(resp);
      if (err) { toast.error(err); return; }
      const r: Result = await resp.json();
      setResult(r);
      recordRun({
        toolId: "teardown",
        toolLabel: "Competitor Teardown",
        title: `Teardown · ${r.meta?.url || "pasted"}`,
        preview: r.positioning,
        output: `Positioning: ${r.positioning}\n\nGaps:\n${r.gaps.map((g) => `- ${g}`).join("\n")}\n\nIf I were them: ${r.ifIWereThem}`,
        payload: r,
      });
    } catch (e) { console.error(e); toast.error("Couldn't teardown."); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <SegmentedControl ariaLabel="Competitor source" value={input} onChange={(v) => setInput(v as "url" | "paste")}
          options={[
            { label: "Competitor URL", value: "url", icon: <Globe className="w-3 h-3" /> },
            { label: "Paste content", value: "paste", icon: <Clipboard className="w-3 h-3" /> },
          ]} />
      </div>
      {input === "url" ? (
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://competitorfirm.com" className="w-full bg-card border border-border rounded-sm px-4 py-3 text-sm font-body focus:outline-none focus:border-primary" />
      ) : (
        <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={8} placeholder="Paste their homepage / about / practice page content here." className="w-full bg-card border border-border rounded-sm px-4 py-3 text-sm font-body focus:outline-none focus:border-primary resize-none" />
      )}
      <button onClick={() => setAdvanced(!advanced)} className="text-[11px] text-primary hover:text-gold-light font-body">
        {advanced ? "− Hide" : "+ Add"} our current angle (sharpens differentiation)
      </button>
      {advanced && (
        <textarea value={ourAngle} onChange={(e) => setOurAngle(e.target.value)} rows={2} placeholder="How we currently position — or want to. E.g. 'The only IP boutique in the SE focused exclusively on biotech.'" className="w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary resize-none" />
      )}
      <div className="flex justify-center">
        <button onClick={run} disabled={!ready || loading} className="bg-primary text-primary-foreground px-8 py-3 text-sm font-body font-medium tracking-widest uppercase hover:bg-gold-light transition-all rounded-sm disabled:opacity-40 flex items-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Tearing down…</> : <><Crosshair className="w-4 h-4" /> Teardown competitor</>}
        </button>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="bg-card border border-border/50 rounded-sm p-6">
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-body mb-2 flex items-center gap-2"><Target className="w-3 h-3" /> Their positioning</div>
            <p className="font-display text-xl text-foreground mb-3">"{result.positioning}"</p>
            <p className="text-xs text-muted-foreground font-body"><span className="text-foreground/80">Hunting:</span> {result.idealClient}</p>
            {result.meta?.url && <p className="text-[10px] text-muted-foreground font-body mt-2">{result.meta.url}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border/50 rounded-sm p-5">
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-body mb-3">Strong moves</div>
              <ul className="space-y-2">{result.strongMoves.map((s, i) => <li key={i} className="text-xs text-foreground/90 font-body flex items-start gap-2"><span className="text-primary mt-0.5">▸</span>{s}</li>)}</ul>
            </div>
            <div className="bg-card border border-border/50 rounded-sm p-5">
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body mb-3">Weak spots</div>
              <ul className="space-y-2">{result.weakSpots.map((s, i) => <li key={i} className="text-xs text-foreground/90 font-body flex items-start gap-2"><span className="text-destructive/70 mt-0.5">▸</span>{s}</li>)}</ul>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-sm p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body mb-3">Proof tactics they lean on</div>
            <ul className="space-y-2">{result.proofTactics.map((s, i) => <li key={i} className="text-xs text-foreground/90 font-body flex items-start gap-2"><span className="text-muted-foreground mt-0.5">▸</span>{s}</li>)}</ul>
          </div>

          <div className="bg-primary/5 border border-primary/30 rounded-sm p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-body mb-3 flex items-center gap-2"><Lightbulb className="w-3 h-3" /> Gaps we can own</div>
            <ul className="space-y-2 mb-4">{result.gaps.map((s, i) => <li key={i} className="text-sm text-foreground font-body flex items-start gap-2"><span className="text-primary mt-0.5">▸</span>{s}</li>)}</ul>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body mb-3">Differentiation angles</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {result.differentiationAngles.map((d, i) => (
                <div key={i} className="bg-card border border-border/50 rounded-sm p-4">
                  <p className="font-display text-base text-foreground mb-2">{d.angle}</p>
                  <p className="text-[11px] text-muted-foreground font-body"><span className="text-foreground/80">Proof we'd need:</span> {d.proofWeWouldNeed}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border-l-2 border-primary pl-5 py-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-body mb-2">If I were them</div>
            <p className="text-sm font-display italic text-foreground/90">{result.ifIWereThem}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CompetitorTeardown;