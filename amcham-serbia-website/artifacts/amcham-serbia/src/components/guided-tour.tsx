import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { AnimatePresence } from 'framer-motion';
import { Compass } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { TourOverlay } from '@/pages/platform/console/components/Overlays';

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
  { path: '/platform/portal?view=home&role=member&tour=off', titleKey: 'guided_tour.step8_title', descKey: 'guided_tour.step8_desc' },
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
  const prev = () => setStepIndex((s) => Math.max(0, s - 1));

  return (
    <GuidedTourContext.Provider value={{ active, start }}>
      {children}
      <AnimatePresence>
        {active && (
          <TourOverlay
            step={stepIndex}
            setStep={setStepIndex}
            endTour={end}
            onBack={prev}
            badge={{ icon: Compass, label: t('guided_tour.badge', 'Guided Tour') }}
            steps={STEPS.map((s) => ({ title: t(s.titleKey), desc: t(s.descKey) }))}
            labels={{
              skip: t('platform.console.tour_skip'),
              next: t('platform.console.tour_next'),
              done: t('platform.console.tour_done'),
              back: t('guided_tour.back', 'Back'),
            }}
          />
        )}
      </AnimatePresence>
    </GuidedTourContext.Provider>
  );
}
