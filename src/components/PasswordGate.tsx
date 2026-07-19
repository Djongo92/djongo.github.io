import { useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import GoldParticles from "./GoldParticles";
import { verifyPassword } from "@/lib/edgeAuth";

interface PasswordGateProps {
  onAuthenticated: () => void;
}

const letterVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.5 + i * 0.06, duration: 0.5, ease: "easeOut" as const },
  }),
};

const PasswordGate = ({ onAuthenticated }: PasswordGateProps) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [busy, setBusy] = useState(false);

  const title = "LegalOS";
  const titleLetters = title.split("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const ok = await verifyPassword("guidebook", password).catch(() => false);
    setBusy(false);
    if (ok) {
      setUnlocking(true);
      setTimeout(() => onAuthenticated(), 1200);
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <motion.div
      animate={unlocking ? { opacity: 0, scale: 1.05 } : {}}
      transition={{ duration: 1, ease: "easeInOut" }}
      className="min-h-screen bg-background flex items-center justify-center px-6 relative overflow-hidden"
    >
      <GoldParticles />

      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.04)_0%,_transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="w-full max-w-md text-center relative z-10"
      >
        {/* Decorative line */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex items-center justify-center gap-4 mb-10"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 64 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-px bg-primary/40"
          />
          <motion.div
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Lock className="w-5 h-5 text-primary" />
          </motion.div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 64 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-px bg-primary/40"
          />
        </motion.div>

        {/* Letter-by-letter title */}
        <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground tracking-tight mb-3">
          {titleLetters.map((letter, i) => (
            <motion.span
              key={i}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={letterVariants}
              className="inline-block"
              style={{ whiteSpace: letter === " " ? "pre" : undefined }}
            >
              {letter === " " ? "\u00A0" : letter}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          className="font-display text-xl text-primary italic mb-2"
        >
          Law Firm Marketing Insights & Guidebook
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.6 }}
          className="text-sm text-muted-foreground mb-10 font-body"
        >
          This resource is password-protected.
        </motion.p>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0], opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
          transition={{ duration: shake ? 0.4 : 0.6, delay: shake ? 0 : 2.2 }}
          className="space-y-4"
        >
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Enter password"
              className="w-full bg-secondary/80 backdrop-blur-sm border border-border text-foreground placeholder:text-muted-foreground px-5 py-3.5 text-sm font-body tracking-wide focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all rounded-sm"
              autoFocus
            />
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-destructive text-xs font-body"
            >
              Incorrect password. Please try again.
            </motion.p>
          )}
          <button
            type="submit"
            disabled={unlocking}
            className="w-full bg-primary text-primary-foreground py-3.5 text-sm font-body font-medium tracking-widest uppercase hover:bg-gold-light transition-all rounded-sm relative overflow-hidden group disabled:opacity-70"
          >
            <span className="relative z-10">
              {unlocking ? "Opening…" : "Access Guidebook"}
            </span>
            {/* Gold shimmer on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 0.6 }}
          className="mt-12 flex items-center justify-center gap-4"
        >
          <div className="h-px w-12 bg-border" />
          <span className="text-[10px] text-muted-foreground tracking-[0.3em] uppercase font-body">
            Confidential
          </span>
          <div className="h-px w-12 bg-border" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default PasswordGate;
