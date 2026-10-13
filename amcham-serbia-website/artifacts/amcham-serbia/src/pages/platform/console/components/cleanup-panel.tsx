import React, { useState } from 'react';
import { Sparkles, Check, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Record fixes Compass found while reading email and the CRM. Each one is a
// suggestion with the before and after side by side; nothing changes until a
// person accepts it.
export function CleanupPanel({ showToast }: { showToast: (m: string) => void }) {
  const { t } = useI18n();
  const k = (key: string, fb: string) => t(`platform.console.cleanup.${key}`, fb);
  const fixes = [
    { id: 'f1', what: k('f1', 'Two records for the same person at S-Leasing'), before: 'J. Petrović · jpetrovic@s-leasing.rs\nJelena Petrović · +381 11 …', after: 'Jelena Petrović · jpetrovic@s-leasing.rs · +381 11 …', why: k('f1_why', 'Same email domain and phone number') },
    { id: 'f2', what: k('f2', 'SBB’s main contact has left'), before: 'Primary contact · emails bouncing since 2 Oct', after: k('f2_after', 'Mark as left · ask the account manager to confirm the new Head of IT'), why: k('f2_why', 'Three bounced emails this month') },
    { id: 'f3', what: k('f3', 'Missing phone number for NCR Atleos'), before: 'Ivana Marić · no phone', after: 'Ivana Marić · +381 11 … (from her email signature)', why: k('f3_why', 'Found in a reply to info@') },
    { id: 'f4', what: k('f4', 'Job title out of date at Hemofarm'), before: 'Marko R. · Communications Manager', after: 'Marko R. · Head of Government Affairs', why: k('f4_why', 'His new email signature') },
  ];
  const [accepted, setAccepted] = useState<string[]>([]);
  const left = fixes.filter(f => !accepted.includes(f.id));

  return (
    <div id="cleanup" className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-5 scroll-mt-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary mb-1"><Sparkles className="w-4 h-4" />{k('eyebrow', 'Record clean-up')}</div>
          <h3 className="text-2xl font-serif font-bold text-foreground">{k('title', 'Compass found 4 things to tidy this week')}</h3>
          <p className="text-sm text-muted-foreground mt-1">{k('desc', 'Found while reading the shared inbox and member records. Nothing changes until you accept it.')}</p>
        </div>
        {left.length > 0 ? (
          <button onClick={() => { setAccepted(fixes.map(f => f.id)); showToast(k('toast_all', 'All 4 fixes applied. Records updated.')); }} className="self-start md:self-auto px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold hover:opacity-90">{k('accept_all', 'Accept all')}</button>
        ) : (
          <span className="self-start md:self-auto inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400"><Check className="w-4 h-4" />{k('all_done', 'Records are tidy')}</span>
        )}
      </div>
      <div className="divide-y divide-border rounded-xl border border-border">
        {fixes.map(f => {
          const done = accepted.includes(f.id);
          return (
            <div key={f.id} className={cn('p-4 grid gap-3 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] md:items-center', done && 'opacity-60')}>
              <div>
                <div className="text-sm font-semibold text-foreground">{f.what}</div>
                <div className="text-xs text-muted-foreground">{f.why}</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                <span className="rounded-lg bg-muted px-3 py-2 whitespace-pre-line text-muted-foreground line-through decoration-muted-foreground/40">{f.before}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
                <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-foreground">{f.after}</span>
              </div>
              {done
                ? <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Check className="w-4 h-4" />{k('done', 'Done')}</span>
                : <button onClick={() => { setAccepted(p => [...p, f.id]); showToast(k('toast_one', 'Record updated.')); }} className="px-4 py-2 rounded-full border border-border text-xs font-bold text-foreground hover:bg-muted">{k('accept', 'Accept')}</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
