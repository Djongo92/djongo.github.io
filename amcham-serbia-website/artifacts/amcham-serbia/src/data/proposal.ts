// Content for "How AI works in the platform" (/ai, also /proposal) and the
// shared "How AI handles your data" definitions shown on Privacy & Sharing.
// English only for now; the structure is kept flat so a Serbian copy can be
// added alongside without touching the page.

export type TierId = 'on-prem' | 'anonymised' | 'public';

export interface AiTier {
  id: TierId;
  name: string;
  short: string;
  where: string;
  sees: string;
  usedFor: string;
}

export const AI_TIERS: AiTier[] = [
  {
    id: 'on-prem',
    name: 'Private model',
    short: 'On premises',
    where: 'A model running on AmCham hardware, or on a private server in the EU that only AmCham can reach.',
    sees: 'Member records, notes, survey answers, drafts. Nothing leaves AmCham’s control.',
    usedFor: 'The default for anything that names a person or a company.',
  },
  {
    id: 'anonymised',
    name: 'Anonymised cloud',
    short: 'Cloud, names removed',
    where: 'A commercial model under enterprise terms that rule out training on your data.',
    sees: 'Only a stripped-down request: names, companies and amounts are replaced with placeholders before it leaves, and restored when the answer comes back.',
    usedFor: 'Polished writing and harder reasoning, when the private model is not strong enough.',
  },
  {
    id: 'public',
    name: 'Public content',
    short: 'Cloud, public data only',
    where: 'Any capable model.',
    sees: 'Only what is already public: the website, published papers, events, laws in public consultation.',
    usedFor: 'Site search, translation drafts, legislation summaries.',
  },
];

export interface DataClass {
  name: string;
  examples: string;
  sensitivity: 'None' | 'Low' | 'Personal' | 'High' | 'Highest';
  tier: TierId;
  rule: string;
}

export const DATA_CLASSES: DataClass[] = [
  { name: 'Public content', examples: 'Website pages, events, news, published position papers, draft laws in public consultation', sensitivity: 'None', tier: 'public', rule: 'Any model may read it.' },
  { name: 'Aggregates', examples: 'Survey totals, sector trends, event attendance counts', sensitivity: 'Low', tier: 'anonymised', rule: 'Shared only as totals, never row by row.' },
  { name: 'Personal data', examples: 'Contact names, emails, phone numbers, job titles', sensitivity: 'Personal', tier: 'on-prem', rule: 'Stays private; names are swapped for placeholders if a cloud model is ever used.' },
  { name: 'Commercial relationship', examples: 'Fees, renewal risk, complaints, staff notes on an account', sensitivity: 'High', tier: 'on-prem', rule: 'Private model only.' },
  { name: 'Confidential', examples: 'Individual survey answers, committee drafts before publication, contacts with government', sensitivity: 'Highest', tier: 'on-prem', rule: 'Private model only, and a person approves anything that leaves AmCham.' },
];

export const PRINCIPLES = [
  { title: 'Your data stays yours', body: 'Anything that names a member is processed on a model AmCham controls. No member data is ever used to train anyone’s AI.' },
  { title: 'Send the least, not the most', body: 'When a task does need a cloud model, it gets a short anonymised summary, never the record.' },
  { title: 'A person signs off', body: 'AI drafts; your team decides. Nothing goes to a member, a ministry or the board without a human approving it.' },
  { title: 'Every AI action is logged', body: 'Which data was used, which model answered and who approved the result. The board can audit it at any time.' },
  { title: 'Members can see and choose', body: 'Members see what AI does with their data in Privacy & Sharing, and can opt out of AI features that use it.' },
];

export interface UseCase {
  area: string;
  title: string;
  body: string;
  tier: TierId;
  phase: 0 | 1 | 2;
}

export const USE_CASES: UseCase[] = [
  { area: 'Website', title: '“Ask AmCham” on the website', body: 'Visitors ask in plain English or Serbian (“What does membership cost for a 40-person company?”) and get an answer with links, drawn only from public pages.', tier: 'public', phase: 0 },
  { area: 'Website', title: 'Translation drafts', body: 'Every news item, event and paper drafted in the second language for a person to check, instead of translated from scratch.', tier: 'public', phase: 0 },
  { area: 'Advocacy', title: 'Legislation radar', body: 'Draft laws in public consultation and new entries in the Official Gazette, summarised every morning with the committees each one affects.', tier: 'public', phase: 1 },
  { area: 'Staff', title: 'Compass for the team', body: 'A morning brief of what needs attention, meeting briefs, follow-up drafts and CRM clean-up, inside the staff console.', tier: 'on-prem', phase: 1 },
  { area: 'Staff', title: 'Meeting notes to actions', body: 'Notes from a call become a summary, the commitments made and the follow-ups due, filed against the account.', tier: 'on-prem', phase: 1 },
  { area: 'Research', title: 'Survey open answers', body: 'Themes and sentiment from hundreds of written survey answers, by sector, in hours instead of weeks. Individual answers never leave the building.', tier: 'on-prem', phase: 2 },
  { area: 'Members', title: 'Introductions and personal digests', body: 'Suggested introductions between members and a digest tuned to each company’s sector and committees, for members who opt in.', tier: 'on-prem', phase: 2 },
];
