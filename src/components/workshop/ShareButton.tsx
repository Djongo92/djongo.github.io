import { useState } from "react";
import { Link2, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { fnUrl, authHeaders } from "./shared";

type Kind = "roast" | "autopsy" | "audit" | "teardown" | "headline" | "bio" | "maturity" | "roadmap" | "pitch" | "calendar" | "copy";

interface Props {
  kind: Kind;
  title: string;
  payload: unknown;
  sourceUrl?: string;
  size?: "sm" | "md";
}

const ShareButton = ({ kind, title, payload, sourceUrl, size = "sm" }: Props) => {
  const [loading, setLoading] = useState(false);
  const [shared, setShared] = useState(false);

  const share = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const r = await fetch(fnUrl("create-share"), {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ kind, title, payload, sourceUrl }),
      });
      if (!r.ok) { toast.error("Couldn't create share link"); return; }
      const { id } = await r.json();
      const link = `${window.location.origin}/share/${id}`;
      await navigator.clipboard.writeText(link);
      setShared(true);
      toast.success("Share link copied", { description: link });
      setTimeout(() => setShared(false), 2500);
    } catch (e) { console.error(e); toast.error("Couldn't share"); }
    finally { setLoading(false); }
  };

  const sz = size === "sm" ? "text-[11px] px-2.5 py-1" : "text-xs px-3 py-1.5";
  return (
    <button
      onClick={share}
      disabled={loading}
      className={`${sz} font-body inline-flex items-center gap-1 rounded-sm border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 transition-colors disabled:opacity-50`}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : shared ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
      {shared ? "Copied" : "Share link"}
    </button>
  );
};

export default ShareButton;