import { platformData, committeeRosters } from '@/data/platform';
import { findConsoleRehearsed } from '@/lib/compass-rehearsed';
import type { TierId } from '@/data/proposal';

// Everything Compass notices on its own, for the Compass page and the Today
// tab. Each signal says what it saw, where the facts came from, why it is
// being shown, and which processing tier it would run on. Built from the same
// fixture data as the rest of the console so names, owners and dates agree;
// the few outside facts (news, emails, consultations) are illustrative.

export type SignalCategory = 'membership' | 'events' | 'advocacy' | 'service' | 'team';

export type SignalAction =
  | { kind: 'draft'; label: string; draftTitle: string; draft: () => string }
  | { kind: 'navigate'; label: string; view: string; companyId?: string }
  | { kind: 'triage'; label: string }
  | { kind: 'reassign'; label: string };

export interface CompassSignal {
  id: string;
  // Groups signals for "show fewer like this".
  kind: string;
  kindLabel: string;
  category: SignalCategory;
  title: string;
  summary: string;
  evidence: { text: string; source: string }[];
  why: string;
  /** Plain-language answer to "how can Compass know this?", shown on request. */
  howWeKnow?: string;
  confidence: 'High' | 'Medium';
  audience: 'me' | 'team';
  tier: TierId;
  due?: string;
  value?: string;
  companyId?: string;
  priority: number;
  action: SignalAction;
}

export const CATEGORY_LABEL: Record<SignalCategory, string> = {
  membership: 'Membership',
  events: 'Events',
  advocacy: 'Advocacy',
  service: 'Member service',
  team: 'Team & leadership',
};

const c = platformData.console as any;
const portal = (platformData as any).portal;
const company = (id: string) => platformData.allMembers.find((m) => m.id === id);
const rehearsed = (prompt: string) => () => findConsoleRehearsed(prompt) ?? '';
const lines = (...l: (string | false | null | undefined)[]) => l.filter((x) => x !== false && x != null).join('\n');

// The sector whose average score moved down most over the last three months.
function slidingSector() {
  const bySector = new Map<string, { now: number; then: number; n: number }>();
  for (const m of platformData.allMembers) {
    const h = m.history;
    if (h.length < 4) continue;
    const b = bySector.get(m.sector) ?? { now: 0, then: 0, n: 0 };
    b.now += h[h.length - 1].score;
    b.then += h[h.length - 4].score;
    b.n += 1;
    bySector.set(m.sector, b);
  }
  let worst = { sector: '', delta: 0, now: 0, n: 0 };
  let book = { now: 0, then: 0, n: 0 };
  for (const [sector, b] of bySector) {
    book = { now: book.now + b.now, then: book.then + b.then, n: book.n + b.n };
    const delta = (b.now - b.then) / b.n;
    if (b.n >= 2 && delta < worst.delta) worst = { sector, delta, now: b.now / b.n, n: b.n };
  }
  return { ...worst, bookDelta: (book.now - book.then) / book.n };
}

export interface TriageEmail {
  id: string;
  from: string;
  org: string;
  subject: string;
  received: string;
  category: 'Membership enquiry' | 'Event' | 'Press' | 'Invoice' | 'Committee' | 'Spam';
  routeTo: string;
  confidence: 'High' | 'Medium';
  reply?: string;
}

export const TRIAGE_EMAILS: TriageEmail[] = [
  { id: 'm1', from: 'Lena Marić', org: 'Cascade Robotics', subject: 'Membership for a new US investor in Subotica?', received: '07:12', category: 'Membership enquiry', routeTo: 'Milica Kostić', confidence: 'High', reply: 'Dear Ms Marić,\n\nThank you for getting in touch, and congratulations on the Subotica announcement. Corporate membership is usually the right fit for a company at your stage; I have attached the overview and would be glad to walk you through it in a 20-minute call this week.\n\nBest regards,\nMilica Kostić' },
  { id: 'm2', from: 'Ivan Petrović', org: 'Hemofarm', subject: 'Two more seats for the Energy Roundtable', received: '07:40', category: 'Event', routeTo: 'Events team', confidence: 'High', reply: 'Dear Ivan,\n\nThe Roundtable has five seats left, so two more for Hemofarm is no problem. Please send the names and I will add them today.\n\nBest regards,\nAmCham Events' },
  { id: 'm3', from: 'Ana Stojić', org: 'Business Info Group', subject: 'Interview request on the survey results', received: '08:05', category: 'Press', routeTo: 'Ana Vulović', confidence: 'High', reply: 'Dear Ms Stojić,\n\nThank you for your interest in Lap Time. Ana Vulović, who leads our communications, can offer 20 minutes on Thursday or Friday. Which suits you?\n\nKind regards,\nAmCham Serbia' },
  { id: 'm4', from: 'Accounts payable', org: 'Bambi', subject: 'Invoice INV-2026-0418: PO number missing', received: '08:21', category: 'Invoice', routeTo: 'Tina Kostić', confidence: 'High', reply: 'Dear colleagues,\n\nApologies for the missing PO number. We will reissue invoice INV-2026-0418 with your reference today.\n\nBest regards,\nAmCham Serbia, Finance' },
  { id: 'm5', from: 'Marko Ilić', org: 'Adriatica Grupa', subject: 'Re: ESG committee, joining the November session', received: '08:34', category: 'Committee', routeTo: 'Marija Jovanović', confidence: 'Medium', reply: 'Dear Marko,\n\nWonderful to hear. The ESG & Environment Committee meets on 24 October; I have added you to the invitation and will send the pre-read on Monday.\n\nBest regards,\nMarija Jovanović' },
  { id: 'm6', from: 'Nikola Đurić', org: 'Zapad IT Solutions', subject: 'Question about upgrading our membership', received: '08:50', category: 'Membership enquiry', routeTo: 'Milica Kostić', confidence: 'High' },
  { id: 'm7', from: 'events@conference-leads.biz', org: 'Unknown', subject: 'Buy 40,000 verified attendee emails', received: '09:02', category: 'Spam', routeTo: 'Archive', confidence: 'High' },
  { id: 'm8', from: 'Sara Janković', org: 'KPMG', subject: 'Can someone else attend in my place on the 14th?', received: '09:15', category: 'Event', routeTo: 'Events team', confidence: 'High', reply: 'Dear Sara,\n\nOf course. Just send us your colleague’s name and title and we will update the registration.\n\nBest regards,\nAmCham Events' },
];

