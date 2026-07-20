import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { Loader2, UserSquare, Copy } from "lucide-react";
import { toast } from "sonner";
import { useFirmContext } from "@/hooks/useFirmContext";
import { fnUrl, authHeaders, handleHttpError } from "./shared";
import { streamSSE } from "@/lib/streamSSE";
import HandoffButton from "./HandoffButton";
import { useHandoffReceive } from "@/lib/handoff";
import { recordRun } from "@/hooks/useWorkshopHistory";
import { saveBio } from "@/hooks/useBattlePlanCache";

const EMPHASES = [
  { key: "trial", label: "Trial cred" },
  { key: "deals", label: "Deal cred" },
  { key: "human", label: "Human-first" },
  { key: "thought", label: "Thought leader" },
  { key: "industry", label: "Industry depth" },
];

const BioRewriter = () => {
  const { context } = useFirmContext();
  const [currentBio, setCurrentBio] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [emphases, setEmphases] = useState<string[]>(["human"]);
  const [hookLine, setHookLine] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  useHandoffReceive("bio", (p) => {
    if (p.kind === "text") setCurrentBio(p.text);
  });

  useEffect(() => {
    if (!loading && output && currentBio) {
      recordRun({
        toolId: "bio",
        toolLabel: "Bio Rewriter",
        title: name ? `Bio · ${name}` : "Bio rewrite",
        preview: currentBio.slice(0, 120),
        output,
      });
      saveBio({ name, role, emphases, rewrite: output });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const toggle = (k: string) =>
    setEmphases((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const run = async () => {
    if (currentBio.trim().length < 30 || loading) return;
    setLoading(true); setOutput("");
    try {
      const resp = await fetch(fnUrl("workshop-bio-rewrite"), {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ currentBio, name, role, emphases, hookLine, firmContext: context }),
      });
      const err = await handleHttpError(resp);
      if (err) { toast.error(err); return; }
      await streamSSE(resp, (full) => setOutput(full));
    } catch (e) { console.error(e); toast.error("Couldn't rewrite bio."); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body mb-2">Current bio</label>
        <textarea value={currentBio} onChange={(e) => setCurrentBio(e.target.value)} rows={10} placeholder="Paste the attorney's current bio (firm website, LinkedIn, directory)." className="w-full bg-card border border-border rounded-sm px-4 py-3 text-sm font-body focus:outline-none focus:border-primary resize-none leading-relaxed" />
      </div>

      <div>
        <label className="block text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-body mb-2">Emphasize</label>
        <div className="flex flex-wrap gap-2">
          {EMPHASES.map((e) => (
            <button
              key={e.key}
              onClick={() => toggle(e.key)}
              className={`text-[11px] font-body px-3 py-1.5 rounded-full border transition-all ${
                emphases.includes(e.key)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => setAdvanced(!advanced)} className="text-[11px] text-primary hover:text-gold-light font-body">
        {advanced ? "− Hide" : "+ Add"} name, role, or a specific hook angle
      </button>
      {advanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role / Title" className="bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
          <input value={hookLine} onChange={(e) => setHookLine(e.target.value)} placeholder="Optional hook angle (e.g. 'the lawyer founders call before they call investors')" className="md:col-span-2 bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary" />
        </div>
      )}

      <div className="flex justify-center">
        <button onClick={run} disabled={currentBio.trim().length < 30 || loading} className="bg-primary text-primary-foreground px-8 py-3 text-sm font-body font-medium tracking-widest uppercase hover:bg-gold-light transition-all rounded-sm disabled:opacity-40 flex items-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Rewriting…</> : <><UserSquare className="w-4 h-4" /> Rewrite bio</>}
        </button>
      </div>

      {(output || loading) && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-sm p-6 min-h-[300px]">
          {output && !loading && (
            <div className="flex justify-end gap-2 mb-3">
              <HandoffButton payload={{ kind: "text", text: output, source: "Bio Rewriter" }} exclude="bio" />
              <button onClick={() => { navigator.clipboard.writeText(output); toast.success("Copied"); }} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1"><Copy className="w-3 h-3" /> Copy all</button>
            </div>
          )}
          {loading && !output && <div className="flex items-center gap-2 text-muted-foreground text-sm font-body"><Loader2 className="w-4 h-4 animate-spin" /> Rewriting…</div>}
          {output && (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-primary prose-strong:text-foreground">
              <ReactMarkdown>{output}</ReactMarkdown>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default BioRewriter;