// "My Library" — everything this firm has kept or edited in the Workshop,
// as reusable templates, plus the voice profile the Workshop has learned
// from them. The point: the more a firm uses the Workshop, the more this
// fills up and the more every tool sounds like the firm.
import { useEffect, useState } from "react";
import { Copy, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { loadLibrary, removeLibraryItem, type LibraryItem, type VoiceProfileInfo } from "@/lib/workshopLibrary";
import { WORKSHOP_TOOL_LABELS } from "@/lib/workshopToolCatalog";
import { useAuth } from "@/hooks/useAuth";
import { isDemoMode } from "@/lib/demoMode";
import HandoffButton from "./HandoffButton";

const EXTRA_LABELS: Record<string, string> = { submission: "Directory Submission", pagedraft: "Page Drafter" };
const labelFor = (toolId: string) =>
  (WORKSHOP_TOOL_LABELS as Record<string, string>)[toolId] ?? EXTRA_LABELS[toolId] ?? toolId;

const MyLibrary = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [voice, setVoice] = useState<VoiceProfileInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;
    loadLibrary().then((r) => {
      if (cancelled) return;
      if (!r) { setFailed(true); setItems([]); return; }
      setItems(r.items);
      setVoice(r.voiceProfile);
    });
    return () => { cancelled = true; };
  }, [user]);

  if (isDemoMode()) {
    return (
      <p className="text-sm text-muted-foreground font-body py-10 text-center">
        Your library fills as you keep or edit drafts in the Workshop. It isn't available in demo mode.
      </p>
    );
  }
  if (items === null) {
    return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  const tools = ["All", ...Array.from(new Set(items.map((i) => i.tool_id)))];
  const shown = filter === "All" ? items : items.filter((i) => i.tool_id === filter);

  const remove = async (id: string) => {
    const r = await removeLibraryItem(id);
    if (r?.ok) setItems((cur) => (cur ?? []).filter((i) => i.id !== id));
    else toast.error("Couldn't remove that.");
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border/50 rounded-sm p-5">
        <p className="eyebrow text-[10px] text-primary mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Your voice, as the Workshop has learned it
        </p>
        {voice ? (
          <>
            <p className="text-sm text-foreground font-body whitespace-pre-line">{voice.profile}</p>
            <p className="text-[10px] text-muted-foreground font-body mt-3">
              Built from {voice.example_count} drafts you kept or edited. It sharpens as you keep more, and every tool uses it.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground font-body">
            Not learned yet. Use “Keep as-is” or “Edit &amp; save” on a few drafts (three or more) and the Workshop will write
            you a style guide it then applies to every tool.
          </p>
        )}
      </div>

      {failed && <p className="text-xs text-destructive font-body">Couldn't load your library right now.</p>}

      {items.length === 0 && !failed ? (
        <p className="text-sm text-muted-foreground font-body py-6 text-center">
          Nothing saved yet. Drafts you keep or edit appear here as your own templates.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {tools.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`text-[11px] font-body px-3 py-1.5 rounded-full border transition-all ${
                  filter === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {t === "All" ? "All" : labelFor(t)}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {shown.map((i) => (
              <div key={i.id} className="bg-card border border-border/50 rounded-sm p-4 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="eyebrow text-[9px] text-primary">{labelFor(i.tool_id)}{i.voice_tag ? ` · ${i.voice_tag}` : ""}</span>
                  <span className="text-[10px] text-muted-foreground font-body">
                    {i.verdict === "edited" ? "Your edit" : "Kept"} · {new Date(i.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-body mb-2 line-clamp-1">{i.input_summary}</p>
                <p className="text-sm text-foreground font-body whitespace-pre-line line-clamp-6 flex-1">{i.final_text}</p>
                <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  <button
                    onClick={() => remove(i.id)}
                    aria-label="Remove from library"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-2">
                    <HandoffButton payload={{ kind: "text", text: i.final_text, source: "My Library" }} label="Use in" />
                    <button
                      onClick={() => { navigator.clipboard.writeText(i.final_text); toast.success("Copied"); }}
                      className="text-xs text-primary hover:text-gold-light font-body inline-flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MyLibrary;
