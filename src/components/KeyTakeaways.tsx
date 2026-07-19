import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface KeyTakeawaysProps {
  takeaways: string[];
}

const KeyTakeaways = ({ takeaways }: KeyTakeawaysProps) => {
  if (takeaways.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-card border border-border/50 rounded-sm p-6 mb-10"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-body font-medium">
          Key Takeaways
        </span>
      </div>
      <ul className="space-y-3">
        {takeaways.map((t, i) => (
          <li key={i} className="flex items-start gap-3 text-secondary-foreground/80 font-body text-sm leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
            <span className="italic">{t}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

export default KeyTakeaways;
