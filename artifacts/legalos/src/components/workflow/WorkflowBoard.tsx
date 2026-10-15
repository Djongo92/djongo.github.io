// §8 — Workflow: turns the Battle Plan into a system — a kanban the firm
// drags work through (to do → in progress → in review → approved → done),
// with comments (text or a recorded voice note), evidence, due dates, and a
// single-purpose expiring mobile link so a partner who won't log in can
// review and approve from their phone.
import { useState } from "react";
import { Plus, Trash2, Link2, Loader2, CheckCircle2, MessageSquare, Paperclip, Copy } from "lucide-react";
import { toast } from "sonner";
import { useWorkflowItems, type WorkflowItem, type WorkflowStatus } from "@/hooks/useWorkflowItems";
import { useAuth } from "@/hooks/useAuth";
import { useFirmTeam } from "@/hooks/useFirmTeam";
import { can } from "@/lib/roles";
import VoiceRecorder from "@/components/workflow/VoiceRecorder";
import DemoOnly from "@/components/DemoOnly";

const STATUS_LABELS: Record<WorkflowStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  approved: "Approved",
  done: "Done",
};
const STATUS_ORDER: WorkflowStatus[] = ["todo", "in_progress", "in_review", "approved", "done"];

interface RoadmapSeed {
  title: string;
  description: string;
  phaseLabel: string;
  chapterRef: string;
}

interface Props {
  roadmapActions?: RoadmapSeed[];
}

const inputClass = "bg-background border border-border text-foreground text-xs font-body px-2.5 py-1.5 rounded-sm focus:outline-none focus:border-primary";

