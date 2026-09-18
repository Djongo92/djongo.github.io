import { Company } from '@/data/platform';

export interface PortalCompassAction {
  type: 'openView';
  label: string;
  viewId: string;
}

// Deliberately narrower than a "peer": only the fields the Directory already
// shows about another member (name/sector/tier/recommended reason) — never
// score, manager, lifecycle, or contactFreshness. Those are staff-internal
// and this engine must never read them off a directory record even though
// the underlying object (from usePortalState) happens to carry them.
export interface PortalPeer {
  id: string;
  name: string;
  sector: string;
  tier: string;
  recommended?: boolean;
  recReason?: string;
}

export interface PortalCompassAnswer {
  text: string;
  peers?: PortalPeer[];
  actions?: PortalCompassAction[];
  // Absent only on the final "nothing recognized" branch below — the one
  // case the FAB escalates to a real AI call for.
  matched?: boolean;
}

export interface PortalCompassContext {
  member: Company;
  billing: { renewalDate: string; paymentMethod: string; invoices: any[] };
  scoreNarrative?: { summary?: string } | null;
  roleParam: string;
  directory: Array<{ id: string; name: string; sector: string; tier: string; recommended?: boolean; recReason?: string }>;
  events: Array<{ id: string; title: string; date: string; capacity: { total: number; booked: number } }>;
  opportunities: Array<{ id: string; title: string; author: string }>;
  committees: Array<{ id: string; name: string; joined: boolean; nextMeeting?: { date: string } }>;
}

const SECTOR_WORDS = ['Manufacturing', 'Pharma', 'IT', 'Logistics', 'Finance', 'FMCG', 'Energy', 'Retail', 'Legal', 'Consulting', 'Banking', 'Services'];

function hasWord(query: string, term: string): boolean {
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(query);
}

export function toPeer(d: PortalCompassContext['directory'][number]): PortalPeer {
  return { id: d.id, name: d.name, sector: d.sector, tier: d.tier, recommended: d.recommended, recReason: d.recReason };
}

// Same narrowing discipline as toPeer(), applied to the viewer's own record:
// only fields already shown to a member about themselves elsewhere in the
// portal (score-view, glance-view). Never manager/lifecycle/contactFreshness
// (staff-internal, confirmed never rendered to a member) and never
// Company.renewalDate specifically — that's a different value from the
// portal's own ctx.billing.renewalDate fixture; renewal/fee questions stay
// sourced from ctx.billing exactly as the deterministic branches above do.
export function toSafeMember(m: Company) {
  return { name: m.name, sector: m.sector, tier: m.tier, score: m.score, scoreTrend: m.scoreTrend, since: m.since };
}

