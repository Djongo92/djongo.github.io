import React from 'react';
import { BlueprintLayout } from '@/components/blueprint-layout';
import { useI18n } from '@/lib/i18n';
import { CheckCircle2, ExternalLink, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BENCHMARK_ROWS, type Score } from '@/data/benchmark';

// "How amcham.rs measures up": the October 2026 website benchmark, written
// for AmCham Serbia's own team. Two yardsticks: the AmCham network is
// context, a modern membership-site standard is the bar. The last column
// scores this redesign against the same twelve checks.

interface Check {
  id: string;
  name: string;
  standard: string;
  today: { score: Score; note: string };
  network: { meets: number; of: number };
  redesign: { score: Score; note: string };
}

const CHECKS: Check[] = [
  { id: 'C1', name: 'Key routes', standard: 'Join, events, members and publications are each within two clicks, plainly labelled.',
    today: { score: '2', note: 'All four within two clicks.' }, network: { meets: 30, of: 42 },
    redesign: { score: '2', note: 'All four in the main menu on every page.' } },
  { id: 'C2', name: 'Works on a phone', standard: 'Fits the screen, zoom works, buttons are easy to tap.',
    today: { score: '1', note: 'Built for phones, but pinch-zoom is blocked.' }, network: { meets: 25, of: 43 },
    redesign: { score: '2', note: 'Zoom works; no sideways scrolling at 360 px; tap targets 24 px or larger.' } },
  { id: 'C3', name: 'Speed', standard: 'Google PageSpeed mobile score of 90 or more.',
    today: { score: '1', note: 'Mobile 53/100.' }, network: { meets: 2, of: 43 },
    redesign: { score: '2', note: 'Mobile 87–97 across three runs (median 90), lab test.' } },
  { id: 'C4', name: 'Accessibility basics', standard: 'PageSpeed accessibility 90 or more, with no colour-contrast or missing-label failures.',
    today: { score: '1', note: '84/100; contrast and heading-order issues.' }, network: { meets: 5, of: 43 },
    redesign: { score: '2', note: '100/100 on the home, join, events, members and news pages.' } },
  { id: 'C5', name: 'Serbian and English', standard: 'Joining, events, news and menus work in both languages; the switcher keeps you on the same page.',
    today: { score: '2', note: 'Full, natural Serbian.' }, network: { meets: 11, of: 38 },
    redesign: { score: '2', note: 'Every public page in both languages.' } },
  { id: 'C6', name: 'Current events and news', standard: 'A dated upcoming event, news from the last 30 days, no past events shown as upcoming.',
    today: { score: '1', note: 'October calendar empty; newest news 2 September.' }, network: { meets: 24, of: 41 },
    redesign: { score: '2', note: 'Dated events up front and recent news. Staying current is an editorial habit, not a design feature.' } },
  { id: 'C7', name: 'Clear opening message', standard: 'The first screen says who you are, whom you serve and why to join.',
    today: { score: '1', note: 'Says who, not for whom or why join.' }, network: { meets: 8, of: 41 },
    redesign: { score: '2', note: 'Who, for whom and why in the first two lines, with a join button.' } },
  { id: 'C8', name: 'Member directory', standard: 'Public, searchable, filterable by sector, with useful entries.',
    today: { score: '1', note: 'Public A–Z list; no search or filter.' }, network: { meets: 15, of: 39 },
    redesign: { score: '2', note: 'Search by name, filter by category and sector.' } },
  { id: 'C9', name: 'Calm design', standard: 'Headlines and buttons stay put, nothing pops up over the page on arrival, no counters ticking up, and motion stops for visitors who ask for less.',
    today: { score: '0', note: 'Headline slides change on their own; figures count up from zero.' }, network: { meets: 18, of: 43 },
    redesign: { score: '2', note: 'The headline stays still; figures show their real values; the cookie notice sits at the edge.' } },
  { id: 'C10', name: 'Trust basics', standard: 'Current contacts, a privacy notice, a cookie choice, working links, a current footer.',
    today: { score: '1', note: 'No privacy notice or cookie choice yet.' }, network: { meets: 21, of: 43 },
    redesign: { score: '2', note: 'Privacy and cookie policies, Reject beside Accept, settings in the footer.' } },
  { id: 'C11', name: 'Simple joining', standard: 'Benefits, categories, fees or how fees are set, and an online form or named contact.',
    today: { score: '1', note: 'Form and named contact; no categories or fees.' }, network: { meets: 19, of: 42 },
    redesign: { score: '2', note: 'Four categories with starting fees, how fees are set, and the form.' } },
  { id: 'C12', name: 'Site search', standard: 'A visible search with relevant results.',
    today: { score: '1', note: 'Works only by typing a web address.' }, network: { meets: 14, of: 32 },
    redesign: { score: '2', note: 'Search in the header of every page.' } },
];

