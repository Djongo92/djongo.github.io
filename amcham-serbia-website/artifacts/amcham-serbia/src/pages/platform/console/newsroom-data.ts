// Drafts that Compass prepares for the communications team. Everything here
// waits for a person to approve it; nothing publishes itself. Public content
// runs on any model; the member digest uses member data, so it stays on the
// private model.
import type { TierId } from '@/data/proposal';

export type NewsKind = 'translation' | 'social' | 'recap' | 'press' | 'digest';

export interface NewsItem {
  id: string;
  kind: NewsKind;
  title: string;
  source: string;
  due: string;
  tier: TierId;
}

export interface TranslationItem extends NewsItem {
  kind: 'translation';
  original: string[];
  draft: string[];
  // Terms Compass wants a person to check, matched against AmCham's glossary.
  check: { term: string; note: string }[];
}

export interface SocialItem extends NewsItem {
  kind: 'social';
  channel: string;
  post: string;
  image: string;
  bestTime: string;
}

export interface RecapItem extends NewsItem {
  kind: 'recap';
  headline: string;
  body: string[];
  builtFrom: string[];
  confirm: string;
}

export interface PressItem extends NewsItem {
  kind: 'press';
  headline: string;
  body: string[];
  audience: string;
}

export interface DigestItem extends NewsItem {
  kind: 'digest';
  ready: number;
}

export type AnyNewsItem = TranslationItem | SocialItem | RecapItem | PressItem | DigestItem;

export const NEWS_ITEMS: AnyNewsItem[] = [
  {
    id: 'n1', kind: 'translation', tier: 'public', due: 'Today',
    title: 'Serbian version: “New Policy Recommendations on AI Regulation Handed to the Ministry”',
    source: 'News article published in English on 22 Aug',
    original: [
      'The Digital Economy Committee has finalised and delivered a comprehensive set of proposals to the Ministry of Information and Telecommunications.',
      'The recommendations focus on a predictable framework for AI, aligned with the EU AI Act, that protects citizens without slowing investment.',
    ],
    draft: [
      'Odbor za digitalnu ekonomiju finalizovao je i predao sveobuhvatan set predloga Ministarstvu informisanja i telekomunikacija.',
      'Preporuke su usmerene na predvidiv okvir za veštačku inteligenciju, usklađen sa Aktom EU o veštačkoj inteligenciji, koji štiti građane bez usporavanja investicija.',
    ],
    check: [
      { term: 'Odbor za digitalnu ekonomiju', note: 'Matches the committee name on the Serbian site.' },
      { term: 'Aktom EU o veštačkoj inteligenciji', note: 'Two spellings are in use. Pick one and Compass will remember it.' },
    ],
  },
  {
    id: 'n2', kind: 'social', tier: 'public', due: 'Today',
    title: 'LinkedIn post: Energy Transition Roundtable, tomorrow',
    source: 'Event page · 86 registered',
    channel: 'LinkedIn',
    post: 'Tomorrow at the Hyatt Regency: our Energy Transition Roundtable brings together energy, manufacturing and finance leaders to talk about what the new grid rules mean for investment in Serbia.\n\nA few seats are still open for members. Register through the member portal.\n\n#AmChamSerbia #EnergyTransition',
    image: 'Photo from last year’s roundtable (event gallery)',
    bestTime: 'Today, 10:00 · when most of your followers are online',
  },
  {
    id: 'n3', kind: 'recap', tier: 'public', due: 'Thursday',
    title: 'Website recap: Digital Economy Committee Session',
    source: 'Event on 22 Sep · agenda, speaker list, 18 photos',
    headline: 'Digital Economy Committee maps out next year’s priorities',
    body: [
      'Members of the Digital Economy Committee met on 22 September to agree on the committee’s priorities for the year ahead: e-invoicing, data protection guidance for small companies, and cloud procurement in the public sector.',
      'Participants discussed early experience with the new e-invoicing rules and agreed to collect practical examples from member companies before the next meeting with the Ministry of Finance.',
      'The committee will publish a short paper on cloud procurement in November.',
    ],
    builtFrom: ['Agenda', 'Speaker list', 'Attendance (31 people)', '18 photos', 'Committee notes'],
    confirm: 'Add a quote from the committee chair, or approve without one.',
  },
  {
    id: 'n4', kind: 'press', tier: 'public', due: 'Friday',
    title: 'Press release: AmCham comments on the Labour Law amendments',
    source: 'Built from the Labour & HR Committee position paper',
    headline: 'AmCham Serbia calls for a predictable approach to fixed-term contracts',
    body: [
      'Belgrade — The American Chamber of Commerce in Serbia today submitted its comments on the draft amendments to the Labour Law, currently in public consultation.',
      'AmCham welcomes the effort to modernise employment rules and recommends a transition period that gives employers time to adjust contracts already in force.',
      'The full comments are available on amcham.rs.',
    ],
    audience: '12 business journalists from AmCham’s press list',
  },
  {
    id: 'n5', kind: 'digest', tier: 'on-prem', due: 'Monday',
    title: 'October member digest',
    source: 'One email per member, built from what AmCham already knows',
    ready: 312,
  },
];

// The digest preview: what three different members would receive.
export const DIGEST_PREVIEWS: Record<string, {
  company: string; person: string; sector: string;
  sections: { heading: string; lines: string[] }[];
}> = {
  hmo: {
    company: 'Hemofarm', person: 'Marko', sector: 'Pharma',
    sections: [
      { heading: 'For your sector', lines: ['Draft rulebook on medicine pricing is open for comment until 30 Oct. The Healthcare Committee meets on it next week.'] },
      { heading: 'Your committees', lines: ['Healthcare Committee: you chair the 21 Oct meeting. The agenda draft is in the portal.'] },
      { heading: 'Events picked for you', lines: ['ESG Reporting Workshop, 5 Nov', 'Annual General Meeting, 15 Nov'] },
      { heading: 'Introductions', lines: ['PwC Serbia accepted your introduction request. Suggested times are in the portal.'] },
      { heading: 'Your year so far', lines: ['22 events attended · 7 introductions · 3 policy wins your committees worked on'] },
    ],
  },
  adr: {
    company: 'Adriatica Grupa', person: 'Dragan', sector: 'Manufacturing',
    sections: [
      { heading: 'For your sector', lines: ['New grid connection rules for industrial users take effect in January. AmCham’s summary is two pages.'] },
      { heading: 'Events picked for you', lines: ['Energy Transition Roundtable, tomorrow: you are registered.', 'Manufacturing CEO breakfast, 12 Nov'] },
      { heading: 'Introductions', lines: ['NIS a.d. has been asked about your energy-supply question. We will write when they reply.'] },
      { heading: 'Your year so far', lines: ['4 events attended · 1 introduction in progress'] },
    ],
  },
  ncr: {
    company: 'NCR Atleos', person: 'Ivana', sector: 'IT',
    sections: [
      { heading: 'For your sector', lines: ['The e-invoicing guidance for software exporters was updated on 8 Oct.'] },
      { heading: 'Your committees', lines: ['Digital Economy Committee: the cloud procurement paper is out for member review.'] },
      { heading: 'Events picked for you', lines: ['Digital Economy Committee Session, 22 Oct'] },
      { heading: 'Your year so far', lines: ['14 events attended · 5 introductions · 2 policy wins'] },
    ],
  },
};
