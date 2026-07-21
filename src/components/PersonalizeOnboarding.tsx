import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Users, Target, X, Sparkles } from "lucide-react";
import { useFirmContext, FirmContext } from "@/hooks/useFirmContext";
import { toast } from "sonner";

export const PRACTICE_AREAS = [
  "Corporate / M&A", "Litigation", "Family Law", "Real Estate", "IP & Tech",
  "Employment & Labor", "Tax", "Criminal Defense", "Estate Planning", "Other",
];

export const FIRM_SIZES = [
  "Solo (1 attorney)", "Small (2-10 attorneys)", "Mid-size (11-50 attorneys)",
  "Large (51-200 attorneys)", "Major (200+ attorneys)",
];

export const GOALS = [
  "Win more high-value clients", "Build firm-wide brand & visibility",
  "Generate qualified inbound leads", "Position lawyers as thought leaders",
  "Modernize digital presence",
];

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete?: (ctx: FirmContext) => void;
}

const PersonalizeOnboarding = ({ open, onClose, onComplete }: Props) => {
  const { save } = useFirmContext();
  const [step, setStep] = useState(0);
  const [practiceArea, setPracticeArea] = useState("");
  const [firmSize, setFirmSize] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");

  const reset = () => { setStep(0); setPracticeArea(""); setFirmSize(""); setPrimaryGoal(""); };
  const close = () => { reset(); onClose(); };

  const finish = () => {
    const ctx = { practiceArea, firmSize, primaryGoal };
    save(ctx);
    toast.success("Personalization saved. Action plans now adapt to your firm.");
    onComplete?.(ctx);
    close();
  };

  const steps = [
    { icon: Briefcase, label: "Practice area", value: practiceArea, set: setPracticeArea, options: PRACTICE_AREAS },
    { icon: Users, label: "Firm size", value: firmSize, set: setFirmSize, options: FIRM_SIZES },
    { icon: Target, label: "Primary goal", value: primaryGoal, set: setPrimaryGoal, options: GOALS },
  ];
  const current = steps[step];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-background/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={close}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-display text-lg text-foreground">Firm Profile</h3>
              </div>
              <button onClick={close} className="p-1.5 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress */}
            <div className="flex gap-1 px-6 pt-4">
              {steps.map((_, i) => (
                <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>

            <div className="p-6 min-h-[340px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-2 mb-4 text-primary">
                    <current.icon className="w-4 h-4" />
                    <span className="text-[10px] tracking-[0.3em] uppercase font-body">{current.label}</span>
                  </div>
                  <h4 className="font-display text-2xl text-foreground mb-5">
                    {step === 0 && "What's your firm's practice area?"}
                    {step === 1 && "How big is your firm?"}
                    {step === 2 && "What's your primary marketing goal?"}
                  </h4>
                  <div className="space-y-2">
                    {current.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => current.set(opt)}
                        className={`w-full text-left px-4 py-2.5 rounded-sm border text-sm font-body transition-colors ${
                          current.value === opt
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
              <button
                onClick={() => (step === 0 ? close() : setStep(step - 1))}
                className="text-sm text-muted-foreground hover:text-foreground font-body"
              >
                {step === 0 ? "Skip for now" : "Back"}
              </button>
              <button
                onClick={() => {
                  if (step < 2) setStep(step + 1);
                  else finish();
                }}
                disabled={!current.value}
                className="bg-primary text-primary-foreground px-5 py-2 rounded-sm font-body text-sm disabled:opacity-30 hover:bg-primary/90 transition-colors"
              >
                {step < 2 ? "Continue" : "Save & personalize"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PersonalizeOnboarding;