const LEARN = [
  { name: 'AmCham Croatia', url: 'https://www.amcham.hr/en', what: 'The closest model. Join, Events, Members and Publications one click from the header, full Croatian and English, a plain opening sentence, and a directory with search and about 35 industry filters.' },
  { name: 'AmCham Netherlands', url: 'https://www.amcham.nl/events', what: 'A model calendar: twelve upcoming events with full dates running months ahead, each showing whether registration is open.' },
  { name: 'AmCham Estonia', url: 'https://amcham.ee/membership/how-to-become-a-member/', what: 'Answers a prospect’s questions on one page: two tiers with prices, what each includes, three numbered steps and a direct contact.' },
  { name: 'AmCham Portugal', url: 'https://amchamportugal.pt/socios/directorio', what: 'A directory you can search by name and sort by sector, with sector, website and phone for each member.' },
  { name: 'AmChamSpain', url: 'https://www.amchamspain.com/en', what: 'Proof that two languages need not mean a slow site: a full English version beside the Spanish one, and the network’s best mobile speed score (98).' },
];

const GAPS = [
  { title: 'Is anything happening?', text: 'A member who opens the calendar finds an empty month, and the newest news is seven weeks old. This is the gap most particular to amcham.rs: 24 of 41 network sites show both a dated upcoming event and recent news. For members, the calendar is the most practical page on the site.' },
  { title: 'Privacy and cookies', text: 'There is no privacy notice to link to and no cookie choice yet. Both are quick to add, and visitors increasingly look for them. The redesign includes placeholder versions of each.' },
  { title: 'The phone', text: 'Pinch-zoom is blocked, which matters to anyone who needs larger text, and the pages are heavy. Both are common across the network: only 2 of 43 sites meet the speed standard.' },
  { title: 'The first screen', text: 'The opening slide says who AmCham Serbia is, but not whom it serves or why companies join, and the joining message is the 11th of 13 blocks. Only 8 of 41 network sites get the opening message right.' },
  { title: 'Joining and finding members', text: 'The join process is clear, but the page names no categories, shows no fees and lists no specific benefits. The member list runs A to Z only, without sectors.' },
  { title: 'Small things', text: 'The “See who are the new Board members” button opens the member list, and the Digital Economy Committee page still says “Our focus in 2023-2025”. Small errors cost more trust than people expect, and they are the quickest to fix.' },
];

const STRENGTHS = [
  'The Serbian version covers menus, home, news, search and joining, and reads as natural Serbian rather than machine translation.',
  'Joining, the calendar, the member list and publications are each one or two clicks from the home page.',
  'The join page has an online form, a clear three-step process and a named membership manager with a direct phone number.',
  'The member list is public, nine staff are listed with direct emails, and ten committees sit in the main menu.',
  'The archive holds Lap Time surveys from 2017 to 2025 and annual reports back to 2015.',
];

