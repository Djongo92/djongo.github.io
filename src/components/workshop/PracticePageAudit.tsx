import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Globe, Clipboard, Copy, FileSearch } from "lucide-react";
import { toast } from "sonner";
import { useFirmContext } from "@/hooks/useFirmContext";
import { fnUrl, authHeaders, handleHttpError } from "./shared";
import { SegmentedControl } from "../ui/segmented-control";
import HandoffButton from "./HandoffButton";
import { useHandoffReceive } from "@/lib/handoff";
import { recordRun } from "@/hooks/useWorkshopHistory";

interface Criterion { name: string; score: number; finding: string; }
interface Result {
  overallGrade: string;
  overallScore: number;
  verdict: string;
  criteria: Criterion[];
  quickWins: string[];
  strategicFixes: string[];
  suggestedHeadline: string;
  suggestedSubhead: string;
  meta?: { source: string; url?: string; title?: string };
}

const PracticePageAudit = () => {
  const { context } = useFirmContext();
  const [input, setInput] = useState<"url" | "paste">("url");
  const [url, setUrl] = useState("");
  const [pastedContent, setPastedContent] = useState("");
  const [practiceArea, setPracticeArea] = useState("");
  const [idealClient, setIdealClient] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useHandoffReceive("audit", (p) => {
    if (p.kind === "url") { setInput("url"); setUrl(p.url); }
    else if (p.kind === "text") { setInput("paste"); setPastedContent(p.text); }
  });

  const ready = input === "url" ? url.trim().length > 4 : pastedContent.trim().length > 50;

  const run = async () => {
    if (!ready || loading) return;
    setLoading(true); setResult(null);
    try {
      const resp = await fetch(fnUrl("workshop-practice-audit"), {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          url: input === "url" ? url : undefined,
          pastedContent: input === "paste" ? pastedContent : undefined,
          practiceArea, idealClient, firmContext: context,
        }),
      });
      const err = await handleHttpError(resp);
      if (err) { toast.error(err); return; }
      const r: Result = await resp.json();
      setResult(r);
      recordRun({
        toolId: "audit",
        toolLabel: "Practice Page Audit",
        title: `Audit · ${r.overallGrade} · ${r.overallScore}/100`,
        preview: r.meta?.url || r.verdict,
        output: `# ${r.suggestedHeadline}\n${r.suggestedSubhead}\n\nQuick wins:\n${r.quickWins.map((w) => `- ${w}`).join("\n")}`,
        payload: r,
      });
    } catch (e) { console.error(e); toast.error("Couldn't audit page."); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <SegmentedControl
          ariaLabel="Input source"
          value={input}
          onChange={(v) => setInput(v as "url" | "paste")}
          options={[
            { label: "From URL", value: "url", icon: <Globe className="w-3 h-3" /> },
            { label: "Paste content", value: "paste", icon: <Clipboard className="w-3 h-3" /> },
          ]}
        />
      </div>

      {input === "url" ? (
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourfirm.com/practices/commercial-litigation"
          className="w-full bg-card border border-border rounded-sm px-4 py-3 text-sm font-body focus:outline-none focus:border-primary"
        />
      ) : (
        <textarea
          value={pastedContent}
          onChange={(e) => setPastedContent(e.target.value)}
          rows={8}
          placeholder="Paste the full text of the practice area page (H1, intro, sections, CTAs)."
          className="w-full bg-card border border-border rounded-sm px-4 py-3 text-sm font-body focus:outline-none focus:border-primary resize-none leading-relaxed"
        />
      )}

      <button onClick={() => setAdvanced(!advanced)} className="text-[11px] text-primary hover:text-gold-light font-body">
        {advanced ? "− Hide" : "+ Add"} optional context for sharper grading
      </button>
      {advanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input value={practiceArea} onChange={(e) => setPracticeArea(e.target.value)} placeholder="Practice area focus" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
          <input value={idealClient} onChange={(e) => setIdealClient(e.target.value)} placeholder="Ideal client (the one you'd most want)" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
        </div>
      )}

      <div className="flex justify-center">
        <button onClick={run} disabled={!ready || loading} className="bg-primary text-primary-foreground px-8 py-3 text-sm font-body font-medium tracking-widest uppercase hover:bg-gold-light transition-all rounded-sm disabled:opacity-40 flex items-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Auditing…</> : <><FileSearch className="w-4 h-4" /> Audit page</>}
        </button>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-card border border-border/50 rounded-sm p-6 text-center">
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body mb-2">Grade</div>
            <div className="font-display text-7xl text-primary mb-1">{result.overallGrade}</div>
            <div className="text-sm text-muted-foreground font-body mb-3">{result.overallScore}/100</div>
            <p className="font-display text-lg text-foreground italic">"{result.verdict}"</p>
            {result.meta?.url && <p className="text-[11px] text-muted-foreground font-body mt-2">{result.meta.url}</p>}
          </div>

          <div className="space-y-2">
            {result.criteria.map((c) => (
              <div key={c.name} className="bg-card border border-border/50 rounded-sm p-4">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm font-body font-medium text-foreground">{c.name}</span>
                  <span className={`font-display text-lg ${c.score >= 7 ? "text-primary" : c.score >= 4 ? "text-foreground" : "text-destructive"}`}>{c.score}<span className="text-xs text-muted-foreground">/10</span></span>
                </div>
                <div className="h-1 bg-muted/40 rounded-full overflow-hidden mb-2">
                  <div className={`h-full ${c.score >= 7 ? "bg-primary" : c.score >= 4 ? "bg-foreground/60" : "bg-destructive/70"}`} style={{ width: `${c.score * 10}%` }} />
                </div>
                <p className="text-xs text-muted-foreground font-body leading-relaxed">{c.finding}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-primary/5 border border-primary/20 rounded-sm p-5">
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-body mb-3">Quick wins</div>
              <ul className="space-y-2">
                {result.quickWins.map((w, i) => (
                  <li key={i} className="text-xs font-body text-foreground/90 flex items-start gap-2"><span className="text-primary mt-0.5">▸</span>{w}</li>
                ))}
              </ul>
            </div>
            <div className="bg-card border border-border/50 rounded-sm p-5">
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-body mb-3">Strategic fixes</div>
              <ul className="space-y-2">
                {result.strategicFixes.map((w, i) => (
                  <li key={i} className="text-xs font-body text-foreground/90 flex items-start gap-2"><span className="text-muted-foreground mt-0.5">▸</span>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-body">Suggested H1 + Subhead</div>
              <div className="flex items-center gap-2">
                <HandoffButton payload={{ kind: "text", text: result.suggestedHeadline, source: "Audit H1" }} exclude="audit" />
                <button onClick={() => { navigator.clipboard.writeText(`${result.suggestedHeadline}\n${result.suggestedSubhead}`); toast.success("Copied"); }} className="text-xs text-primary hover:text-gold-light font-body flex items-center gap-1"><Copy className="w-3 h-3" />Copy</button>
              </div>
            </div>
            <h4 className="font-display text-2xl text-foreground mb-2">{result.suggestedHeadline}</h4>
            <p className="font-body text-sm text-muted-foreground italic">{result.suggestedSubhead}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PracticePageAudit;