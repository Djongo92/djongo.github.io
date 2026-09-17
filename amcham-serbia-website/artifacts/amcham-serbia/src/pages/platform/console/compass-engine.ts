import { platformData, Company } from '@/data/platform';
import { runFixtureQuery, DepartedMember } from './views/ask';
import { explainScore } from '@/components/ui/score-explanation';

export interface CompassAction {
  type: 'queue' | 'openDossier' | 'openBrief' | 'openAsk';
  label: string;
  companyId?: string;
  query?: string;
}

export interface CompassAnswer {
  text: string;
  companies?: Company[];
  departed?: DepartedMember[];
  actions?: CompassAction[];
}

// Phrases that mean "tell me about the company already open" rather than a
// new book-wide search — deliberately a short allow-list, not free NLU.
const CONTEXT_FOLLOWUP_PHRASES = [
  'this company', 'this account', 'brief me', "what's going on", 'whats going on',
  'tell me about', 'catch me up', 'summarize', 'summarise', 'status', 'update me',
];

function looksLikeContextFollowUp(query: string): boolean {
  const q = query.toLowerCase();
  return CONTEXT_FOLLOWUP_PHRASES.some((p) => q.includes(p));
}

function findMentionedCompany(query: string): Company | null {
  const q = query.toLowerCase();
  return platformData.allMembers.find((c) => q.includes(c.name.toLowerCase())) || null;
}

// The "what needs attention for company X" rollup no single existing view
// assembles — combines the score explanation with any open ritual item,
// retention case, pending flags, and the Patron-tier coverage-gap check
// MyTeamView already applies (duplicated here as two lines; not worth an
// export for this).
export function getCompanyContextSummary(companyId: string): CompassAnswer | null {
  const company = platformData.allMembers.find((c) => c.id === companyId);
  if (!company) return null;

  const parts: string[] = [];
  const explanation = explainScore(companyId);
  if (explanation) parts.push(explanation.text);

  const ritualItem = platformData.console.ritual.items.find((i) => i.companyId === companyId);
  if (ritualItem) parts.push(`Open ritual item: ${ritualItem.tag} — ${ritualItem.text} (${ritualItem.urgency}, due ${ritualItem.dueDate}).`);

  const retentionCase = platformData.console.retention.find((r) => r.companyId === companyId);
  if (retentionCase) parts.push(`Retention: ${retentionCase.risk} risk — ${retentionCase.reason}. Stage: ${retentionCase.stage}, deadline ${retentionCase.deadline}.`);

  const openFlags = platformData.console.flags.filter((f) => f.companyId === companyId && f.status === 'pending');
  if (openFlags.length > 0) parts.push(`${openFlags.length} pending flag${openFlags.length > 1 ? 's' : ''}: ${openFlags.map((f) => f.note).join(' ')}`);

  const teamNames = new Set(platformData.console.team.map((m) => m.name));
  const isCoverageGap = company.tier === 'Patron' && !teamNames.has(company.manager);
  if (isCoverageGap) parts.push(`${company.name} is a Patron account managed by ${company.manager}, who isn't on the active team roster — worth flagging for reassignment.`);

  if (parts.length === 0) {
    parts.push(`${company.name} — no open ritual items, retention cases, or pending flags right now. Score ${company.score} (${company.scoreTrend >= 0 ? '+' : ''}${company.scoreTrend}).`);
  }

  const actions: CompassAction[] = [{ type: 'openBrief', label: 'Open Brief', companyId }];
  if (ritualItem || retentionCase) actions.push({ type: 'queue', label: 'Queue Outreach', companyId });

  return { text: parts.join(' '), companies: [company], actions };
}

// Deterministic, grounded-in-real-fields "something needs attention" pick —
// same idiom as ActivityTicker/PresenceIndicator: never random, always
// traceable back to an actual fixture row.
export function getProactiveNudge(): CompassAnswer | null {
  const critical = platformData.console.ritual.items.find((i) => i.urgency === 'Critical');
  if (critical) {
    const company = platformData.allMembers.find((c) => c.id === critical.companyId);
    if (company) {
      return {
        text: `${company.name}: ${critical.text} — flagged ${critical.urgency}, ${critical.action.toLowerCase()} due ${critical.dueDate.toLowerCase()}.`,
        companies: [company],
        actions: [{ type: 'queue', label: 'Queue Outreach', companyId: company.id }],
      };
    }
  }
  const teamNames = new Set(platformData.console.team.map((m) => m.name));
  const gap = platformData.allMembers.find((c) => c.tier === 'Patron' && !teamNames.has(c.manager));
  if (gap) {
    return {
      text: `${gap.name} is a Patron account managed by ${gap.manager}, who isn't on your active team roster — worth flagging for reassignment.`,
      companies: [gap],
    };
  }
  return null;
}

export function answerCompassQuery(
  query: string,
  ctx: { selectedCompanyId: string | null },
  t: (path: string, fallback?: string) => string,
): CompassAnswer {
  const trimmed = query.trim();
  if (!trimmed) {
    return { text: 'Ask about a segment of the book ("manufacturing exporters", "at-risk accounts"), or open a dossier and ask "brief me on this".' };
  }

  // 1. Book-wide filter — the exact same engine Ask and Cmd+K already call.
  const { results, departed, explanation, applied } = runFixtureQuery(trimmed, t);
  if (applied.length > 0) {
    if (departed) {
      return { text: explanation, departed, actions: [{ type: 'openAsk', label: 'See full results in Ask', query: trimmed }] };
    }
    return {
      text: explanation,
      companies: results.slice(0, 5),
      actions: [{ type: 'openAsk', label: `See all ${results.length} in Ask`, query: trimmed }],
    };
  }

  // 2. A named company, or a "brief me" follow-up with one already in view.
  const mentioned = findMentionedCompany(trimmed);
  if (mentioned) {
    const summary = getCompanyContextSummary(mentioned.id);
    if (summary) return summary;
  }
  if (ctx.selectedCompanyId && looksLikeContextFollowUp(trimmed)) {
    const summary = getCompanyContextSummary(ctx.selectedCompanyId);
    if (summary) return summary;
  }

  // 3. Nothing recognized — the same "no filter matched" help text
  // runFixtureQuery itself already returns (also what Ask's suggestion
  // chips are built from).
  return { text: explanation };
}
