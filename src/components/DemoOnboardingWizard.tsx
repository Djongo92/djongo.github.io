// A short, informational-only walkthrough shown once each time someone
// freshly enters demo mode (see consumeDemoWizardPending in lib/demoMode).
// Unlike PersonalizeOnboarding, this collects nothing — it just orients a
// first-time visitor to what they're looking at before they start
// clicking around a firm that doesn't exist.
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, LayoutDashboard, Hammer, FileText, X } from "lucide-react";
import ModalShell from "@/components/ui/modal-shell";
import { DEMO_DISPLAY_NAME } from "@/data/demoData";

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Sparkles,
    title: `Meet ${DEMO_DISPLAY_NAME}`,
    body: "A fictional firm, invented for this tour. Every score, chart, and workshop run you'll see is synthetic — nothing here is a real business, and nothing you do touches a real account. Click around freely.",
  },
  {
    icon: LayoutDashboard,
    title: "Their Visibility Score, already run",
    body: "The Command Center shows a full market visibility audit — performance, reputation, thought leadership, and more — plus where it stands against peer firms in its market. This is what your own audit will look like once you run it.",
  },
  {
    icon: Hammer,
    title: "Eleven AI tools, ready to try",
    body: "Open the Workshop to test drive real tools — headline testing, competitor teardowns, practice-page audits — against this sample firm's context before you ever run one on your own.",
  },
  {
    icon: FileText,
    title: "It all rolls into one Battle Plan",
    body: "My Progress assembles everything you've run into a single exportable PDF. Explore a tool or two, then take a look — that's the shape of what you'll walk away with.",
  },
] as const;

const DemoOnboardingWizard = ({ open, onClose }: Props) => {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const close = () => {
    onClose();
    setTimeout(() => setStep(0), 300);
  };

  return (
    <ModalShell open={open} onClose={close} maxWidthClass="max-w-lg" zIndexClass="z-[60]">
      <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-display text-lg text-foreground">Quick tour</h3>
        </div>
        <button onClick={close} className="p-1.5 text-muted-foreground hover:text-foreground tap-scale" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-1 px-6 pt-4">
        {STEPS.map((_, i) => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <div className="p-6 min-h-[260px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            <div className="inline-flex p-3 bg-primary/10 rounded-2xl mb-4">
              <current.icon className="w-5 h-5 text-primary" />
            </div>
            <h4 className="font-display text-2xl text-foreground mb-3 leading-snug">{current.title}</h4>
            <p className="text-sm text-muted-foreground font-body leading-relaxed">{current.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
        <button
          onClick={() => (step === 0 ? close() : setStep(step - 1))}
          className="text-sm text-muted-foreground hover:text-foreground font-body tap-scale"
        >
          {step === 0 ? "Skip tour" : "Back"}
        </button>
        <button
          onClick={() => (isLast ? close() : setStep(step + 1))}
          className="bg-primary text-primary-foreground px-5 py-2 rounded-xl font-body text-sm hover:bg-gold-light transition-colors tap-scale"
        >
          {isLast ? "Start exploring" : "Continue"}
        </button>
      </div>
    </ModalShell>
  );
};

export default DemoOnboardingWizard;
