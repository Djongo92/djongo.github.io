import { motion } from "framer-motion";
import { Check, Zap, Target, TrendingUp } from "lucide-react";
import type { ActionItem } from "@/data/chapters";

interface ActionPlanProps {
  chapterId: string;
  items: ActionItem[];
  isImplemented: (chapterId: string, index: number) => boolean;
  onToggle: (chapterId: string, index: number) => void;
  score: number;
}

const priorityConfig = {
  "quick-win": { icon: Zap, label: "Quick Win", className: "text-gold-light bg-gold/10" },
  "strategic": { icon: Target, label: "Strategic", className: "text-primary bg-primary/10" },
  "long-term": { icon: TrendingUp, label: "Long-term", className: "text-muted-foreground bg-muted" },
};

const ActionPlan = ({ chapterId, items, isImplemented, onToggle, score }: ActionPlanProps) => {
  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mt-12 border border-primary/20 rounded-sm overflow-hidden"
    >
      <div className="bg-primary/5 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl text-foreground font-medium">Your Action Plan</h3>
          <p className="text-[11px] text-muted-foreground font-body mt-0.5">
            Track your implementation progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-full border-2 border-primary/30 flex items-center justify-center relative">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"
                strokeDasharray={`${score * 1.257} 125.7`} strokeLinecap="round" opacity="0.8" />
            </svg>
            <span className="text-xs font-body font-medium text-primary">{score}%</span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/30">
        {items.map((item, index) => {
          const implemented = isImplemented(chapterId, index);
          const { icon: PriorityIcon, label, className } = priorityConfig[item.priority];

          return (
            <button
              key={index}
              onClick={() => onToggle(chapterId, index)}
              className="w-full flex items-start gap-4 px-6 py-4 hover:bg-muted/20 transition-colors text-left"
            >
              <div className={`mt-0.5 w-5 h-5 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${
                implemented
                  ? "bg-primary border-primary"
                  : "border-border hover:border-primary/50"
              }`}>
                {implemented && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-body text-sm ${implemented ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {item.text}
                </p>
              </div>
              <span className={`text-[9px] tracking-wider uppercase font-body font-medium px-2 py-0.5 rounded-sm shrink-0 ${className}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ActionPlan;
