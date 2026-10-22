import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { SEO } from '@/components/seo';
import { ArrowRight, ChevronDown } from 'lucide-react';
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

// Plain answers to the questions AmCham staff asked when they first saw the
// demo. Short, one everyday comparison each, no diagrams.
const QUESTIONS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'What is a “private model”?',
    a: <>An AI program that runs on a computer AmCham controls, rather than a public service such as ChatGPT. Think of owning your own photocopier instead of taking documents to a copy shop: nothing leaves the building, and nobody else learns from what you put through it. Member data is only ever handled by the private model.</>,
  },
  {
    q: 'What do the “On premises” and “Cloud” labels mean?',
    a: <>Every AI task carries a label saying where it ran. <b>On premises</b>: the private model did the work and nothing left AmCham. <b>Cloud, names removed</b>: a larger outside model helped with the wording, but names, companies and amounts were swapped for placeholders first and put back afterwards. <b>Cloud, public data only</b>: used for material that is public anyway, such as a published draft law.</>,
  },
  {
    q: 'How would this work with our database or CRM?',
    a: <>It doesn’t replace what you use today. The platform connects to the systems that already hold member records, such as the CRM, the email newsletter tool, the event registration system or the accounting package, even a well-kept spreadsheet. It starts by reading only. It writes back, for example to update a contact, only when a person approves the change. You’d start with one connection and add others over time. The <Link href="/platform/console?view=integrations" className="font-semibold text-foreground underline underline-offset-2">Integrations screen</Link> in the staff console shows what that looks like.</>,
  },
  {
    q: 'How can an email that didn’t arrive tell you anything?',
    a: <>When an email can’t be delivered, the recipient’s mail server automatically sends back an “undeliverable” notice with a reason, for example that the mailbox no longer exists. Every newsletter tool already records these notices. The platform reads that delivery record, not anyone’s inbox. So “three invitations to SBB couldn’t be delivered” simply means SBB never received them and the contact has probably left. The suggestion that follows is just: update the contact.</>,
  },
  {
    q: 'Does anyone, or anything, read our emails?',
    a: <>Only the shared info@ inbox, and only to sort incoming mail and draft replies for the team to approve. Personal inboxes are never read. Nothing is sent without a person pressing send.</>,
  },
  {
    q: 'Who checks what the AI writes?',
    a: <>A person, every time. Drafts arrive in the Newsroom or next to the task they belong to, and someone on the team reads, edits and approves them. The AI suggests; staff decide.</>,
  },
  {
    q: 'Where does a member’s engagement score come from?',
    a: <>Only from what the company does with AmCham: events attended, committee work, introductions, and use of the member portal and emails. News about the company is shown to staff as background, but it never changes the score, and members are never ranked against each other.</>,
  },
  {
    q: 'Can members see what we hold, and can we switch the AI off?',
    a: <>Yes to both. Members see everything AmCham holds about them, the same engagement number staff see, and switches for how their data is used, on the <Link href="/platform/portal?view=seen&role=member&member=hmo" className="font-semibold text-foreground underline underline-offset-2">What AmCham sees about you</Link> page. Each AI feature can also be switched off on AmCham’s side; the website and platform keep working without it.</>,
  },
];

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
  {
    id: 'questions', nav: 'Questions', band: 'muted',
    render: () => (
      <>
        <Eyebrow>Questions you might have</Eyebrow>
        <H2>Plain answers to fair questions.</H2>
        <Lead>The questions people ask most when they first see the platform, answered without jargon.</Lead>
        <div className="max-w-3xl divide-y divide-border rounded-3xl border border-border bg-card">
          {QUESTIONS.map((item, i) => (
            <details key={item.q} className="group px-5 md:px-7" open={i === 0}>
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 py-5 min-h-11">
                <span className="text-lg font-semibold text-foreground">{item.q}</span>
                <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="pb-6 -mt-1 text-foreground/85 leading-relaxed">{item.a}</p>
            </details>
          ))}
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
