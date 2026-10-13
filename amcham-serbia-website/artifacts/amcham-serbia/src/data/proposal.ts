// Content for the client-facing proposal (/proposal) and the shared
// "How AI handles your data" definitions also shown on Privacy & Sharing.
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
  { name: 'Aggregates', examples: 'Lap Time totals, sector trends, event attendance counts', sensitivity: 'Low', tier: 'anonymised', rule: 'Shared only as totals, never row by row.' },
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
  { area: 'Research', title: 'Lap Time open answers', body: 'Themes and sentiment from hundreds of written survey answers, by sector, in hours instead of weeks. Individual answers never leave the building.', tier: 'on-prem', phase: 2 },
  { area: 'Advocacy', title: 'Committee drafting assistant', body: 'First drafts of comments and position papers from committee discussions and past positions, for the committee to edit.', tier: 'on-prem', phase: 2 },
  { area: 'Members', title: 'Introductions and personal digests', body: 'Suggested introductions between members and a digest tuned to each company’s sector and committees, for members who opt in.', tier: 'on-prem', phase: 2 },
];

export const PHASES = [
  {
    phase: 0,
    name: 'With the new website',
    duration: 'Ships with the redesign',
    goal: 'Visible wins on public content only. No member data involved, so nothing to approve but the design.',
    items: ['“Ask AmCham” site search and answers', 'Serbian ↔ English translation drafts', 'Analytics on what visitors actually ask'],
  },
  {
    phase: 1,
    name: 'A staff pilot',
    duration: 'About 8–12 weeks, indicative',
    goal: 'Two or three people on the team use Compass every day. We measure the hours it saves and the renewals it helps protect.',
    items: ['Private model installed and running', 'Compass morning brief, meeting briefs, follow-up drafts', 'Legislation radar', 'Data-protection impact assessment completed'],
  },
  {
    phase: 2,
    name: 'Sensitive work and members',
    duration: 'Planned after the pilot review',
    goal: 'Extend to the work that matters most, once the pilot has earned trust.',
    items: ['Lap Time analysis', 'Committee drafting assistant', 'Member-facing introductions and digests, opt-in', 'Board-level AI audit report'],
  },
];

export const ASKS = [
  { title: 'A discovery fortnight', body: 'Two weeks to see how member data is kept today (spreadsheets, Outlook, any CRM) and what is worth connecting first.' },
  { title: 'A small pilot group', body: 'Two or three people from the team, around an hour a week of feedback during the pilot.' },
  { title: 'A privacy owner', body: 'One named person who signs off what data each AI feature may use.' },
  { title: 'Board visibility', body: 'A short session with the board on the principles above before any member data is used.' },
];

export const RISKS = [
  { risk: 'Serbian quality', answer: 'Smaller private models are weaker in Serbian than in English. We test with your real documents during discovery and route only what passes to the private model.' },
  { risk: 'Data readiness', answer: 'AI is only as good as the records behind it. Discovery tells us what exists; the pilot starts with what is already clean.' },
  { risk: 'Profiling members', answer: 'Engagement scores describe companies, but notes can describe people. A data-protection impact assessment comes before the pilot, and members are told plainly.' },
  { risk: 'Who keeps it running', answer: 'We do. The private model is a managed service; AmCham does not need an IT department to own it.' },
  { risk: 'Over-promising', answer: 'Everything in the demo is a mock-up built to show the idea. Each phase is scoped and measured before the next one starts.' },
];

export const FAQ = [
  { q: 'Will our data be used to train AI models?', a: 'No. Member data is processed on a model AmCham controls. When a cloud model is used, it is under terms that exclude training, and it only receives anonymised or public content.' },
  { q: 'What happens if the internet goes down?', a: 'Everything that runs on the private model keeps working. The demo shows Compass answering with the network switched off.' },
  { q: 'Does it work in Serbian?', a: 'The website and public-content features do, today. For the private model, we confirm Serbian quality on your own documents before relying on it.' },
  { q: 'Can members opt out?', a: 'Yes. Member-facing AI features are opt-in, and every member can see what AI does with their data in Privacy & Sharing.' },
  { q: 'What if our staff already use ChatGPT?', a: 'They probably do, and that is the real privacy risk today: member details pasted into public tools with no record. A governed tool is the safer answer than a ban.' },
];
