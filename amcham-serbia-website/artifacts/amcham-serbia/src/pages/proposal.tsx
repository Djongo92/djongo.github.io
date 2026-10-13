import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'wouter';
import { SEO } from '@/components/seo';
import { ArrowRight, Presentation, X, ChevronDown, ChevronUp, Globe2, LayoutDashboard, ShieldCheck, Sparkles, Check } from 'lucide-react';
import { PRINCIPLES, USE_CASES, PHASES, ASKS, RISKS, FAQ } from '@/data/proposal';
import { TierCards, RouterExample, DataClassTable, TierChip } from '@/components/ai-privacy';
import { cn } from '@/lib/utils';

// Client-facing proposal: the redesign, the platform, and private-by-design
// AI. Reads as a long page; "Present" turns each section into a full-screen
// slide driven by the arrow keys, for use in the room.

type Band = 'plain' | 'navy' | 'muted';
interface Section { id: string; nav: string; band: Band; render: () => React.ReactNode }

function Eyebrow({ children, onNavy }: { children: React.ReactNode; onNavy?: boolean }) {
  return <span className={cn('text-xs font-bold uppercase tracking-widest block mb-4', onNavy ? 'text-accent' : 'text-primary')}>{children}</span>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-3xl md:text-5xl font-serif font-bold mb-6 text-balance max-w-4xl">{children}</h2>;
}
function Lead({ children, onNavy }: { children: React.ReactNode; onNavy?: boolean }) {
  return <p className={cn('text-lg md:text-xl leading-relaxed max-w-3xl mb-10', onNavy ? 'text-secondary-foreground/85' : 'text-muted-foreground')}>{children}</p>;
}

