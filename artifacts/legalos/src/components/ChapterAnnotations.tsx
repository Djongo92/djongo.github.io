import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StickyNote, ChevronDown, ChevronUp } from "lucide-react";

interface ChapterAnnotationsProps {
  chapterId: string;
  value: string;
  onChange: (chapterId: string, text: string) => void;
}

const ChapterAnnotations = ({ chapterId, value, onChange }: ChapterAnnotationsProps) => {
  const [open, setOpen] = useState(!!value);

  return (
    <div className="my-10 print:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-body text-sm"
      >
        <StickyNote className="w-4 h-4" />
        <span>Private Notes</span>
        {value && !open && (
          <span className="w-2 h-2 rounded-full bg-primary" />
        )}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <textarea
              value={value}
              onChange={(e) => onChange(chapterId, e.target.value)}
              placeholder="Add your private notes for this chapter…"
              className="w-full mt-3 p-4 bg-card border border-border/50 rounded-sm text-sm font-body text-foreground placeholder:text-muted-foreground resize-y min-h-[100px] focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChapterAnnotations;
