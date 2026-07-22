import { useMemo, useState } from "react";
import { X, History, Search, Trash2 } from "lucide-react";
import { useWorkshopHistory } from "@/hooks/useWorkshopHistory";
import type { WorkshopToolId } from "@/lib/handoff";
import ModalShell from "@/components/ui/modal-shell";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenWorkshopTool: (toolId: WorkshopToolId) => void;
}

const timeAgo = (ts: number): string => {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

const WorkshopHistoryModal = ({ open, onClose, onOpenWorkshopTool }: Props) => {
  const { runs, remove, clear } = useWorkshopHistory();
  const [query, setQuery] = useState("");
  const [toolFilter, setToolFilter] = useState<string>("all");
  const [confirmingClear, setConfirmingClear] = useState(false);

  const tools = useMemo(() => {
    const set = new Set(runs.map((r) => r.toolLabel));
    return Array.from(set).sort();
  }, [runs]);

  const filtered = useMemo(() => {
    return runs.filter((r) => {
      if (toolFilter !== "all" && r.toolLabel !== toolFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return r.title.toLowerCase().includes(q) || (r.preview?.toLowerCase().includes(q) ?? false);
    });
  }, [runs, toolFilter, query]);

  const handleClear = () => {
    clear();
    setConfirmingClear(false);
  };

  return (
    <ModalShell open={open} onClose={onClose} maxWidthClass="max-w-xl">
      <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="font-display text-lg text-foreground">Workshop History</h3>
              </div>
              <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pt-4 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search runs…"
                  className="w-full bg-secondary/80 border border-border text-foreground placeholder:text-muted-foreground text-sm font-body pl-8 pr-3 py-2 rounded-sm focus:outline-none focus:border-primary"
                />
              </div>
              <select
                value={toolFilter}
                onChange={(e) => setToolFilter(e.target.value)}
                className="bg-secondary/80 border border-border text-foreground text-sm font-body px-3 py-2 rounded-sm focus:outline-none focus:border-primary"
              >
                <option value="all">All tools</option>
                {tools.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body italic">
                  {runs.length === 0 ? "Nothing run yet — the Workshop's eleven tools are one click away." : "No runs match that search."}
                </p>
              ) : (
                <div className="space-y-2">
                  {filtered.map((run) => (
                    <div key={run.id} className="flex items-start gap-3 bg-secondary/40 border border-border/40 rounded-sm px-4 py-3">
                      <button onClick={() => { onOpenWorkshopTool(run.toolId); onClose(); }} className="flex-1 min-w-0 text-left group">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-body text-muted-foreground">{run.toolLabel}</span>
                          <span className="text-[10px] font-body text-muted-foreground">{timeAgo(run.createdAt)}</span>
                        </div>
                        <p className="text-sm font-body text-foreground group-hover:text-primary transition-colors truncate">{run.title}</p>
                        {run.preview && <p className="text-xs font-body text-secondary-foreground/60 truncate">{run.preview}</p>}
                      </button>
                      <button onClick={() => remove(run.id)} className="p-1 text-muted-foreground hover:text-destructive shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {runs.length > 0 && (
              <div className="px-6 py-4 border-t border-border/50 flex justify-end">
                {!confirmingClear ? (
                  <button
                    onClick={() => setConfirmingClear(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-body text-destructive hover:opacity-80"
                  >
                    <Trash2 className="w-3 h-3" /> Clear all history
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-2">
                    <span className="text-xs font-body text-destructive">Delete all {runs.length} runs?</span>
                    <button onClick={handleClear} className="px-3 py-1 rounded-sm text-xs font-body bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes
                    </button>
                    <button onClick={() => setConfirmingClear(false)} className="px-3 py-1 rounded-sm text-xs font-body border border-border/50 text-muted-foreground hover:text-foreground">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
    </ModalShell>
  );
};

export default WorkshopHistoryModal;
