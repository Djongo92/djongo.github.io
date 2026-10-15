import { motion } from "framer-motion";

interface ComparisonPanelProps {
  before: { title: string; items: string[] };
  after: { title: string; items: string[] };
}

const ComparisonPanel = ({ before, after }: ComparisonPanelProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8"
    >
      <div className="bg-destructive/5 border border-destructive/20 rounded-sm p-5">
        <h4 className="font-display text-sm font-semibold text-destructive mb-3 uppercase tracking-wider">
          {before.title}
        </h4>
        <ul className="space-y-2">
          {before.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm font-body text-secondary-foreground/70">
              <span className="text-destructive mt-0.5">✕</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-primary/5 border border-primary/20 rounded-sm p-5">
        <h4 className="font-display text-sm font-semibold text-primary mb-3 uppercase tracking-wider">
          {after.title}
        </h4>
        <ul className="space-y-2">
          {after.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm font-body text-secondary-foreground/80">
              <span className="text-primary mt-0.5">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
};

export default ComparisonPanel;
