import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ShieldCheck, Check, Lock, Smartphone, LayoutDashboard } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// A member action travels from the portal toward the console. Shared actions
// pass the privacy filter; private ones stop there. Mirrors the rules listed
// on the Privacy & Sharing page.
const EVENTS = [
  { key: 'e1', action: 'Registered for the Energy Transition Roundtable', result: 'Added to the account timeline', shared: true },
  { key: 'e2', action: 'Saved Microsoft to a private shortlist', result: 'Stays with the member', shared: false },
  { key: 'e3', action: 'Applied to the ESG & Environment Committee', result: 'Routed to the committee lead', shared: true },
  { key: 'e4', action: 'Drafted a message to UniCredit Bank', result: 'Stays with the member', shared: false },
] as const;

const STEP_MS = 3600;

export function SeamFlow() {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((n) => (n + 1) % EVENTS.length), STEP_MS);
    return () => clearInterval(id);
  }, [reduce]);

  const ev = EVENTS[i];
  const action = t(`platform.hub.flow_${ev.key}_action`, ev.action);
  const result = t(`platform.hub.flow_${ev.key}_result`, ev.result);

  return (
    <div className="w-full" aria-live="polite">
      <div className="relative h-12 mx-5">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-secondary-foreground/25" />
        <div className="absolute top-1/2 left-1/2 right-0 h-px bg-accent/40" />
        {[
          { pos: '0%', Icon: Smartphone },
          { pos: '50%', Icon: ShieldCheck },
          { pos: '100%', Icon: LayoutDashboard },
        ].map(({ pos, Icon }) => (
          <span key={pos} style={{ left: pos }} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-secondary border border-secondary-foreground/30 flex items-center justify-center z-10">
            <Icon className="w-4 h-4 text-secondary-foreground" />
          </span>
        ))}
        {!reduce && (
          <motion.span
            key={ev.key}
            className={cn('absolute top-1/2 w-3.5 h-3.5 -mt-[7px] -ml-[7px] rounded-full z-20 shadow-[0_0_0_4px_rgba(255,255,255,0.08)]', ev.shared ? 'bg-accent' : 'bg-primary')}
            initial={{ left: '0%', opacity: 0 }}
            animate={ev.shared
              ? { left: ['0%', '50%', '50%', '100%'], opacity: [1, 1, 1, 1] }
              : { left: ['0%', '50%', '50%', '50%'], opacity: [1, 1, 1, 0] }}
            transition={{ duration: 2.6, times: [0, 0.4, 0.55, 1], ease: 'easeInOut' }}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
        <div>
          <div className="font-bold uppercase tracking-wider text-secondary-foreground/75 mb-1">{t('platform.hub.flow_portal', 'Member does')}</div>
          <AnimatePresence mode="wait">
            <motion.p key={ev.key} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm text-secondary-foreground leading-snug">{action}</motion.p>
          </AnimatePresence>
        </div>
        <div className="text-center">
          <div className="font-bold uppercase tracking-wider text-secondary-foreground/75 mb-1">{t('platform.hub.flow_filter', 'Privacy filter')}</div>
          <AnimatePresence mode="wait">
            <motion.p key={ev.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 1.1 }} className={cn('text-sm font-bold inline-flex items-center gap-1', ev.shared ? 'text-accent' : 'text-secondary-foreground')}>
              {ev.shared ? <Check className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
              {ev.shared ? t('platform.hub.flow_shared', 'Shared') : t('platform.hub.flow_private', 'Private')}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="text-right">
          <div className="font-bold uppercase tracking-wider text-secondary-foreground/75 mb-1">{t('platform.hub.flow_console', 'Team sees')}</div>
          <AnimatePresence mode="wait">
            <motion.p key={ev.key} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: reduce ? 0 : ev.shared ? 2.2 : 1.4 }} className={cn('text-sm leading-snug', ev.shared ? 'text-secondary-foreground' : 'text-secondary-foreground/75 italic')}>
              {ev.shared ? result : t('platform.hub.flow_nothing', 'Nothing')}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
