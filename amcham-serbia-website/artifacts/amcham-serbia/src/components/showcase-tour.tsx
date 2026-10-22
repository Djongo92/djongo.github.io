import React, { createContext, Suspense, useContext, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { AnimatePresence } from 'framer-motion';
import { Presentation } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { lazyWithReload } from '@/lib/lazy-with-reload';

// The showcase is a self-guided walk through the platform for anyone who
// opens the demo on their own. One route for everyone, written to the
// reader; a step can carry a short "Try it" hint pointing at something to
// click. It ends on the page that explains how the AI works.

// The overlay lives with the console code; load it only when a tour starts so
// the public site doesn't carry the platform's data on first load.
const TourOverlay = lazyWithReload(() => import('@/pages/platform/console/components/Overlays').then((m) => ({ default: m.TourOverlay })));

interface StepDef { id: string; path: string; title: string; desc: string; tip?: string }

const STEPS: StepDef[] = [
  { id: 'website', path: '/', title: 'This is the new website', desc: 'The public site, rebuilt so visitors find what they came for in a few clicks: joining, events, members and research. It works on phones, in English and Serbian.', tip: 'Scroll down to see the rest of the page.' },
  { id: 'priorities', path: '/platform/console?view=ritual&role=lead&tour=off', title: 'Where the team’s day starts', desc: 'Each morning the team gets a short list of what matters most, with the money at stake next to each item. Adriatica Grupa is at the top: their renewal is at risk.', tip: 'Click the Adriatica Grupa row to see the detail on the right.' },
  { id: 'morning', path: '/platform/console?view=ritual&brief=open&role=lead&tour=off', title: 'The morning in one panel', desc: 'Before anyone opens their email, Compass has sorted the shared inbox, drafted the easy replies and prepared a one-page brief for today’s 11:00 call. The team reads it and approves what is ready.', tip: 'Look at “Since you left” in the panel on the right.' },
  { id: 'dossier', path: '/platform/console?view=heatmap&company=adr&role=lead&tour=off', title: 'Why Adriatica is slipping', desc: 'Their engagement score fell 9 points since May. The breakdown shows why: fewer events, and nobody on a committee.', tip: 'Look at Event Attendance in the score breakdown.' },
  { id: 'saveplan', path: '/platform/console?view=retention&focus=adr&role=lead&tour=off', title: 'A plan to keep them', desc: 'The drop opened a save plan: meet their CEO, with a named owner and a deadline. Nobody has to remember to do it.' },
  { id: 'notes', path: '/platform/console?view=notes&meeting=adr-call&role=lead&tour=off', title: 'After the call', desc: 'Compass took the notes on Marija’s call with Adriatica’s CEO: the summary, the decisions, who does what by when and the calendar entries are ready. It does the same for internal meetings.', tip: 'Open “Brainstorm: the 2027 events calendar” to see ideas grouped by theme.' },
  { id: 'match', path: '/platform/console?view=matchmaking&focus=adr&role=lead&tour=off', title: 'The introduction they need', desc: 'Adriatica needs energy for its new production line, and NIS a.d. can help. AmCham asks both sides before making the introduction.', tip: 'Click “Request Opt-in from NIS a.d.”, then “Schedule Introduction”.' },
  { id: 'compass', path: '/platform/console?view=compass&role=lead&tour=off', title: 'Compass, the team’s assistant', desc: 'Compass watches what is happening across the membership and suggests what to do next. Today’s top item: a labour law consultation closes in 6 days, and AmCham hasn’t commented yet.', tip: 'The green “On premises” labels mark work that never left AmCham.' },
  { id: 'newsroom', path: '/platform/console?view=newsroom&item=n1&role=lead&tour=off', title: 'Drafts, ready to approve', desc: 'Translations, social posts, event recaps and press releases arrive as drafts. Someone on the team checks each one and approves it. Nothing goes out by itself.', tip: 'The highlighted words are ones Compass asks a person to check.' },
  { id: 'privacy', path: '/platform/seam?tour=off', title: 'What staff see, and what they don’t', desc: 'Members can see exactly what the portal records, what staff see and how it is used. Personal data stays on AmCham’s own server.' },
  { id: 'member_value', path: '/platform/portal?view=score&role=member&member=hmo&tour=off', title: 'The member’s side', desc: 'This is what Hemofarm sees: what their membership did for them this year, and a statement they can forward to their own management.', tip: 'Click “Generate Annual Value Statement”.' },
  { id: 'member_intros', path: '/platform/portal?view=intros&role=member&member=hmo&tour=off', title: 'Asking for an introduction', desc: 'Members ask to meet each other and follow each request step by step. PwC said yes, so Hemofarm just picks a time.', tip: 'Click “Pick a time”.' },
  { id: 'member_seen', path: '/platform/portal?view=seen&role=member&member=hmo&tour=off', title: 'Nothing hidden', desc: 'Members see the same engagement number staff see, the notes AmCham keeps, and switches to decide how their data is used.' },
  { id: 'end', path: '/ai', title: 'How the AI works', desc: 'Every AI feature you just saw follows the same rules. This page explains them in plain words, and answers the questions people ask most, such as what a “private model” is.', tip: 'Open “Questions” in the bar at the top of the page.' },
];

interface ShowcaseContextValue {
  active: boolean;
  start: () => void;
  // Screens the tour visits, per app, so the sidebar can show just those.
  focus: { console: string[]; portal: string[] } | null;
}

const ShowcaseContext = createContext<ShowcaseContextValue>({ active: false, start: () => {}, focus: null });

export const useShowcase = () => useContext(ShowcaseContext);

// Focus mode: while the tour runs, the sidebar lists only the screens it
// visits; everything else folds under "More". Null when no tour is running.
export function useShowcaseFocus(area: 'console' | 'portal'): string[] | null {
  const { focus } = useShowcase();
  if (!focus || focus[area].length === 0) return null;
  return focus[area];
}

function viewsFor(area: 'console' | 'portal'): string[] {
  const out: string[] = [];
  for (const s of STEPS) {
    if (!s.path.startsWith(`/platform/${area}?`)) continue;
    const v = new URLSearchParams(s.path.split('?')[1]).get('view');
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

const FOCUS = { console: viewsFor('console'), portal: viewsFor('portal') };
const STEP_KEY = 'amcham_tour_step';

export function ShowcaseProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  // The current step is kept for this tab, so a reload (for example after a
  // deploy) carries on from the same step instead of ending the tour.
  const [stepIndex, setStepIndex] = useState(() => {
    try {
      const saved = Number(sessionStorage.getItem(STEP_KEY));
      return Number.isInteger(saved) && saved >= 0 && saved < STEPS.length ? saved : -1;
    } catch {
      return -1;
    }
  });
  const active = stepIndex > -1;

  useEffect(() => {
    try {
      if (active) sessionStorage.setItem(STEP_KEY, String(stepIndex));
      else sessionStorage.removeItem(STEP_KEY);
    } catch { /* storage blocked: the tour just won't survive a reload */ }
    if (!active) return;
    setLocation(STEPS[stepIndex].path);
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  const start = () => setStepIndex(0);
  const end = () => setStepIndex(-1);
  const prev = () => setStepIndex((s) => Math.max(0, s - 1));

  // Arrow keys move through the steps and Esc ends the tour. Ignored while
  // typing in a field.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.key === 'ArrowRight') setStepIndex((s) => Math.min(STEPS.length - 1, s + 1));
      else if (e.key === 'ArrowLeft') setStepIndex((s) => Math.max(0, s - 1));
      else if (e.key === 'Escape') end();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  return (
    <ShowcaseContext.Provider value={{ active, start, focus: active ? FOCUS : null }}>
      {children}
      <Suspense fallback={null}>
      <AnimatePresence>
        {active && (
          <TourOverlay
            step={stepIndex}
            setStep={setStepIndex}
            endTour={end}
            onBack={prev}
            align="left"
            badge={{ icon: Presentation, label: t('showcase.badge', 'Guided tour') }}
            steps={STEPS.map((s) => ({
              title: t(`showcase.s.${s.id}.title`, s.title),
              desc: t(`showcase.s.${s.id}.desc`, s.desc),
              note: s.tip ? t(`showcase.s.${s.id}.tip`, s.tip) : undefined,
            }))}
            labels={{
              skip: t('platform.console.tour_skip'),
              next: t('platform.console.tour_next'),
              done: t('platform.console.tour_done'),
              back: t('showcase.back', 'Back'),
              note: t('showcase.tip_label', 'Try it'),
              fold: t('showcase.fold', 'Fold the tour card'),
              unfold: t('showcase.unfold', 'Show the tour card'),
            }}
          />
        )}
      </AnimatePresence>
      </Suspense>
    </ShowcaseContext.Provider>
  );
}
