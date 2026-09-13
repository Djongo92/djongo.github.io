import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Compass, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface TourStep {
  path: string;
  titleKey: string;
  descKey: string;
}

const STEPS: TourStep[] = [
  { path: '/', titleKey: 'guided_tour.step1_title', descKey: 'guided_tour.step1_desc' },
  { path: '/blueprint/diagnostic', titleKey: 'guided_tour.step2_title', descKey: 'guided_tour.step2_desc' },
  { path: '/membership', titleKey: 'guided_tour.step3_title', descKey: 'guided_tour.step3_desc' },
  { path: '/members', titleKey: 'guided_tour.step4_title', descKey: 'guided_tour.step4_desc' },
  { path: '/platform', titleKey: 'guided_tour.step5_title', descKey: 'guided_tour.step5_desc' },
  { path: '/platform/console?view=matchmaking&role=staffer&tour=off', titleKey: 'guided_tour.step6_title', descKey: 'guided_tour.step6_desc' },
  { path: '/platform/seam', titleKey: 'guided_tour.step7_title', descKey: 'guided_tour.step7_desc' },
  { path: '/platform/portal?view=home&role=member', titleKey: 'guided_tour.step8_title', descKey: 'guided_tour.step8_desc' },
];

interface GuidedTourContextValue {
  active: boolean;
  start: () => void;
}

const GuidedTourContext = createContext<GuidedTourContextValue>({ active: false, start: () => {} });

export const useGuidedTour = () => useContext(GuidedTourContext);

export function GuidedTourProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [stepIndex, setStepIndex] = useState(-1);
  const active = stepIndex > -1;

  useEffect(() => {
    if (!active) return;
    setLocation(STEPS[stepIndex].path);
    window.scrollTo(0, 0);
  }, [stepIndex]);

  const start = () => setStepIndex(0);
  const end = () => setStepIndex(-1);
  const next = () => {
    if (stepIndex >= STEPS.length - 1) end();
    else setStepIndex((s) => s + 1);
  };

  return (
    <GuidedTourContext.Provider value={{ active, start }}>
      {children}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-[100] flex justify-center px-4 pb-6 md:pb-10 pointer-events-none"
          >
            <div className="w-full max-w-lg bg-foreground text-background rounded-3xl p-6 md:p-8 shadow-2xl pointer-events-auto border border-foreground/10 relative overflow-hidden font-sans">
              <svg className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none" viewBox="0 0 100 100">
                <circle cx="80" cy="20" r="40" fill="currentColor" />
              </svg>
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-accent">
                  <Compass className="w-3.5 h-3.5" /> {t('guided_tour.badge', 'Guided Tour')}
                </div>
                <button onClick={end} className="text-background/50 hover:text-background transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1.5 mb-6">
                {STEPS.map((_, i) => (
                  <div key={i} className={cn('h-1.5 rounded-full transition-all flex-1', i === stepIndex ? 'bg-accent' : i < stepIndex ? 'bg-background/40' : 'bg-background/15')}></div>
                ))}
              </div>
              <h3 className="text-2xl md:text-3xl font-serif font-light mb-3">{t(STEPS[stepIndex].titleKey)}</h3>
              <p className="text-sm font-medium text-background/70 mb-8 leading-relaxed">{t(STEPS[stepIndex].descKey)}</p>
              <div className="flex justify-between items-center">
                <button onClick={end} className="text-[10px] font-bold uppercase tracking-widest text-background/50 hover:text-background transition-colors">
                  {t('platform.console.tour_skip')}
                </button>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-background/40">{stepIndex + 1} / {STEPS.length}</span>
                  <button onClick={next} className="px-6 py-2.5 rounded-full bg-accent text-foreground font-bold text-sm shadow-md hover:shadow-lg transition-transform active:scale-95">
                    {stepIndex === STEPS.length - 1 ? t('platform.console.tour_done') : t('platform.console.tour_next')} <ArrowRight className="inline w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GuidedTourContext.Provider>
  );
}
