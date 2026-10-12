import { platformData, Company } from '@/data/platform';
import { explainScore } from '@/components/ui/score-explanation';
import { parseEuro, fmtEuro } from '@/lib/utils';
import type { PortalCompassContext } from '@/pages/platform/portal-compass-engine';

// Showcase prompts with answers composed from fixture data, resolved locally
// so the questions a presenter plans to ask never depend on venue wifi or the
// live model. Anything off-script still goes to the Worker.

interface Rehearsed<C> {
  question: string;
  aliases: string[];
  answer: (ctx: C) => string | null;
}

const normalize = (s: string) =>
  s.toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

function find<C>(list: Rehearsed<C>[], query: string, ctx: C): string | null {
  const q = normalize(query);
  const hit = list.find((r) => [r.question, ...r.aliases].some((p) => normalize(p) === q));
  return hit ? hit.answer(ctx) : null;
}

const company = (id: string): Company | undefined => platformData.allMembers.find((c) => c.id === id);
const console_ = platformData.console as any;

const URGENCY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const CONSOLE_PROMPTS: Rehearsed<void>[] = [
  {
    question: 'What should I focus on this week?',
    aliases: ['What should I focus on?', 'Where should I start this week?', 'What should I do this week?'],
    answer: () => {
      const items = [...console_.ritual.items].sort((a: any, b: any) => (URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9)).slice(0, 3);
      const lines = items.map((it: any, i: number) => {
        const name = company(it.companyId)?.name ?? it.companyId;
        return `${i + 1}. ${name}: ${it.action.toLowerCase()}, due ${it.dueDate.toLowerCase()}. ${it.text}`;
      });
      const total = items.reduce((sum: number, it: any) => sum + parseEuro(it.expectedValue), 0);
      return `Three things, in order of urgency:\n${lines.join('\n')}\nTogether that's ${fmtEuro(total)} of membership revenue you can still influence this week.`;
    },
  },
  {
    question: 'Draft a renewal note for Adriatica Grupa',
    aliases: ['Draft a renewal email for Adriatica Grupa', 'Write a renewal note for Adriatica', 'Draft a renewal note for Adriatica'],
    answer: () => {
      const c = company('adr');
      if (!c) return null;
      const signal = console_.intelligence.feed.find((f: any) => f.companyId === 'adr' && f.sentiment === 'positive');
      const introFlag = console_.flags.find((f: any) => f.companyId === 'adr' && f.category === 'Matchmaking');
      const introTarget = introFlag?.note.match(/introduction to (.+?) via/)?.[1];
      const news = signal ? signal.text.replace(/^Announced /, 'the ').replace(/\.$/, '') : null;
      return [
        `Subject: Making your next AmCham year count`,
        ``,
        `Dear colleagues at ${c.name},`,
        ``,
        news ? `Congratulations on ${news}. That is exactly the kind of growth AmCham exists to back.` : `Thank you for ${new Date().getFullYear() - c.since} years with AmCham.`,
        ``,
        `Ahead of your renewal in ${c.renewalDate}, I'd like to make the coming year count.${introTarget ? ` We're moving your introduction to ${introTarget} forward this week,` : ''} and I'd value 30 minutes with your CEO to realign on the advocacy priorities that matter most to you.`,
        ``,
        `Would Tuesday or Wednesday next week suit?`,
        ``,
        `Warm regards,`,
        `${c.manager}`,
        `AmCham Serbia`,
      ].join('\n');
    },
  },
  {
    question: "Why is Adriatica's score dropping?",
    aliases: ["Why is Adriatica Grupa's score dropping?", 'Why is Adriatica struggling?', 'What happened with Adriatica?'],
    answer: () => {
      const c = company('adr');
      if (!c) return null;
      const h = c.history;
      const now = h[h.length - 1].score;
      const yearAgo = h[Math.max(0, h.length - 13)].score;
      // Six months back, matching the window the Ritual card's drop refers to.
      const recent = h[Math.max(0, h.length - 7)];
      const explanation = explainScore('adr')?.text;
      const outreach = console_.outreach.items.find((o: any) => o.companyId === 'adr');
      const retention = console_.retention.find((r: any) => r.companyId === 'adr');
      return [
        `${c.name} has slid from ${yearAgo} to ${now} over the past year, ${recent.score - now} points of it since ${recent.month}.`,
        explanation,
        outreach ? `The last real touchpoint was ${outreach.lastTouch.replace(/(\d+)d ago/, '$1 days ago')}, and it left an open issue: ${outreach.context.charAt(0).toLowerCase()}${outreach.context.slice(1)}` : null,
        retention ? `${retention.evidence} The planned fix is to ${retention.intervention.charAt(0).toLowerCase()}${retention.intervention.slice(1)} before ${retention.deadline}.` : null,
      ].filter(Boolean).join(' ');
    },
  },
];

const PORTAL_PROMPTS: Rehearsed<PortalCompassContext>[] = [
  {
    question: 'How can we get more out of our membership?',
    aliases: ['How do we get more out of our membership?', 'How can we get more value from AmCham?', 'How do we get more value?'],
    answer: (ctx) => {
      const rec = ctx.directory.find((d) => d.recommended);
      const ev = ctx.events.find((e) => e.capacity.booked < e.capacity.total);
      const notJoined = ctx.committees.filter((c) => !c.joined);
      const moves: string[] = [];
      if (rec) moves.push(`Take the introduction to ${rec.name}${rec.name.endsWith('.') ? '' : '.'} ${rec.recReason ?? ''}`.trim());
      if (ev) moves.push(`Send two colleagues to ${ev.title} (${ev.date}); ${ev.capacity.total - ev.capacity.booked} seats are still open.`);
      if (notJoined.length) moves.push(`Join the ${notJoined[0].name} Committee${notJoined.length === 1 ? ', the one active committee you are not on yet' : ''}.`);
      if (!moves.length) return null;
      return `${moves.length === 1 ? 'One move' : `${moves.length} moves`} would make the biggest difference this quarter:\n${moves.map((m, i) => `${i + 1}. ${m}`).join('\n')}`;
    },
  },
  {
    question: 'Summarise our year with AmCham',
    aliases: ['Summarize our year with AmCham', 'What did we get from AmCham this year?', 'Summarise our year'],
    answer: (ctx) => {
      const narrative = ctx.scoreNarrative as { recentOutcomes?: string[]; committeeNote?: string } | null | undefined;
      const outcomes = narrative?.recentOutcomes ?? [];
      if (!outcomes.length) return null;
      const trend = ctx.member.scoreTrend;
      return [
        `Your year with AmCham, in short:`,
        ...outcomes.map((o) => `• ${o}`),
        narrative?.committeeNote ? `• ${narrative.committeeNote}.` : null,
        `Your engagement score is ${ctx.member.score} (${trend >= 0 ? '+' : ''}${trend} recently)${trend < 0 ? ', so a push before renewal would pay off.' : ' and tracking well.'}`,
      ].filter(Boolean).join('\n');
    },
  },
];

export const CONSOLE_SHOWCASE_PROMPTS = CONSOLE_PROMPTS.map((p) => p.question);
export const PORTAL_SHOWCASE_PROMPTS = PORTAL_PROMPTS.map((p) => p.question);

export const findConsoleRehearsed = (query: string) => find(CONSOLE_PROMPTS, query, undefined);
export const findPortalRehearsed = (query: string, ctx: PortalCompassContext) => find(PORTAL_PROMPTS, query, ctx);

// Long enough to read as "thinking", short enough not to stall a live demo.
export const REHEARSED_THINK_MS = 1100;
