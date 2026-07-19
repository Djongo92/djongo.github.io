import { useState } from "react";
import { ChevronDown, Building2, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface CaseStudyData {
  firmName: string;
  context: string;
  challenge: string;
  approach: string[];
  results: { metric: string; value: string }[];
}

const CaseStudy = ({ data }: { data: CaseStudyData }) => {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="my-6 border border-primary/20 rounded-sm overflow-hidden bg-gradient-to-br from-primary/5 to-card"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-primary/5 transition-colors"
      >
        <div className="p-2 rounded-sm bg-primary/10 text-primary">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-body">Real Firm Case Study</p>
          <h4 className="font-display text-base text-foreground">{data.firmName}</h4>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 text-sm font-body">
              <p className="text-secondary-foreground/80 italic leading-relaxed">{data.context}</p>
              <div>
                <p className="text-[10px] tracking-wider uppercase text-muted-foreground mb-1">Challenge</p>
                <p className="text-secondary-foreground/80 leading-relaxed">{data.challenge}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-wider uppercase text-muted-foreground mb-2">What they did</p>
                <ul className="space-y-1.5">
                  {data.approach.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-secondary-foreground/80">
                      <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/30">
                {data.results.map((r, i) => (
                  <div key={i} className="text-center py-2">
                    <TrendingUp className="w-3.5 h-3.5 text-primary mx-auto mb-1.5" />
                    <p className="font-display text-2xl text-foreground font-semibold">{r.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{r.metric}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground italic text-center pt-2">
                Anonymized for confidentiality. Real firm, real results.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CaseStudy;
