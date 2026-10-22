// Sample meetings for the Meetings screen: a member call, an internal
// brainstorm and an upcoming committee prep. Everything here is what an AI
// note-taker would produce from a recording made with everyone's consent,
// processed on AmCham's private model.

export interface Speaker { id: string; name: string; role: string }
export interface Line { at: string; who: string; text: string }
export interface Chapter { at: string; title: string }
export interface Action { id: string; text: string; owner: string; due: string }
export interface CalendarItem { id: string; title: string; when: string; who: string }
export interface Qa { q: string; a: string; at: string }
export interface IdeaCluster { theme: string; ideas: { text: string; votes: number; by: string }[] }

export interface Meeting {
  id: string;
  kind: 'member' | 'internal' | 'upcoming';
  title: string;
  when: string;
  length?: string;
  source: string;
  speakers: Speaker[];
  prep?: { goal: string; agenda: string[]; talkingPoints: string[]; openItems: string[] };
  summary?: string[];
  decisions?: string[];
  actions?: Action[];
  calendar?: CalendarItem[];
  quotes?: { at: string; who: string; text: string }[];
  chapters?: Chapter[];
  transcript?: Line[];
  qa?: Qa[];
  followUp?: string;
  clusters?: IdeaCluster[];
  parked?: string[];
}