export function buildSignals(): CompassSignal[] {
  const roundtable = portal.events.find((e: any) => e.id === 'e1');
  const breakfast = portal.events.find((e: any) => e.id === 'e2');
  const seatsLeft = roundtable ? roundtable.capacity.total - roundtable.capacity.booked : 5;
  const jelenaRenewals = platformData.allMembers.filter((m) => m.manager === 'Jelena Kostić' && ['Oct 2026', 'Nov 2026', 'Dec 2026', 'Jan 2027'].includes(m.renewalDate));
  const hygiene = c.approvals.filter((a: any) => a.type === 'Data Hygiene').length;
  const pm = company('pmp');
  const zit = company('zit');
  const dmg = company('dmg');
  const departed = c.departedMembers.find((d: any) => d.id === 'dep1');
  const healthCare = committeeRosters.find((r) => r.id === 'health-care');
  const owners = new Map<string, number>();
  for (const r of c.ritual.items) owners.set(r.owner, (owners.get(r.owner) ?? 0) + 1);
  const busiest = [...owners.entries()].sort((a, b) => b[1] - a[1])[0];
  const slide = slidingSector();
  const receipt = portal.valueReceipt;
  const energyInvitees = ['sav', 'dhp'].map(company).filter(Boolean);

  const signals: CompassSignal[] = [
    // ── Advocacy ─────────────────────────────────────────────
    {
      id: 'consultation-labour', kind: 'consultation', kindLabel: 'consultation deadlines', category: 'advocacy',
      title: 'Labour Law consultation closes in 6 days, and we haven’t commented',
      summary: 'The Ministry of Labour’s draft amendments are open for comment until 18 October. The Labor & HR Committee has not submitted anything yet.',
      evidence: [
        { text: 'Draft amendments to the Labour Law published for public consultation, comments due 18 October.', source: 'eUprava, public consultations' },
        { text: 'Three of the changes touch remote work and fixed-term contracts, both on the committee’s 2026 priority list.', source: 'Labor & HR Committee priorities' },
        { text: 'No AmCham comment logged against this consultation.', source: 'Advocacy tracker' },
      ],
      why: 'A public consultation that matches a committee’s priorities is closing within 7 days with no AmCham response.',
      howWeKnow: 'The government publishes draft laws for public comment on the eUprava portal, with a closing date. The platform checks that public list each morning, matches drafts to the topics each committee follows, and looks in AmCham’s own advocacy log for a comment. Nothing is guessed: no comment in the log means none was filed through the platform.',
      confidence: 'High', audience: 'team', tier: 'public', due: '6 days', priority: 98,
      action: {
        kind: 'draft', label: 'Draft the committee comment', draftTitle: 'Comment outline for the Labor & HR Committee',
        draft: () => lines(
          'AmCham Serbia comment on the draft amendments to the Labour Law (outline for the committee)',
          '',
          '1. We welcome the clearer rules on remote work and ask that the employer’s cost-reimbursement duty be defined as a flat allowance rather than actual costs.',
          '2. Fixed-term contracts: the proposed 12-month cap is shorter than in most EU member states. We propose 24 months, in line with our 2025 position.',
          '3. Transition period: members need at least 6 months after adoption to update contracts and payroll systems.',
          '',
          'Next step: committee members to confirm or edit by Wednesday 14 October; submission by Friday 16 October.',
        ),
      },
    },
    {
      id: 'consistency', kind: 'consistency', kindLabel: 'consistency checks', category: 'advocacy',
      title: 'A draft comment contradicts our 2025 position',
      summary: 'The working draft on fixed-term contracts supports a 12-month cap. AmCham’s 2025 position paper argued for 24 months.',
      evidence: [
        { text: 'Working draft, paragraph 2: “We support the proposed 12-month limit.”', source: 'Committee drafts (internal)' },
        { text: '2025 position paper on labour flexibility recommends a 24-month limit.', source: 'Published position papers' },
      ],
      why: 'Compass compares new committee drafts against AmCham’s published positions before anything goes to a ministry.',
      confidence: 'Medium', audience: 'team', tier: 'on-prem', priority: 90,
      action: { kind: 'navigate', label: 'Open committees', view: 'committees' },
    },
    {
      id: 'gov-prep', kind: 'gov-prep', kindLabel: 'government meeting briefs', category: 'advocacy',
      title: 'Brief for Thursday’s meeting at the Ministry of Finance',
      summary: 'The Tax & Finance Committee meets the State Secretary on Thursday. Compass has assembled our past positions and what members have raised this quarter.',
      evidence: [
        { text: 'Meeting: Ministry of Finance, Thursday 15 October, 11:00.', source: 'Team calendar' },
        { text: 'Five members raised e-invoicing delays in the last quarter.', source: 'Member requests' },
        { text: 'Our 2026 priorities: e-invoicing, transfer-pricing rules, VAT refund times.', source: 'Tax & Finance Committee priorities' },
      ],
      why: 'Meetings with government officials get a prepared brief two days ahead.',
      confidence: 'High', audience: 'team', tier: 'on-prem', due: 'Thu', priority: 82,
      action: {
        kind: 'draft', label: 'Open the brief', draftTitle: 'Briefing note: Ministry of Finance, 15 October',
        draft: () => lines(
          'Briefing note: Ministry of Finance, Thursday 15 October, 11:00',
          '',
          'Purpose: present members’ priorities ahead of the 2027 budget.',
          '',
          'Our asks, in order:',
          '1. A fixed timeline for the next phase of e-invoicing, with a 6-month notice period.',
          '2. Clearer transfer-pricing documentation thresholds for mid-sized companies.',
          '3. VAT refunds within 30 days, as the law already requires.',
          '',
          'What members told us this quarter: five members raised e-invoicing delays; two raised VAT refund times.',
          '',
          'Avoid: commenting on the draft budget figures, which are not yet public.',
          '',
          'Attending: Ana Savić, Tax & Finance Committee chair (UniCredit Bank), KPMG.',
        ),
      },
    },
    {
      id: 'minutes', kind: 'minutes', kindLabel: 'meeting actions', category: 'advocacy',
      title: 'Digital Economy minutes have 4 actions without an owner',
      summary: 'Compass pulled the actions out of last week’s committee minutes. Four have no owner or due date yet.',
      evidence: [
        { text: 'Minutes of the Digital Economy Committee, 5 October.', source: 'Committee documents' },
        { text: 'Actions found: AI regulation response, data-localisation survey, speaker for November, update to the e-signature paper.', source: 'Extracted from minutes' },
      ],
      why: 'Actions without owners two days after a meeting usually don’t happen.',
      confidence: 'Medium', audience: 'team', tier: 'on-prem', priority: 60,
      action: {
        kind: 'draft', label: 'Draft the action list', draftTitle: 'Actions from the Digital Economy Committee, 5 October',
        draft: () => lines(
          'Actions from the Digital Economy Committee, 5 October',
          '',
          '1. Draft the response on the AI regulation proposal. Suggested owner: Microsoft (chair). Due 23 October.',
          '2. Send the data-localisation survey to IT members. Suggested owner: Milica Kostić. Due 16 October.',
          '3. Confirm a speaker for the November session. Suggested owner: NCR Atleos. Due 20 October.',
          '4. Update the e-signature position paper. Suggested owner: Yettel. Due 30 October.',
          '',
          'Please confirm or change your item by Wednesday.',
        ),
      },
    },
    {
      id: 'committee-health', kind: 'committee-health', kindLabel: 'committee health', category: 'advocacy',
      title: 'The Health Care Committee has no members besides its chair',
      summary: `Hemofarm chairs it alone. The next meeting is ${healthCare?.nextMeeting ?? 'Nov 15, 2026'}, and two pharma members aren’t on it yet.`,
      evidence: [
        { text: `Roster: chair ${company(healthCare?.chairCompanyId ?? 'hmo')?.name}, no other members.`, source: 'Committee rosters' },
        { text: 'Niš Pharma Labs and STADA IT Solutions work in health care and are not on any health committee.', source: 'Member directory' },
      ],
      why: 'A committee with fewer than three member companies can’t produce a credible position.',
      confidence: 'High', audience: 'team', tier: 'on-prem', priority: 55,
      action: {
        kind: 'draft', label: 'Draft the invitations', draftTitle: 'Invitation to the Health Care Committee',
        draft: () => lines(
          'Subject: An invitation to AmCham’s Health Care Committee',
          '',
          'Dear colleagues at Niš Pharma Labs,',
          '',
          `The Health Care Committee, chaired by Hemofarm, works on access to medicines and predictable drug pricing. Its next meeting is on ${healthCare?.nextMeeting ?? '15 November'}, and your perspective as a regional manufacturer would carry real weight.`,
          '',
          'Would you like to nominate someone to join?',
          '',
          'Best regards,',
          'AmCham Serbia',
        ),
      },
    },

    // ── Membership ───────────────────────────────────────────
    {
      id: 'value-pm', kind: 'value-statement', kindLabel: 'renewal value statements', category: 'membership',
      title: `${pm?.name} renews in December: send them their year in one page`,
      summary: `A ${pm?.tier} membership worth ${pm?.fee}. Compass has drafted a value statement for ${pm?.manager} to send.`,
      evidence: [
        { text: `Renewal date ${pm?.renewalDate}, owner ${pm?.manager}.`, source: 'Accounts' },
        { text: `${receipt.eventsAttended} events attended, ${receipt.introsBrokered} introductions, ${receipt.advocacyWins} advocacy wins, ${receipt.marketplaceResponses} marketplace responses this year.`, source: 'Activity record' },
        { text: 'Title sponsor of the Energy Transition Roundtable on 14 October.', source: 'Sponsorship pipeline' },
      ],
      why: 'Every renewal gets a value statement 60 days ahead, so the conversation starts from what the member received.',
      howWeKnow: 'Everything in the summary comes from AmCham’s own records: event check-ins, introductions logged by staff, committee work and the sponsorship list. Compass adds it up; a person reviews it before it is sent.',
      confidence: 'High', audience: 'me', tier: 'on-prem', due: 'This week', value: pm?.fee, companyId: 'pmp', priority: 88,
      action: {
        kind: 'draft', label: 'Open the statement', draftTitle: `Value statement for ${pm?.name}`,
        draft: () => lines(
          `Subject: Your 2026 with AmCham Serbia`,
          '',
          `Dear colleagues at ${pm?.name},`,
          '',
          'Ahead of your renewal in December, here is your year with AmCham at a glance:',
          `• ${receipt.eventsAttended} events attended by your team`,
          `• ${receipt.introsBrokered} introductions to other members`,
          `• ${receipt.advocacyWins} advocacy results in areas you asked us to prioritise`,
          `• ${receipt.marketplaceResponses} responses to your marketplace listings`,
          '• Title sponsorship of the Energy Transition Roundtable on 14 October',
          '',
          'I’d welcome 30 minutes to agree what would make next year even more useful for you.',
          '',
          'Warm regards,',
          `${pm?.manager}`,
          'AmCham Serbia',
        ),
      },
    },
    {
      id: 'upgrade-zit', kind: 'upgrade', kindLabel: 'upgrade signals', category: 'membership',
      title: `${zit?.name} is outgrowing its ${zit?.tier} membership`,
      summary: 'Registered for 4 events this quarter, opens nearly every newsletter, and asked about upgrading by email this morning. Worth a Patron-tier conversation.',
      evidence: [
        { text: 'Registered for 4 events this quarter.', source: 'Event registrations' },
        { text: 'Opened 11 of the last 12 newsletters.', source: 'Email activity' },
        { text: 'Asked about upgrading by email this morning.', source: 'info@ inbox' },
        { text: 'In the news: a second delivery office for Western-European clients. Context only, not in the score.', source: 'Public news' },
      ],
      why: 'Strong involvement with AmCham plus a direct question from the member.',
      howWeKnow: 'Registrations and newsletter opens come from the event system and the email tool AmCham already uses; the upgrade question is an email in the shared info@ inbox. The news item is shown for context only and doesn’t change the score.',
      confidence: 'High', audience: 'me', tier: 'on-prem', value: '€2.5k upgrade', companyId: 'zit', priority: 74,
      action: {
        kind: 'draft', label: 'Draft the reply', draftTitle: `Upgrade conversation with ${zit?.name}`,
        draft: () => lines(
          'Subject: Re: Question about upgrading our membership',
          '',
          'Dear Nikola,',
          '',
          'Congratulations on the new delivery office. Given how fast you’re growing, Patron membership would give you a seat at the table with ministries through the Digital Economy Committee, priority event places and a dedicated account contact.',
          '',
          'Could we meet next week to look at what would be most useful?',
          '',
          'Best regards,',
          `${zit?.manager}`,
        ),
      },
    },
    {
      id: 'winback', kind: 'win-back', kindLabel: 'win-back opportunities', category: 'membership',
      title: `${departed?.name}: the reason they left may no longer apply`,
      summary: 'They left when a foreign parent consolidated memberships. That parent has just opened its own Serbian holding company.',
      evidence: [
        { text: `Departed ${departed?.departedDate}: “${departed?.reason}”`, source: 'Departed members log' },
        { text: 'The parent group registered a Serbian holding company in September.', source: 'Business Registers Agency' },
      ],
      why: 'Compass re-checks why each member left, every month.',
      confidence: 'Medium', audience: 'team', tier: 'on-prem', value: '€5k', priority: 58,
      action: {
        kind: 'draft', label: 'Draft a re-approach', draftTitle: 'Re-approach to the new holding company',
        draft: () => lines(
          'Subject: Welcome to Serbia, from AmCham',
          '',
          'Dear colleagues,',
          '',
          `Congratulations on establishing your Serbian holding company. ${departed?.name} was an AmCham member for many years, and we’d be glad to welcome the group back as it builds its presence here.`,
          '',
          'Could we introduce what membership looks like today over a short coffee?',
          '',
          'Best regards,',
          `${departed?.lastManager}`,
        ),
      },
    },
    {
      id: 'prospect', kind: 'prospect', kindLabel: 'prospect radar', category: 'membership',
      title: 'New US investor: Cascade Robotics is building in Subotica',
      summary: 'A €40m automation plant announced this week. Not a member, and they have already emailed info@.',
      evidence: [
        { text: 'Investment announced with the Development Agency of Serbia.', source: 'Public news' },
        { text: 'Membership enquiry received at 07:12 today.', source: 'info@ inbox' },
      ],
      why: 'New US and international investments in Serbia are matched against the member list daily.',
      confidence: 'High', audience: 'team', tier: 'public', value: '€5k', priority: 72,
      action: { kind: 'triage', label: 'See their email' },
    },

    // ── Events ───────────────────────────────────────────────
    {
      id: 'seats', kind: 'seat-filling', kindLabel: 'seat-filling suggestions', category: 'events',
      title: `${seatsLeft} seats left at the ${roundtable?.title}`,
      summary: `Two days out. ${energyInvitees.map((m) => m?.name).join(' and ')} are energy members who haven’t registered.`,
      evidence: [
        { text: `${roundtable?.capacity.booked} of ${roundtable?.capacity.total} seats booked for ${roundtable?.date}.`, source: 'Events' },
        { text: `${energyInvitees.map((m) => m?.name).join(' and ')} attended energy events last year but haven’t registered.`, source: 'Attendance history' },
      ],
      why: 'Events below 95% capacity in the last week get a list of the members most likely to come.',
      confidence: 'High', audience: 'team', tier: 'on-prem', due: 'Wed', priority: 80,
      action: {
        kind: 'draft', label: 'Draft the invitations', draftTitle: 'Last seats at the Energy Transition Roundtable',
        draft: () => lines(
          `Subject: ${roundtable?.title}, ${roundtable?.date}: a few seats left`,
          '',
          'Dear colleagues,',
          '',
          `We have kept a few seats at Wednesday’s ${roundtable?.title} for energy members. The panel includes the Ministry of Energy, and NIS a.d. will be there.`,
          '',
          'Reply to this email and we’ll hold a place for you.',
          '',
          'Best regards,',
          'AmCham Events',
        ),
      },
    },
    {
      id: 'waitlist', kind: 'waitlist', kindLabel: 'waitlist updates', category: 'events',
      title: `${breakfast?.title} is full, with 6 on the waitlist`,
      summary: 'Two registrants have cancelled late at each of the last three breakfasts. Compass suggests confirming attendance now and releasing seats on Monday.',
      evidence: [
        { text: `${breakfast?.capacity.booked} of ${breakfast?.capacity.total} booked; 6 on the waitlist.`, source: 'Events' },
        { text: 'Average late cancellations at C-Level Breakfasts: 2.', source: 'Attendance history' },
      ],
      why: 'Full events with a waitlist get a confirmation round a week ahead.',
      confidence: 'Medium', audience: 'team', tier: 'on-prem', due: 'Mon', priority: 50,
      action: {
        kind: 'draft', label: 'Draft the confirmation', draftTitle: 'Attendance confirmation for the C-Level Breakfast',
        draft: () => lines(
          `Subject: ${breakfast?.title}, ${breakfast?.date}: please confirm`,
          '',
          'Dear colleague,',
          '',
          `You’re registered for the ${breakfast?.title}. The room is full and there is a waitlist, so please confirm by Monday that you’re still coming. If plans have changed, a quick reply lets a colleague from another member take your seat.`,
          '',
          'Thank you,',
          'AmCham Events',
        ),
      },
    },
    {
      id: 'no-show', kind: 'no-show', kindLabel: 'no-show reminders', category: 'events',
      title: 'KPMG may not turn up on Wednesday',
      summary: 'They missed the last two events they registered for. A personal reminder works better than the automatic one.',
      evidence: [
        { text: 'Two no-shows for registered events this year.', source: 'Retention case' },
        { text: 'Registered for the Energy Transition Roundtable; they’ve also asked to send someone else.', source: 'Events + info@ inbox' },
      ],
      why: 'Members with two recent no-shows get a personal reminder before the next event.',
      howWeKnow: 'Attendance comes from event check-in: someone who registered but didn’t check in counts as a no-show. The request to send someone else arrived as an email in the shared info@ inbox.',
      confidence: 'Medium', audience: 'me', tier: 'on-prem', due: 'Tue', companyId: 'kpmg', priority: 45,
      action: {
        kind: 'draft', label: 'Draft a reminder', draftTitle: 'Reminder to KPMG',
        draft: () => lines(
          'Subject: See you on Wednesday?',
          '',
          'Dear Sara,',
          '',
          'Just checking in before Wednesday’s Energy Transition Roundtable. Happy to switch the registration to your colleague, as you asked. Could you send me their name today?',
          '',
          'Best regards,',
          `${company('kpmg')?.manager}`,
        ),
      },
    },
    {
      id: 'follow-up', kind: 'event-follow-up', kindLabel: 'event follow-ups', category: 'events',
      title: '9 people from the survey presentation haven’t heard from us',
      summary: 'Of the 31 who attended on 10 September, 9 have had no follow-up. Compass has drafted a thank-you with the full results attached.',
      evidence: [
        { text: '31 attendees checked in on 10 September.', source: 'Event check-ins' },
        { text: '22 received the results pack; 9 did not.', source: 'Email log' },
      ],
      why: 'Every attendee should hear from AmCham within two weeks of an event.',
      confidence: 'High', audience: 'team', tier: 'on-prem', priority: 48,
      action: {
        kind: 'draft', label: 'Draft the thank-you', draftTitle: 'Thank you for joining the survey presentation',
        draft: () => lines(
          'Subject: Thank you for joining us for the 2026 survey results',
          '',
          'Dear colleague,',
          '',
          'Thank you for joining the survey results presentation on 10 September. The full results, with the sector breakdowns we discussed, are attached.',
          '',
          'If your sector’s results raise questions, our committees are where we turn them into proposals to government. I’d be glad to introduce you.',
          '',
          'Best regards,',
          'AmCham Serbia',
        ),
      },
    },
    {
      id: 'speaker', kind: 'speaker-ideas', kindLabel: 'speaker ideas', category: 'events',
      title: 'Nelt Co would make a strong speaker for the Logistics Forum',
      summary: 'Their new regional distribution hub is exactly the forum’s theme, and they already sponsor it.',
      evidence: [
        { text: 'Opened a regional distribution hub this quarter.', source: 'Member news' },
        { text: 'Multi-year sponsor of the Logistics & Supply Chain Forum.', source: 'Sponsorship pipeline' },
      ],
      why: 'Members with fresh news that fits an upcoming event are suggested as speakers.',
      confidence: 'Medium', audience: 'team', tier: 'on-prem', companyId: 'nkt', priority: 30,
      action: { kind: 'navigate', label: 'Open sponsorship', view: 'sponsorship' },
    },

    // ── Member service ───────────────────────────────────────
    {
      id: 'triage', kind: 'triage', kindLabel: 'inbox triage', category: 'service',
      title: `${TRIAGE_EMAILS.length} new emails in info@, already sorted`,
      summary: 'Compass has read, sorted and routed this morning’s emails and drafted replies for six of them. One is spam.',
      evidence: [
        { text: `${TRIAGE_EMAILS.length} emails since 07:00.`, source: 'info@ inbox' },
        { text: 'Two need an answer today: a membership enquiry and an event change.', source: 'Response targets' },
      ],
      why: 'The shared inbox is sorted every hour so nothing waits more than a working day.',
      confidence: 'High', audience: 'team', tier: 'on-prem', due: 'Today', priority: 93,
      action: { kind: 'triage', label: 'Review and route' },
    },
    {
      id: 'portal-question', kind: 'portal-question', kindLabel: 'portal questions', category: 'service',
      title: 'Hemofarm asked in the portal how to add colleagues to an event',
      summary: 'A quick one. Compass has drafted the answer for you to send.',
      evidence: [{ text: 'Question received in the member portal at 08:47.', source: 'Portal messages' }],
      why: 'Portal questions are routed to the account owner with a suggested answer.',
      confidence: 'High', audience: 'me', tier: 'on-prem', companyId: 'hmo', priority: 52,
      action: {
        kind: 'draft', label: 'Open the answer', draftTitle: 'Reply to Hemofarm in the portal',
        draft: () => lines(
          'Hi Ivan,',
          '',
          'Open the event in the portal and choose “Add colleague” under your registration. You can add up to two people per company; for more, just reply here and I’ll arrange it.',
          '',
          `${company('hmo')?.manager}`,
        ),
      },
    },
    {
      id: 'onboarding', kind: 'onboarding', kindLabel: 'onboarding checks', category: 'service',
      title: `${dmg?.name} is three months in and hasn’t joined anything yet`,
      summary: 'No committee, no event and no portal login in the last month. Members who stay unengaged past 90 days are the ones who don’t renew.',
      evidence: [
        { text: `Joined ${dmg?.joinDate}.`, source: 'Accounts' },
        { text: 'No committee membership, no event registrations.', source: 'Activity record' },
      ],
      why: 'New members get a 30/60/90-day plan; this one has missed the 90-day step.',
      confidence: 'High', audience: 'me', tier: 'on-prem', companyId: 'dmg', priority: 64,
      action: {
        kind: 'draft', label: 'Draft a check-in', draftTitle: `90-day check-in with ${dmg?.name}`,
        draft: () => lines(
          'Subject: Three months in: how can we help?',
          '',
          `Dear colleagues at ${dmg?.name},`,
          '',
          'You joined AmCham three months ago, and I want to make sure membership is working for you. Two suggestions to start: the Real Estate & Construction Committee, which covers the permits question you raised when joining, and the C-Level Breakfast waitlist on 22 October.',
          '',
          'Would 20 minutes next week suit?',
          '',
          'Best regards,',
          `${dmg?.manager}`,
        ),
      },
    },

    // ── Team & leadership ────────────────────────────────────
    {
      id: 'workload', kind: 'workload', kindLabel: 'workload balance', category: 'team',
      title: `${busiest?.[0]?.split(' ')[0]} owns ${busiest?.[1]} of the ${c.ritual.items.length} priorities`,
      summary: 'Milica has one. Moving one priority would even out the week.',
      evidence: [{ text: [...owners.entries()].map(([o, n]) => `${o}: ${n}`).join(' · '), source: 'Priorities' }],
      why: 'When one person holds more than half of the open priorities, Compass suggests rebalancing.',
      confidence: 'High', audience: 'team', tier: 'on-prem', priority: 62,
      action: { kind: 'reassign', label: 'Rebalance' },
    },
    {
      id: 'friday-wrap', kind: 'friday-wrap', kindLabel: 'weekly wrap-ups', category: 'team',
      title: 'Friday wrap for Ana is ready to review',
      summary: 'What got done, what slipped and what’s coming next week, in five lines.',
      evidence: [{ text: 'Built from Priorities, Approvals, Retention and the events calendar.', source: 'Console' }],
      why: 'The Executive Director gets a short weekly summary every Friday at 15:00.',
      confidence: 'High', audience: 'me', tier: 'on-prem', due: 'Fri', priority: 40,
      action: {
        kind: 'draft', label: 'Open the wrap', draftTitle: 'Friday wrap for Ana Savić',
        draft: () => lines(
          'Subject: The week at AmCham, in five lines',
          '',
          'Done: renewal conversations opened with Adriatica Grupa and Philip Morris; 3 data clean-ups approved.',
          'Slipped: SBB still has no primary contact; follow-up due Monday.',
          'At risk: €33k across 5 open priorities, €18k of it at Adriatica.',
          'Next week: Energy Transition Roundtable (Wed), Ministry of Finance meeting (Thu), Labour Law comment due (Fri).',
          'Ask: can you join the Adriatica call on Tuesday?',
          '',
          'Stefan',
        ),
      },
    },
    {
      id: 'anomaly', kind: 'anomaly', kindLabel: 'unusual changes', category: 'team',
      title: `${slide.sector || 'One sector'} is sliding while the rest of the membership holds steady`,
      summary: `Average score in ${slide.sector} is down ${Math.abs(slide.delta).toFixed(1)} points over three months; the membership as a whole moved ${slide.bookDelta >= 0 ? '+' : ''}${slide.bookDelta.toFixed(1)}.`,
      evidence: [
        { text: `${slide.n} ${slide.sector} members, average score now ${Math.round(slide.now)}.`, source: 'Engagement scores' },
        { text: 'Computed on totals only; no individual records leave the console.', source: 'Analytics' },
      ],
      why: 'Compass flags any sector moving against the rest of the membership by more than a point in a quarter.',
      confidence: 'Medium', audience: 'team', tier: 'anonymised', priority: 44,
      action: { kind: 'navigate', label: 'Open analytics', view: 'analytics' },
    },
    {
      id: 'sponsor', kind: 'sponsor', kindLabel: 'sponsorship moments', category: 'team',
      title: 'Microsoft is open to a multi-year summit sponsorship',
      summary: 'First-time sponsor of the Tech Committee Annual Summit, and the notes say they are exploring a multi-year deal. Propose it before their budget closes.',
      evidence: [
        { text: 'Tech Committee Annual Summit, title sponsor, €12k, confirmed.', source: 'Sponsorship pipeline' },
        { text: 'Owner’s note: “exploring a multi-year deal”.', source: 'Sponsorship pipeline' },
      ],
      why: 'Sponsors who signal interest in a longer deal get a proposal before Q4 budgets close.',
      confidence: 'Medium', audience: 'me', tier: 'on-prem', value: '€12k', companyId: 'msft', priority: 56,
      action: {
        kind: 'draft', label: 'Draft the proposal note', draftTitle: 'Multi-year sponsorship note to Microsoft',
        draft: () => lines(
          'Subject: The Tech Summit, for the next three years',
          '',
          'Dear colleagues at Microsoft,',
          '',
          'Thank you for sponsoring this year’s Tech Committee Annual Summit. Several of you mentioned interest in a longer partnership, so here is a simple three-year proposal: the same title sponsorship each year, at this year’s price, with first refusal on the keynote slot.',
          '',
          'Happy to talk it through whenever suits.',
          '',
          'Best regards,',
          'Stefan Mitić',
        ),
      },
    },

    // ── Carried over from the Today tab ──────────────────────
    {
      id: 'sig-roundtable', kind: 'intro-moment', kindLabel: 'introduction moments', category: 'membership',
      title: 'An introduction can happen in the room',
      summary: `Adriatica Grupa and NIS a.d. are both registered for the ${roundtable?.title} (${roundtable?.date}). Their pending introduction could be made at the break.`,
      evidence: [
        { text: 'Both companies registered for 14 October.', source: 'Events' },
        { text: 'Pending introduction: Adriatica Grupa to NIS a.d., about energy supply for a new production line.', source: 'Matchmaking' },
      ],
      why: 'Two members with a pending introduction attending the same event.',
      confidence: 'High', audience: 'me', tier: 'on-prem', due: 'Wed', priority: 78,
      action: { kind: 'navigate', label: 'Open matchmaking', view: 'matchmaking' },
    },
    {
      id: 'sig-promise', kind: 'promise', kindLabel: 'promises made', category: 'membership',
      title: 'A promise is due Friday',
      summary: 'On Tuesday’s call you told Adriatica Grupa you’d send the Roundtable agenda by Friday.',
      evidence: [{ text: '“I’ll send the agenda over by Friday.”', source: 'Call notes, 6 Oct' }],
      why: 'Commitments in call notes are tracked until they’re done.',
      confidence: 'High', audience: 'me', tier: 'on-prem', due: 'Fri', companyId: 'adr', priority: 84,
      action: { kind: 'draft', label: 'Draft it', draftTitle: 'Roundtable agenda for Adriatica Grupa', draft: rehearsed('Draft the Roundtable agenda note for Adriatica') },
    },
    {
      id: 'sig-sbb', kind: 'contact-change', kindLabel: 'contact changes', category: 'service',
      title: 'SBB’s main contact has gone',
      summary: 'Three emails to the primary contact couldn’t be delivered this month, and nobody else at SBB has opened an AmCham email since. LinkedIn, for what it’s worth, shows a new Head of IT since September.',
      evidence: [
        { text: 'Three “undeliverable” notices for the primary contact’s address.', source: 'Email delivery records' },
        { text: 'No one else at SBB has opened an AmCham email in 30 days.', source: 'Email activity' },
        { text: 'A new Head of IT has been on LinkedIn since September.', source: 'LinkedIn (public)' },
      ],
      why: 'Emails that can’t be delivered and no other active contact mean the relationship has no owner on their side.',
      howWeKnow: 'When an email can’t be delivered, the recipient’s mail server automatically sends back an “undeliverable” notice saying why, for example that the mailbox no longer exists. AmCham’s email tool already records these notices. Compass reads that delivery record, not anyone’s inbox, and suggests updating the contact.',
      confidence: 'High', audience: 'me', tier: 'on-prem', due: 'Tomorrow', value: '€5k', companyId: 'sbb', priority: 86,
      action: { kind: 'draft', label: 'Draft an intro', draftTitle: 'Introduction to SBB’s new IT lead', draft: rehearsed("Draft an intro to SBB's new IT lead") },
    },
    {
      id: 'sig-cover', kind: 'cover', kindLabel: 'cover and handovers', category: 'team',
      title: 'Jelena is out Thursday and Friday',
      summary: `${jelenaRenewals.length} of her accounts renew in the next three months (${jelenaRenewals.map((m) => m.name).join(', ')}). Worth a handover before she goes.`,
      evidence: [{ text: 'Out of office Thursday and Friday.', source: 'Team calendar' }],
      why: 'Absences longer than a day with renewals coming up get a handover suggestion.',
      confidence: 'High', audience: 'team', tier: 'on-prem', due: 'Wed', priority: 66,
      action: { kind: 'navigate', label: 'Set up cover', view: 'cover' },
    },
    {
      id: 'sig-approvals', kind: 'approvals', kindLabel: 'approval reminders', category: 'team',
      title: `${c.approvals.length} approvals are waiting`,
      summary: `${hygiene} of them are data clean-ups Compass has already prepared; each needs one click to confirm.`,
      evidence: [{ text: `${c.approvals.length} items in the queue, ${hygiene} data clean-ups.`, source: 'Approvals queue' }],
      why: 'Approvals older than two days are surfaced here.',
      confidence: 'High', audience: 'team', tier: 'on-prem', priority: 42,
      action: { kind: 'navigate', label: 'Review approvals', view: 'approvals' },
    },
  ];

  return signals.sort((a, b) => b.priority - a.priority);
}

export const SIGNALS = buildSignals();
