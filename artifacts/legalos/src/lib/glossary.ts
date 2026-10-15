// Curated glossary of marketing & legal-marketing terms used across the guidebook.
// Each entry: term (canonical phrase), definition (short, plain-English), and
// optional aliases (case-insensitive variants that should also be linked).

export interface GlossaryEntry {
  term: string;
  definition: string;
  aliases?: string[];
}

export const glossary: GlossaryEntry[] = [
  {
    term: "SEO",
    definition:
      "Search Engine Optimization — the practice of structuring your website and content so it ranks higher on Google for the searches your potential clients actually type.",
    aliases: ["search engine optimization"],
  },
  {
    term: "SERP",
    definition:
      "Search Engine Results Page — the page Google shows after a search. The top 3 organic spots usually capture the majority of clicks.",
  },
  {
    term: "CTA",
    definition:
      "Call To Action — the specific next step you ask a visitor to take (e.g. \"Book a consultation\", \"Download the guide\"). Every key page should have exactly one primary CTA.",
    aliases: ["call to action", "calls to action"],
  },
  {
    term: "thought leadership",
    definition:
      "Publishing original analysis, opinions, or research that demonstrates expertise — earning the trust of clients, peers, journalists, and referral sources before they ever need to hire you.",
  },
  {
    term: "buyer journey",
    definition:
      "The stages a prospective client moves through from realizing they have a legal problem to selecting a firm. Marketing should serve content suited to each stage.",
    aliases: ["client journey"],
  },
  {
    term: "lead magnet",
    definition:
      "A high-value asset (guide, checklist, template, webinar) given away in exchange for a prospect's contact details — used to build a pipeline of warm leads.",
    aliases: ["lead magnets"],
  },
  {
    term: "conversion rate",
    definition:
      "The percentage of visitors who take a desired action (filling a form, booking a call). Most law firm websites convert under 2%; well-designed pages can hit 5-10%.",
  },
  {
    term: "bounce rate",
    definition:
      "The percentage of visitors who leave your site after viewing only one page. High bounce rates usually signal a mismatch between what visitors searched for and what they found.",
  },
  {
    term: "evergreen content",
    definition:
      "Articles and resources that stay relevant for years (as opposed to news commentary). The backbone of a sustainable content strategy.",
  },
  {
    term: "pillar content",
    definition:
      "A long, comprehensive article that covers a topic in depth and is supported by smaller related pieces — the strongest format for ranking on competitive SEO terms.",
    aliases: ["pillar page", "pillar pages"],
  },
  {
    term: "backlinks",
    definition:
      "Links from other websites pointing to yours. A foundational SEO ranking signal — Google treats them as votes of credibility.",
    aliases: ["backlink"],
  },
  {
    term: "domain authority",
    definition:
      "A score (0-100) estimating how likely a site is to rank in search results, based largely on the quantity and quality of inbound links.",
  },
  {
    term: "ICP",
    definition:
      "Ideal Client Profile — a specific definition of the client type you most want to serve (industry, deal size, geography, pain point). Sharper ICPs produce sharper marketing.",
    aliases: ["ideal client profile"],
  },
  {
    term: "positioning",
    definition:
      "The distinct space your firm occupies in a prospect's mind — what you stand for, who you serve, and why you're the obvious choice over alternatives.",
  },
  {
    term: "messaging",
    definition:
      "The specific words you use to communicate your positioning across web copy, ads, bios, and outreach. Strong messaging is concrete, benefit-led, and repeatable.",
  },
  {
    term: "case study",
    definition:
      "A structured story showing how you helped a specific client achieve a specific outcome. The single most persuasive content format for B2B legal services.",
    aliases: ["case studies"],
  },
  {
    term: "referral",
    definition:
      "A new client introduced by an existing client, contact, or peer. Referrals close at 3-5x the rate of cold leads — and most firms massively under-invest in nurturing them.",
    aliases: ["referrals"],
  },
  {
    term: "RFP",
    definition:
      "Request For Proposal — a formal document a client sends to multiple firms inviting bids. Winning RFPs is more about prior brand presence and relationships than the proposal itself.",
    aliases: ["request for proposal"],
  },
  {
    term: "BD",
    definition:
      "Business Development — the lawyer-led activities (relationship building, networking, client visits) that turn marketing-generated awareness into actual engagements.",
    aliases: ["business development"],
  },
  {
    term: "CRM",
    definition:
      "Client Relationship Management software — a system of record for every contact, conversation, and opportunity. Without one, marketing investment leaks out.",
  },
  {
    term: "drip campaign",
    definition:
      "An automated email sequence that delivers a series of messages over time (e.g. 5 emails over 3 weeks) — used to nurture leads from interest to engagement.",
  },
  {
    term: "brand equity",
    definition:
      "The accumulated reputation, recognition, and trust your firm carries in the market. It compounds over years of consistent positioning and visible expertise.",
  },
  {
    term: "share of voice",
    definition:
      "The percentage of industry conversation (media mentions, search visibility, social engagement) you own relative to competitors.",
  },
  {
    term: "GTM",
    definition:
      "Go-To-Market — the coordinated plan covering positioning, channels, content, and sales motions used to launch a new practice, geography, or service.",
    aliases: ["go-to-market", "go to market"],
  },
  {
    term: "MQL",
    definition:
      "Marketing Qualified Lead — a prospect who has shown enough engagement (downloads, page views, form fills) to warrant outreach from BD.",
    aliases: ["marketing qualified lead"],
  },
  {
    term: "SQL",
    definition:
      "Sales Qualified Lead — a prospect who has been verified as a real opportunity (right ICP, right need, right timing) and is ready for substantive engagement.",
    aliases: ["sales qualified lead"],
  },
  {
    term: "attribution",
    definition:
      "Tying a closed engagement back to the marketing touchpoints that influenced it. Hard in legal services because of long, multi-channel buying cycles.",
  },
  {
    term: "long-tail",
    definition:
      "Specific, lower-volume search queries (e.g. \"chicago franchise dispute attorney\") that collectively drive most qualified traffic — and have far less competition than head terms.",
    aliases: ["long tail", "long-tail keyword", "long-tail keywords"],
  },
];

/**
 * Build a single regex matching every glossary term/alias as whole-word matches.
 * Returns the regex plus a lookup map of lowercase term → definition.
 */
export const buildGlossaryMatcher = () => {
  const lookup = new Map<string, GlossaryEntry>();
  const phrases: string[] = [];
  for (const entry of glossary) {
    const variants = [entry.term, ...(entry.aliases || [])];
    for (const v of variants) {
      lookup.set(v.toLowerCase(), entry);
      phrases.push(v);
    }
  }
  // Sort longest first so multi-word phrases match before sub-phrases.
  phrases.sort((a, b) => b.length - a.length);
  const escaped = phrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  return { regex, lookup };
};