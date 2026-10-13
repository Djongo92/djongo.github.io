import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check, ListChecks, Mail, History, Copy } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { TierChip } from '@/components/ai-privacy';

const SAMPLE_NOTES = `Call w/ Adriatica, Dragan (CEO) + Marija, 20 min

- new production line in Kragujevac, energy costs = biggest worry, grid connection delays
- felt we've been "all policy, nothing for manufacturing" this year
- likes the idea of meeting NIS re energy supply, asked us to push it
- will come to the energy roundtable tomorrow if Marija sends the agenda
- renewal: "depends on the next 3 months"
- me: send agenda today, chase NIS intro by Fri, invite to manufacturing CEO breakfast 12 Nov`;

// Turns rough call notes into a summary, commitments and drafted follow-ups.
// The output is staged for the demo; it runs on the private model because
// the notes name a member and a person.
export function MeetingNotesView({ showToast, navigateTo }: { showToast: (m: string) => void; navigateTo: (v: string, c?: string) => void }) {
  const { t } = useI18n();
  const k = (key: string, fb: string) => t(`platform.console.notes.${key}`, fb);
  const [notes, setNotes] = useState(SAMPLE_NOTES);
  const [phase, setPhase] = useState<'idle' | 'working' | 'done'>('idle');
  const [saved, setSaved] = useState(false);

  const run = () => {
    setPhase('working');
    setTimeout(() => setPhase('done'), 1400);
  };

  const commitments = [
    { who: k('us', 'Us'), what: k('c1', 'Send the roundtable agenda to Dragan'), when: k('today', 'Today'), owner: 'Marija J.' },
    { who: k('us', 'Us'), what: k('c2', 'Get an answer from NIS a.d. on the introduction'), when: k('by_fri', 'By Friday'), owner: 'Marija J.' },
    { who: k('us', 'Us'), what: k('c3', 'Invite Dragan to the Manufacturing CEO breakfast'), when: '12 Nov', owner: 'Stefan M.' },
    { who: 'Adriatica', what: k('c4', 'Dragan attends the Energy Transition Roundtable'), when: k('tomorrow', 'Tomorrow'), owner: 'Dragan' },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2">{k('title', 'Meeting notes')}</h2>
          <p className="text-muted-foreground leading-relaxed">{k('desc', 'Paste your notes from a call, however rough. Compass writes the summary, lists who promised what, and drafts the follow-up.')}</p>
        </div>
        <TierChip tier="on-prem" className="self-start md:self-auto" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{k('your_notes', 'Your notes')}</div>
          <textarea id="meeting-notes" value={notes} onChange={e => { setNotes(e.target.value); setPhase('idle'); setSaved(false); }} className="w-full h-72 rounded-xl border border-border bg-background p-4 text-sm font-mono leading-relaxed text-foreground" />
          <button onClick={run} disabled={phase === 'working'} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold hover:opacity-90 disabled:opacity-60">
            <Sparkles className="w-4 h-4" />{phase === 'working' ? k('working', 'Reading your notes…') : k('run', 'Turn into actions')}
          </button>
        </div>

        <div className={cn('rounded-2xl border border-border bg-card p-6 space-y-6 min-h-[22rem]', phase !== 'done' && 'flex items-center justify-center')}>
          {phase === 'idle' && <p className="text-sm text-muted-foreground text-center max-w-xs">{k('empty', 'The summary, commitments and follow-up email will appear here.')}</p>}
          {phase === 'working' && (
            <div className="w-full space-y-3">
              {[80, 95, 60, 90, 70].map((w, i) => <div key={i} className="h-3 rounded-full bg-muted animate-pulse" style={{ width: `${w}%` }} />)}
            </div>
          )}
          {phase === 'done' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <section>
                <div className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">{k('summary', 'Summary')}</div>
                <ul className="text-sm text-foreground space-y-1.5 list-disc pl-5">
                  <li>{k('s1', 'Energy costs and grid delays for the new Kragujevac line are Adriatica’s main worry.')}</li>
                  <li>{k('s2', 'Dragan feels AmCham did little for manufacturing this year. Renewal depends on the next three months.')}</li>
                  <li>{k('s3', 'The NIS a.d. introduction matters to him. He wants us to push it.')}</li>
                </ul>
              </section>

              <section>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary mb-2"><ListChecks className="w-4 h-4" />{k('commitments', 'Who promised what')}</div>
                <div className="rounded-xl border border-border divide-y divide-border">
                  {commitments.map(c => (
                    <div key={c.what} className="flex items-center gap-3 p-3 text-sm">
                      <span className={cn('text-[11px] font-bold uppercase tracking-widest w-20 shrink-0', c.who === 'Adriatica' ? 'text-muted-foreground' : 'text-foreground')}>{c.who}</span>
                      <span className="flex-1 text-foreground">{c.what}</span>
                      <span className="text-muted-foreground whitespace-nowrap">{c.when}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary mb-2"><Mail className="w-4 h-4" />{k('followup', 'Follow-up email, drafted')}</div>
                <div className="rounded-xl bg-muted/50 p-4 text-sm text-foreground whitespace-pre-line leading-relaxed">{k('email', 'Dear Dragan,\n\nThank you for your time today. As promised, the agenda for tomorrow’s Energy Transition Roundtable is attached. I have asked NIS a.d. about the energy-supply introduction and will update you by Friday.\n\nWe would also be glad to see you at our Manufacturing CEO breakfast on 12 November.\n\nKind regards,\nMarija')}</div>
                <button onClick={() => showToast(k('copied', 'Draft copied.'))} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><Copy className="w-4 h-4" />{k('copy', 'Copy draft')}</button>
              </section>

              <section className="rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-400/10 p-4 text-sm text-foreground">
                {k('suggest', 'Suggestion: keep Adriatica at “renewal risk” until the NIS introduction happens. Your call.')}
              </section>

              <div className="flex flex-wrap gap-3 pt-2">
                <button onClick={() => { setSaved(true); showToast(k('saved_toast', 'Saved to Adriatica Grupa’s timeline. Three tasks created.')); }} disabled={saved} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold hover:opacity-90 disabled:opacity-60">
                  {saved ? <><Check className="w-4 h-4" />{k('saved', 'Saved')}</> : <><History className="w-4 h-4" />{k('save', 'Save to the account and create tasks')}</>}
                </button>
                <button onClick={() => navigateTo('heatmap', 'adr')} className="px-5 py-2.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted">{k('open_account', 'Open Adriatica Grupa')}</button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
