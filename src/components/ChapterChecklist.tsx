import { motion } from "framer-motion";
import { CheckSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ChapterChecklistProps {
  chapterId: string;
  items: string[];
  isChecked: (chapterId: string, index: number) => boolean;
  onToggle: (chapterId: string, index: number) => void;
  progress: number;
}

const ChapterChecklist = ({ chapterId, items, isChecked, onToggle, progress }: ChapterChecklistProps) => {
  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-card border border-border/50 rounded-sm p-6 my-10"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-primary" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-body font-medium">
            Action Checklist
          </span>
        </div>
        <span className="text-xs text-muted-foreground font-body">
          {progress}% complete
        </span>
      </div>
      <div className="w-full h-1 bg-muted rounded-full mb-5 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <Checkbox
              checked={isChecked(chapterId, i)}
              onCheckedChange={() => onToggle(chapterId, i)}
              className="mt-0.5"
            />
            <span
              className={`font-body text-sm leading-relaxed transition-colors ${
                isChecked(chapterId, i)
                  ? "text-muted-foreground line-through"
                  : "text-secondary-foreground/80"
              }`}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

export default ChapterChecklist;
