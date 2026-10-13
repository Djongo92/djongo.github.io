import React, { useEffect, useMemo, useState } from 'react';
import { useSearch } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, Share2, Newspaper, Megaphone, Mail, Check, Pencil, Send, Clock, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { TierChip } from '@/components/ai-privacy';
import { NEWS_ITEMS, DIGEST_PREVIEWS, type AnyNewsItem, type NewsKind } from '../newsroom-data';

const KIND_ICON: Record<NewsKind, React.ElementType> = {
  translation: Languages, social: Share2, recap: Newspaper, press: Megaphone, digest: Mail,
};

export function NewsroomView({ showToast }: { showToast: (m: string) => void }) {
  const { t } = useI18n();
  const k = (key: string, fb: string) => t(`platform.console.newsroom.${key}`, fb);
  const kindLabel: Record<NewsKind, string> = {
    translation: k('kind_translation', 'Translation'),
    social: k('kind_social', 'Social post'),
    recap: k('kind_recap', 'Event recap'),
    press: k('kind_press', 'Press release'),
    digest: k('kind_digest', 'Member digest'),
  };

  // ?item=<id> opens that draft; following it means a walkthrough can move
  // between drafts without leaving the page.
  const search = useSearch();
  const initialFocus = new URLSearchParams(search).get('item');
  const [filter, setFilter] = useState<NewsKind | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string>(initialFocus && NEWS_ITEMS.some(i => i.id === initialFocus) ? initialFocus : NEWS_ITEMS[0].id);
  const [approved, setApproved] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    if (initialFocus && NEWS_ITEMS.some(i => i.id === initialFocus)) { setSelectedId(initialFocus); setFilter('all'); }
  }, [initialFocus]);

  const items = useMemo(() => NEWS_ITEMS.filter(i => filter === 'all' || i.kind === filter), [filter]);
  const selected = NEWS_ITEMS.find(i => i.id === selectedId) ?? NEWS_ITEMS[0];
  const waiting = NEWS_ITEMS.filter(i => !approved[i.id]).length;

  const approve = (item: AnyNewsItem, message: string, state: string) => {
    setApproved(p => ({ ...p, [item.id]: state }));
    setEditing(null);
    showToast(message);
  };

  const filters: (NewsKind | 'all')[] = ['all', 'translation', 'social', 'recap', 'press', 'digest'];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-serif font-light tracking-tight text-foreground mb-2">{k('title', 'Newsroom')}</h2>
          <p className="text-muted-foreground leading-relaxed">{k('desc', 'Everything Compass has drafted for the website, members and the press. Nothing goes out until someone on the team approves it.')}</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <div className="rounded-2xl border border-border bg-card px-5 py-3">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{k('waiting', 'Waiting for you')}</div>
            <div className="text-2xl font-serif tabular-nums text-foreground">{waiting}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card px-5 py-3">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{k('approved_week', 'Approved this week')}</div>
            <div className="text-2xl font-serif tabular-nums text-foreground">{14 + Object.keys(approved).length}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-4 py-2 rounded-full text-sm font-semibold border transition-colors', filter === f ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border hover:text-foreground')}>
            {f === 'all' ? k('all', 'Everything') : kindLabel[f]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 items-start">
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {items.map(item => {
            const Icon = KIND_ICON[item.kind];
            const state = approved[item.id];
            return (
              <button key={item.id} onClick={() => setSelectedId(item.id)} className={cn('w-full text-left p-5 flex gap-4 transition-colors', selectedId === item.id ? 'bg-primary/5' : 'hover:bg-muted/50')}>
                <span className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-foreground/70" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{kindLabel[item.kind]}</span>
                    {state
                      ? <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{state}</span>
                      : <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{item.due}</span>}
                  </span>
                  <span className="block font-semibold text-foreground leading-snug">{item.title}</span>
                  <span className="block text-sm text-muted-foreground mt-1">{item.source}</span>
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={selected.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">{kindLabel[selected.kind]}</span>
              <TierChip tier={selected.tier} />
            </div>
            <h3 className="text-2xl font-serif font-bold text-foreground leading-snug">{selected.title}</h3>

            {selected.kind === 'translation' && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-muted/50 p-4 space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{k('original', 'Original · English')}</div>
                    {selected.original.map((p, i) => <p key={i} className="text-sm text-foreground/80 leading-relaxed">{p}</p>)}
                  </div>
                  <div className="rounded-xl border border-primary/30 p-4 space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-primary">{k('draft_sr', 'Draft · Serbian')}</div>
                    {editing === selected.id
                      ? <textarea defaultValue={selected.draft.join('\n\n')} className="w-full h-48 text-sm bg-background border border-border rounded-lg p-3" />
                      : selected.draft.map((p, i) => <p key={i} className="text-sm text-foreground leading-relaxed">{highlight(p, selected.check.map(c => c.term))}</p>)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{k('check', 'Please check')}</div>
                  {selected.check.map(c => (
                    <div key={c.term} className="text-sm flex gap-2"><mark className="bg-amber-200/70 dark:bg-amber-400/30 text-foreground rounded px-1">{c.term}</mark><span className="text-muted-foreground">{c.note}</span></div>
                  ))}
                </div>
              </>
            )}

            {selected.kind === 'social' && (
              <>
                <div className="rounded-xl border border-border p-5 bg-background">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{selected.channel}</div>
                  {editing === selected.id
                    ? <textarea defaultValue={selected.post} className="w-full h-40 text-sm bg-card border border-border rounded-lg p-3" />
                    : <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{selected.post}</p>}
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><ImageIcon className="w-4 h-4" />{selected.image}</div>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" />{k('suggested_time', 'Suggested time')}: <span className="text-foreground font-medium">{selected.bestTime}</span></div>
              </>
            )}

            {(selected.kind === 'recap' || selected.kind === 'press') && (
              <>
                <article className="rounded-xl border border-border p-5 bg-background space-y-3">
                  <h4 className="font-serif text-xl font-bold text-foreground">{selected.headline}</h4>
                  {editing === selected.id
                    ? <textarea defaultValue={selected.body.join('\n\n')} className="w-full h-52 text-sm bg-card border border-border rounded-lg p-3" />
                    : selected.body.map((p, i) => <p key={i} className="text-sm text-foreground/85 leading-relaxed">{p}</p>)}
                </article>
                {selected.kind === 'recap' && (
                  <>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mr-1">{k('built_from', 'Built from')}</span>
                      {selected.builtFrom.map(b => <span key={b} className="text-xs px-3 py-1 rounded-full bg-muted text-foreground/80">{b}</span>)}
                    </div>
                    <p className="text-sm"><mark className="bg-amber-200/70 dark:bg-amber-400/30 text-foreground rounded px-1">{selected.confirm}</mark></p>
                  </>
                )}
                {selected.kind === 'press' && (
                  <p className="text-sm text-muted-foreground">{k('goes_to', 'Goes to')}: <span className="text-foreground font-medium">{selected.audience}</span></p>
                )}
              </>
            )}

            {selected.kind === 'digest' && <DigestPreview k={k} ready={selected.ready} />}

            <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
              {approved[selected.id] ? (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 pt-4"><Check className="w-4 h-4" />{approved[selected.id]}</span>
              ) : (
                <div className="flex flex-wrap gap-3 pt-4">
                  <button
                    onClick={() => {
                      if (selected.kind === 'translation') approve(selected, k('toast_translation', 'Published in Serbian on the website.'), k('state_published', 'Published'));
                      else if (selected.kind === 'social') approve(selected, k('toast_social', 'Scheduled for today at 10:00.'), k('state_scheduled', 'Scheduled'));
                      else if (selected.kind === 'recap') approve(selected, k('toast_recap', 'Recap published in News.'), k('state_published', 'Published'));
                      else if (selected.kind === 'press') approve(selected, k('toast_press', 'Sent to 12 journalists.'), k('state_sent', 'Sent'));
                      else approve(selected, k('toast_digest', '312 digests scheduled for Monday, 09:00.'), k('state_scheduled', 'Scheduled'));
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold hover:opacity-90">
                    <Send className="w-4 h-4" />
                    {selected.kind === 'translation' ? k('approve_publish', 'Approve and publish')
                      : selected.kind === 'social' ? k('approve_schedule', 'Approve and schedule')
                      : selected.kind === 'press' ? k('approve_send', 'Approve and send')
                      : selected.kind === 'digest' ? `${k('approve_all', 'Approve all')} ${selected.ready}`
                      : k('approve_publish', 'Approve and publish')}
                  </button>
                  {selected.kind !== 'digest' && (
                    <button onClick={() => setEditing(editing === selected.id ? null : selected.id)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted">
                      <Pencil className="w-4 h-4" />{editing === selected.id ? k('done_editing', 'Done editing') : k('edit', 'Edit')}
                    </button>
                  )}
                  {selected.kind === 'digest' && (
                    <button onClick={() => showToast(k('toast_test', 'Test email sent to you.'))} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted">
                      <Mail className="w-4 h-4" />{k('send_test', 'Send me a test')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function highlight(text: string, terms: string[]) {
  const parts: React.ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest) {
    const hits = terms.map(term => ({ term, at: rest.indexOf(term) })).filter(h => h.at >= 0).sort((a, b) => a.at - b.at);
    if (!hits.length) { parts.push(rest); break; }
    const { term, at } = hits[0];
    if (at > 0) parts.push(rest.slice(0, at));
    parts.push(<mark key={key++} className="bg-amber-200/70 dark:bg-amber-400/30 text-foreground rounded px-0.5">{term}</mark>);
    rest = rest.slice(at + term.length);
  }
  return parts;
}

function DigestPreview({ k, ready }: { k: (key: string, fb: string) => string; ready: number }) {
  const [who, setWho] = useState<keyof typeof DIGEST_PREVIEWS>('hmo');
  const d = DIGEST_PREVIEWS[who];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        {k('digest_explain', 'Every member gets their own email, built from their sector, their committees, the events they go to and the introductions they asked for. Pick a member to see theirs.')}
      </p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(DIGEST_PREVIEWS) as (keyof typeof DIGEST_PREVIEWS)[]).map(id => (
          <button key={id} onClick={() => setWho(id)} className={cn('px-4 py-2 rounded-full text-sm font-semibold border', who === id ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>
            {DIGEST_PREVIEWS[id].company}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="px-5 py-3 border-b border-border text-sm">
          <div className="text-muted-foreground">{k('subject', 'Subject')}: <span className="text-foreground font-medium">{k('digest_subject', 'Your AmCham month')} · {d.sector}</span></div>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-foreground">{k('digest_hello', 'Hello')} {d.person},</p>
          {d.sections.map(s => (
            <div key={s.heading}>
              <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">{s.heading}</div>
              <ul className="text-sm text-foreground/85 space-y-1">{s.lines.map(l => <li key={l}>{l}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{ready} {k('digest_ready', 'digests are ready. Members who opted out of email are not included.')}</p>
    </div>
  );
}
