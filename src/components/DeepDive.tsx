import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface DeepDiveProps {
  title: string;
  content: string;
}

const DeepDive = ({ title, content }: DeepDiveProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-6 border border-border/50 rounded-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
      >
        <span className="font-display text-base text-foreground flex items-center gap-2">
          <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-body font-medium">Deep Dive</span>
          <span className="text-muted-foreground/60">·</span>
          {title}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-4 pb-4 border-t border-border/30">
              <p className="font-body text-sm text-secondary-foreground/80 leading-relaxed pt-4">
                {content}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeepDive;
