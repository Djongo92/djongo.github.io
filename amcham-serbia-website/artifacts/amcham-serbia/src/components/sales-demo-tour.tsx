import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { AnimatePresence } from 'framer-motion';
import { Presentation } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { TourOverlay } from '@/pages/platform/console/components/Overlays';

interface SalesDemoStep {
  path: string;
  titleKey: string;
  descKey: string;
}

// Ten curated, presenter-driven beats — distinct from GuidedTourProvider's
// consumer-facing orientation tour. Steps 1-6 stay anchored on the same
// Adriatica Grupa -> NIS a.d. matchmaking thread (verified directly against
// src/data/platform.ts and each view's own code, not just narration copy)
// so the console portion reads as one story rather than a feature checklist.
const STEPS: SalesDemoStep[] = [
  { path: '/platform/console?view=ritual&role=lead&tour=off', titleKey: 'sales_demo.step1_title', descKey: 'sales_demo.step1_desc' },
  { path: '/platform/console?view=heatmap&company=adr&role=lead&tour=off', titleKey: 'sales_demo.step2_title', descKey: 'sales_demo.step2_desc' },
  { path: '/platform/console?view=network&role=lead&tour=off', titleKey: 'sales_demo.step3_title', descKey: 'sales_demo.step3_desc' },
  { path: '/platform/console?view=retention&role=lead&tour=off', titleKey: 'sales_demo.step4_title', descKey: 'sales_demo.step4_desc' },
  { path: '/platform/console?view=ask&role=lead&tour=off', titleKey: 'sales_demo.step5_title', descKey: 'sales_demo.step5_desc' },
  { path: '/platform/console?view=matchmaking&role=lead&tour=off', titleKey: 'sales_demo.step6_title', descKey: 'sales_demo.step6_desc' },
  { path: '/platform/console?view=board-summary&role=lead&tour=off', titleKey: 'sales_demo.step7_title', descKey: 'sales_demo.step7_desc' },
  { path: '/platform/seam?tour=off', titleKey: 'sales_demo.step8_title', descKey: 'sales_demo.step8_desc' },
  { path: '/platform/portal?view=score&role=member&member=hmo&tour=off', titleKey: 'sales_demo.step9_title', descKey: 'sales_demo.step9_desc' },
  { path: '/status', titleKey: 'sales_demo.step10_title', descKey: 'sales_demo.step10_desc' },
];

interface SalesDemoContextValue {
  active: boolean;
  start: () => void;
}

const SalesDemoContext = createContext<SalesDemoContextValue>({ active: false, start: () => {} });

export const useSalesDemo = () => useContext(SalesDemoContext);

export function SalesDemoProvider({ children }: { children: React.ReactNode }) {
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
    <SalesDemoContext.Provider value={{ active, start }}>
      {children}
      <AnimatePresence>
        {active && (
          <TourOverlay
            step={stepIndex}
            setStep={setStepIndex}
            endTour={end}
            onBack={prev}
            badge={{ icon: Presentation, label: t('sales_demo.badge', 'Sales Demo') }}
            steps={STEPS.map((s) => ({ title: t(s.titleKey), desc: t(s.descKey) }))}
            labels={{
              skip: t('platform.console.tour_skip'),
              next: t('platform.console.tour_next'),
              done: t('platform.console.tour_done'),
              back: t('sales_demo.back', 'Back'),
            }}
          />
        )}
      </AnimatePresence>
    </SalesDemoContext.Provider>
  );
}
