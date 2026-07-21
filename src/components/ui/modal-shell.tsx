// Shared overlay shell for every "pop over" surface in the app (tool
// dialogs, onboarding, reading controls). One definition means one place
// to get the physics right: a real spring slide-up + fade, a frosted
// backdrop, and — unlike each dialog's previous copy-pasted version —
// an actual exit animation (AnimatePresence now wraps the `open` check
// instead of the component returning null above it, which previously
// skipped the exit transition entirely).
import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidthClass?: string;
  className?: string;
  zIndexClass?: string;
}

const ModalShell = ({ open, onClose, children, maxWidthClass = "max-w-2xl", className = "", zIndexClass = "z-50" }: ModalShellProps) => (
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
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full ${maxWidthClass} max-h-[90vh] sm:m-4 bg-card hairline border rounded-t-2xl sm:rounded-2xl shadow-apple-lg overflow-hidden flex flex-col ${className}`}
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

export default ModalShell;
