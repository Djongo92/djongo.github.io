import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { SEO } from '@/components/seo';
import { ArrowRight } from 'lucide-react';
import { PRINCIPLES, USE_CASES } from '@/data/proposal';
import { TierCards, RouterExample, DataClassTable, TierChip } from '@/components/ai-privacy';
import { cn } from '@/lib/utils';

// "How AI works in the platform": a reading page that explains how AI fits
// into the product and what happens to member data. Served at /ai and, for
// older links, /proposal.

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
    id: 'principles', nav: 'AI principles', band: 'navy',
    render: () => (
      <>
        <Eyebrow onNavy>AI principles</Eyebrow>
        <H2>Five rules every AI feature follows.</H2>
        <Lead onNavy>They hold for every feature in the platform, today and later, and each one can be checked.</Lead>
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
        <Lead>The router looks at what data a task needs and sends it to the simplest model that is allowed to see that data. Most of the time, that is the private model.</Lead>
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
        <Lead>Every kind of data in the platform has a rule for which model may see it. The router enforces the rule; it does not depend on anyone remembering it.</Lead>
        <DataClassTable />
      </>
    ),
  },
  {
    id: 'use-cases', nav: 'What AI will do', band: 'plain',
    render: () => (
      <>
        <Eyebrow>What AI will do</Eyebrow>
        <H2>Useful first, impressive second.</H2>
        <Lead>Where AI shows up across the website, the staff console and the member portal, and which model each task is allowed to use.</Lead>
        <div className="grid gap-4 md:grid-cols-2">
          {USE_CASES.map((u) => (
            <div key={u.title} className="rounded-3xl border border-border bg-card p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{u.area}</span>
                <TierChip tier={u.tier} />
              </div>
              <h3 className="text-lg font-bold text-foreground">{u.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{u.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/platform/console?view=compass" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-3 text-sm font-bold hover:opacity-90">
            See Compass in the staff console <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/platform/seam" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-bold text-foreground hover:bg-muted">
            What members see in Privacy &amp; Sharing
          </Link>
        </div>
      </>
    ),
  },
];

const BAND_CLASS: Record<Band, string> = {
  plain: 'bg-background text-foreground',
  muted: 'bg-muted/40 text-foreground',
  navy: 'bg-secondary text-secondary-foreground',
};

export default function Proposal() {
  const [current, setCurrent] = useState(-1);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const goTo = useCallback((i: number) => {
    sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Deep links like /ai#how land on that section (the shell scrolls to the
  // top on every route change, so this runs just after it).
  useEffect(() => {
    const idx = SECTIONS.findIndex((s) => s.id === window.location.hash.slice(1));
    if (idx >= 0) setTimeout(() => sectionRefs.current[idx]?.scrollIntoView({ block: 'start' }), 350);
  }, []);

  // Highlight the section in view in the sticky nav.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(Number((e.target as HTMLElement).dataset.idx));
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sectionRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="w-full">
      <SEO title="How AI works in the platform" description="How AI fits into the AmCham platform: the principles it follows, how requests are routed, which data each model may see, and what AI does for staff and members." />

      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl pt-20 pb-14 md:pt-24 md:pb-16">
          <Eyebrow>AI in the platform</Eyebrow>
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 text-balance max-w-4xl leading-[1.08] text-foreground">How AI works in the platform, and what it does with your data.</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed">
            AI is built into the website, the staff console and the member portal. This page explains the rules it follows, how each request is routed, and which data each model is allowed to see.
          </p>
        </div>
      </header>

      <div className="sticky top-20 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl flex items-center h-14">
          <nav aria-label="Sections" className="min-w-0 overflow-x-auto [scrollbar-width:none]">
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
        </div>
      </div>

      {SECTIONS.map((s, i) => (
        <section
          key={s.id}
          id={s.id}
          data-idx={i}
          ref={(el) => { sectionRefs.current[i] = el; }}
          className={cn(BAND_CLASS[s.band], 'scroll-mt-32 py-20 md:py-24')}
        >
          <div className="container mx-auto px-4 md:px-8 max-w-6xl w-full">{s.render()}</div>
        </section>
      ))}
    </div>
  );
}
