import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, ListChecks, Mail, Copy, CalendarPlus, Gavel, Quote, MessageSquareText, ClipboardList, Users, Mic, Lightbulb, PauseCircle, FileText, Clock, ShieldCheck } from 'lucide-react';
import { useSearch } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { TierChip } from '@/components/ai-privacy';
import { MEETINGS, type Meeting } from '../meetings-data';

type Tab = 'prep' | 'recap' | 'transcript' | 'ask' | 'follow';

const ROUGH_NOTES = `Call w/ Adriatica, Dragan (CEO) + Marija, 20 min

- new production line in Kragujevac, energy costs = biggest worry, grid connection delays
- felt we've been "all policy, nothing for manufacturing" this year
- likes the idea of meeting NIS re energy supply, asked us to push it
- will come to the energy roundtable tomorrow if Marija sends the agenda
- renewal: "depends on the next 3 months"
- me: send agenda today, chase NIS intro by Fri, invite to manufacturing CEO breakfast 12 Nov`;

// Meetings: an AI note-taker for member calls and internal sessions. It
// prepares talking points before, keeps a transcript during, and afterwards
// pulls out the summary, decisions, action items and calendar entries.
// Recording needs everyone's consent and runs on AmCham's private model.
export function MeetingNotesView({ showToast, navigateTo }: { showToast: (m: string) => void; navigateTo: (v: string, c?: string) => void }) {
  const { t } = useI18n();
  const k = (key: string, fb: string) => t(`platform.console.notes.${key}`, fb);
  const search = useSearch();
  const fromUrl = new URLSearchParams(search).get('meeting');
  const [selectedId, setSelectedId] = useState<string>(fromUrl && (MEETINGS.some(m => m.id === fromUrl) || fromUrl === 'paste') ? fromUrl : 'adr-call');
  useEffect(() => { if (fromUrl) setSelectedId(fromUrl); }, [fromUrl]);

  const meeting = MEETINGS.find(m => m.id === selectedId);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2">{k('title', 'Meetings')}</h2>
          <p className="text-muted-foreground leading-relaxed">{k('desc', 'Compass prepares you before a meeting, takes the notes during it, and afterwards hands you the summary, the decisions, who does what by when, and the calendar entries. For member calls and internal sessions alike.')}</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start lg:self-auto">
          <TierChip tier="on-prem" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground"><ShieldCheck className="w-3.5 h-3.5" />{k('consent', 'Recorded only with everyone’s consent')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] gap-6 items-start">
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {MEETINGS.map(m => (
              <button key={m.id} onClick={() => setSelectedId(m.id)} className={cn('w-full text-left p-4 flex gap-3 transition-colors', selectedId === m.id ? 'bg-primary/5' : 'hover:bg-muted/50')}>
                <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', m.kind === 'upcoming' ? 'bg-amber-500/10 text-amber-600' : m.kind === 'internal' ? 'bg-violet-500/10 text-violet-600' : 'bg-primary/10 text-primary')}>
                  {m.kind === 'upcoming' ? <Clock className="w-5 h-5" /> : m.kind === 'internal' ? <Lightbulb className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {m.kind === 'upcoming' ? k('kind_upcoming', 'Coming up') : m.kind === 'internal' ? k('kind_internal', 'Internal') : k('kind_member', 'Member call')}
                  </span>
                  <span className="block font-semibold text-foreground leading-snug">{m.title}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{m.when}{m.length ? ` · ${m.length}` : ''} · {m.source}</span>
                </span>
              </button>
            ))}
            <button onClick={() => setSelectedId('paste')} className={cn('w-full text-left p-4 flex gap-3 transition-colors', selectedId === 'paste' ? 'bg-primary/5' : 'hover:bg-muted/50')}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-muted text-foreground/70"><FileText className="w-5 h-5" /></span>
              <span>
                <span className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{k('kind_paste', 'No recording')}</span>
                <span className="block font-semibold text-foreground leading-snug">{k('paste_title', 'Paste rough notes instead')}</span>
              </span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground px-1 leading-relaxed">{k('works_with', 'Works with Teams, Zoom and Google Meet, or a phone on the table for meetings in the room.')}</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={selectedId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            {selectedId === 'paste' || !meeting
              ? <PastePanel k={k} showToast={showToast} />
              : <MeetingPanel key={meeting.id} m={meeting} k={k} showToast={showToast} navigateTo={navigateTo} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function MeetingPanel({ m, k, showToast, navigateTo }: { m: Meeting; k: (a: string, b: string) => string; showToast: (s: string) => void; navigateTo: (v: string, c?: string) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = m.kind === 'upcoming'
    ? [{ id: 'prep', label: k('tab_prep', 'Before'), icon: ClipboardList }]
    : [
        ...(m.prep ? [{ id: 'prep' as Tab, label: k('tab_prep', 'Before'), icon: ClipboardList }] : []),
        { id: 'recap', label: k('tab_recap', 'Recap'), icon: Sparkles },
        { id: 'transcript', label: k('tab_transcript', 'Transcript'), icon: FileText },
        { id: 'ask', label: k('tab_ask', 'Ask'), icon: MessageSquareText },
        ...(m.followUp ? [{ id: 'follow' as Tab, label: k('tab_follow', 'Follow-up'), icon: Mail }] : []),
      ];
  const [tab, setTab] = useState<Tab>(m.kind === 'upcoming' ? 'prep' : 'recap');
  const [done, setDone] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [asked, setAsked] = useState<number | null>(null);
  const speaker = (id: string) => m.speakers.find(s => s.id === id);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-serif font-bold text-foreground">{m.title}</h3>
          <div className="text-sm text-muted-foreground mt-1">{m.when}{m.length ? ` · ${m.length}` : ''} · {m.source}</div>
        </div>
        <div className="flex -space-x-2">
          {m.speakers.map(s => (
            <span key={s.id} title={`${s.name}, ${s.role}`} className="w-9 h-9 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-bold text-foreground">{s.name.split(' ').map(x => x[0]).join('')}</span>
          ))}
        </div>
      </div>

      <div role="tablist" className="flex flex-wrap gap-1 bg-muted p-1 rounded-full w-fit">
        {tabs.map(tb => {
          const Icon = tb.icon;
          return (
            <button key={tb.id} role="tab" aria-selected={tab === tb.id} onClick={() => setTab(tb.id)} className={cn('inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-colors', tab === tb.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              <Icon className="w-3.5 h-3.5" />{tb.label}
            </button>
          );
        })}
      </div>

      {tab === 'prep' && m.prep && (
        <div className="space-y-5">
          <Section icon={ClipboardList} title={k('goal', 'What this meeting is for')}><p className="text-sm text-foreground">{m.prep.goal}</p></Section>
          <Section icon={ListChecks} title={k('agenda', 'Agenda')}><ol className="text-sm text-foreground space-y-1 list-decimal pl-5">{m.prep.agenda.map(x => <li key={x}>{x}</li>)}</ol></Section>
          <Section icon={Sparkles} title={k('talking_points', 'Talking points, from AmCham’s own records')}><ul className="text-sm text-foreground space-y-1.5 list-disc pl-5">{m.prep.talkingPoints.map(x => <li key={x}>{x}</li>)}</ul></Section>
          <Section icon={PauseCircle} title={k('open_items', 'Still open from last time')}><ul className="text-sm text-foreground space-y-1.5 list-disc pl-5">{m.prep.openItems.map(x => <li key={x}>{x}</li>)}</ul></Section>
          {m.kind === 'upcoming' && <p className="text-xs text-muted-foreground">{k('upcoming_note', 'After the meeting, the recap, decisions and action items appear here.')}</p>}
        </div>
      )}

      {tab === 'recap' && (
        <div className="space-y-6">
          {m.summary && <Section icon={Sparkles} title={k('summary', 'Summary')}><ul className="text-sm text-foreground space-y-1.5 list-disc pl-5">{m.summary.map(x => <li key={x}>{x}</li>)}</ul></Section>}

          {m.clusters && (
            <Section icon={Lightbulb} title={k('ideas', 'Ideas, grouped by theme')}>
              <div className="grid md:grid-cols-3 gap-3">
                {m.clusters.map(c => (
                  <div key={c.theme} className="rounded-xl border border-border p-4 space-y-3">
                    <div className="text-sm font-semibold text-foreground">{c.theme}</div>
                    {c.ideas.map(i => (
                      <div key={i.text} className="text-sm">
                        <div className="text-foreground/90">{i.text}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex gap-0.5" aria-label={`${i.votes} ${k('votes', 'votes')}`}>{Array.from({ length: 5 }).map((_, n) => <span key={n} className={cn('w-1.5 h-1.5 rounded-full', n < i.votes ? 'bg-primary' : 'bg-muted')} />)}</span>
                          <span className="text-[11px] text-muted-foreground">{i.by}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {m.decisions && <Section icon={Gavel} title={k('decisions', 'Decisions')}><ul className="space-y-2">{m.decisions.map(x => <li key={x} className="text-sm text-foreground flex gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />{x}</li>)}</ul></Section>}

          {m.actions && (
            <Section icon={ListChecks} title={k('actions', 'Action items')}>
              <div className="rounded-xl border border-border divide-y divide-border">
                {m.actions.map(a => (
                  <label key={a.id} htmlFor={`act-${a.id}`} className="flex items-center gap-3 p-3 text-sm cursor-pointer">
                    <input id={`act-${a.id}`} type="checkbox" checked={done.includes(a.id)} onChange={() => setDone(d => d.includes(a.id) ? d.filter(x => x !== a.id) : [...d, a.id])} className="w-4 h-4 accent-emerald-600" />
                    <span className={cn('flex-1 text-foreground', done.includes(a.id) && 'line-through text-muted-foreground')}>{a.text}</span>
                    <span className="text-xs font-semibold text-foreground/80 whitespace-nowrap">{a.owner}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap w-24 text-right">{a.due}</span>
                  </label>
                ))}
              </div>
              <button onClick={() => showToast(k('tasks_toast', 'Action items sent to everyone’s task list, with reminders.'))} className="mt-3 text-sm font-semibold text-primary hover:underline">{k('send_tasks', 'Send to everyone’s task list')}</button>
            </Section>
          )}

          {m.calendar && (
            <Section icon={CalendarPlus} title={k('calendar', 'Calendar')}>
              <div className="grid sm:grid-cols-2 gap-3">
                {m.calendar.map(c => (
                  <div key={c.id} className="rounded-xl border border-border p-4 flex flex-col gap-2">
                    <div className="text-sm font-semibold text-foreground">{c.title}</div>
                    <div className="text-xs text-muted-foreground">{c.when} · {c.who}</div>
                    {added.includes(c.id)
                      ? <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" />{k('added', 'In the calendar')}</span>
                      : <button onClick={() => { setAdded(x => [...x, c.id]); showToast(k('cal_toast', 'Added to the calendar and invites sent.')); }} className="self-start text-xs font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20">{k('add_cal', 'Add to calendar')}</button>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {m.parked && <Section icon={PauseCircle} title={k('parked', 'Parked for later')}><ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">{m.parked.map(x => <li key={x}>{x}</li>)}</ul></Section>}

          {m.quotes && (
            <Section icon={Quote} title={k('quotes', 'Worth remembering')}>
              <div className="space-y-2">
                {m.quotes.map(q => (
                  <blockquote key={q.at} className="border-l-2 border-primary/40 pl-4 text-sm text-foreground/90">“{q.text}” <span className="text-xs text-muted-foreground not-italic">· {speaker(q.who)?.name}, {q.at}</span></blockquote>
                ))}
              </div>
            </Section>
          )}

          {m.kind === 'member' && (
            <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
              <button onClick={() => showToast(k('saved_toast', 'Saved to Adriatica Grupa’s timeline.'))} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold hover:opacity-90">{k('save', 'Save to the account')}</button>
              <button onClick={() => navigateTo('heatmap', 'adr')} className="mt-4 px-5 py-2.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted">{k('open_account', 'Open Adriatica Grupa')}</button>
            </div>
          )}
        </div>
      )}

      {tab === 'transcript' && m.transcript && (
        <div className="space-y-5">
          {m.chapters && (
            <div className="flex flex-wrap gap-2">
              {m.chapters.map(c => <span key={c.at} className="text-xs px-3 py-1.5 rounded-full bg-muted text-foreground/80"><span className="tabular-nums text-muted-foreground mr-1.5">{c.at}</span>{c.title}</span>)}
            </div>
          )}
          <div className="space-y-4">
            {m.transcript.map(l => (
              <div key={l.at} className="flex gap-3 text-sm">
                <span className="text-xs tabular-nums text-muted-foreground w-12 shrink-0 pt-0.5">{l.at}</span>
                <div>
                  <span className="font-semibold text-foreground">{speaker(l.who)?.name}</span>
                  <p className="text-foreground/85 leading-relaxed">{l.text}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{k('transcript_note', 'Excerpt. The full transcript stays on AmCham’s server and can be deleted at any time.')}</p>
        </div>
      )}

      {tab === 'ask' && m.qa && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{k('ask_intro', 'Ask anything about this meeting. Every answer points to the moment it came from.')}</p>
          <div className="flex flex-wrap gap-2">
            {m.qa.map((qa, i) => <button key={qa.q} onClick={() => setAsked(i)} className={cn('px-4 py-2 rounded-full text-sm border transition-colors', asked === i ? 'bg-foreground text-background border-foreground' : 'border-border text-foreground hover:bg-muted')}>{qa.q}</button>)}
          </div>
          {asked !== null && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-muted/50 p-4 text-sm text-foreground">
              {m.qa[asked].a}
              <div className="text-xs text-muted-foreground mt-2">{k('from_moment', 'From the recording at')} {m.qa[asked].at}</div>
            </motion.div>
          )}
        </div>
      )}

      {tab === 'follow' && m.followUp && (
        <div className="space-y-3">
          <div className="rounded-xl bg-muted/50 p-4 text-sm text-foreground whitespace-pre-line leading-relaxed">{m.followUp}</div>
          <div className="flex gap-3">
            <button onClick={() => showToast(k('sent_toast', 'Follow-up sent from Marija’s mailbox.'))} className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold hover:opacity-90">{k('send', 'Approve and send')}</button>
            <button onClick={() => showToast(k('copied', 'Draft copied.'))} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted"><Copy className="w-4 h-4" />{k('copy', 'Copy draft')}</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
        <Users className="w-3.5 h-3.5" />{m.speakers.map(s => `${s.name} (${s.role})`).join(' · ')}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary mb-2"><Icon className="w-4 h-4" />{title}</div>
      {children}
    </section>
  );
}

function PastePanel({ k, showToast }: { k: (a: string, b: string) => string; showToast: (s: string) => void }) {
  const [notes, setNotes] = useState(ROUGH_NOTES);
  const [phase, setPhase] = useState<'idle' | 'working' | 'done'>('idle');
  const m = MEETINGS[0];
  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-5">
      <h3 className="text-2xl font-serif font-bold text-foreground">{k('paste_title', 'Paste rough notes instead')}</h3>
      <p className="text-sm text-muted-foreground">{k('paste_desc', 'No recording? Paste whatever you wrote down, however rough. Compass turns it into the same summary, decisions and action items.')}</p>
      <textarea id="meeting-notes" value={notes} onChange={e => { setNotes(e.target.value); setPhase('idle'); }} className="w-full h-56 rounded-xl border border-border bg-background p-4 text-sm font-mono leading-relaxed text-foreground" />
      <button onClick={() => { setPhase('working'); setTimeout(() => setPhase('done'), 1400); }} disabled={phase === 'working'} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold hover:opacity-90 disabled:opacity-60">
        <Sparkles className="w-4 h-4" />{phase === 'working' ? k('working', 'Reading your notes…') : k('run', 'Turn into actions')}
      </button>
      {phase === 'working' && <div className="space-y-2">{[80, 95, 60].map((w, i) => <div key={i} className="h-3 rounded-full bg-muted animate-pulse" style={{ width: `${w}%` }} />)}</div>}
      {phase === 'done' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 pt-2 border-t border-border">
          <Section icon={Sparkles} title={k('summary', 'Summary')}><ul className="text-sm text-foreground space-y-1.5 list-disc pl-5">{m.summary!.map(x => <li key={x}>{x}</li>)}</ul></Section>
          <Section icon={Gavel} title={k('decisions', 'Decisions')}><ul className="space-y-2">{m.decisions!.map(x => <li key={x} className="text-sm text-foreground flex gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />{x}</li>)}</ul></Section>
          <Section icon={ListChecks} title={k('actions', 'Action items')}>
            <ul className="text-sm text-foreground space-y-1.5">{m.actions!.map(a => <li key={a.id} className="flex justify-between gap-3"><span>{a.text}</span><span className="text-muted-foreground whitespace-nowrap">{a.owner} · {a.due}</span></li>)}</ul>
          </Section>
          <button onClick={() => showToast(k('saved_toast', 'Saved to Adriatica Grupa’s timeline.'))} className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold hover:opacity-90">{k('save', 'Save to the account')}</button>
        </motion.div>
      )}
    </div>
  );
}
