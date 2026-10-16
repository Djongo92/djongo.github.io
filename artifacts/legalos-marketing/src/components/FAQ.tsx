import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { SCORED_FIRMS } from '../data/benchmarkLeaders';
import { GUIDEBOOK_CHAPTER_COUNT } from '../data/guidebookMeta';
import { AI_TOOLS } from '../data/aiTools';

const FAQS = [
  {
    q: 'Is my firm\u2019s data safe?',
    a: 'Completely. The audit analyses only publicly available information \u2014 your website, directory listings, Google Business Profile, and press coverage. Nothing private is ever accessed, and nothing about your firm is published without your action. Your score is visible only to you until you choose to appear on the public benchmark.',
  },
  {
    q: 'Is this advertising?',
    a: 'No — Uvid is measurement, not promotion. The audit reads only publicly visible signals (your website, directory listings, Google Business Profile, and press coverage) and reports where your firm stands against the market. Nothing is published on your behalf, no claims are made to clients, and no promotional content is produced. Firms in jurisdictions with strict professional-conduct rules use Uvid precisely because it observes the market instead of advertising into it.',
  },
  {
    q: 'How is this different from just Googling my firm?',
    a: `A Google search shows you fragments from your own perspective. Uvid cross-references Chambers\u00a0&\u00a0Partners, Legal\u00a0500, IFLR1000, Google PageSpeed Insights, Google Business Profile, and Google News press coverage into one 0\u2013500 score \u2014 then benchmarks it against ${SCORED_FIRMS} peer firms with their real scores. It\u2019s the difference between checking your own reflection and seeing where you stand in the room.`,
  },
  {
    q: 'What exactly is free?',
    a: `The partial audit is completely free and requires no account: enter your domain and receive scored results on 2 of the 5 categories using real data from your firm\u2019s actual presence. The full platform \u2014 all 5 categories, your exact position in the index, the${GUIDEBOOK_CHAPTER_COUNT}-chapter guidebook, the ${AI_TOOLS.length}-tool AI Workshop, and the Battle Plan PDF \u2014 is \u20ac149/month per firm, but free during early access with a free account.`,
  },
  {
    q: 'How do I know the score is accurate for my firm?',
    a: 'Every data point links back to a named source \u2014 Chambers\u00a0&\u00a0Partners, Legal\u00a0500, IFLR1000, Google PageSpeed Insights, Google Business Profile, or Google News. When you see your score, you see the exact evidence behind each category, not a black box. If a source carries an error about your firm, contact us and we investigate. Scores update when the underlying source data changes.',
  },
  {
    q: 'How often does the data update?',
    a: 'Directory data (Chambers, Legal\u00a0500, IFLR1000) refreshes quarterly, in line with their publication cycles. Website performance and Google Business Profile signals refresh on a rolling cycle. Press and content signals update continuously. Every score shows its last-updated date, so you always know exactly how fresh the data is.',
  },
  {
    q: 'When does early access end \u2014 and what will it cost after?',
    a: 'We haven\u2019t announced a closing date. When early access ends, the full platform moves to \u20ac149/month per firm. Firms who join during early access will be notified well in advance and given the first option to lock in their rate. The free partial audit \u2014 no account required \u2014 stays free permanently.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-white/5 border-y border-white/5">
      {FAQS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${i}`}
              data-testid={`button-faq-${i}`}
              className="w-full flex items-center justify-between gap-6 py-6 text-left group"
            >
              <span className={`text-base md:text-lg font-medium transition-colors ${isOpen ? 'text-primary' : 'text-white group-hover:text-primary/80'}`}>
                {item.q}
              </span>
              <motion.span
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2 }}
                className={`shrink-0 ${isOpen ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <Plus className="w-5 h-5" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`faq-panel-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <p className="pb-6 text-muted-foreground leading-relaxed text-sm md:text-base max-w-3xl">
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