const SCORE_STYLE: Record<string, { label: string; cls: string }> = {
  '2': { label: 'Meets', cls: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200' },
  '1': { label: 'Partly', cls: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' },
  '0': { label: 'Not yet', cls: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200' },
  'U': { label: 'Unchecked', cls: 'bg-muted text-muted-foreground' },
  'N/A': { label: 'N/A', cls: 'bg-muted text-muted-foreground' },
};

function Pill({ score }: { score: Score }) {
  const s = SCORE_STYLE[score];
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap', s.cls)}>{s.label}</span>;
}

function NetworkBar({ meets, of }: { meets: number; of: number }) {
  return (
    <div>
      <div className="text-sm text-foreground tabular-nums"><strong>{meets}</strong> of {of}</div>
      <div className="mt-1.5 h-1.5 w-24 rounded-full bg-muted overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full bg-foreground/60" style={{ width: `${(meets / of) * 100}%` }} />
      </div>
    </div>
  );
}

const CHECK_NAMES = CHECKS.map((c) => `${c.id} ${c.name}`);

export default function BlueprintDiagnostic() {
  const { t } = useI18n();
  const todayMet = CHECKS.filter((c) => c.today.score === '2').length;
  const redesignMet = CHECKS.filter((c) => c.redesign.score === '2').length;

  return (
    <BlueprintLayout title={t('blueprint.nav.diagnostic')}>
      <div className="container mx-auto px-4 md:px-8">

        {/* Summary */}
        <div className="max-w-3xl mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Website benchmark · checked 22 October 2026</p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6 text-balance">How amcham.rs measures up</h2>
          <div className="space-y-4 text-lg text-foreground/85 leading-relaxed">
            <p>amcham.rs has a lot going for it. Its Serbian version reads naturally, joining, events, members and publications are a click or two away, and the research archive goes back to 2015.</p>
            <p>This review checked it against twelve plain tests of what a modern membership website should do, and compared it with the 42 other American Chambers of Commerce in the AmChams in Europe network. The network is useful context, but it is not the goal: no chamber site passed all twelve tests. The target is the modern standard.</p>
            <p>Today amcham.rs fully meets {todayMet} of the twelve and sits in the network’s lower third, mostly because of upkeep and presentation rather than content: an empty events calendar, older news, a home page that moves on its own, and no privacy notice yet.</p>
          </div>
        </div>

        {/* Strengths */}
        <section className="mb-20 max-w-4xl">
          <h3 className="text-2xl font-serif font-bold mb-6">What amcham.rs already does well</h3>
          <ul className="grid md:grid-cols-2 gap-x-10 gap-y-4">
            {STRENGTHS.map((s) => (
              <li key={s} className="flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-foreground/85 leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Two yardsticks */}
        <section className="mb-20">
          <div className="max-w-3xl mb-8">
            <h3 className="text-2xl font-serif font-bold mb-4">Two yardsticks</h3>
            <p className="text-foreground/85 leading-relaxed mb-4">The bar comes from outside the network: the UK government’s design principles (“start with user needs”, “do less”), Google’s PageSpeed measure, usability research, and the international accessibility guidelines (WCAG 2.2 AA), which are good practice for a private association rather than a legal duty.</p>
            <p className="text-foreground/85 leading-relaxed">Other AmChams make a poor yardstick because they share the same problems. Even respected bodies outside the network are slow on phones: of four association sites measured, none scored above 59.</p>
          </div>
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border">
            {[
              { n: '0 of 42', l: 'network sites meet all twelve checks' },
              { n: '7', l: 'checks met by the best network site' },
              { n: '2 of 43', l: 'sites score 90+ for speed on a phone' },
              { n: '26 of 43', l: 'sites fail Google’s colour-contrast check' },
            ].map((s) => (
              <div key={s.l} className="bg-card p-5 md:p-6">
                <dt className="sr-only">{s.l}</dt>
                <dd className="text-3xl md:text-4xl font-serif font-bold text-foreground tabular-nums">{s.n}</dd>
                <dd className="text-sm text-muted-foreground mt-1 leading-snug">{s.l}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* The twelve checks */}
        <section className="mb-20" aria-labelledby="checks-title">
          <div className="max-w-3xl mb-8">
            <h3 id="checks-title" className="text-2xl font-serif font-bold mb-4">The twelve checks: today, the network and the redesign</h3>
            <p className="text-foreground/85 leading-relaxed">For each check: how amcham.rs does today, how many network sites meet it, and how the redesign on this site does against the same test.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 max-w-xl">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">amcham.rs today</div>
              <div className="text-3xl font-serif font-bold mt-1 tabular-nums">{todayMet} <span className="text-lg text-muted-foreground font-sans font-normal">of 12 met</span></div>
            </div>
            <div className="rounded-2xl border-2 border-foreground bg-card p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">The redesign</div>
              <div className="text-3xl font-serif font-bold mt-1 tabular-nums">{redesignMet} <span className="text-lg text-muted-foreground font-sans font-normal">of 12 met</span></div>
            </div>
          </div>

          {/* Phones: one card per check */}
          <ol className="md:hidden space-y-4">
            {CHECKS.map((c) => (
              <li key={c.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="text-xs font-bold text-muted-foreground">{c.id}</div>
                <h4 className="font-semibold text-foreground">{c.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">{c.standard}</p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">amcham.rs today</dt><dd className="flex flex-wrap gap-2 items-center"><Pill score={c.today.score} /><span className="text-foreground/85">{c.today.note}</span></dd></div>
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Network sites meeting it</dt><dd><NetworkBar {...c.network} /></dd></div>
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">The redesign</dt><dd className="flex flex-wrap gap-2 items-center"><Pill score={c.redesign.score} /><span className="text-foreground/85">{c.redesign.note}</span></dd></div>
                </dl>
              </li>
            ))}
          </ol>

          <div className="hidden md:block rounded-2xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold w-[28%]">Check, and what meeting it looks like</th>
                  <th scope="col" className="px-4 py-3 font-semibold w-[26%]">amcham.rs today</th>
                  <th scope="col" className="px-4 py-3 font-semibold w-[14%]">Network sites meeting it</th>
                  <th scope="col" className="px-4 py-3 font-semibold w-[32%]">The redesign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {CHECKS.map((c) => (
                  <tr key={c.id} className="align-top">
                    <th scope="row" className="px-4 py-4 text-left font-normal">
                      <span className="block font-semibold text-foreground"><span className="text-muted-foreground font-bold mr-1.5">{c.id}</span>{c.name}</span>
                      <span className="block text-muted-foreground mt-1">{c.standard}</span>
                    </th>
                    <td className="px-4 py-4"><Pill score={c.today.score} /><p className="mt-2 text-foreground/85">{c.today.note}</p></td>
                    <td className="px-4 py-4"><NetworkBar {...c.network} /></td>
                    <td className="px-4 py-4"><Pill score={c.redesign.score} /><p className="mt-2 text-foreground/85">{c.redesign.note}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 max-w-3xl">Redesign speed and accessibility come from Google Lighthouse run locally (the demo is password-protected, so PageSpeed’s own servers can’t reach it). “Network sites meeting it” counts sites where the check could be made.</p>
        </section>

        {/* Learn from */}
        <section className="mb-20">
          <h3 className="text-2xl font-serif font-bold mb-2">Five network sites worth learning from</h3>
          <p className="text-foreground/85 mb-8 max-w-3xl">No single site shows the whole standard, but each of these does one thing well.</p>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LEARN.map((l) => (
              <li key={l.name} className="rounded-2xl border border-border bg-card p-6 flex flex-col">
                <h4 className="font-semibold text-foreground">{l.name}</h4>
                <p className="text-sm text-foreground/85 mt-2 leading-relaxed flex-1">{l.what}</p>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-primary hover:underline self-start">
                  Visit the site <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Gaps */}
        <section className="mb-20 max-w-4xl">
          <h3 className="text-2xl font-serif font-bold mb-8">The gaps that matter most for members</h3>
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-8">
            {GAPS.map((g) => (
              <div key={g.title}>
                <h4 className="font-semibold text-foreground mb-2">{g.title}</h4>
                <p className="text-foreground/85 leading-relaxed">{g.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What good looks like */}
        <section className="mb-20 rounded-2xl bg-secondary text-secondary-foreground p-8 md:p-12">
          <h3 className="text-2xl md:text-3xl font-serif font-bold mb-6">What good would look like</h3>
          <div className="max-w-3xl space-y-4 text-secondary-foreground/90 leading-relaxed">
            <p>Picture a member opening amcham.rs on a phone. The first screen says, in Serbian or English, whom AmCham Serbia serves and why companies join. Below it are the next few events, each with a date and a register button, and this month’s news. A search box and a sector filter find a committee, a survey or a member company. The join page lists the categories, what each includes and how fees are set. The footer links a privacy notice, and the cookie choice offers Reject as plainly as Accept. The page appears quickly and lets the visitor zoom.</p>
            <p>Most of this builds on what amcham.rs already has. Some of it needs no redesign at all: a current calendar and news, a home page that stays still and a privacy notice would together lift amcham.rs into the network’s top third. It would still meet only five of the twelve checks, which shows how low the network’s bar is. The redesign on this site is the first step from there to all twelve.</p>
          </div>
        </section>

        {/* All sites */}
        <details className="group mb-16 rounded-2xl border border-border">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-4 p-5 md:p-6 min-h-11">
            <span>
              <span className="block font-semibold text-foreground">Show all 43 network sites</span>
              <span className="block text-sm text-muted-foreground">The full scoring table, as checked on 22 October 2026</span>
            </span>
            <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180 shrink-0" aria-hidden="true" />
          </summary>
          <div className="border-t border-border overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold sticky left-0 bg-muted">Site</th>
                  {CHECK_NAMES.map((n) => <th key={n} scope="col" title={n} className="px-2 py-2 font-semibold text-center">{n.split(' ')[0]}</th>)}
                  <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">Total</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Rank</th>
                  <th scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">PSI mobile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {BENCHMARK_ROWS.map((r) => {
                  const self = r.url === 'amcham.rs';
                  return (
                    <tr key={r.url} className={self ? 'bg-primary/5 font-semibold' : undefined}>
                      <th scope="row" className={cn('px-3 py-2 text-left whitespace-nowrap sticky left-0 bg-background', self ? 'font-semibold' : 'font-normal')}>{r.name}</th>
                      {r.scores.map((s, i) => <td key={i} className="px-2 py-2 text-center tabular-nums">{s}{i === 8 && r.starC9 ? '*' : ''}</td>)}
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">{r.total}</td>
                      <td className="px-3 py-2 tabular-nums">{r.rank ?? '–'}</td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">{r.psiMobile}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="px-5 md:px-6 py-4 text-xs text-muted-foreground border-t border-border">2 meets · 1 partly · 0 doesn’t · U couldn’t check · N/A not applicable. * Slider present, but whether it moves on its own couldn’t be confirmed. TABA-AmCham (Türkiye) isn’t ranked because only five checks could be made. PSI is Google PageSpeed Insights, Performance / Accessibility.</p>
        </details>

        {/* Method */}
        <section className="max-w-3xl">
          <h3 className="text-lg font-semibold mb-3">How this was done</h3>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
            <li>The roster is the AmChams in Europe members page (44 full members, 4 observers), read on 22 October 2026. The 43 full members with a public site were scored; AmCham Russia is suspended and the observers are left out.</li>
            <li>Every site was visited the same day and measured once in Google PageSpeed Insights (mobile and desktop). Single runs vary by a few points.</li>
            <li>The standard draws on GOV.UK’s design principles, W3C’s WCAG 2.2, Google’s PageSpeed documentation, Nielsen Norman Group and Stanford’s web credibility guidelines.</li>
            <li>Calm design (C9) is read here as text and buttons that stay put. Network scores for it come from the original review, which counted any self-moving slider, so a few more network sites might pass under this reading.</li>
            <li>The scores are one reviewer’s judgment from text and code checks, not user testing, and describe the sites as they were on 22 October 2026.</li>
          </ul>
        </section>

      </div>
    </BlueprintLayout>
  );
}
