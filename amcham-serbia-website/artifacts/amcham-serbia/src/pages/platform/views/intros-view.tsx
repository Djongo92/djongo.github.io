import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handshake, Check, Plus, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { companies } from '@/data/platform';

type Step = 0 | 1 | 2 | 3 | 4;
interface Intro { id: string; with: string; why: string; step: Step; note: string }

const BY_MEMBER: Record<string, Intro[]> = {
  hmo: [
    { id: 'i1', with: 'PwC Serbia', why: 'ESG audit partner for the new reporting rules', step: 3, note: 'PwC said yes. Pick a time that suits you.' },
    { id: 'i2', with: 'Delhaize Serbia', why: 'Shelf space for the new consumer health line', step: 4, note: 'Met on 12 Sep. How did it go?' },
  ],
  adr: [
    { id: 'i3', with: 'NIS a.d.', why: 'Energy supply for the new production line', step: 2, note: 'We asked NIS a.d. on 9 Oct. They usually answer within a week.' },
  ],
};

// The member's side of matchmaking: every introduction they asked for, and
// where it stands. AmCham brokers each one, and both sides agree first.
export default function IntrosView({ t, showToast, member, navigateTo }: any) {
  const k = (key: string, fb: string) => t(`portal_intros_${key}`, fb);
  const steps = [k('s0', 'You asked'), k('s1', 'AmCham checks the fit'), k('s2', 'The other side is asked'), k('s3', 'Both agreed'), k('s4', 'You met')];
  const [list, setList] = useState<Intro[]>(() => BY_MEMBER[member?.id] ?? [
    { id: 'ix', with: 'Nelt Co', why: 'Distribution partner for the region', step: 1, note: 'Your account manager is looking at it.' },
  ]);
  const [asking, setAsking] = useState(false);
  const [target, setTarget] = useState('');
  const [why, setWhy] = useState('');

  const options = companies.filter(c => c.id !== member?.id && !list.some(i => i.with === c.name)).slice(0, 12);

  const submit = () => {
    const name = target || options[0]?.name;
    if (!name) return;
    setList(p => [{ id: `new-${Date.now()}`, with: name, why: why || k('default_why', 'Exploring working together'), step: 0, note: k('new_note', 'Sent. Your account manager will look at it within two working days.') }, ...p]);
    setAsking(false); setTarget(''); setWhy('');
    showToast(k('sent_toast', 'Introduction request sent to AmCham.'));
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2">{k('title', 'Your introductions')}</h2>
          <p className="text-muted-foreground leading-relaxed">{k('desc', 'Ask to meet another member and AmCham makes the introduction. Both sides agree before anyone shares contact details.')}</p>
        </div>
        <button onClick={() => setAsking(a => !a)} className="self-start md:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold hover:opacity-90"><Plus className="w-4 h-4" />{k('ask', 'Ask for an introduction')}</button>
      </div>

      <AnimatePresence>
        {asking && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-2xl border border-border bg-card p-6 grid gap-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
              <label className="text-sm space-y-1.5" htmlFor="intro-target">
                <span className="font-semibold text-foreground">{k('who', 'Who would you like to meet?')}</span>
                <select id="intro-target" value={target} onChange={e => setTarget(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                  {options.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </select>
              </label>
              <label className="text-sm space-y-1.5" htmlFor="intro-why">
                <span className="font-semibold text-foreground">{k('why', 'Why? One line is enough')}</span>
                <input id="intro-why" value={why} onChange={e => setWhy(e.target.value)} placeholder={k('why_ph', 'E.g. we are looking for a logistics partner')} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
              </label>
              <button onClick={submit} className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold">{k('send', 'Send request')}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {list.map(intro => (
          <motion.div layout key={intro.id} className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"><Handshake className="w-5 h-5 text-foreground/70" /></span>
                <div>
                  <div className="font-semibold text-foreground">{intro.with}</div>
                  <div className="text-sm text-muted-foreground">{intro.why}</div>
                </div>
              </div>
              {intro.step === 3 && (
                <button onClick={() => { setList(p => p.map(i => i.id === intro.id ? { ...i, step: 4, note: k('booked', 'Booked for Thursday at 10:00. Both of you have the invite.') } : i)); showToast(k('booked_toast', 'Meeting booked.')); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-bold"><CalendarClock className="w-4 h-4" />{k('pick_time', 'Pick a time')}</button>
              )}
            </div>
            <ol className="grid grid-cols-5 gap-1.5">
              {steps.map((s, i) => (
                <li key={s} className="space-y-1.5">
                  <div className={cn('h-1.5 rounded-full', i <= intro.step ? 'bg-emerald-500' : 'bg-muted')} />
                  <div className={cn('text-[11px] leading-tight', i <= intro.step ? 'text-foreground font-semibold' : 'text-muted-foreground')}>{i < intro.step ? <Check className="w-3 h-3 inline mr-0.5" /> : null}{s}</div>
                </li>
              ))}
            </ol>
            <p className="text-sm text-foreground/80">{intro.note}</p>
          </motion.div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">{k('footer', 'Looking for someone specific?')} <button onClick={() => navigateTo('directory')} className="font-semibold text-primary hover:underline">{k('footer_link', 'Browse the member directory')}</button></p>
    </div>
  );
}
