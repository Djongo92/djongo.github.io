import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { X, Copy, Check } from "lucide-react";
import { motionReveal } from "@/lib/motion";
import { measuredScoreLabel, toScale500, type computeMeasuredTotals } from "@/lib/measuredScore";
import { downloadScoreCard } from "@/lib/visibilityScoreCard";
import { TOTAL_MAX } from "../../../supabase/functions/_shared/methodology";
import type { AuditRow } from "./auditTypes";

type Measured = ReturnType<typeof computeMeasuredTotals>;

/** "<firm> scored <score> on the Market Visibility Score", the shared start
 *  of every social post. */
export function shareHeadline(audit: AuditRow, measured: Measured): string {
  const score = Math.round(audit.total_score);
  const firm = audit.display_name || audit.audited_domain;
  const scoreLine = measured ? measuredScoreLabel(score, measured) : `${toScale500(score, TOTAL_MAX)} / 500`;
  return `${firm} scored ${scoreLine} on the Market Visibility Score`;
}

interface ShareCardDialogProps {
  open: boolean;
  /** The rendered score card image; the dialog stays closed until it exists. */
  imageUrl: string | null;
  audit: AuditRow;
  measured: Measured;
  onClose: () => void;
}

/** Preview of the score card with share (LinkedIn, X, copy link) and download. */
export default function ShareCardDialog({ open, imageUrl, audit, measured, onClose }: ShareCardDialogProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  if (!open || !imageUrl) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={() => onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={motionReveal}
        className="bg-card border border-border rounded-sm p-5 max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-display text-foreground">Score card preview</span>
          <button onClick={() => onClose()} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <img src={imageUrl} alt="Visibility score card" className="w-full rounded-sm mb-5 border border-border/30" />
        <div className="space-y-3">
          {/* Social share row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                const url = `${window.location.origin}/app/`;
                const text = `${shareHeadline(audit, measured)} — real, externally-verified data on legal market presence.`;
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`, "_blank", "width=600,height=500");
              }}
              className="flex flex-col items-center justify-center gap-1 bg-[#0A66C2] hover:bg-[#0958A8] text-white py-2.5 text-[11px] font-body rounded-sm transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </button>
            <button
              onClick={() => {
                const url = `${window.location.origin}/app/`;
                const text = `${shareHeadline(audit, measured)} — real, externally-verified legal market data.\n\n${url}`;
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "width=600,height=500");
              }}
              className="flex flex-col items-center justify-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-white py-2.5 text-[11px] font-body rounded-sm transition-colors border border-zinc-700"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              X / Twitter
            </button>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${window.location.origin}/app/`);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Couldn't copy the link");
                }
              }}
              className="flex flex-col items-center justify-center gap-1 bg-card border border-border hover:border-primary/40 py-2.5 text-[11px] font-body rounded-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <Copy className="w-3.5 h-3.5 flex-shrink-0" />}
              {copiedLink ? "Copied!" : "Copy link"}
            </button>
          </div>
          {/* Download + dismiss */}
          <div className="flex gap-3">
            <button
              onClick={() => { downloadScoreCard(audit); onClose(); }}
              className="flex-1 bg-primary text-primary-foreground px-4 py-2 text-sm font-body rounded-sm hover:bg-gold-light transition-colors font-medium"
            >
              Download PNG
            </button>
            <button
              onClick={() => onClose()}
              className="px-4 py-2 text-sm font-body text-muted-foreground hover:text-foreground border border-border rounded-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
