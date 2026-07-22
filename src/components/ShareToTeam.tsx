import { useState } from "react";
import { Send, X, Mail, Copy, Check } from "lucide-react";
import { Chapter } from "@/data/chapters";
import { toast } from "sonner";
import ModalShell from "@/components/ui/modal-shell";

const ShareToTeam = ({ chapter }: { chapter: Chapter }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const buildSummary = () => {
    const takeaways = chapter.content
      .filter((s) => s.pullQuote)
      .map((s) => `• ${s.pullQuote}`)
      .slice(0, 3)
      .join("\n");
    const actions = chapter.actionItems?.map((a, i) => `${i + 1}. ${a.text}`).join("\n") || "";
    return `Chapter ${chapter.number}: ${chapter.title}
${chapter.subtitle}

KEY TAKEAWAYS:
${takeaways}

ACTION ITEMS:
${actions}

— Sent from LegalOS`;
  };

  const summary = buildSummary();

  const copyText = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Summary copied to clipboard");
  };

  const emailIt = () => {
    const subject = encodeURIComponent(`Chapter ${chapter.number}: ${chapter.title}`);
    const body = encodeURIComponent(summary);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-muted-foreground hover:text-primary transition-colors"
        aria-label="Send to team"
      >
        <Send className="w-4 h-4" />
      </button>

      <ModalShell open={open} onClose={() => setOpen(false)} maxWidthClass="max-w-md">
              <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-display text-base text-foreground flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" /> Send to your team
                </h3>
                <button onClick={() => setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5">
                <p className="text-xs text-muted-foreground font-body mb-3">
                  Share a clean summary of this chapter and its action items with your associates.
                </p>
                <pre className="bg-muted/30 border border-border/30 rounded-sm p-3 text-[11px] font-body text-secondary-foreground/80 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {summary}
                </pre>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={emailIt}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-sm font-body text-sm hover:bg-primary/90 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" /> Email
                  </button>
                  <button
                    onClick={copyText}
                    className="flex-1 flex items-center justify-center gap-2 border border-border py-2 rounded-sm font-body text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
      </ModalShell>
    </>
  );
};

export default ShareToTeam;
