import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { Loader2, Presentation, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { useFirmContext } from "@/hooks/useFirmContext";
import { fnUrl, authHeaders, handleHttpError } from "./shared";
import { streamSSE } from "@/lib/streamSSE";
import { recordRun } from "@/hooks/useWorkshopHistory";

const PitchDeck = () => {
  const { context } = useFirmContext();
  const [audience, setAudience] = useState("");
  const [opportunity, setOpportunity] = useState("");
  const [ourEdge, setOurEdge] = useState("");
  const [proof, setProof] = useState("");
  const [ask, setAsk] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loading && output && audience && opportunity) {
      recordRun({
        toolId: "deck",
        toolLabel: "Pitch Deck",
        title: `Pitch · ${audience.slice(0, 50)}`,
        preview: opportunity.slice(0, 120),
        output,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const run = async () => {
    if (!audience.trim() || !opportunity.trim() || loading) return;
    setLoading(true); setOutput("");
    try {
      const resp = await fetch(fnUrl("workshop-pitch-deck"), {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ audience, opportunity, ourEdge, proof, ask, firmContext: context }),
      });
      const err = await handleHttpError(resp);
      if (err) { toast.error(err); return; }
      await streamSSE(resp, (full) => setOutput(full));
    } catch (e) { console.error(e); toast.error("Couldn't draft deck."); }
    finally { setLoading(false); }
  };

  const download = () => {
    const blob = new Blob([output], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pitch-deck.md";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Who's the audience? (e.g. GC of a $500M PE-backed industrials co.)" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
        <input value={opportunity} onChange={(e) => setOpportunity(e.target.value)} placeholder="What's the opportunity? (e.g. add-on acquisition strategy across EU)" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
      </div>
      <button onClick={() => setAdvanced(!advanced)} className="text-[11px] text-primary hover:text-gold-light font-body">
        {advanced ? "− Hide" : "+ Add"} our edge, proof, and ask
      </button>
      {advanced && (
        <div className="grid grid-cols-1 gap-3">
          <textarea value={ourEdge} onChange={(e) => setOurEdge(e.target.value)} rows={2} placeholder="What makes us uniquely right for this? (sector depth, prior wins, team)" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary resize-none" />
          <textarea value={proof} onChange={(e) => setProof(e.target.value)} rows={2} placeholder="Proof points to weave in (anonymized case studies, deal values, named clients we can cite)" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary resize-none" />
          <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Desired next step (90-min working session, scoped pilot, RFP slot…)" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
        </div>
      )}
      <div className="flex justify-center">
        <button onClick={run} disabled={!audience.trim() || !opportunity.trim() || loading} className="bg-primary text-primary-foreground px-8 py-3 text-sm font-body font-medium tracking-widest uppercase hover:bg-gold-light transition-all rounded-sm disabled:opacity-40 flex items-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Drafting…</> : <><Presentation className="w-4 h-4" /> Draft 10-slide deck</>}
        </button>
      </div>

      {(output || loading) && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-sm p-6 min-h-[400px]">
          {output && !loading && (
            <div className="flex justify-end gap-3 mb-4">
              <button onClick={() => { navigator.clipboard.writeText(output); toast.success("Copied"); }} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
              <button onClick={download} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1"><Download className="w-3 h-3" /> .md</button>
            </div>
          )}
          {loading && !output && <div className="flex items-center gap-2 text-muted-foreground text-sm font-body"><Loader2 className="w-4 h-4 animate-spin" /> Structuring 10 slides…</div>}
          {output && (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-primary prose-strong:text-foreground prose-hr:border-border/50">
              <ReactMarkdown>{output}</ReactMarkdown>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default PitchDeck;