// Task #136 — public read-only view of a Roast My Deck result behind an
// expiring bearer-token link. No login, no nav chrome — same posture as
// PartnerReview.tsx / Share.tsx. The link id is the token; the read goes
// through the roast-share-link service-role function (the table has no anon
// grant), so this page never touches Supabase directly.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Flame } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { edgeHeaders } from "@/lib/edgeAuth";
import { isEdgeFunctionAvailable, recordEdgeFunctionStatus } from "@/lib/edgeFunctionAvailability";
import { formatRoastMarkdown, type DeckRoastResult } from "@/lib/roastMarkdown";
import SharePageCta from "@/components/SharePageCta";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
// Constant name ends in _FN so probe:functions can see the slug.
const ROAST_SHARE_FN = "roast-share-link";

interface ShareView {
  payload: DeckRoastResult;
  fileName: string | null;
  recipientLabel: string | null;
  expiresAt: string;
}

const RoastShare = () => {
  const { linkId } = useParams();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [share, setShare] = useState<ShareView | null>(null);

  useEffect(() => {
    (async () => {
      if (!linkId) return;
      if (!isEdgeFunctionAvailable(ROAST_SHARE_FN)) {
        setError("Shared roast links aren't available right now — please ask for a fresh link later.");
        setStatus("error");
        return;
      }
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/${ROAST_SHARE_FN}`, {
          method: "POST",
          headers: edgeHeaders(),
          body: JSON.stringify({ action: "view", linkId }),
        });
        recordEdgeFunctionStatus(ROAST_SHARE_FN, resp.status);
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Couldn't open this link");
        if (!data.payload || typeof data.payload !== "object" || typeof data.payload.verdict !== "string") {
          throw new Error("This link's roast is unreadable");
        }
        setShare(data as ShareView);
        setStatus("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't open this link");
        setStatus("error");
      }
    })();
  }, [linkId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-2">
          <Flame className="w-4 h-4 text-primary" />
          <span className="eyebrow text-[10px] text-primary">Deck roast · shared read-only</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {status === "loading" && (
          <div className="flex items-center gap-3 text-muted-foreground font-body text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading the roast…
          </div>
        )}

        {status === "error" && (
          <div className="bg-card border border-border/50 rounded-sm p-6">
            <p className="font-display text-lg mb-1">Couldn't open this link</p>
            <p className="text-sm text-muted-foreground font-body">{error}</p>
          </div>
        )}

        {status === "ready" && share && (
          <>
            {(share.recipientLabel || share.expiresAt) && (
              <p className="text-xs text-muted-foreground font-body mb-6">
                {share.recipientLabel ? `Prepared for ${share.recipientLabel} · ` : ""}
                Link expires {new Date(share.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
            <article className="prose prose-invert prose-sm max-w-none font-body">
              <ReactMarkdown>{formatRoastMarkdown(share.payload, share.fileName ?? "deck")}</ReactMarkdown>
            </article>
            <p className="text-[11px] text-muted-foreground/70 font-body mt-10 pt-4 border-t border-border/30">
              This is a read-only snapshot — the deck owner can revoke the link at any time.
            </p>
            <SharePageCta source="roast-share" />
          </>
        )}
      </main>
    </div>
  );
};

export default RoastShare;
