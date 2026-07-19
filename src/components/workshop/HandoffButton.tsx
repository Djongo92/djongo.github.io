import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, ArrowRight } from "lucide-react";
import { HANDOFF_TARGETS, sendTo, type HandoffPayload, type WorkshopToolId } from "@/lib/handoff";
import { toast } from "sonner";

interface Props {
  payload: HandoffPayload;
  exclude?: WorkshopToolId;       // hide the current tool from targets
  label?: string;                 // e.g. "Send to →"
  size?: "sm" | "md";
}

const HandoffButton = ({ payload, exclude, label = "Send to", size = "sm" }: Props) => {
  const [open, setOpen] = useState(false);
  const targets = HANDOFF_TARGETS.filter(
    (t) => t.id !== exclude && t.accepts.includes(payload.kind)
  );
  if (targets.length === 0) return null;

  const handle = (id: WorkshopToolId, lbl: string) => {
    sendTo(id, payload);
    setOpen(false);
    toast.success(`Sent to ${lbl}`);
  };

  const sz = size === "sm" ? "text-[11px] px-2.5 py-1" : "text-xs px-3 py-1.5";

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`${sz} font-body inline-flex items-center gap-1 rounded-sm border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 transition-colors`}
      >
        <Share2 className="w-3 h-3" /> {label}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute right-0 mt-1.5 z-50 w-56 bg-card border border-border rounded-sm shadow-2xl overflow-hidden"
            >
              <div className="px-3 py-2 text-[9px] uppercase tracking-[0.25em] text-muted-foreground font-body border-b border-border/50">
                Send to a tool
              </div>
              {targets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handle(t.id, t.label)}
                  className="w-full px-3 py-2 text-left text-xs font-body text-foreground hover:bg-primary/10 hover:text-primary flex items-center justify-between"
                >
                  {t.label}
                  <ArrowRight className="w-3 h-3 opacity-50" />
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HandoffButton;