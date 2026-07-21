// A real moment for a badge that just unlocked — see useAchievements'
// newlyUnlocked/acknowledge for how "just now" is told apart from "already
// knew about this." Auto-dismisses, but calls onDismiss either way so the
// caller can mark it acknowledged and never show it again.
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award } from "lucide-react";

interface AchievementUnlockProps {
  badge: { label: string; description: string } | null;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4500;

const AchievementUnlock = ({ badge, onDismiss }: AchievementUnlockProps) => {
  useEffect(() => {
    if (!badge) return;
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [badge, onDismiss]);

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] w-full max-w-xs px-4"
          role="status"
        >
          <div className="relative overflow-hidden bg-card border border-primary/40 rounded-sm shadow-2xl shadow-primary/20 p-4 flex items-center gap-3">
            {/* Gold shimmer sweep */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/15 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.1, ease: "easeInOut" }}
            />
            <div className="relative p-2 rounded-full bg-gradient-to-br from-primary to-gold-light text-primary-foreground shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="relative min-w-0">
              <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-body">Achievement unlocked</p>
              <p className="font-display text-base text-foreground leading-tight">{badge.label}</p>
              <p className="text-xs text-muted-foreground font-body truncate">{badge.description}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AchievementUnlock;
