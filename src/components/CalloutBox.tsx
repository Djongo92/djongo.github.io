import { motion } from "framer-motion";
import { Lightbulb, AlertTriangle, Zap, Info } from "lucide-react";

export type CalloutType = "pro-tip" | "mistake" | "quick-win" | "insight";

interface CalloutBoxProps {
  type: CalloutType;
  title?: string;
  content: string;
}

const config: Record<CalloutType, { icon: typeof Lightbulb; label: string; borderClass: string; bgClass: string; iconClass: string }> = {
  "pro-tip": {
    icon: Lightbulb,
    label: "Pro Tip",
    borderClass: "border-l-primary",
    bgClass: "bg-primary/5",
    iconClass: "text-primary",
  },
  "mistake": {
    icon: AlertTriangle,
    label: "Common Mistake",
    borderClass: "border-l-destructive",
    bgClass: "bg-destructive/5",
    iconClass: "text-destructive",
  },
  "quick-win": {
    icon: Zap,
    label: "Quick Win",
    borderClass: "border-l-gold-light",
    bgClass: "bg-gold/5",
    iconClass: "text-gold-light",
  },
  "insight": {
    icon: Info,
    label: "Key Insight",
    borderClass: "border-l-primary",
    bgClass: "bg-primary/5",
    iconClass: "text-primary",
  },
};

const CalloutBox = ({ type, title, content }: CalloutBoxProps) => {
  const { icon: Icon, label, borderClass, bgClass, iconClass } = config[type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.5 }}
      className={`border-l-4 ${borderClass} ${bgClass} rounded-r-sm p-5 my-6`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${iconClass}`} />
        <span className="text-[10px] tracking-[0.2em] uppercase font-body font-medium text-foreground/70">
          {title || label}
        </span>
      </div>
      <p className="font-body text-sm text-secondary-foreground/80 leading-relaxed">
        {content}
      </p>
    </motion.div>
  );
};

export default CalloutBox;
