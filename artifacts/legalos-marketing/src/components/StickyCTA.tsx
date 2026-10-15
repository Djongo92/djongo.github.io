import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export function StickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY > document.body.scrollHeight - 900;
      setVisible(window.scrollY > 700 && !nearBottom);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.a
          href="/app/teaser"
          data-testid="link-sticky-cta"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 bg-primary text-primary-foreground pl-5 pr-4 py-3.5 text-sm font-semibold rounded-2xl shadow-2xl shadow-primary/20 hover:opacity-90 transition-opacity group"
        >
          Run Free Audit
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </motion.a>
      )}
    </AnimatePresence>
  );
}
