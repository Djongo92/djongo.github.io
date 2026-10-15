import type { FirmContext } from '@/lib/firmContext';

export type ToolMobile = 'full' | 'limited' | 'desktop-only';
export type ToolCategory = 'content' | 'analysis' | 'strategy';

export interface ToolField {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
  rows?: number;
  optional?: boolean;
}

export interface WorkshopTool {
  id: string;
  name: string;
  desc: string;
  icon: string; // Feather icon name
  edgeFunction?: string; // undefined = static/no-API
  // firmContext is the structured object the edge functions read
  // (firmContext.practiceArea/.firmSize/.primaryGoal) — never a display
  // string, which functions would render as "undefined practice, undefined…".
  requestBody?: (fields: Record<string, string>, firmContext: FirmContext | null) => Record<string, unknown>;
  outputKey?: string; // key in the response to display
  fields: ToolField[];
  mobile: ToolMobile;
  category: ToolCategory;
}

export const tools: WorkshopTool[] = [
  {
    id: 'headlines',
    name: 'Headline Lab',
    desc: 'Generate 20 ranked headlines for any content. Run a tournament to crown the champion.',
    icon: 'zap',
    edgeFunction: 'workshop-headlines',
    requestBody: (f, ctx) => ({ mode: 'generate', brief: f.brief, audience: f.audience, mustInclude: f.mustInclude, avoid: f.avoid, firmContext: ctx }),
    outputKey: 'headlines',
    fields: [
      { key: 'brief', label: 'Brief', placeholder: 'Describe the article, campaign, or page you need a headline for...', multiline: true, rows: 3 },
      { key: 'audience', label: 'Target audience', placeholder: 'e.g. in-house counsel, CFOs at mid-size companies', optional: true },
      { key: 'mustInclude', label: 'Must include', placeholder: 'Word or idea that must appear', optional: true },
      { key: 'avoid', label: 'Must avoid', placeholder: 'Anything to stay away from', optional: true },
    ],
    mobile: 'full',
    category: 'content',
  },
  {
    id: 'copywriter',
    name: 'AI Copywriter',
    desc: 'Generate 3 variations of polished marketing copy — ads, homepage sections, email intros, and more.',
    icon: 'edit-3',
    edgeFunction: 'workshop-copywriter',
    requestBody: (f, ctx) => ({ brief: f.brief, audience: f.audience, format: f.format, firmContext: ctx }),
    outputKey: 'copy',
    fields: [
      { key: 'brief', label: 'What needs to be written', placeholder: 'e.g. Homepage hero copy for a corporate M&A boutique targeting PE-backed founders', multiline: true, rows: 3 },
      { key: 'audience', label: 'Audience', placeholder: 'e.g. Managing partners at mid-size law firms', optional: true },
      { key: 'format', label: 'Format', placeholder: 'e.g. LinkedIn post, email intro, bio paragraph', optional: true },
    ],
    mobile: 'full',
    category: 'content',
  },
  {
    id: 'bio-rewriter',
    name: 'Bio Rewriter',
    desc: 'Transform a dry partner bio into compelling, client-centric copy that highlights real expertise.',
    icon: 'user',
    // workshop-bio-rewrite (no trailing "r") is the real, deployed function —
    // the old name 404'd. It answers with an SSE stream of markdown, not a
    // JSON envelope, so there is no outputKey: callEdgeFunction de-frames it.
    edgeFunction: 'workshop-bio-rewrite',
    requestBody: (f, ctx) => ({ currentBio: f.bio, name: f.partnerName, firmContext: ctx }),
    fields: [
      { key: 'partnerName', label: 'Partner name', placeholder: 'e.g. Ana Petrović', optional: true },
      { key: 'bio', label: 'Existing bio', placeholder: 'Paste the current bio text here...', multiline: true, rows: 5 },
    ],
    mobile: 'full',
    category: 'content',
  },
  {
    id: 'rewrite',
    name: 'Rewrite Tool',
    desc: 'Apply Guidebook frameworks to existing copy. Paste anything and get a strategic rewrite.',
    icon: 'refresh-cw',
    edgeFunction: 'workshop-rewrite',
    requestBody: (f, ctx) => ({ text: f.text, instruction: f.instruction, firmContext: ctx }),
    outputKey: 'rewritten',
    fields: [
      { key: 'text', label: 'Original text', placeholder: 'Paste the text you want to improve...', multiline: true, rows: 5 },
      { key: 'instruction', label: 'Rewrite goal', placeholder: 'e.g. Make it client-centric and clearer, cut to 150 words', optional: true },
    ],
    mobile: 'full',
    category: 'content',
  },
  {
    id: 'copy-autopsy',
    name: 'Copy Autopsy',
    desc: 'Score any piece of copy across 6 axes: clarity, specificity, credibility, emotion, CTA, differentiation.',
    icon: 'activity',
    edgeFunction: 'workshop-autopsy',
    requestBody: (f, ctx) => ({ copy: f.copy, firmContext: ctx }),
    outputKey: 'analysis',
    fields: [
      { key: 'copy', label: 'Copy to analyse', placeholder: 'Paste your homepage text, pitch paragraph, LinkedIn bio, email intro...', multiline: true, rows: 5 },
    ],
    mobile: 'full',
    category: 'analysis',
  },
  {
    id: 'competitor-teardown',
    name: 'Competitor Teardown',
    desc: 'Enter a competitor\'s name and get a full breakdown of their weak spots and your positioning opportunities.',
    icon: 'crosshair',
    edgeFunction: 'workshop-competitor-teardown',
    requestBody: (f, ctx) => ({ competitor: f.competitor, practiceArea: f.practiceArea, firmContext: ctx }),
    outputKey: 'teardown',
    fields: [
      { key: 'competitor', label: 'Competitor firm name', placeholder: 'e.g. Joksović & Associates' },
      { key: 'practiceArea', label: 'Practice area focus', placeholder: 'e.g. M&A, Employment, Disputes', optional: true },
    ],
    mobile: 'full',
    category: 'analysis',
  },
  {
    id: 'practice-audit',
    name: 'Practice Page Audit',
    desc: 'Enter any practice area page URL and get a score and actionable improvements based on Chapter 8 framework.',
    icon: 'search',
    edgeFunction: 'workshop-practice-audit',
    requestBody: (f, ctx) => ({ url: f.url, firmContext: ctx }),
    outputKey: 'audit',
    fields: [
      { key: 'url', label: 'Practice area page URL', placeholder: 'https://yourfirm.com/practice/corporate' },
    ],
    mobile: 'full',
    category: 'analysis',
  },
  {
    id: 'marketing-calendar',
    name: '12-Month Calendar',
    desc: 'Generate a full 12-month content and marketing calendar tailored to your firm\'s practice areas.',
    icon: 'calendar',
    edgeFunction: 'workshop-calendar',
    requestBody: (f, ctx) => ({ practiceAreas: f.practiceAreas, goals: f.goals, firmContext: ctx }),
    outputKey: 'calendar',
    fields: [
      { key: 'practiceAreas', label: 'Your practice areas', placeholder: 'e.g. M&A, Employment Law, Real Estate' },
      { key: 'goals', label: 'Marketing goals for the year', placeholder: 'e.g. Double LinkedIn following, win Chambers Band 1, launch client newsletter', optional: true },
    ],
    mobile: 'full',
    category: 'strategy',
  },
  {
    id: 'pitch-deck',
    name: 'Pitch Deck Drafter',
    desc: 'Generate a structured pitch deck outline for a new client or panel submission. Fill in the key details and get slide-ready content with speaker notes.',
    icon: 'layers',
    edgeFunction: 'workshop-pitch-deck',
    requestBody: (f, ctx) => ({
      audience: f.audience,
      opportunity: f.opportunity,
      ourEdge: f.ourEdge || undefined,
      proof: f.proof || undefined,
      ask: f.ask || undefined,
      tone: f.tone || undefined,
      firmContext: ctx,
    }),
    outputKey: 'deck',
    fields: [
      { key: 'audience', label: 'Who is this pitch for', placeholder: 'e.g. CFO at a PE-backed tech company considering M&A counsel' },
      { key: 'opportunity', label: 'The opportunity', placeholder: 'e.g. Cross-border acquisition, seller-side, ~€80m deal, tight timeline' },
      { key: 'ourEdge', label: 'Your edge', placeholder: 'e.g. Deep tech-sector M&A experience, dedicated team, rapid mobilisation', optional: true },
      { key: 'proof', label: 'Proof / credentials', placeholder: 'e.g. Led 12 similar deals in the past 3 years, Chambers Band 1 M&A', optional: true },
      { key: 'ask', label: 'Desired outcome', placeholder: 'e.g. Appointment as lead counsel for the transaction', optional: true },
      { key: 'tone', label: 'Tone', placeholder: 'e.g. Confident and direct, or collaborative and advisory', optional: true },
    ],
    mobile: 'limited',
    category: 'strategy',
  },
  {
    id: 'deck-roast',
    name: 'Roast My Deck',
    desc: 'Get a critical, honest review of your existing pitch or credentials deck. Upload on the web app.',
    icon: 'alert-triangle',
    fields: [],
    mobile: 'desktop-only',
    category: 'analysis',
  },
  {
    id: 'swipe-file',
    name: 'Swipe File',
    desc: '50+ proven legal marketing templates — LinkedIn posts, email subjects, article openers, and pitch phrases.',
    icon: 'copy',
    fields: [],
    mobile: 'full',
    category: 'content',
  },
];