const SECTIONS: Section[] = [
  {
    id: 'cover', nav: 'Cover', band: 'navy',
    render: () => (
      <>
        <Eyebrow onNavy>Proposal for AmCham Serbia · October 2026 · Draft for discussion</Eyebrow>
        <h1 className="text-4xl md:text-7xl font-serif font-bold mb-8 text-balance max-w-5xl leading-[1.05]">A new website, and AI your members can trust.</h1>
        <p className="text-lg md:text-2xl text-secondary-foreground/85 max-w-3xl leading-relaxed">
          A redesigned AmCham Serbia online, a platform that connects members and the team, and AI built into both, set up so member data never leaves AmCham’s control.
        </p>
      </>
    ),
  },
  {
    id: 'summary', nav: 'In short', band: 'plain',
    render: () => (
      <>
        <Eyebrow>In short</Eyebrow>
        <H2>Three things, delivered in steps you can stop after.</H2>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Globe2, title: 'A website that answers', body: 'Built around what members and visitors actually come to do: join, attend, find a member, find research, reach a committee.' },
            { icon: LayoutDashboard, title: 'A platform that connects', body: 'A member portal and a staff console that share one record of each relationship, with clear rules on what each side sees.' },
            { icon: ShieldCheck, title: 'AI that stays private', body: 'Help for the team and for members, running on a model AmCham controls whenever member data is involved.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-3xl border border-border bg-card p-7">
              <Icon className="w-7 h-7 text-primary mb-5" />
              <h3 className="text-xl font-serif font-bold mb-3 text-foreground">{title}</h3>
              <p className="text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'why-now', nav: 'Why now', band: 'muted',
    render: () => (
      <>
        <Eyebrow>Why now</Eyebrow>
        <H2>AI is already touching member data. The question is whose rules it follows.</H2>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { title: 'It is already happening', body: 'Staff everywhere paste emails, notes and drafts into public AI tools to save time. There is no record of what was shared, and no control over where it went.' },
            { title: 'Members expect it', body: 'Your members run Microsoft, banks and law firms. They use AI daily and will judge AmCham’s service against it.' },
            { title: 'The team’s time is the constraint', body: 'Briefs, follow-ups, translations, reports and survey analysis are slow, manual work that AI does well with a person checking.' },
          ].map((c) => (
            <div key={c.title} className="rounded-3xl bg-card border border-border p-7">
              <h3 className="text-lg font-bold mb-3 text-foreground">{c.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-lg font-serif text-foreground max-w-3xl">A governed tool, with clear rules on what data goes where, is safer than a ban that nobody follows.</p>
      </>
    ),
  },
  {
    id: 'website', nav: 'The website', band: 'plain',
    render: () => (
      <>
        <Eyebrow>1 · The website</Eyebrow>
        <H2>Designed around five real journeys, not an org chart.</H2>
        <Lead>We benchmarked the current site against peer AmCham sites, then rebuilt it around what people come to do. Every page you can click today is a working mock-up of that redesign.</Lead>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-10">
          {['Join AmCham', 'Attend an event', 'Find a member', 'Find research', 'Reach a committee'].map((j, i) => (
            <div key={j} className="rounded-2xl border border-border bg-card p-5">
              <div className="text-xs font-bold text-primary mb-2">Journey {i + 1}</div>
              <div className="font-bold text-foreground">{j}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-bold hover:bg-primary/90">See the new homepage <ArrowRight className="w-4 h-4" /></Link>
          <Link href="/blueprint" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-bold hover:bg-muted">Read the Blueprint</Link>
        </div>
      </>
    ),
  },
  {
    id: 'platform', nav: 'The platform', band: 'muted',
    render: () => (
      <>
        <Eyebrow>2 · The platform</Eyebrow>
        <H2>One record of each relationship, seen from both sides.</H2>
        <Lead>Members get a portal for introductions, events, committees and a clear record of what membership has delivered. The team gets a console that shows which relationships need attention this week. Privacy & Sharing sets out exactly what crosses between them.</Lead>
        <div className="grid gap-5 md:grid-cols-2 mb-8">
          <div className="rounded-3xl border border-border bg-card p-7">
            <h3 className="text-xl font-serif font-bold mb-3 text-foreground">Staff console</h3>
            <p className="text-muted-foreground mb-5">This week’s priorities ranked by what is at stake, account health, renewals, introductions, committees and board reporting.</p>
            <Link href="/platform/console" className="text-primary font-bold inline-flex items-center gap-1.5">Open the console <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="rounded-3xl border border-border bg-card p-7">
            <h3 className="text-xl font-serif font-bold mb-3 text-foreground">Member portal</h3>
            <p className="text-muted-foreground mb-5">What membership delivered this year, introductions to other members, events, committees and AmCham’s surveys.</p>
            <Link href="/platform/portal" className="text-primary font-bold inline-flex items-center gap-1.5">Open the portal <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'principles', nav: 'AI principles', band: 'navy',
    render: () => (
      <>
        <Eyebrow onNavy>3 · AI, private by design</Eyebrow>
        <H2>Five promises we build to, and you can audit.</H2>
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <li key={p.title} className="rounded-3xl border border-secondary-foreground/15 bg-secondary-foreground/5 p-6">
              <div className="text-accent font-serif text-3xl mb-3">{i + 1}</div>
              <h3 className="text-lg font-bold mb-2">{p.title}</h3>
              <p className="text-secondary-foreground/80 leading-relaxed">{p.body}</p>
            </li>
          ))}
        </ol>
      </>
    ),
  },
  {
    id: 'how', nav: 'How it works', band: 'plain',
    render: () => (
      <>
        <Eyebrow>How it works</Eyebrow>
        <H2>Every request goes through a privacy router first.</H2>
        <Lead>The router looks at what data a task needs and sends it to the cheapest model that is allowed to see that data. Most of the time, that is the private model.</Lead>
        <TierCards className="mb-10" />
        <RouterExample />
      </>
    ),
  },
  {
    id: 'data', nav: 'Your data', band: 'muted',
    render: () => (
      <>
        <Eyebrow>Your data, classified</Eyebrow>
        <H2>Different data, different rules.</H2>
        <Lead>We agree this table with AmCham’s privacy owner before any feature goes live. It is enforced by the router, not by good intentions.</Lead>
        <DataClassTable />
      </>
    ),
  },
  {
    id: 'use-cases', nav: 'What AI will do', band: 'plain',
    render: () => (
      <>
        <Eyebrow>What AI will do for AmCham</Eyebrow>
        <H2>Useful first, impressive second.</H2>
        <div className="grid gap-4 md:grid-cols-2">
          {USE_CASES.map((u) => (
            <div key={u.title} className="rounded-3xl border border-border bg-card p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{u.area} · Phase {u.phase}</span>
                <TierChip tier={u.tier} />
              </div>
              <h3 className="text-lg font-bold text-foreground">{u.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{u.body}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'roadmap', nav: 'Roadmap', band: 'muted',
    render: () => (
      <>
        <Eyebrow>Roadmap</Eyebrow>
        <H2>Start with public data. Earn trust. Then go deeper.</H2>
        <div className="grid gap-5 lg:grid-cols-3">
          {PHASES.map((p) => (
            <div key={p.phase} className="rounded-3xl border border-border bg-card p-7 flex flex-col">
              <div className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Phase {p.phase}</div>
              <h3 className="text-2xl font-serif font-bold mb-1 text-foreground">{p.name}</h3>
              <div className="text-sm text-muted-foreground mb-4">{p.duration}</div>
              <p className="text-foreground mb-5 leading-relaxed">{p.goal}</p>
              <ul className="space-y-2 mt-auto">
                {p.items.map((it) => (
                  <li key={it} className="flex gap-2 text-sm text-foreground"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'asks', nav: 'What we need', band: 'plain',
    render: () => (
      <>
        <Eyebrow>What we need from AmCham</Eyebrow>
        <H2>A little time, and one decision-maker for privacy.</H2>
        <div className="grid gap-4 md:grid-cols-2">
          {ASKS.map((a) => (
            <div key={a.title} className="rounded-3xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold mb-2 text-foreground">{a.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{a.body}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'risks', nav: 'Risks', band: 'muted',
    render: () => (
      <>
        <Eyebrow>Risks, stated plainly</Eyebrow>
        <H2>What could go wrong, and what we do about it.</H2>
        <div className="rounded-3xl border border-border bg-card divide-y divide-border">
          {RISKS.map((r) => (
            <div key={r.risk} className="p-6 grid gap-2 md:grid-cols-[220px_minmax(0,1fr)]">
              <h3 className="font-bold text-foreground">{r.risk}</h3>
              <p className="text-muted-foreground leading-relaxed">{r.answer}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'faq', nav: 'Questions', band: 'plain',
    render: () => <FaqBlock />,
  },
  {
    id: 'next', nav: 'Next steps', band: 'navy',
    render: () => (
      <>
        <Eyebrow onNavy>Next steps</Eyebrow>
        <H2>Three steps to get started.</H2>
        <ol className="grid gap-4 md:grid-cols-3 mb-10">
          {[
            { title: 'A working session', body: '90 minutes with the team: walk through the demo, agree what matters most.' },
            { title: 'Discovery fortnight', body: 'How data is kept today, what to connect first, and a Serbian-quality test on your own documents.' },
            { title: 'A written proposal', body: 'For the redesign and Phase 0, with Phase 1 scoped as an option.' },
          ].map((s, i) => (
            <li key={s.title} className="rounded-3xl border border-secondary-foreground/15 bg-secondary-foreground/5 p-6">
              <div className="text-accent font-serif text-3xl mb-3">{i + 1}</div>
              <h3 className="text-lg font-bold mb-2">{s.title}</h3>
              <p className="text-secondary-foreground/80 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
        <Link href="/platform" className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-bold hover:bg-primary/90">
          <Sparkles className="w-4 h-4" /> Try the platform demo
        </Link>
      </>
    ),
  },
];

function FaqBlock() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <>
      <Eyebrow>Questions we expect</Eyebrow>
      <H2>The questions a careful board will ask.</H2>
      <div className="rounded-3xl border border-border bg-card divide-y divide-border">
        {FAQ.map((f, i) => (
          <div key={f.q}>
            <button onClick={() => setOpenIdx(openIdx === i ? null : i)} aria-expanded={openIdx === i} className="w-full flex items-center justify-between gap-4 p-6 text-left font-bold text-foreground hover:bg-muted/40">
              {f.q}
              <ChevronDown className={cn('w-5 h-5 shrink-0 transition-transform', openIdx === i && 'rotate-180')} />
            </button>
            {openIdx === i && <p className="px-6 pb-6 -mt-2 text-muted-foreground leading-relaxed max-w-3xl">{f.a}</p>}
          </div>
        ))}
      </div>
    </>
  );
}

const BAND_CLASS: Record<Band, string> = {
  plain: 'bg-background text-foreground',
  muted: 'bg-muted/40 text-foreground',
  navy: 'bg-secondary text-secondary-foreground',
};

export default function Proposal() {
  const [presenting, setPresenting] = useState(false);
  const [current, setCurrent] = useState(0);
  const currentRef = useRef(0);
  currentRef.current = current;
  const deckRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const goTo = useCallback((i: number) => {
    const idx = Math.max(0, Math.min(SECTIONS.length - 1, i));
    sectionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Deep links like /proposal#how land on that section (the shell scrolls to
  // the top on every route change, so this runs just after it).
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const idx = SECTIONS.findIndex((s) => s.id === id);
    if (idx > 0) setTimeout(() => sectionRefs.current[idx]?.scrollIntoView({ block: 'start' }), 350);
  }, []);

  // Track which section is in view, for the nav highlight and the slide counter.
  useEffect(() => {
    const root = presenting ? deckRef.current : null;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(Number((e.target as HTMLElement).dataset.idx));
      },
      { root, rootMargin: '-45% 0px -50% 0px' },
    );
    sectionRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [presenting]);

  // Entering or leaving the deck keeps your place: the slide (or section) you
  // were on is where you land.
  useEffect(() => {
    const at = currentRef.current;
    requestAnimationFrame(() => sectionRefs.current[at]?.scrollIntoView({ block: 'start' }));
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        // A slide taller than the screen pages through its lower half first.
        const el = sectionRefs.current[currentRef.current];
        const deck = deckRef.current;
        if (el && deck && el.getBoundingClientRect().bottom > window.innerHeight + 8) deck.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
        else goTo(currentRef.current + 1);
      }
      else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); goTo(currentRef.current - 1); }
      else if (e.key === 'Escape') setPresenting(false);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [presenting, goTo]);

  const sections = SECTIONS.map((s, i) => (
    <section
      key={s.id}
      id={s.id}
      data-idx={i}
      ref={(el) => { sectionRefs.current[i] = el; }}
      className={cn(BAND_CLASS[s.band], presenting ? 'min-h-[100dvh] snap-start flex items-center py-16' : cn('scroll-mt-32', i === 0 ? 'pt-20 pb-24 md:pt-28 md:pb-32' : 'py-20 md:py-24'))}
    >
      <div className="container mx-auto px-4 md:px-8 max-w-6xl w-full">{s.render()}</div>
    </section>
  ));

  return (
    <div className="w-full">
      <SEO title="Proposal: a new website and private AI" description="A proposal for AmCham Serbia: the website redesign, the member platform, and AI that keeps member data under AmCham's control." />

      {!presenting && (
        <div className="sticky top-20 z-30 bg-background/90 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 md:px-8 max-w-6xl flex items-center gap-4 h-14">
            <nav aria-label="Proposal sections" className="flex-1 min-w-0 overflow-x-auto [scrollbar-width:none]">
              <ul className="flex items-center gap-1 w-max">
                {SECTIONS.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} onClick={(e) => { e.preventDefault(); goTo(i); }} className={cn('block px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors', current === i ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                      {s.nav}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <button onClick={() => setPresenting(true)} className="shrink-0 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:bg-primary/90">
              <Presentation className="w-4 h-4" /> Present
            </button>
          </div>
        </div>
      )}

      {presenting ? createPortal(
        <div ref={deckRef} className="fixed inset-0 z-[90] overflow-y-auto snap-y snap-proximity bg-background" role="region" aria-label="Proposal presentation">
          {sections}
          <div className="fixed top-0 left-0 right-0 h-1 bg-border z-10" aria-hidden="true">
            <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${((current + 1) / SECTIONS.length) * 100}%` }} />
          </div>
          <div className="fixed bottom-5 right-5 z-10 flex items-center gap-2 rounded-full bg-card/95 border border-border shadow-lg px-2 py-1.5 text-foreground">
            <button onClick={() => goTo(current - 1)} aria-label="Previous slide" className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"><ChevronUp className="w-4 h-4" /></button>
            <span className="text-xs font-bold tabular-nums w-12 text-center">{current + 1} / {SECTIONS.length}</span>
            <button onClick={() => goTo(current + 1)} aria-label="Next slide" className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"><ChevronDown className="w-4 h-4" /></button>
            <button onClick={() => setPresenting(false)} aria-label="Exit presentation" className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
        </div>,
        document.body,
      ) : (
        sections
      )}
    </div>
  );
}
