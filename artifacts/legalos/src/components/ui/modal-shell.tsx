// Shared overlay shell for every "pop over" surface in the app (tool
// dialogs, onboarding, reading controls). One definition means one place
// to get the physics right: a real spring slide-up + fade, a frosted
// backdrop, and — unlike each dialog's previous copy-pasted version —
// an actual exit animation (AnimatePresence now wraps the `open` check
// instead of the component returning null above it, which previously
// skipped the exit transition entirely). Also the one place that needs
// to get dialog accessibility right once: focus trap, Escape-to-close,
// focus restoration, and an accessible name borrowed from whatever
// heading the caller's own content renders (so none of the ~10 call
// sites need to thread a title prop through just for aria-labelledby).
import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidthClass?: string;
  className?: string;
  zIndexClass?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const ModalShell = ({ open, onClose, children, maxWidthClass = "max-w-2xl", className = "", zIndexClass = "z-50" }: ModalShellProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [labelledBy, setLabelledBy] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const heading = panelRef.current?.querySelector<HTMLElement>("h1, h2, h3, h4");
    if (heading) {
      if (!heading.id) heading.id = titleId;
      setLabelledBy(heading.id);
    }

    const getFocusable = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []).filter(
        (el) => el.offsetParent !== null,
      );

    (getFocusable()[0] ?? panelRef.current)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus();
      setLabelledBy(undefined);
    };
  }, [open, onClose, titleId]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`fixed inset-0 ${zIndexClass} bg-background/85 backdrop-blur-md flex items-end sm:items-center justify-center print:hidden`}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full ${maxWidthClass} max-h-[90vh] sm:m-4 bg-card hairline border rounded-t-2xl sm:rounded-2xl shadow-apple-lg overflow-hidden flex flex-col outline-none ${className}`}
          >
            <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0" aria-hidden="true">
              <div className="w-9 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModalShell;