export const SWIPE_FILE_ITEMS = [
  { category: 'LinkedIn Post Openers', items: [
    'Most law firms think [X]. Here\'s why they\'re wrong.',
    'I asked 10 general counsel what they actually want from outside counsel. Here\'s what they said:',
    'The legal industry has a [problem] problem. We need to talk about it.',
    'Hot take: The best law firm marketing isn\'t marketing at all.',
    'We just closed [type of deal]. What we learned:',
  ]},
  { category: 'Email Subject Lines', items: [
    'Your practice area page is leaking clients (here\'s the fix)',
    '[First Name], a quick question about your firm\'s visibility',
    'The 3-minute website audit every law firm should run',
    'What the top-ranked firm in your market is doing differently',
    'Your Chambers ranking — and what comes after it',
  ]},
  { category: 'Article Openers', items: [
    'Here\'s a test: Can you describe what makes your firm different in one sentence?',
    'Every client you\'ve lost to a competitor made a decision based on information available online. Here\'s what they saw.',
    'The most underused marketing asset at most law firms isn\'t a social channel. It\'s their people.',
    'Law firms that win consistently share one trait: they make their expertise visible before they\'re needed.',
  ]},
  { category: 'Pitch Phrases', items: [
    'We don\'t just advise — we stay involved until implementation is complete.',
    'Our team has handled [X] transactions in this sector over the past [Y] years.',
    'Our approach is structured around your business objectives, not just the legal issues.',
    'We bring cross-border perspective to every mandate through our [network/alliance/expertise].',
  ]},
];
