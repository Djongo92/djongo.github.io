import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import GoldParticles from "./GoldParticles";
import type { SessionMode } from "@/lib/session";

interface SignInGateProps {
  onSignIn: (mode: SessionMode) => void;
}

type Stage = "idle" | "verifying" | "done";

const SignInGate = ({ onSignIn }: SignInGateProps) => {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [pendingMode, setPendingMode] = useState<SessionMode | null>(null);

  const emailLooksValid = /\S+@\S+\.\S+/.test(email);

  const enter = (mode: SessionMode) => {
    if (stage !== "idle") return;
    setPendingMode(mode);
    setStage("verifying");
    setTimeout(() => {
      setStage("done");
      setTimeout(() => onSignIn(mode), 500);
    }, 850);
  };

  const handleLiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailLooksValid) return;
    enter("live");
  };

  return (
    <motion.div
      animate={stage === "done" ? { opacity: 0, scale: 1.05 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="min-h-screen bg-background flex items-center justify-center px-6 relative overflow-hidden"
    >
      <GoldParticles />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.05)_0%,_transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-10 bg-primary/40" />
            <ShieldCheck className="w-5 h-5 text-primary" />
            <div className="h-px w-10 bg-primary/40" />
          </div>
          <h1 className="font-display text-4xl font-semibold text-foreground tracking-tight mb-2">LegalOS</h1>
          <p className="text-sm text-muted-foreground font-body">
            Your firm's marketing &amp; digital presence command center.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {stage === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <button
                onClick={() => enter("demo")}
                className="w-full bg-primary text-primary-foreground py-3.5 text-sm font-body font-medium tracking-wide rounded-lg hover:bg-gold-light transition-all relative overflow-hidden group flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span className="relative z-10">See it with sample data</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase font-body">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleLiveSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Work email"
                  autoFocus
                  className="w-full bg-secondary/80 backdrop-blur-sm border border-border text-foreground placeholder:text-muted-foreground px-5 py-3.5 text-sm font-body tracking-wide focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all rounded-lg"
                />
                <button
                  type="submit"
                  disabled={!emailLooksValid}
                  className="w-full border border-border text-foreground py-3.5 text-sm font-body font-medium tracking-wide rounded-lg hover:border-primary/50 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continue with your own audit <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </motion.div>
          )}

          {stage !== "idle" && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-4 py-6"
            >
              <motion.div
                animate={{ rotate: stage === "verifying" ? 360 : 0 }}
                transition={stage === "verifying" ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
                className={`w-8 h-8 rounded-full border-2 ${
                  stage === "done" ? "border-emerald-500 bg-emerald-500/10" : "border-primary/30 border-t-primary"
                }`}
              />
              <p className="text-sm text-muted-foreground font-body">
                {stage === "done"
                  ? "Welcome in."
                  : pendingMode === "demo"
                  ? "Preparing your workspace…"
                  : "Verifying…"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 flex items-center justify-center gap-4">
          <div className="h-px w-12 bg-border" />
          <span className="text-[10px] text-muted-foreground tracking-[0.3em] uppercase font-body">Private</span>
          <div className="h-px w-12 bg-border" />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SignInGate;