export function answerPortalQuery(query: string, ctx: PortalCompassContext): PortalCompassAnswer {
  const q = query.trim();
  if (!q) {
    return { text: 'Ask about your own membership — score, renewal, events — or search the directory for other members.' };
  }

  if (/\b(?:my|our) score\b|\bhow('?s| is| are) (?:my|our) (?:score|engagement)\b|\bmembership value\b/i.test(q)) {
    const trend = ctx.member.scoreTrend >= 0 ? `+${ctx.member.scoreTrend}` : `${ctx.member.scoreTrend}`;
    return {
      text: `Your engagement score is ${ctx.member.score} (${trend} recently).${ctx.scoreNarrative?.summary ? ` ${ctx.scoreNarrative.summary}` : ''}`,
      actions: [{ type: 'openView', label: 'Open Membership Value', viewId: 'score' }],
      matched: true,
    };
  }

  if (/\bfee\b|\bhow much do (?:i|we) pay\b|\binvoices?\b/i.test(q)) {
    if (ctx.roleParam !== 'admin') {
      return { text: 'Billing detail is only visible to account admins for your company — switch to the admin view to see it.', matched: true };
    }
    return {
      text: `Renews ${ctx.billing.renewalDate}, paid via ${ctx.billing.paymentMethod}.`,
      actions: [{ type: 'openView', label: 'Open Billing', viewId: 'billing' }],
      matched: true,
    };
  }

  if (/\brenew(al|s|ing)?\b|\bwhen (?:do|does) (?:i|we) renew\b|\bexpir/i.test(q)) {
    return {
      text: `Your membership renews ${ctx.billing.renewalDate}.`,
      actions: [{ type: 'openView', label: 'Open Membership Value', viewId: 'score' }],
      matched: true,
    };
  }

  if (/\brecommended\b|\bwho should i (?:meet|connect with)\b|\bintros?\b|\bintroductions?\b/i.test(q)) {
    const recs = ctx.directory.filter((d) => d.recommended).slice(0, 5).map(toPeer);
    if (recs.length === 0) {
      return { text: 'No recommended introductions right now — check back after your next event or committee activity.', matched: true };
    }
    return {
      text: `${recs.length} recommended connection${recs.length === 1 ? '' : 's'}, based on shared committees and matchmaking signals.`,
      peers: recs,
      actions: [{ type: 'openView', label: 'Open Directory', viewId: 'directory' }],
      matched: true,
    };
  }

  const matchedSector = SECTOR_WORDS.find((s) => hasWord(q, s));
  if (matchedSector) {
    const peers = ctx.directory.filter((d) => d.sector === matchedSector).slice(0, 5).map(toPeer);
    return {
      text: peers.length > 0
        ? `${peers.length} ${matchedSector} member${peers.length === 1 ? '' : 's'} in the directory.`
        : `No ${matchedSector} members found in the directory.`,
      peers,
      actions: [{ type: 'openView', label: 'Open Directory', viewId: 'directory' }],
      matched: true,
    };
  }

  if (/\bevents?\b|\bregist(er|ration)\b|\bupcoming\b|\broundtables?\b/i.test(q)) {
    const open = ctx.events.filter((e) => e.capacity.booked < e.capacity.total);
    return {
      text: open.length > 0
        ? `${open.map((e) => `${e.title} (${e.date})`).join('; ')} — ${open.length} event${open.length === 1 ? ' has' : 's have'} open seats.`
        : 'No events with open seats right now — everything upcoming is fully booked.',
      actions: [{ type: 'openView', label: 'Open Events', viewId: 'events' }],
      matched: true,
    };
  }

  if (/\bcommittees?\b/i.test(q)) {
    const notJoined = ctx.committees.filter((c) => !c.joined);
    const joined = ctx.committees.find((c) => c.joined);
    return {
      text: notJoined.length > 0
        ? `You're not yet on: ${notJoined.map((c) => c.name).join(', ')}.${joined?.nextMeeting ? ` Your next meeting is ${joined.nextMeeting.date}.` : ''}`
        : "You're already on every active committee.",
      actions: [{ type: 'openView', label: 'Open Committees', viewId: 'committee' }],
      matched: true,
    };
  }

  if (/\bopportunit(y|ies)\b|\bmarketplace\b|\boffers?\b|\bwho'?s (?:looking for|offering)\b/i.test(q)) {
    return {
      text: ctx.opportunities.length > 0
        ? `${ctx.opportunities.map((o) => `${o.author}: ${o.title}`).join('; ')}.`
        : 'No open opportunities in the marketplace right now.',
      actions: [{ type: 'openView', label: 'Open Opportunities', viewId: 'marketplace' }],
      matched: true,
    };
  }

  return { text: 'Try asking about your score, renewal, upcoming events, recommended introductions, or a sector in the directory (e.g. "IT companies").' };
}

// Same deterministic, grounded-in-real-fields idiom as the console engine's
// nudge — never random, always traceable to a real field on this member.
export function getPortalNudge(ctx: PortalCompassContext): PortalCompassAnswer | null {
  if (ctx.member.scoreTrend < 0) {
    return {
      text: `Your engagement score is trending down — ${ctx.member.score} (${ctx.member.scoreTrend}) recently. Worth a look at what's driving it.`,
      actions: [{ type: 'openView', label: 'Open Membership Value', viewId: 'score' }],
    };
  }
  const rec = ctx.directory.find((d) => d.recommended);
  if (rec) {
    return {
      text: `You have a recommended introduction waiting: ${rec.name} (${rec.sector}).`,
      peers: [toPeer(rec)],
      actions: [{ type: 'openView', label: 'Open Directory', viewId: 'directory' }],
    };
  }
  return null;
}
