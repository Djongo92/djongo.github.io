import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { AnimatePresence } from 'framer-motion';
import { Presentation } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { TourOverlay } from '@/pages/platform/console/components/Overlays';

interface ShowcaseStep {
  path: string;
  titleKey: string;
  descKey: string;
}

// Ten curated, presenter-driven beats — distinct from GuidedTourProvider's
// consumer-facing orientation tour. Steps 1-6 stay anchored on the same
// Adriatica Grupa -> NIS a.d. matchmaking thread (verified directly against
// src/data/platform.ts and each view's own code, not just narration copy)
// so the console portion reads as one story rather than a feature checklist.
const STEPS: ShowcaseStep[] = [
  { path: '/platform/console?view=ritual&role=lead&tour=off', titleKey: 'showcase.step1_title', descKey: 'showcase.step1_desc' },
  { path: '/platform/console?view=heatmap&company=adr&role=lead&tour=off', titleKey: 'showcase.step2_title', descKey: 'showcase.step2_desc' },
  { path: '/platform/console?view=network&role=lead&tour=off', titleKey: 'showcase.step3_title', descKey: 'showcase.step3_desc' },
  { path: '/platform/console?view=retention&role=lead&tour=off', titleKey: 'showcase.step4_title', descKey: 'showcase.step4_desc' },
  { path: '/platform/console?view=ask&role=lead&tour=off', titleKey: 'showcase.step5_title', descKey: 'showcase.step5_desc' },
  { path: '/platform/console?view=matchmaking&role=lead&tour=off', titleKey: 'showcase.step6_title', descKey: 'showcase.step6_desc' },
  { path: '/platform/console?view=board-summary&role=lead&tour=off', titleKey: 'showcase.step7_title', descKey: 'showcase.step7_desc' },
  { path: '/platform/seam?tour=off', titleKey: 'showcase.step8_title', descKey: 'showcase.step8_desc' },
  { path: '/platform/portal?view=score&role=member&member=hmo&tour=off', titleKey: 'showcase.step9_title', descKey: 'showcase.step9_desc' },
  { path: '/status', titleKey: 'showcase.step10_title', descKey: 'showcase.step10_desc' },
];

interface ShowcaseContextValue {
  active: boolean;
  start: () => void;
}

const ShowcaseContext = createContext<ShowcaseContextValue>({ active: false, start: () => {} });

export const useShowcase = () => useContext(ShowcaseContext);

export function ShowcaseProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [stepIndex, setStepIndex] = useState(-1);
  const active = stepIndex > -1;

  useEffect(() => {
    if (!active) return;
    setLocation(STEPS[stepIndex].path);
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  const start = () => setStepIndex(0);
  const end = () => setStepIndex(-1);
  const prev = () => setStepIndex((s) => Math.max(0, s - 1));

  return (
    <ShowcaseContext.Provider value={{ active, start }}>
      {children}
      <AnimatePresence>
        {active && (
          <TourOverlay
            step={stepIndex}
            setStep={setStepIndex}
            endTour={end}
            onBack={prev}
            badge={{ icon: Presentation, label: t('showcase.badge', 'Showcase') }}
            steps={STEPS.map((s) => ({ title: t(s.titleKey), desc: t(s.descKey) }))}
            labels={{
              skip: t('platform.console.tour_skip'),
              next: t('platform.console.tour_next'),
              done: t('platform.console.tour_done'),
              back: t('showcase.back', 'Back'),
            }}
          />
        )}
      </AnimatePresence>
    </ShowcaseContext.Provider>
  );
}
