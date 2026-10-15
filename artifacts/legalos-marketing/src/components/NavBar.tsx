import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { DemoLink } from './DemoLaunch';
import { AnimatedLogoMark } from './Logo';

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#score', label: 'The Score' },
  { href: '#benchmark', label: 'Benchmark' },
  { href: '#visibility-index', label: 'Visibility Index' },
  { href: '#workshop', label: 'AI Workshop' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export function NavBar() {
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl"
    >
      {/* Scroll progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px bg-primary origin-left"
        style={{ scaleX: progress }}
      />

      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-5">
          {/* Editorial metadata — desktop only */}
          <div className="hidden 2xl:flex items-center gap-3">
            <span className="font-serif text-[10px] tracking-[0.3em] uppercase text-primary opacity-90">Est. 2024</span>
            <span className="h-px w-7 bg-primary/30" />
            <span className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground/55">Belgrade Market</span>
          </div>
          <a href="#" className="flex items-center gap-2.5" aria-label="Uvid home">
            <AnimatedLogoMark className="w-7 h-7 text-primary" />
            <span className="font-serif text-xl tracking-tight text-white font-semibold">Uvid</span>
          </a>
        </div>

        <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          {NAV_LINKS.map(link => (
            <a key={link.href} href={link.href} className="hover:text-white transition-colors">
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <a
            href="/app/teaser"
            className="hidden lg:inline-flex text-sm font-medium text-white hover:text-primary transition-colors"
          >
            Run Free Audit
          </a>
          <DemoLink
            from="nav"
            data-testid="link-nav-demo"
            className="hidden lg:inline-flex text-sm font-medium text-muted-foreground hover:text-white transition-colors"
          >
            Request Full Demo
          </DemoLink>
          <a
            href="/app/#signin"
            className="hidden sm:inline-flex bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Log in
          </a>
          {/* Mobile menu button */}
          <button
            onClick={() => setOpen(v => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            data-testid="button-mobile-menu"
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 border border-white/10 text-white rounded-xl hover:border-primary/40 transition-colors"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="lg:hidden overflow-hidden border-t border-white/5 bg-background/95 backdrop-blur-xl"
          >
            <div className="container mx-auto px-6 py-6 flex flex-col gap-1">
              {NAV_LINKS.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-base text-white/80 hover:text-white border-b border-white/5 transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-3 pt-5">
                <a
                  href="/app/teaser"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 text-sm font-semibold rounded-xl"
                >
                  Run Free Audit <ArrowRight className="w-4 h-4" />
                </a>
                <DemoLink
                  from="nav"
                  data-testid="link-nav-demo-mobile"
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-white transition-colors py-1"
                >
                  Or request the full demo <ArrowRight className="w-3.5 h-3.5" />
                </DemoLink>
                <a
                  href="/app/#signin"
                  className="inline-flex items-center justify-center border border-white/20 text-white px-6 py-3.5 text-sm font-medium rounded-xl sm:hidden"
                >
                  Log in
                </a>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
