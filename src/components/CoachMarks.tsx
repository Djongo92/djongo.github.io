// A first-open guided tour: dims the screen and cuts a spotlight around
// one real, already-rendered element at a time (found via a
// data-coachmark attribute, not a synthetic mockup of the UI). Targets
// are matched with querySelectorAll rather than getElementById because
// the same logical target (e.g. "Workshop" nav) legitimately exists
// twice in the DOM — once in the desktop sidebar, once in the mobile tab
// bar — and only one is actually rendered (non-zero size) at a time.
//
// A step may also carry a `section` — when present, the tour actually
// navigates there (via onNavigate) instead of only pointing at a sidebar
// link, so this doubles as a sequenced, multi-section product tour rather
// than a single-screen annotation pass. Sections are lazy-loaded (see
// Index.tsx's Suspense skeletons), so the "target never mounts" fallback
// below polls for a few seconds rather than giving up after one frame.
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Section } from "./AppShell";

export interface CoachMarkStep {
  /** Omit for a centered, no-spotlight step (e.g. a welcome slide). */
  target?: string;
  title: string;
  body: string;
  /** Navigates here (via onNavigate) before trying to find `target`. */
  section?: Section;
}

interface Props {
  steps: CoachMarkStep[];
  active: boolean;
  onDone: () => void;
  /** Called once per step when that step names a section, so the tour can
   * actually walk through the app rather than only pointing within
   * whichever screen happened to be open when it started. */
  onNavigate?: (section: Section) => void;
}

const PADDING = 8;
const BUBBLE_WIDTH = 288;
// A freshly-navigated, lazy-loaded section (Workshop, Progress) needs time
// to fetch its chunk and mount before its target exists — generous enough
// to cover that without visibly stalling on a genuinely missing target.
const TARGET_POLL_MS = 150;
const TARGET_GIVE_UP_MS = 4000;

const findVisibleElement = (target: string): HTMLElement | null => {
  const els = document.querySelectorAll(`[data-coachmark="${target}"]`);
  for (const el of Array.from(els)) {
    const rect = (el as HTMLElement).getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el as HTMLElement;
  }
  return null;
};

const CoachMarks = ({ steps, active, onDone, onNavigate }: Props) => {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const navigatedForStep = useRef<number | null>(null);
  const revealedForStep = useRef<number | null>(null);

  // Re-measures the current step's already-found target without scrolling —
  // used by the resize/scroll listeners below just to keep the spotlight
  // glued to a moving target, not to fight a user's own manual scroll.
  const measure = useCallback(() => {
    const target = steps[step]?.target;
    const el = target ? findVisibleElement(target) : null;
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step, steps]);

  // Scrolls this step's target into view once, the first time it's found —
  // a step further down a long page (e.g. Progress's Battle Plan section)
  // would otherwise spotlight and place its callout off-screen with
  // nothing to scroll a `position: fixed` overlay into view.
  const revealStep = useCallback(() => {
    const target = steps[step]?.target;
    if (!target) {
      setRect(null);
      return true;
    }
    const el = findVisibleElement(target);
    if (!el) return false;
    if (revealedForStep.current !== step) {
      revealedForStep.current = step;
      el.scrollIntoView({ block: "center" });
    }
    setRect(el.getBoundingClientRect());
    return true;
  }, [step, steps]);

  useEffect(() => {
    if (!active) return;
    setStep(0);
    navigatedForStep.current = null;
    revealedForStep.current = null;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    return () => previouslyFocused.current?.focus();
  }, [active]);

  // Walk to this step's section, once, the first time it's reached — not
  // on every re-measure, so scrolling/resizing while reading a step doesn't
  // re-trigger navigation.
  useEffect(() => {
    if (!active) return;
    const section = steps[step]?.section;
    if (section && onNavigate && navigatedForStep.current !== step) {
      navigatedForStep.current = step;
      onNavigate(section);
    }
  }, [active, step, steps, onNavigate]);

  // Escape skips the whole tour, same as clicking Skip.
  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [active, onDone]);

  // Move focus into the callout on every step change so keyboard/screen
  // reader users land on the new copy without hunting for it, and so
  // Tab reaches Skip/Next immediately.
  useEffect(() => {
    if (!active) return;
    bubbleRef.current?.focus();
  }, [active, step]);

  // Reveal (scroll-and-measure) once per step change; the listeners below
  // only re-measure afterward, so a user's own manual scroll during a step
  // isn't fought by re-snapping back to center.
  useEffect(() => {
    if (!active) return;
    revealStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step]);

  useEffect(() => {
    if (!active) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, measure]);

  // A target that never renders for this user (e.g. the score ring before
  // any audit has run, or a section still fetching its lazy chunk)
  // shouldn't strand the tour on a blank dimmed screen — poll for a few
  // seconds, then skip past it if it genuinely never shows up.
  useEffect(() => {
    if (!active || rect) return;
    const target = steps[step]?.target;
    if (!target) return;
    const start = Date.now();
    const interval = setInterval(() => {
      if (revealStep()) {
        clearInterval(interval);
        return;
      }
      if (Date.now() - start >= TARGET_GIVE_UP_MS) {
        clearInterval(interval);
        setStep((s) => (s < steps.length - 1 ? s + 1 : s));
        if (step === steps.length - 1) onDone();
      }
    }, TARGET_POLL_MS);
    return () => clearInterval(interval);
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
          ref={bubbleRef}
          role="dialog"
          aria-label={`${current.title} — step ${step + 1} of ${steps.length}`}
          aria-live="polite"
          tabIndex={-1}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed bg-card hairline border rounded-2xl shadow-apple-lg p-4 outline-none"
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
