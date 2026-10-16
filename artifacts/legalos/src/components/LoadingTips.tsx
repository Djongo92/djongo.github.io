// Shared "while you wait" tips strip for any analysis that can run long —
// one tip at a time, rotating while the operation is in flight. `afterMs`
// gates appearance: known-long runs (Roast, Market Visibility, teardowns)
// pass 0 and show it from the first second, while usually-fast tools pass
// ~10s so the strip only appears when the wait genuinely drags — a fast
// result never flashes it (per product decision: waits over ~10 seconds
// earn the strip).
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { AUDIT_LOADING_TIPS, nextAuditLoadingTipIndex } from "@/lib/auditLoadingTips";

const ROTATE_MS = 4800;

export function LoadingTips({ active, afterMs = 0 }: { active: boolean; afterMs?: number }) {
  const [tipIndex, setTipIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      setTipIndex(0);
      return;
    }
    if (afterMs <= 0) {
      setVisible(true);
      return;
    }
    const showTimeout = window.setTimeout(() => setVisible(true), afterMs);
    return () => window.clearTimeout(showTimeout);
  }, [active, afterMs]);

  useEffect(() => {
    if (!visible) return;
    const intervalId = window.setInterval(() => {
      setTipIndex(nextAuditLoadingTipIndex);
    }, ROTATE_MS);
    return () => window.clearInterval(intervalId);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="text-left" role="status" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tipIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="flex gap-2"
        >
          <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] eyebrow text-primary">{AUDIT_LOADING_TIPS[tipIndex].title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground font-body">
              {AUDIT_LOADING_TIPS[tipIndex].body}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
