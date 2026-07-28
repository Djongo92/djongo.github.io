// §8 — Workflow: the single-purpose expiring mobile link a partner opens
// with no login. Branded, read-only-except-for-comment/approve, no nav
// chrome — same posture as Share.tsx and the public rankings pages.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, ShieldCheck, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { edgeHeaders } from "@/lib/edgeAuth";
import VoiceRecorder from "@/components/workflow/VoiceRecorder";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface ReviewItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
}

interface ReviewComment {
  id: string;
  item_id: string;
  author_label: string;
  body: string | null;
  voice_note_data_url: string | null;
  created_at: string;
}

const call = async (payload: Record<string, unknown>) => {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/workflow-partner-link`, {
    method: "POST",
    headers: edgeHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Something went wrong");
  return data;
};

const PartnerReview = () => {
  const { linkId } = useParams();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [recipientLabel, setRecipientLabel] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [voiceDrafts, setVoiceDrafts] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = async () => {
    if (!linkId) return;
    try {
      const data = await call({ action: "view", linkId });
      setRecipientLabel(data.recipientLabel);
      setItems(data.items ?? []);
      setComments(data.comments ?? []);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load this review link");
      setStatus("error");
    }
  };

  useEffect(() => { load(); }, [linkId]);

  const handleComment = async (itemId: string) => {
    const body = drafts[itemId]?.trim();
    const voice = voiceDrafts[itemId];
    if (!body && !voice) return;
    setSubmitting(itemId);
    try {
      await call({ action: "comment", linkId, itemId, body, voiceNoteDataUrl: voice });
      setDrafts((d) => ({ ...d, [itemId]: "" }));
      setVoiceDrafts((d) => ({ ...d, [itemId]: null }));
      toast.success("Comment sent");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't post the comment");
    } finally {
      setSubmitting(null);
    }
  };

  const handleApprove = async (itemId: string) => {
    setSubmitting(itemId);
    try {
      await call({ action: "approve", linkId, itemId });
      toast.success("Approved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't approve");
    } finally {
      setSubmitting(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <XCircle className="w-8 h-8 text-destructive mx-auto mb-4" />
          <p className="font-display text-xl text-foreground mb-2">Couldn't open this link</p>
          <p className="text-sm text-muted-foreground font-body">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-body">Partner review</span>
        </div>
        <h1 className="font-display text-2xl text-foreground mb-1">
          {recipientLabel ? `For ${recipientLabel}` : "Review these items"}
        </h1>
        <p className="text-sm text-muted-foreground font-body mb-6">
          Comment or approve directly from your phone — no account needed.
        </p>

        <div className="space-y-3">
          {items.map((item) => {
            const itemComments = comments.filter((c) => c.item_id === item.id);
            return (
              <div key={item.id} className="bg-card border border-border/50 rounded-sm p-4">
                <p className="font-body text-foreground">{item.title}</p>
                {item.description && <p className="text-xs text-muted-foreground font-body mt-1">{item.description}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-body">{item.status.replace("_", " ")}</span>
                  {item.due_date && <span className="text-[10px] text-muted-foreground font-body">· Due {new Date(item.due_date).toLocaleDateString()}</span>}
                </div>

                {itemComments.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {itemComments.map((c) => (
                      <div key={c.id} className="text-xs font-body bg-secondary/30 rounded-sm px-2.5 py-2">
                        <p className="text-[10px] text-muted-foreground mb-1">{c.author_label}</p>
                        {c.body && <p className="text-foreground">{c.body}</p>}
                        {c.voice_note_data_url && <audio controls src={c.voice_note_data_url} className="mt-1 h-8 w-full" />}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 space-y-1.5">
                  <textarea
                    value={drafts[item.id] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                    placeholder="Add a comment…"
                    rows={2}
                    className="w-full bg-background border border-border text-foreground text-xs font-body px-2.5 py-1.5 rounded-sm focus:outline-none focus:border-primary"
                  />
                  <VoiceRecorder onRecorded={(url) => setVoiceDrafts((d) => ({ ...d, [item.id]: url }))} disabled={submitting === item.id} />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleComment(item.id)}
                      disabled={submitting === item.id || (!drafts[item.id]?.trim() && !voiceDrafts[item.id])}
                      className="inline-flex items-center gap-1.5 text-xs font-body border border-border/50 text-foreground px-3 py-1.5 rounded-sm disabled:opacity-40 hover:border-primary/40"
                    >
                      <MessageSquare className="w-3 h-3" /> Comment
                    </button>
                    {item.status === "in_review" && (
                      <button
                        onClick={() => handleApprove(item.id)}
                        disabled={submitting === item.id}
                        className="inline-flex items-center gap-1.5 text-xs font-body bg-emerald-600 text-white px-3 py-1.5 rounded-sm disabled:opacity-40 hover:bg-emerald-500"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PartnerReview;
