// A one-shot celebration for "this is a new personal best" — distinct from
// GoldParticles' ambient, indefinite drift elsewhere in the app. Mounts,
// throws a dozen gold particles outward from its center, and unmounts
// itself; the parent only needs to render this when it decides the
// current score is actually a new high, not on every render.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PARTICLE_COUNT = 14;

const ScoreBurst = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setVisible(false), reduceMotion ? 0 : 1400);
    return () => clearTimeout(t);
  }, []);

  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const distance = 60 + Math.random() * 50;
    return { angle, distance, size: 3 + Math.random() * 3, delay: Math.random() * 0.1 };
  });

  return (
    <AnimatePresence>
      {visible && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible" aria-hidden>
          {particles.map((p, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full bg-gradient-to-br from-primary to-gold-light"
              style={{ width: p.size, height: p.size }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos(p.angle) * p.distance,
                y: Math.sin(p.angle) * p.distance,
                opacity: 0,
                scale: 0.3,
              }}
              transition={{ duration: 1.1, delay: p.delay, ease: "easeOut" }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

export default ScoreBurst;
