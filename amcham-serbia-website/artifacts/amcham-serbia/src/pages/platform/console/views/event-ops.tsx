import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Users, BellRing, QrCode, HeartHandshake, Bot, UserRound, Check, CalendarDays, MapPin } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type StageId = 'announce' | 'register' | 'remind' | 'day' | 'follow';

// One event followed from announcement to follow-up. Each stage splits the
// work into what happens by itself and what a person on the team does.
export function EventOpsView({ showToast, navigateTo }: { showToast: (m: string) => void; navigateTo: (v: string, c?: string, extra?: Record<string, string>) => void }) {
  const { t } = useI18n();
  const k = (key: string, fb: string) => t(`platform.console.events_ops.${key}`, fb);
  const [stage, setStage] = useState<StageId>('register');

  const stages: { id: StageId; icon: React.ElementType; label: string; status: 'done' | 'now' | 'next' }[] = [
    { id: 'announce', icon: Megaphone, label: k('s_announce', 'Announce'), status: 'done' },
    { id: 'register', icon: Users, label: k('s_register', 'Registrations'), status: 'now' },
    { id: 'remind', icon: BellRing, label: k('s_remind', 'Reminders'), status: 'now' },
    { id: 'day', icon: QrCode, label: k('s_day', 'On the day'), status: 'next' },
    { id: 'follow', icon: HeartHandshake, label: k('s_follow', 'Follow-up'), status: 'next' },
  ];

  const detail: Record<StageId, { auto: string[]; person: string[]; extra?: React.ReactNode }> = {
    announce: {
      auto: [
        k('a1', 'Event page published on the website in English and Serbian'),
        k('a2', 'Invitation sent to the 140 members in energy, manufacturing and finance'),
        k('a3', 'LinkedIn post drafted and waiting in the Newsroom'),
      ],
      person: [k('p1', 'Ana chose the topic, speakers and venue'), k('p2', 'Ana approved the invitation text')],
    },
    register: {
      auto: [
        k('a4', 'Each registration confirmed by email with a calendar invite'),
        k('a5', 'Seats tracked; the waiting list opens by itself when the room is full'),
        k('a6', 'Registrations added to each member’s timeline'),
      ],
      person: [k('p3', 'Ana approved two guests who are not members')],
      extra: (
        <div className="grid sm:grid-cols-3 gap-3">
          <Stat label={k('registered', 'Registered')} value="86" sub={k('of_seats', 'of 100 seats')} />
          <Stat label={k('waitlist', 'Waiting list')} value="9" sub={k('waitlist_sub', 'offered seats if anyone cancels')} />
          <Stat label={k('at_risk', 'Members at risk')} value="3" sub={k('at_risk_sub', 'registered, a good moment to talk')} />
        </div>
      ),
    },
    remind: {
      auto: [k('a7', 'Reminder sent 7 days before'), k('a8', 'Final reminder with directions goes out today at 18:00'), k('a9', 'People who cancel free their seat for the waiting list')],
      person: [k('p4', 'Nothing to do unless the agenda changes')],
    },
    day: {
      auto: [k('a10', 'Name badges and the check-in list printed from registrations'), k('a11', 'QR check-in at the door marks who actually came')],
      person: [k('p5', 'The team welcomes guests and runs the room')],
    },
    follow: {
      auto: [
        k('a12', 'Thank-you email drafted for everyone who came, with the slides'),
        k('a13', '“Sorry we missed you” drafted for no-shows'),
        k('a14', 'Recap article drafted and waiting in the Newsroom'),
        k('a15', 'Attendance added to each member’s record, so Priorities knows who engaged'),
      ],
      person: [k('p6', 'Ana approves the emails and the recap'), k('p7', 'Account managers call the three at-risk members who came')],
    },
  };

  const d = detail[stage];

  return (
    <div className="space-y-8 pb-20">
      <div className="max-w-2xl">
        <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2">{k('title', 'Events')}</h2>
        <p className="text-muted-foreground leading-relaxed">{k('desc', 'One event from start to finish. For each step you can see what happens by itself and what the team still does.')}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">{k('tomorrow', 'Tomorrow')}</div>
            <h3 className="text-2xl font-serif font-bold text-foreground">Energy Transition Roundtable</h3>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
              <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" />14 Oct, 18:00</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />Hyatt Regency Belgrade</span>
            </div>
          </div>
          <button onClick={() => navigateTo('newsroom', undefined, { item: 'n2' })} className="self-start md:self-auto px-5 py-2.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted">{k('open_post', 'See the LinkedIn post')}</button>
        </div>

        <ol className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-8">
          {stages.map((s, i) => {
            const Icon = s.icon;
            const active = stage === s.id;
            return (
              <li key={s.id}>
                <button onClick={() => setStage(s.id)} className={cn('w-full rounded-xl border p-3 md:p-4 text-left transition-colors h-full', active ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-muted')}>
                  <span className="flex items-center justify-between mb-2">
                    <Icon className="w-4 h-4" />
                    {s.status === 'done' && <Check className={cn('w-4 h-4', active ? 'text-background' : 'text-emerald-600')} />}
                    {s.status === 'now' && <span className={cn('w-2 h-2 rounded-full', active ? 'bg-background' : 'bg-primary')} />}
                  </span>
                  <span className="block text-xs md:text-sm font-semibold leading-tight">{i + 1}. {s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <AnimatePresence mode="wait">
          <motion.div key={stage} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-6">
            {d.extra}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-muted/50 p-5">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3"><Bot className="w-4 h-4" />{k('auto', 'Happens by itself')}</div>
                <ul className="space-y-2">{d.auto.map(x => <li key={x} className="text-sm text-foreground flex gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />{x}</li>)}</ul>
              </div>
              <div className="rounded-xl border border-border p-5">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3"><UserRound className="w-4 h-4" />{k('person', 'Done by the team')}</div>
                <ul className="space-y-2">{d.person.map(x => <li key={x} className="text-sm text-foreground flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-foreground/50 shrink-0 mt-2" />{x}</li>)}</ul>
              </div>
            </div>
            {stage === 'follow' && (
              <button onClick={() => showToast(k('toast_follow', 'Follow-up emails approved. They go out the morning after the event.'))} className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold hover:opacity-90">{k('approve_follow', 'Approve the follow-up emails')}</button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-3xl font-serif tabular-nums text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
