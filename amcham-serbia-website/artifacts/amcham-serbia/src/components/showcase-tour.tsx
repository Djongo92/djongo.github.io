import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import { AnimatePresence, motion } from 'framer-motion';
import { Presentation, X, Layers, Building, Users, Newspaper, Landmark, Briefcase, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { TourOverlay } from '@/pages/platform/console/components/Overlays';

// The showcase is a presenter-driven walk through the platform. The
// presenter first picks who is in the room; each audience gets its own short
// track, written in plain words, and every track ends on that audience's
// card in the proposal. Each step can carry a presenter note ("click this"),
// which the presenter can hide per step (or press N) without the room noticing.

interface StepDef { path: string; title: string; desc: string; note?: string }

const STEPS: Record<string, StepDef> = {
  website: { path: '/', title: 'This is the new website', desc: 'The public site, rebuilt so visitors find what they came for in a few clicks: joining, events, members and research. It works on phones, in English and Serbian.', note: 'Scroll down once, slowly, then press Next.' },
  priorities: { path: '/platform/console?view=ritual&role=lead&tour=off', title: 'Where the team’s day starts', desc: 'Each morning the team gets a short list of what matters most, with the money at stake next to each item. Adriatica Grupa is at the top: their renewal is at risk.', note: 'Click the Adriatica Grupa row.' },
  dossier: { path: '/platform/console?view=heatmap&company=adr&role=lead&tour=off', title: 'Why Adriatica is slipping', desc: 'Their engagement score fell 9 points since May. The breakdown shows why: fewer events, and nobody on a committee.', note: 'Point at Event Attendance.' },
  saveplan: { path: '/platform/console?view=retention&focus=adr&role=lead&tour=off', title: 'A plan to keep them', desc: 'The drop opened a save plan: meet their CEO, with a named owner and a deadline. Nobody has to remember to do it.', note: 'Point at the owner and the deadline on the first card.' },
  notes: { path: '/platform/console?view=notes&role=lead&tour=off', title: 'After the call', desc: 'Marija called Adriatica’s CEO. She pastes her rough notes, and Compass writes the summary, who promised what, and the follow-up email.', note: 'Click “Turn into actions” and wait two seconds.' },
  match: { path: '/platform/console?view=matchmaking&focus=adr&role=lead&tour=off', title: 'The introduction they need', desc: 'Adriatica needs energy for its new production line, and NIS a.d. can help. AmCham asks both sides before making the introduction.', note: 'Click “Request Opt-in from NIS a.d.”, then “Schedule Introduction”.' },
  cleanup: { path: '/platform/console?view=approvals&role=lead&tour=off', title: 'Records that tidy themselves', desc: 'Compass spots duplicate contacts, bounced emails and old job titles, and suggests the fix. One click accepts it.', note: 'Click “Accept all”.' },
  compass: { path: '/platform/console?view=compass&role=lead&tour=off', title: 'Compass, the team’s assistant', desc: 'Compass watches what is happening across the membership and suggests what to do next. Today’s top item: a labour law consultation closes in 6 days, and AmCham hasn’t commented yet.', note: 'Point at the green “On premises” labels: that work never left AmCham.' },
  committees: { path: '/platform/console?view=committees&role=lead&tour=off', title: 'Committees in one place', desc: 'Every committee, who sits on it and what it is working on. This is where policy work gets organised.' },
  press: { path: '/platform/console?view=newsroom&item=n4&role=lead&tour=off', title: 'From position to press release', desc: 'Once a committee agrees a position, the press release is drafted from it, ready to approve and send to journalists.', note: 'Click “Approve and send”.' },
  newsroom: { path: '/platform/console?view=newsroom&item=n1&role=lead&tour=off', title: 'Drafts, ready to approve', desc: 'Translations, social posts, event recaps and press releases arrive as drafts. Someone on the team checks each one and approves it. Nothing goes out by itself.', note: 'Point at the yellow words: Compass asks a person to check them.' },
  digest: { path: '/platform/console?view=newsroom&item=n5&role=lead&tour=off', title: 'One email per member', desc: 'Every member gets a monthly email made for them: news for their sector, their committees, events they would like. Click another company to see it change.', note: 'Click “Adriatica Grupa”.' },
  events: { path: '/platform/console?view=events&role=lead&tour=off', title: 'An event, start to finish', desc: 'Invitations, confirmations, reminders and thank-you emails happen by themselves. The team picks the topic, approves the texts and runs the room.', note: 'Click “5. Follow-up”.' },
  board: { path: '/platform/console?view=board-summary&role=lead&tour=off', title: 'The board report, already done', desc: 'The quarter on one page: how healthy the membership is, and how much money is safe or at risk. No spreadsheets the night before.', note: 'Point at the 88% and read the line under it.' },
  privacy: { path: '/platform/seam?tour=off', title: 'What staff see, and what they don’t', desc: 'Members can see exactly what the portal records, what staff see and how it is used. Personal data stays on AmCham’s own server.' },
  surveys: { path: '/platform/portal?view=laptime&role=member&member=hmo&tour=off', title: 'Surveys', desc: 'Members take AmCham’s surveys here and see the combined results by sector. Nobody’s individual answers are ever shown.' },
  member_value: { path: '/platform/portal?view=score&role=member&member=hmo&tour=off', title: 'The member’s side', desc: 'This is what Hemofarm sees: what their membership did for them this year, and a statement they can forward to their own boss.', note: 'Click “Generate Annual Value Statement”.' },
  member_intros: { path: '/platform/portal?view=intros&role=member&member=hmo&tour=off', title: 'Asking for an introduction', desc: 'Members ask to meet each other and follow each request step by step. PwC said yes, so Hemofarm just picks a time.', note: 'Click “Pick a time”.' },
  member_seen: { path: '/platform/portal?view=seen&role=member&member=hmo&tour=off', title: 'Nothing hidden', desc: 'Members see the same engagement number staff see, the notes AmCham keeps, and switches to decide how their data is used.', note: 'Scroll down and flip one switch.' },
};

const endStep = (team: string): StepDef => ({
  path: `/proposal#teams${team === 'full' ? '' : `-${team}`}`,
  title: team === 'full' ? 'What this means for each team' : 'What this means for you',
  desc: 'That’s the idea. Here is what changes, and just below it, how we would start.',
  note: 'Scroll to “Next steps” when you are ready for questions.',
});

type TrackId = 'full' | 'leadership' | 'membership' | 'comms' | 'policy' | 'members';

const TRACKS: { id: TrackId; icon: React.ElementType; name: string; desc: string; steps: string[] }[] = [
  { id: 'full', icon: Layers, name: 'Everyone', desc: 'The whole story, start to finish.', steps: ['website', 'priorities', 'dossier', 'saveplan', 'notes', 'match', 'compass', 'newsroom', 'privacy', 'member_value', 'member_intros'] },
  { id: 'leadership', icon: Building, name: 'Leadership and the board', desc: 'The big picture, the board report and how data is protected.', steps: ['website', 'priorities', 'compass', 'board', 'privacy'] },
  { id: 'membership', icon: Users, name: 'Membership team', desc: 'Priorities, calls, save plans and introductions.', steps: ['priorities', 'dossier', 'saveplan', 'notes', 'match', 'cleanup'] },
  { id: 'comms', icon: Newspaper, name: 'Communications and events', desc: 'Drafts to approve, the member email and events.', steps: ['website', 'newsroom', 'digest', 'events'] },
  { id: 'policy', icon: Landmark, name: 'Policy and committees', desc: 'Law alerts, committees, surveys and press releases.', steps: ['compass', 'committees', 'surveys', 'press'] },
  { id: 'members', icon: Briefcase, name: 'Members', desc: 'What membership gives them, and what AmCham sees.', steps: ['website', 'member_value', 'member_intros', 'member_seen'] },
];

interface ShowcaseContextValue {
  active: boolean;
  start: () => void;
  startTrack: (id: TrackId) => void;
}

const ShowcaseContext = createContext<ShowcaseContextValue>({ active: false, start: () => {}, startTrack: () => {} });

export const useShowcase = () => useContext(ShowcaseContext);

const NOTES_KEY = 'amcham-showcase-hidden-notes';
function readHidden(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); } catch { return {}; }
}
function writeHidden(v: Record<string, boolean>) {
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(v)); } catch { /* notes still work for this visit */ }
}

