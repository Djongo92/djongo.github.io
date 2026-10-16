import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { History, Search, Trash2, ArrowRight, Inbox } from "lucide-react";
import { useWorkshopHistory } from "@/hooks/useWorkshopHistory";
import { sendTo, type WorkshopToolId } from "@/lib/handoff";
import { toast } from "sonner";

const since = (ts: number) => {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
};

interface Props {
  onOpenTool?: (id: string) => void;
}

const MyWorkshopDrawer = ({ onOpenTool }: Props) => {
  const { runs, remove, clear } = useWorkshopHistory();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return runs;
    const needle = q.toLowerCase();
    return runs.filter(
      (r) =>
        r.title.toLowerCase().includes(needle) ||
        r.toolLabel.toLowerCase().includes(needle) ||
        (r.preview || "").toLowerCase().includes(needle)
    );
  }, [q, runs]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary font-body px-3 py-1.5 rounded-sm border border-border/60 hover:border-primary/40 transition-colors"
          aria-label="Open Workshop history"
        >
          <History className="w-3.5 h-3.5" />
          My Workshop
          {runs.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">{runs.length}</span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b border-border/50">
          <SheetTitle className="font-display text-lg flex items-center gap-2">
            <History className="w-4 h-4 text-primary" /> My Workshop
          </SheetTitle>
          <p className="text-[11px] text-muted-foreground font-body">
            Your last {runs.length} runs · saved to this browser
          </p>
        </SheetHeader>

        <div className="px-6 py-3 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search runs…"
              className="w-full bg-card border border-border rounded-sm pl-8 pr-3 py-2 text-xs font-body focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-xs font-body italic">
                {runs.length === 0 ? "No runs yet. Generate something." : "No matches."}
              </p>
            </div>
          )}
          {filtered.map((r) => (
            <div key={r.id} className="group bg-card border border-border/50 rounded-sm p-3 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] uppercase tracking-wider text-primary font-body">{r.toolLabel}</div>
                  <div className="text-sm font-display text-foreground truncate">{r.title}</div>
                </div>
                <span className="text-[10px] text-muted-foreground font-body shrink-0">{since(r.createdAt)}</span>
              </div>
              {r.preview && (
                <p className="text-[11px] text-muted-foreground font-body line-clamp-2 mb-2">{r.preview}</p>
              )}
              <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                {r.output && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(r.output!);
                      toast.success("Copied");
                    }}
                    className="text-[10px] font-body text-muted-foreground hover:text-primary px-2 py-1"
                  >
                    Copy
                  </button>
                )}
                {r.output && (
                  <button
                    onClick={() => {
                      sendTo("autopsy", { kind: "text", text: r.output!, source: r.toolLabel });
                      onOpenTool?.("autopsy");
                    }}
                    className="text-[10px] font-body text-muted-foreground hover:text-primary px-2 py-1"
                  >
                    → Autopsy
                  </button>
                )}
                <button
                  onClick={() => onOpenTool?.(r.toolId)}
                  className="text-[10px] font-body text-primary hover:text-gold-light px-2 py-1 inline-flex items-center gap-1"
                >
                  Open <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => remove(r.id)}
                  className="text-[10px] text-muted-foreground hover:text-destructive p-1"
                  aria-label="Delete run"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {runs.length > 0 && (
          <div className="px-6 py-3 border-t border-border/50">
            <button
              onClick={() => { clear(); toast.success("History cleared"); }}
              className="text-[11px] text-muted-foreground hover:text-destructive font-body"
            >
              Clear all history
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default MyWorkshopDrawer;