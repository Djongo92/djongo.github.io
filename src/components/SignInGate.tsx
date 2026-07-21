import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import GoldParticles from "./GoldParticles";
import { useAuth } from "@/hooks/useAuth";

interface SignInGateProps {
  onDemo: () => void;
}

type Mode = "signin" | "signup" | "reset";
type Stage = "idle" | "submitting" | "check-email" | "reset-sent";

const SignInGate = ({ onDemo }: SignInGateProps) => {
  const { signUp, signIn, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);

  const emailLooksValid = /\S+@\S+\.\S+/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stage === "submitting" || !emailLooksValid) return;
    setError(null);

    if (mode === "reset") {
      setStage("submitting");
      const { error: err } = await resetPassword(email);
      if (err) {
        setError(err);
        setStage("idle");
        return;
      }
      setStage("reset-sent");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setStage("submitting");
    if (mode === "signup") {
      const { error: err } = await signUp(email, password);
      if (err) {
        setError(err);
        setStage("idle");
        return;
      }
      setStage("check-email");
      return;
    }

    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err);
      setStage("idle");
      return;
    }
    // On success, useAuth's onAuthStateChange updates the session and
    // Index.tsx re-renders past this gate — nothing further to do here.
  };

  return (
    <motion.div
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
          {stage === "check-email" ? (
            <motion.div
              key="check-email"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-3 py-6"
            >
              <p className="text-sm text-foreground font-body">Check your email to confirm your account.</p>
              <p className="text-xs text-muted-foreground font-body">
                We sent a confirmation link to {email}. Once confirmed, come back and sign in.
              </p>
              <button
                onClick={() => {
                  setMode("signin");
                  setStage("idle");
                }}
                className="text-xs text-primary hover:text-gold-light font-body"
              >
                Back to sign in
              </button>
            </motion.div>
          ) : stage === "reset-sent" ? (
            <motion.div
              key="reset-sent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-3 py-6"
            >
              <p className="text-sm text-foreground font-body">Password reset link sent.</p>
              <p className="text-xs text-muted-foreground font-body">Check {email} for instructions.</p>
              <button
                onClick={() => {
                  setMode("signin");
                  setStage("idle");
                }}
                className="text-xs text-primary hover:text-gold-light font-body"
              >
                Back to sign in
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <button
                onClick={onDemo}
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

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Work email"
                  aria-label="Work email"
                  autoComplete="email"
                  autoFocus
                  className="w-full bg-secondary/80 backdrop-blur-sm border border-border text-foreground placeholder:text-muted-foreground px-5 py-3.5 text-sm font-body tracking-wide focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all rounded-lg"
                />
                {mode !== "reset" && (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    aria-label="Password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="w-full bg-secondary/80 backdrop-blur-sm border border-border text-foreground placeholder:text-muted-foreground px-5 py-3.5 text-sm font-body tracking-wide focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all rounded-lg"
                  />
                )}

                {error && <p className="text-xs text-destructive font-body">{error}</p>}

                <button
                  type="submit"
                  disabled={!emailLooksValid || stage === "submitting"}
                  className="w-full border border-border text-foreground py-3.5 text-sm font-body font-medium tracking-wide rounded-lg hover:border-primary/50 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {stage === "submitting" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      {mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between text-xs font-body">
                <button
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setError(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
                </button>
                {mode !== "reset" && (
                  <button
                    onClick={() => {
                      setMode("reset");
                      setError(null);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
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
