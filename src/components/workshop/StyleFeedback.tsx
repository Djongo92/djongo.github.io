// "Keep as-is" / "Edit & save" for the 4 Workshop tools building Phase 1
// memory (bio, copywriter, rewrite — headlines captures its tournament
// champion automatically instead, see HeadlineLab.tsx). Whichever the user
// picks becomes a future few-shot example of this firm's voice — see
// _shared/styleMemory.ts on the backend for how it gets used.
import { useEffect, useState } from "react";
import { Check, Pencil, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { recordStyleFeedback, type StyleToolId } from "@/lib/styleFeedback";

interface Props {
  toolId: StyleToolId;
  output: string;
  inputSummary: string;
}

const StyleFeedback = ({ toolId, output, inputSummary }: Props) => {
  const [mode, setMode] = useState<"idle" | "editing" | "saved">("idle");
  const [draft, setDraft] = useState(output);

  // A fresh generation should get its own fresh feedback prompt, not carry
  // over "saved" from the previous draft.
  useEffect(() => {
    setMode("idle");
    setDraft(output);
  }, [output]);

  const keepAsIs = async () => {
    setMode("saved");
    await recordStyleFeedback(toolId, inputSummary, output, "approved");
    toast.success("Got it — future drafts will match this voice.");
  };

  const saveEdit = async () => {
    if (!draft.trim()) return;
    setMode("saved");
    await recordStyleFeedback(toolId, inputSummary, draft, "edited");
    toast.success("Saved your edit — future drafts will match this voice.");
  };

  if (mode === "saved") {
    return (
      <p className="text-[11px] text-emerald-500 font-body inline-flex items-center gap-1.5">
        <Check className="w-3 h-3" /> Saved to this firm's style memory
      </p>
    );
  }

  if (mode === "editing") {
    return (
      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={6}
          className="w-full bg-card border border-primary/40 rounded-sm px-3 py-2.5 text-sm font-body focus:outline-none focus:border-primary resize-none"
        />
        <div className="flex items-center gap-2">
          <button onClick={saveEdit} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-sm font-body">
            Save my version
          </button>
          <button onClick={() => setMode("idle")} className="text-xs text-muted-foreground hover:text-foreground font-body">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={keepAsIs} className="text-[11px] text-muted-foreground hover:text-primary font-body inline-flex items-center gap-1">
        <ThumbsUp className="w-3 h-3" /> Keep as-is
      </button>
      <button onClick={() => setMode("editing")} className="text-[11px] text-muted-foreground hover:text-primary font-body inline-flex items-center gap-1">
        <Pencil className="w-3 h-3" /> Edit &amp; save my version
      </button>
    </div>
  );
};

export default StyleFeedback;
