// A first-open guided tour: dims the screen and cuts a spotlight around
// one real, already-rendered element at a time (found via a
// data-coachmark attribute, not a synthetic mockup of the UI). Targets
// are matched with querySelectorAll rather than getElementById because
// the same logical target (e.g. "Workshop" nav) legitimately exists
// twice in the DOM — once in the desktop sidebar, once in the mobile tab
// bar — and only one is actually rendered (non-zero size) at a time.
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface CoachMarkStep {
  target: string;
  title: string;
  body: string;
}

interface Props {
  steps: CoachMarkStep[];
  active: boolean;
  onDone: () => void;
}

const PADDING = 8;
const BUBBLE_WIDTH = 288;

const findVisibleRect = (target: string): DOMRect | null => {
  const els = document.querySelectorAll(`[data-coachmark="${target}"]`);
  for (const el of Array.from(els)) {
    const rect = (el as HTMLElement).getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return rect;
  }
  return null;
};

const CoachMarks = ({ steps, active, onDone }: Props) => {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const measure = useCallback(() => {
    const target = steps[step]?.target;
    setRect(target ? findVisibleRect(target) : null);
  }, [step, steps]);

  useEffect(() => {
    if (!active) return;
    setStep(0);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, measure]);

  // A target that never renders for this user (e.g. the score ring before
  // any audit has run) shouldn't strand the tour on a blank dimmed screen —
  // give the target one render cycle to mount, then skip past it.
  useEffect(() => {
    if (!active || rect) return;
    const target = steps[step]?.target;
    if (!target) return;
    const t = setTimeout(() => {
      if (!findVisibleRect(target)) {
        setStep((s) => (s < steps.length - 1 ? s + 1 : s));
        if (step === steps.length - 1) onDone();
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step, rect]);

  if (!active) return null;
  const current = steps[step];
  if (!current) return null;
  const isLast = step === steps.length - 1;

  const next = () => (isLast ? onDone() : setStep((s) => s + 1));

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1280;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const bubbleTop = rect
    ? rect.bottom + 200 < viewportH
      ? rect.bottom + 16
      : Math.max(16, rect.top - 190)
    : viewportH / 2 - 90;
  const bubbleLeft = rect
    ? Math.min(Math.max(16, rect.left), viewportW - BUBBLE_WIDTH - 16)
    : viewportW / 2 - BUBBLE_WIDTH / 2;

  return (
    <AnimatePresence>
      <motion.div
        key="coachmarks-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] print:hidden"
      >
        {rect ? (
          <motion.div
            className="fixed rounded-2xl pointer-events-none border-2 border-primary"
            animate={{
              top: rect.top - PADDING,
              left: rect.left - PADDING,
              width: rect.width + PADDING * 2,
              height: rect.height + PADDING * 2,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ boxShadow: "0 0 0 9999px hsl(var(--background) / 0.78)" }}
          />
        ) : (
          <div className="fixed inset-0 bg-background/78" onClick={onDone} />
        )}

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed bg-card hairline border rounded-2xl shadow-apple-lg p-4"
          style={{ top: bubbleTop, left: bubbleLeft, width: BUBBLE_WIDTH }}
        >
          <p className="text-[10px] tracking-[0.15em] uppercase text-primary font-body mb-1">
            {step + 1} of {steps.length}
          </p>
          <h4 className="font-display text-base text-foreground mb-1.5">{current.title}</h4>
          <p className="text-xs text-muted-foreground font-body leading-relaxed mb-4">{current.body}</p>
          <div className="flex items-center justify-between">
            <button onClick={onDone} className="text-xs text-muted-foreground hover:text-foreground font-body tap-scale">
              Skip
            </button>
            <button
              onClick={next}
              className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-body tap-scale"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CoachMarks;
