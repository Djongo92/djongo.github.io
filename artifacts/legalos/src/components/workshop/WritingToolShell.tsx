// One generic form-in, streamed-draft-out screen for the Workshop's
// long-form writing tools. Each tool is just a config (fields + endpoint);
// everything else — identity, streaming, run history, hand-off to other
// tools, copy/download, and the "keep as-is / edit & save" learning loop —
// is shared, so every tool built on it learns the firm's voice the same way.
import PagePreview from "./PagePreview";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Download, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useFirmContext } from "@/hooks/useFirmContext";
import { streamSSE } from "@/lib/streamSSE";
import { recordRun } from "@/hooks/useWorkshopHistory";
import { styleMemoryIdentity, type StyleToolId } from "@/lib/styleFeedback";
import { isDemoMode } from "@/lib/demoMode";
import { useHandoffReceive, type WorkshopToolId } from "@/lib/handoff";
import { edgeHeaders } from "@/lib/edgeAuth";
import { fnUrl } from "./shared";
import HandoffButton from "./HandoffButton";
import StyleFeedback from "./StyleFeedback";

export interface WritingField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
  rows?: number;
  required?: boolean;
  /** Receives the text handed over from another tool (first one flagged wins). */
  receivesHandoff?: boolean;
  hint?: string;
}

export interface WritingToolConfig {
  toolId: WorkshopToolId & StyleToolId;
  toolLabel: string;
  endpoint: string;
  fields: WritingField[];
  cta: string;
  emptyText: string;
  /** Field whose value titles the saved run. */
  titleKey: string;
  /** Plain-language reminder shown under the button. */
  note?: string;
  /** Show a Draft | Preview toggle that renders the draft's HTML block as a page. */
  pagePreview?: boolean;
  /** Tools this draft can be handed to. */
  handoffExclude?: WorkshopToolId;
}

const inputClass =
  "w-full bg-card border border-border rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary";

const WritingToolShell = ({ config }: { config: WritingToolConfig }) => {
  const { context } = useFirmContext();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(config.fields.map((f) => [f.key, f.type === "select" ? f.options?.[0]?.value ?? "" : ""])),
  );
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"draft" | "preview">("draft");
  const runIdentity = useRef<ReturnType<typeof styleMemoryIdentity> | null>(null);

  useHandoffReceive(config.toolId, (p) => {
    if (p.kind !== "text") return;
    const target = config.fields.find((f) => f.receivesHandoff);
    if (target) setValues((v) => ({ ...v, [target.key]: p.text }));
  });

  const set = (key: string, v: string) => setValues((cur) => ({ ...cur, [key]: v }));
  const ready = config.fields.filter((f) => f.required).every((f) => values[f.key]?.trim());

  const generate = async () => {
    if (!ready || loading) return;
    setLoading(true);
    setOutput("");
    const identity = styleMemoryIdentity();
    runIdentity.current = identity;
    try {
      const resp = await fetch(fnUrl(config.endpoint), {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ ...values, firmContext: context, ...identity }),
      });
      if (resp.status === 429) { toast.error("Rate limit reached. Try again in a moment."); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); return; }
      if (!resp.ok) throw new Error("Request failed");
      await streamSSE(resp, (full) => setOutput(full));
    } catch (e) {
      console.error(e);
      toast.error("Couldn't generate the draft.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && output) {
      recordRun({
        toolId: config.toolId,
        toolLabel: config.toolLabel,
        title: (values[config.titleKey] || config.toolLabel).slice(0, 80),
        preview: output.slice(0, 120),
        output,
      }, runIdentity.current ?? undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const download = () => {
    const blob = new Blob([output], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${config.toolId}-draft.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {config.fields.map((f) => (
          <div key={f.key}>
            <label className="eyebrow block text-[10px] text-muted-foreground mb-2">
              {f.label}{f.required ? "" : " (optional)"}
            </label>
            {f.type === "select" ? (
              <select value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} className={inputClass}>
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                value={values[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                rows={f.rows ?? 4}
                placeholder={f.placeholder}
                className={`${inputClass} resize-none`}
              />
            ) : (
              <input value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} className={inputClass} />
            )}
            {f.hint && <p className="text-[10px] text-muted-foreground font-body mt-1">{f.hint}</p>}
          </div>
        ))}
        <button
          onClick={generate}
          disabled={!ready || loading}
          className="w-full bg-primary text-primary-foreground py-3 text-sm font-body font-medium tracking-widest uppercase hover:bg-gold-light transition-all rounded-sm disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Writing…</> : <><Sparkles className="w-4 h-4" /> {config.cta}</>}
        </button>
        {config.note && <p className="text-[11px] text-muted-foreground font-body italic">{config.note}</p>}
        {!context && (
          <p className="text-[11px] text-muted-foreground font-body italic">
            Tip: set your firm context from the dashboard for sharper, personalised drafts.
          </p>
        )}
      </div>

      <div className="lg:col-span-3">
        <div className="bg-card border border-border/50 rounded-sm p-6 min-h-[420px]">
          {!output && !loading && (
            <div className="text-center py-20 text-muted-foreground">
              <Sparkles className="w-6 h-6 mx-auto mb-3 text-primary/40" />
              <p className="text-sm font-body">{config.emptyText}</p>
            </div>
          )}
          {loading && !output && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-body">
              <Loader2 className="w-4 h-4 animate-spin" /> Drafting…
            </div>
          )}
          {output && (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-primary prose-strong:text-foreground">
              {config.pagePreview && (
                <div className="flex gap-1.5 mb-4 not-prose" role="tablist" aria-label="Draft or page preview">
                  {(["draft", "preview"] as const).map((v) => (
                    <button
                      key={v}
                      role="tab"
                      aria-selected={view === v}
                      onClick={() => setView(v)}
                      className={`px-3 py-1 rounded-sm border text-xs font-body ${view === v ? "border-primary bg-primary/10 text-foreground" : "border-border/50 text-muted-foreground hover:text-foreground"}`}
                    >
                      {v === "draft" ? "Draft" : "Page preview"}
                    </button>
                  ))}
                </div>
              )}
              {config.pagePreview && view === "preview"
                ? <div className="not-prose"><PagePreview output={output} title={values[config.titleKey]} /></div>
                : <ReactMarkdown>{output}</ReactMarkdown>}
              <div className="mt-4 pt-4 border-t border-border/50 flex justify-end gap-2 not-prose">
                <HandoffButton payload={{ kind: "text", text: output, source: config.toolLabel }} exclude={config.handoffExclude ?? config.toolId} />
                <button onClick={download} className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1">
                  <Download className="w-3 h-3" /> Download
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(output); toast.success("Copied"); }}
                  className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy all
                </button>
              </div>
              {!loading && !isDemoMode() && (
                <div className="mt-3 pt-3 border-t border-border/50 not-prose">
                  <StyleFeedback
                    toolId={config.toolId}
                    output={output}
                    inputSummary={`${config.toolLabel} · ${(values[config.titleKey] || "").slice(0, 120)}`}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WritingToolShell;
