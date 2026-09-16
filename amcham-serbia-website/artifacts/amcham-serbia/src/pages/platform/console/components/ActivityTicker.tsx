import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { platformData } from '@/data/platform';

// A rotating "what's happening right now" strip for the console home. The
// events are pre-written (not computed from a real event stream — there
// isn't one), but they're grounded in real company names, sectors, and
// committee names from the fixture data rather than generic placeholders,
// so the ambient "alive platform" effect doesn't read as fake filler.
function buildEvents(): string[] {
  const byId = (id: string) => platformData.allMembers.find(c => c.id === id);
  const names = (ids: string[]) => ids.map(byId).filter(Boolean).map(c => c!.name);
  const [a, b, c, d, e, f] = names(['adr', 'hmo', 'kar', 'stada', 'zit', 'ncr']);

  return [
    `${a} logged into the member portal`,
    `${b}'s engagement score moved to 88 (+2)`,
    `New committee seat opened on Digital Economy`,
    `${c} registered for the LapTime Roundtable`,
    `${d} joined the Tech Committee`,
    `A new matchmaking overlap was flagged between ${e} and ${f}`,
    `Quarterly benchmark refresh completed for 40 members`,
    `${a} downloaded the Q3 Annual Value Statement`,
    `Outreach queue cleared 3 overdue touchpoints`,
    `${b} was nominated for the Board of Governors`,
    `${c}'s renewal moved into the 90-day window`,
    `Ritual streak extended to day 5`,
  ];
}

export function ActivityTicker() {
  const [events] = useState(buildEvents);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex(i => (i + 1) % events.length), 4500);
    return () => clearInterval(timer);
  }, [events.length]);

  return (
    <div className="flex items-center gap-3 bg-muted/40 border border-border/50 rounded-full px-5 py-2.5 overflow-hidden">
      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
      <Activity className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="relative flex-1 h-5 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 text-xs font-bold text-foreground/70 whitespace-nowrap"
          >
            {events[index]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