export function ShowcaseProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [picker, setPicker] = useState(false);
  const [trackId, setTrackId] = useState<TrackId>('full');
  const [stepIndex, setStepIndex] = useState(-1);
  const [hiddenNotes, setHiddenNotes] = useState<Record<string, boolean>>(readHidden);
  const active = stepIndex > -1;

  const track = TRACKS.find((x) => x.id === trackId)!;
  const stepIds = [...track.steps, `end_${track.id}`];
  const stepAt = (i: number): StepDef => {
    const id = stepIds[i];
    if (id.startsWith('end_')) return endStep(track.id);
    return STEPS[id];
  };
  const tx = (id: string, field: 'title' | 'desc' | 'note', fb?: string) => (fb ? t(`showcase.s.${id.startsWith('end_') ? (id === 'end_full' ? 'end_full' : 'end') : id}.${field}`, fb) : undefined);

  useEffect(() => {
    if (!active) return;
    setLocation(stepAt(stepIndex).path);
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, trackId]);

  const start = () => setPicker(true);
  const startTrack = (id: TrackId) => { setPicker(false); setTrackId(id); setStepIndex(0); };
  const end = () => setStepIndex(-1);
  const prev = () => setStepIndex((s) => Math.max(0, s - 1));
  const noteKey = `${trackId}:${stepIds[stepIndex] ?? ''}`;
  const toggleNote = useCallback(() => {
    setHiddenNotes((h) => { const n = { ...h, [noteKey]: !h[noteKey] }; writeHidden(n); return n; });
  }, [noteKey]);

  // Arrow keys move through the steps, N hides or shows the presenter note,
  // Esc ends the tour. Ignored while typing in a field.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.key === 'ArrowRight') setStepIndex((s) => (s >= stepIds.length - 1 ? s : s + 1));
      else if (e.key === 'ArrowLeft') setStepIndex((s) => Math.max(0, s - 1));
      else if (e.key === 'n' || e.key === 'N') toggleNote();
      else if (e.key === 'Escape') end();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, stepIds.length, toggleNote]);

  return (
    <ShowcaseContext.Provider value={{ active, start, startTrack }}>
      {children}
      <AnimatePresence>
        {picker && <AudiencePicker onPick={startTrack} onClose={() => setPicker(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {active && (
          <TourOverlay
            step={stepIndex}
            setStep={setStepIndex}
            endTour={end}
            onBack={prev}
            badge={{ icon: Presentation, label: `${t('showcase.badge', 'Showcase')} · ${t(`showcase.tracks.${track.id}.name`, track.name)}` }}
            steps={stepIds.map((id, i) => {
              const s = stepAt(i);
              return { title: tx(id, 'title', s.title)!, desc: tx(id, 'desc', s.desc)!, note: tx(id, 'note', s.note) };
            })}
            noteHidden={!!hiddenNotes[noteKey]}
            onToggleNote={toggleNote}
            align="left"
            labels={{
              skip: t('platform.console.tour_skip'),
              next: t('platform.console.tour_next'),
              done: t('platform.console.tour_done'),
              back: t('showcase.back', 'Back'),
              note: t('showcase.note_label', 'Presenter note'),
              hideNote: t('showcase.note_hide', 'Hide note (N)'),
              showNote: t('showcase.note_show', 'Show note (N)'),
            }}
          />
        )}
      </AnimatePresence>
    </ShowcaseContext.Provider>
  );
}

function AudiencePicker({ onPick, onClose }: { onPick: (id: TrackId) => void; onClose: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="showcase-picker-title">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-background border border-border shadow-2xl p-6 md:p-8">
        <button onClick={onClose} aria-label={t('showcase.picker_close', 'Close')} className="absolute top-5 right-5 w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"><X className="w-4 h-4" /></button>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary mb-2"><Presentation className="w-3.5 h-3.5" />{t('showcase.badge', 'Showcase')}</div>
        <h2 id="showcase-picker-title" className="text-3xl font-serif font-bold text-foreground mb-2">{t('showcase.picker_title', 'Who’s in the room?')}</h2>
        <p className="text-muted-foreground mb-6">{t('showcase.picker_desc', 'Pick your audience and the walkthrough shows what matters to them. Use the arrow keys to move, and N to hide your presenter notes.')}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {TRACKS.map((tr) => {
            const Icon = tr.icon;
            const n = tr.steps.length + 1;
            return (
              <button key={tr.id} onClick={() => onPick(tr.id)}
                className={cn('group text-left rounded-2xl border p-5 flex gap-4 transition-colors', tr.id === 'full' ? 'border-foreground/30 bg-card sm:col-span-2' : 'border-border bg-card hover:border-foreground/30')}>
                <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-foreground">{t(`showcase.tracks.${tr.id}.name`, tr.name)}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{n} {t('showcase.steps_word', 'steps')}</span>
                  </span>
                  <span className="block text-sm text-muted-foreground mt-1">{t(`showcase.tracks.${tr.id}.desc`, tr.desc)}</span>
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground self-center opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