const WorkflowBoard = ({ roadmapActions = [] }: Props) => {
  const { user } = useAuth();
  const { team } = useFirmTeam();
  const myRole = team?.members.find((m) => m.user_id === user?.id)?.role;
  const canComment = !team || can(myRole, "canComment");
  const canApprove = !team || can(myRole, "canApproveWorkflow");
  const isConsultant = myRole === "consultant";

  const { items, comments, loading, create, update, remove, addComment, createPartnerLink } = useWorkflowItems();
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentVoice, setCommentVoice] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creatingLink, setCreatingLink] = useState(false);
  const [recipientLabel, setRecipientLabel] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  // Kanban drag state — the dragged card's id plus the column currently
  // hovered, which drives the drop-zone highlight.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<WorkflowStatus | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const result = await create({ title: newTitle, description: newDescription || undefined, dueDate: newDueDate || undefined });
    if ("error" in result) toast.error(result.error);
    else {
      setNewTitle("");
      setNewDescription("");
      setNewDueDate("");
    }
  };

  const handleSeedFromRoadmap = async (seed: RoadmapSeed) => {
    const result = await create({
      title: seed.title,
      description: seed.description,
      source: "roadmap_action",
      sourceRef: { phaseLabel: seed.phaseLabel, chapterRef: seed.chapterRef },
    });
    if ("error" in result) toast.error(result.error);
    else toast.success("Added to workflow");
  };

  /** Moves a card, enforcing the same gates the select always had. */
  const moveItem = async (item: WorkflowItem, status: WorkflowStatus) => {
    if (item.status === status) return;
    if (status === "approved" && !canApprove) {
      toast.error("Only someone with approval rights can move an item to Approved");
      return;
    }
    if (item.status === "approved" && !canApprove) {
      // Un-approving is the same decision in reverse — same gate.
      toast.error("Only someone with approval rights can move an item out of Approved");
      return;
    }
    if (!canComment) return;
    const result = await update(item.id, { status });
    if ("error" in result) toast.error(result.error);
  };

  const handleDelete = async (id: string) => {
    const result = await remove(id);
    if ("error" in result) toast.error(result.error);
  };

  const handleAddComment = async (itemId: string) => {
    if (!commentDraft.trim() && !commentVoice) return;
    setSubmittingComment(true);
    const result = await addComment(
      itemId, commentDraft.trim() || undefined, commentVoice ?? undefined, evidenceUrl.trim() || undefined,
      internalNote ? "internal" : "client",
    );
    setSubmittingComment(false);
    if ("error" in result) toast.error(result.error);
    else {
      setCommentDraft("");
      setCommentVoice(null);
      setEvidenceUrl("");
      setInternalNote(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateLink = async () => {
    if (selected.size === 0) return;
    setCreatingLink(true);
    const result = await createPartnerLink(Array.from(selected), recipientLabel.trim() || undefined, 7);
    setCreatingLink(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    const url = `${window.location.origin}${import.meta.env.BASE_URL}partner-review/${result.linkId}`;
    setGeneratedLink(url);
  };

  const copyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    toast.success("Link copied");
  };

  const handleDrop = (status: WorkflowStatus) => (e: React.DragEvent) => {
    e.preventDefault();
    setDropTarget(null);
    // dataTransfer can be absent on synthetic/assisted drops — fall back to
    // the id captured at drag start before giving up.
    const id = (e.dataTransfer?.getData("text/plain") ?? "") || draggingId;
    setDraggingId(null);
    const item = id ? items.find((i) => i.id === id) : undefined;
    if (!item) return;
    void moveItem(item, status);
  };

  const endDrag = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  const renderCard = (item: WorkflowItem) => {
    const itemComments = comments.filter((c) => c.item_id === item.id);
    const isExpanded = expandedId === item.id;
    const dragLocked = !canComment || (item.status === "approved" && !canApprove);
    return (
      <div
        key={item.id}
        draggable={!dragLocked}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", item.id);
          e.dataTransfer.effectAllowed = "move";
          setDraggingId(item.id);
        }}
        onDragEnd={endDrag}
        className={`bg-card border border-border/40 rounded-sm p-2.5 space-y-1.5 ${
          dragLocked ? "" : "cursor-grab active:cursor-grabbing"
        } ${draggingId === item.id ? "opacity-40" : ""}`}
      >
        <div className="flex items-start gap-1.5">
          <input
            type="checkbox"
            checked={selected.has(item.id)}
            onChange={() => toggleSelected(item.id)}
            className="mt-0.5 shrink-0"
            title="Select for partner review link"
          />
          <p className="text-xs font-body text-foreground flex-1 min-w-0">{item.title}</p>
          {canComment && (
            <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {item.description && (
          <p className="text-[11px] text-muted-foreground font-body line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {item.due_date && (
            <span className="text-[10px] text-muted-foreground font-body">Due {new Date(item.due_date).toLocaleDateString()}</span>
          )}
          {item.status === "approved" && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-body">
              <CheckCircle2 className="w-3 h-3" /> Approved
            </span>
          )}
          <button
            onClick={() => setExpandedId(isExpanded ? null : item.id)}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary font-body"
          >
            <MessageSquare className="w-3 h-3" /> {itemComments.length || ""} {itemComments.length === 1 ? "comment" : "comments"}
          </button>
        </div>
        {/* The select stays alongside drag-and-drop: keyboard and touch users
            need a move affordance, and it carries the permission gates. */}
        <select
          value={item.status}
          aria-label={`Status for ${item.title}`}
          onChange={(e) => void moveItem(item, e.target.value as WorkflowStatus)}
          disabled={item.status === "approved" ? !canApprove : !canComment}
          className={`${inputClass} text-[10px] w-full`}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s} disabled={s === "approved" && !canApprove}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        {isExpanded && (
          <div className="pt-2 border-t border-border/30 space-y-2">
            {itemComments.map((c) => (
              <div key={c.id} className={`text-xs font-body rounded-sm px-2.5 py-2 ${c.visibility === "internal" ? "bg-amber-500/10 border border-amber-500/30" : "bg-secondary/30"}`}>
                <p className="text-[10px] text-muted-foreground mb-1">
                  {c.author_label} · {new Date(c.created_at).toLocaleString()}
                  {c.visibility === "internal" && <span className="ml-1.5 text-amber-500 uppercase tracking-wide">Internal only</span>}
                </p>
                {c.body && <p className="text-foreground">{c.body}</p>}
                {c.voice_note_data_url && <audio controls src={c.voice_note_data_url} className="mt-1 h-8 w-full" />}
                {c.evidence_url && (
                  <a href={c.evidence_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:text-gold-light mt-1">
                    <Paperclip className="w-3 h-3" /> Evidence
                  </a>
                )}
              </div>
            ))}
            {canComment && (
              <div className="space-y-1.5">
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Add a comment…"
                  rows={2}
                  className={`${inputClass} w-full`}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <VoiceRecorder onRecorded={setCommentVoice} disabled={submittingComment} />
                  <input
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="Evidence link (optional)"
                    className={`${inputClass} flex-1 min-w-[140px]`}
                  />
                </div>
                {isConsultant && (
                  <label className="flex items-center gap-1.5 text-[11px] font-body text-amber-500 cursor-pointer">
                    <input type="checkbox" checked={internalNote} onChange={(e) => setInternalNote(e.target.checked)} />
                    Internal note (hidden from the client)
                  </label>
                )}
                <button
                  onClick={() => handleAddComment(item.id)}
                  disabled={submittingComment || (!commentDraft.trim() && !commentVoice)}
                  className="text-xs font-body bg-primary text-primary-foreground px-3 py-1.5 rounded-sm disabled:opacity-40"
                >
                  {submittingComment ? "Posting…" : "Post comment"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <DemoOnly>
        <p className="text-[11px] text-muted-foreground font-body italic">
          Sample board — try it: drag cards between columns, add items, post a comment. Changes stay in this browser.
        </p>
      </DemoOnly>
      {roadmapActions.length > 0 && (
        <div>
          <p className="eyebrow text-[10px] text-muted-foreground mb-2">
            Add a roadmap action to your workflow
          </p>
          <div className="flex flex-wrap gap-2">
            {roadmapActions.slice(0, 6).map((seed, i) => (
              <button
                key={i}
                onClick={() => handleSeedFromRoadmap(seed)}
                disabled={!canComment}
                className="text-xs font-body px-2.5 py-1.5 rounded-sm border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-40"
              >
                <Plus className="w-3 h-3 inline mr-1" /> {seed.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {canComment && (
        <form onSubmit={handleCreate} className="bg-secondary/30 border border-border/40 rounded-sm p-3 space-y-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New workflow item title"
            className={`${inputClass} w-full`}
          />
          <div className="flex gap-2">
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              className={`${inputClass} flex-1`}
            />
            <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className={inputClass} />
          </div>
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="inline-flex items-center gap-1.5 text-xs font-body bg-primary text-primary-foreground px-3 py-1.5 rounded-sm disabled:opacity-40"
          >
            <Plus className="w-3 h-3" /> Add item
          </button>
        </form>
      )}

      {/* The kanban itself: one column per status, cards draggable between
          them. Horizontal scroll rather than crushing five columns into a
          narrow viewport. */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {STATUS_ORDER.map((status) => {
          const columnItems = items.filter((i) => i.status === status);
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                if (dropTarget !== status) setDropTarget(status);
              }}
              onDrop={handleDrop(status)}
              className={`min-w-[230px] w-[230px] shrink-0 rounded-sm border p-2 space-y-2 transition-colors ${
                dropTarget === status && draggingId
                  ? "border-primary/60 bg-primary/5"
                  : "border-border/30 bg-secondary/20"
              }`}
            >
              <div className="flex items-center justify-between px-1 pt-0.5">
                <p className="eyebrow text-[10px] text-muted-foreground">{STATUS_LABELS[status]}</p>
                <span className="text-[10px] text-muted-foreground font-mono">{columnItems.length}</span>
              </div>
              {columnItems.map(renderCard)}
              {columnItems.length === 0 && (
                <p className="text-[10px] text-muted-foreground/50 font-body italic px-1 py-3 text-center">
                  Drop items here
                </p>
              )}
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground font-body italic">No workflow items yet — add one above.</p>
      )}

      {items.length > 0 && (
        <div className="bg-secondary/30 border border-border/40 rounded-sm p-3 space-y-2">
          <p className="eyebrow text-[10px] text-muted-foreground">
            Partner review — no login required
          </p>
          <p className="text-[11px] text-muted-foreground font-body">
            Check the cards you want a partner to review, then generate a single-purpose link that expires in 7 days.
          </p>
          <div className="flex gap-2">
            <input
              value={recipientLabel}
              onChange={(e) => setRecipientLabel(e.target.value)}
              placeholder="Recipient name (optional)"
              className={`${inputClass} flex-1`}
            />
            <button
              onClick={handleCreateLink}
              disabled={selected.size === 0 || creatingLink}
              className="inline-flex items-center gap-1.5 text-xs font-body bg-primary text-primary-foreground px-3 py-1.5 rounded-sm disabled:opacity-40"
            >
              <Link2 className="w-3 h-3" /> {creatingLink ? "Creating…" : `Create link (${selected.size})`}
            </button>
          </div>
          {generatedLink && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 bg-background border border-border/50 rounded-sm px-2.5 py-2">
                <code className="text-[11px] font-mono text-foreground truncate flex-1">{generatedLink}</code>
                <button onClick={copyLink} className="text-muted-foreground hover:text-primary shrink-0">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <DemoOnly>
                <p className="text-[11px] text-muted-foreground font-body italic">
                  Sample link — a real account generates a working review page that expires in 7 days.
                </p>
              </DemoOnly>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkflowBoard;
