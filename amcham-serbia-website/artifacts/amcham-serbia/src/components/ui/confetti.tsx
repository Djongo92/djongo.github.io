import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#e11d2e', '#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#40D9F1'];

interface Particle { id: number; x: number; rotation: number; color: string; delay: number; drift: number }

function buildParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 45 + Math.random() * 10,
    rotation: Math.random() * 360,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 0.15,
    drift: (Math.random() - 0.5) * 40,
  }));
}

// A hand-rolled confetti burst (no new dependency) fired from the center of
// whatever panel mounts it — a one-off celebratory beat for a genuinely
// positive, session-defining moment (a closed deal, a completed ritual item),
// not something to sprinkle on every click.
export function Confetti({ trigger }: { trigger: number }) {
  const [particles, setParticles] = useState<Particle[] | null>(null);

  useEffect(() => {
    if (trigger === 0) return;
    setParticles(buildParticles(28));
    const timer = setTimeout(() => setParticles(null), 1400);
    return () => clearTimeout(timer);
  }, [trigger]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      <AnimatePresence>
        {particles?.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, x: `${p.x}vw`, y: '35vh', rotate: 0, scale: 1 }}
            animate={{ opacity: 0, x: `${p.x + p.drift * 0.1}vw`, y: '85vh', rotate: p.rotation, scale: 0.6 }}
            transition={{ duration: 1.1, delay: p.delay, ease: 'easeIn' }}
            className="absolute w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: p.color }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