export const MEETINGS: Meeting[] = [
  {
    id: 'adr-call', kind: 'member', title: 'Call with Adriatica Grupa', when: 'Today, 11:00', length: '24 min', source: 'Microsoft Teams',
    speakers: [
      { id: 'D', name: 'Dragan Petrović', role: 'CEO, Adriatica Grupa' },
      { id: 'M', name: 'Marija Jovanović', role: 'Account manager, AmCham' },
      { id: 'S', name: 'Stefan Mitić', role: 'Team lead, AmCham' },
    ],
    prep: {
      goal: 'Understand why engagement has dropped and agree one concrete next step before the renewal.',
      agenda: ['How the year has gone for Adriatica', 'What would make AmCham more useful to manufacturing', 'The NIS a.d. introduction', 'Next events'],
      talkingPoints: ['Thank him for the ESG roundtable feedback in March.', 'They have missed the last two committee meetings; ask what would make them worth the time.', 'The NIS a.d. introduction is waiting on NIS; say when we expect an answer.'],
      openItems: ['Agenda for the Energy Transition Roundtable was promised in September.'],
    },
    summary: [
      'Energy costs and grid-connection delays for the new Kragujevac line are Adriatica’s main worry this year.',
      'Dragan feels AmCham focused on policy and did little for manufacturing. Renewal depends on the next three months.',
      'The NIS a.d. introduction matters to him; he asked AmCham to push it.',
    ],
    decisions: [
      'AmCham will prioritise the NIS a.d. introduction and report back by Friday.',
      'Dragan will attend the Energy Transition Roundtable tomorrow.',
      'Adriatica stays tagged “renewal risk” until the introduction happens.',
    ],
    actions: [
      { id: 'a1', text: 'Send the roundtable agenda to Dragan', owner: 'Marija J.', due: 'Today' },
      { id: 'a2', text: 'Get an answer from NIS a.d. on the introduction', owner: 'Marija J.', due: 'Fri 16 Oct' },
      { id: 'a3', text: 'Invite Dragan to the Manufacturing CEO breakfast', owner: 'Stefan M.', due: 'Mon 19 Oct' },
    ],
    calendar: [
      { id: 'c1', title: 'Check-in: NIS a.d. introduction for Adriatica', when: 'Fri 16 Oct, 09:30', who: 'Marija J.' },
      { id: 'c2', title: 'Manufacturing CEO breakfast (hold for Dragan)', when: 'Thu 12 Nov, 08:00', who: 'Stefan M., Dragan P.' },
    ],
    quotes: [
      { at: '06:12', who: 'D', text: 'This year it felt like AmCham was all policy and nothing for manufacturing.' },
      { at: '14:40', who: 'D', text: 'If you can get NIS to the table, that alone is worth the membership.' },
    ],
    chapters: [
      { at: '00:00', title: 'How the year has gone' },
      { at: '05:30', title: 'What AmCham could do better' },
      { at: '12:10', title: 'The NIS a.d. introduction' },
      { at: '19:45', title: 'Next steps' },
    ],
    transcript: [
      { at: '00:42', who: 'M', text: 'Thanks for making time, Dragan. How has the year been with the new line?' },
      { at: '01:05', who: 'D', text: 'Busy. The line is ready but the grid connection keeps slipping, and energy prices are the biggest worry on our side.' },
      { at: '06:12', who: 'D', text: 'Honestly, this year it felt like AmCham was all policy and nothing for manufacturing.' },
      { at: '06:40', who: 'S', text: 'That’s fair to hear. What would make it worth your time?' },
      { at: '12:20', who: 'D', text: 'The NIS introduction. We need a long-term energy supplier.' },
      { at: '14:40', who: 'D', text: 'If you can get NIS to the table, that alone is worth the membership.' },
      { at: '15:02', who: 'M', text: 'I’ll chase them this week and come back to you by Friday.' },
      { at: '20:10', who: 'D', text: 'Send me the agenda for tomorrow and I’ll be there.' },
    ],
    qa: [
      { q: 'What did we promise Adriatica?', a: 'The roundtable agenda today, an answer on the NIS a.d. introduction by Friday, and an invitation to the Manufacturing CEO breakfast.', at: '15:02' },
      { q: 'Is the renewal at risk?', a: 'Yes. Dragan said renewal depends on the next three months, and the NIS introduction is what he cares about most.', at: '14:40' },
      { q: 'What does he think of AmCham this year?', a: 'That it focused on policy and did little for manufacturing.', at: '06:12' },
    ],
    followUp: 'Dear Dragan,\n\nThank you for your time today. As promised, the agenda for tomorrow’s Energy Transition Roundtable is attached. I have asked NIS a.d. about the energy-supply introduction and will update you by Friday.\n\nWe would also be glad to see you at our Manufacturing CEO breakfast on 12 November.\n\nKind regards,\nMarija',
  },
  {
    id: 'brainstorm', kind: 'internal', title: 'Brainstorm: the 2027 events calendar', when: 'Yesterday, 14:00', length: '52 min', source: 'Meeting room recorder',
    speakers: [
      { id: 'A', name: 'Ana Savić', role: 'Events' },
      { id: 'S', name: 'Stefan Mitić', role: 'Membership' },
      { id: 'J', name: 'Jelena Kostić', role: 'Policy' },
      { id: 'N', name: 'Nikola Krstić', role: 'Membership' },
      { id: 'T', name: 'Tina Kostić', role: 'Communications' },
    ],
    summary: [
      'The team wants fewer, bigger events next year, with a clear reason for each one.',
      'Manufacturing members feel left out; two ideas address that directly.',
      'Venue costs and speaker sourcing are the main open questions.',
    ],
    clusters: [
      { theme: 'Win back manufacturing', ideas: [
        { text: 'Quarterly Manufacturing CEO breakfast outside Belgrade', votes: 5, by: 'Stefan' },
        { text: 'Factory visit series with member hosts', votes: 4, by: 'Nikola' },
      ] },
      { theme: 'Fewer, bigger events', ideas: [
        { text: 'Merge the three tax briefings into one annual Tax Day', votes: 4, by: 'Jelena' },
        { text: 'Drop the summer networking evening; low turnout two years running', votes: 3, by: 'Ana' },
      ] },
      { theme: 'Make events work harder', ideas: [
        { text: 'Every event ends with a recap and a members-only recording', votes: 3, by: 'Tina' },
        { text: 'Pre-book introductions between attendees before each event', votes: 2, by: 'Stefan' },
      ] },
    ],
    decisions: [
      'Pilot the Manufacturing CEO breakfast in Kragujevac in January.',
      'Merge the tax briefings into one Tax Day in March.',
      'Every event gets a recap within 48 hours.',
    ],
    parked: ['A members’ awards evening (revisit when the sponsorship budget is known)', 'A podcast (needs someone to own it)'],
    actions: [
      { id: 'b1', text: 'Shortlist three venues in Kragujevac', owner: 'Ana S.', due: 'Fri 23 Oct' },
      { id: 'b2', text: 'Draft the Tax Day outline with the Tax Committee', owner: 'Jelena K.', due: 'Fri 30 Oct' },
      { id: 'b3', text: 'Ask five manufacturing members to host a factory visit', owner: 'Nikola K.', due: 'Fri 6 Nov' },
      { id: 'b4', text: 'Set up the recap template in the Newsroom', owner: 'Tina K.', due: 'Fri 23 Oct' },
    ],
    calendar: [
      { id: 'd1', title: 'Follow-up: 2027 calendar, decide venues', when: 'Tue 3 Nov, 14:00', who: 'Events team' },
      { id: 'd2', title: 'Tax Day planning with the Tax Committee', when: 'Thu 5 Nov, 10:00', who: 'Jelena K.' },
    ],
    quotes: [
      { at: '08:20', who: 'S', text: 'If manufacturing feels left out, a breakfast in Belgrade won’t fix it. Go to them.' },
      { at: '31:05', who: 'A', text: 'Two years of low turnout is enough evidence. Let’s drop the summer evening.' },
    ],
    chapters: [
      { at: '00:00', title: 'What worked in 2026' },
      { at: '07:45', title: 'Manufacturing' },
      { at: '22:30', title: 'Fewer, bigger events' },
      { at: '40:10', title: 'Decisions and owners' },
    ],
    transcript: [
      { at: '00:30', who: 'A', text: 'Let’s start with what worked this year and what didn’t.' },
      { at: '08:20', who: 'S', text: 'If manufacturing feels left out, a breakfast in Belgrade won’t fix it. Go to them.' },
      { at: '09:05', who: 'N', text: 'We could ask members to host factory visits. They’d love showing their lines.' },
      { at: '23:40', who: 'J', text: 'Three separate tax briefings is too many. One Tax Day would get better speakers.' },
      { at: '31:05', who: 'A', text: 'Two years of low turnout is enough evidence. Let’s drop the summer evening.' },
      { at: '41:15', who: 'T', text: 'Whatever we pick, every event should get a recap within two days.' },
    ],
    qa: [
      { q: 'What did we decide?', a: 'Pilot a Manufacturing CEO breakfast in Kragujevac in January, merge the tax briefings into one Tax Day in March, and publish a recap within 48 hours of every event.', at: '40:10' },
      { q: 'Who owns the venue shortlist?', a: 'Ana, by Friday 23 October.', at: '42:30' },
      { q: 'Which ideas did we park, and why?', a: 'The awards evening, until the sponsorship budget is known, and a podcast, until someone owns it.', at: '47:50' },
    ],
  },
  {
    id: 'healthcare-prep', kind: 'upcoming', title: 'Healthcare Committee', when: 'Wed 21 Oct, 10:00', source: 'Calendar',
    speakers: [
      { id: 'H', name: 'Marko R.', role: 'Chair, Hemofarm' },
      { id: 'J', name: 'Jelena Kostić', role: 'Policy, AmCham' },
    ],
    prep: {
      goal: 'Agree the committee’s comment on the medicine-pricing rulebook before the 30 October deadline.',
      agenda: ['Pricing rulebook: where members stand', 'Draft comment: who writes what', 'Next meeting'],
      talkingPoints: ['The consultation closes on 30 October: nine days after this meeting.', 'Survey themes for pharma: pricing rules were the top concern (58% of written answers).', 'Last meeting’s open item: Marko offered two case examples from Hemofarm.'],
      openItems: ['Case examples from Hemofarm (Marko, promised on 23 Sep).', 'List of affected products (Jelena).'],
    },
  },
];
