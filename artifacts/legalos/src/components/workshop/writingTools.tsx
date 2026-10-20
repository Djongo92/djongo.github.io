// The four long-form writing tools, as configs for WritingToolShell.
import WritingToolShell, { type WritingToolConfig } from "./WritingToolShell";

const ARTICLE: WritingToolConfig = {
  toolId: "article",
  toolLabel: "Article Drafter",
  endpoint: "workshop-article",
  titleKey: "topic",
  cta: "Draft the article",
  emptyText: "Your article draft will appear here — with headline options, SEO fields and a checklist of facts to verify.",
  note: "Publish it on your own site under the author's name — that's what the Thought Leadership score rewards.",
  fields: [
    { key: "topic", label: "What happened / what's it about", type: "textarea", rows: 4, required: true, receivesHandoff: true,
      placeholder: "E.g. The new data-protection amendments take effect next month and change breach-notification deadlines for banks." },
    { key: "format", label: "Format", type: "select", options: [
      { value: "Client alert", label: "Client alert (news → what to do)" },
      { value: "Insight article", label: "Insight article (analysis)" },
      { value: "Explainer", label: "Explainer (plain-English guide)" },
      { value: "Opinion piece", label: "Opinion piece (take a position)" },
    ] },
    { key: "length", label: "Length", type: "select", options: [
      { value: "short", label: "Short (~500 words)" },
      { value: "standard", label: "Standard (~900 words)" },
      { value: "long", label: "Long (~1,500 words)" },
    ] },
    { key: "audience", label: "Who it's for", type: "text", placeholder: "E.g. General counsel at mid-size banks" },
    { key: "view", label: "Your firm's view / angle", type: "textarea", rows: 3, placeholder: "What do you actually think? The strongest pieces take a clear position." },
    { key: "byline", label: "Author (name and title)", type: "text", placeholder: "E.g. Ana Petrović, Partner, Banking & Finance" },
    { key: "sources", label: "Source text to rely on", type: "textarea", rows: 5, hint: "Paste the law, ruling or notice. The draft will quote it exactly instead of guessing." },
  ],
};

const PITCH: WritingToolConfig = {
  toolId: "pitch",
  toolLabel: "Press Pitch Builder",
  endpoint: "workshop-press-pitch",
  titleKey: "story",
  cta: "Build the pitch",
  emptyText: "Your pitch email, announcement and quote drafts will appear here.",
  note: "Press coverage by independent outlets feeds your Thought Leadership score. Always confirm client consent before naming anyone.",
  fields: [
    { key: "story", label: "The story", type: "textarea", rows: 4, required: true, receivesHandoff: true,
      placeholder: "E.g. We advised a regional lender on its first cross-border refinancing under the new law." },
    { key: "storyType", label: "Type", type: "select", options: [
      { value: "Deal / matter", label: "Deal or matter" },
      { value: "Ruling / case result", label: "Ruling or case result" },
      { value: "Article / insight", label: "Our article or analysis" },
      { value: "Hire / promotion", label: "Hire or promotion" },
      { value: "Ranking / award", label: "Ranking or award" },
    ] },
    { key: "newsworthy", label: "Why is it news?", type: "textarea", rows: 2, placeholder: "First of its kind? Largest? A change in the law? A trend?" },
    { key: "facts", label: "Key facts", type: "textarea", rows: 4, placeholder: "Parties, advisers, value, dates, jurisdictions…" },
    { key: "spokesperson", label: "Spokesperson", type: "text", placeholder: "Name and title" },
    { key: "outlet", label: "Target outlet or type", type: "text", placeholder: "E.g. regional legal trade press, business daily" },
    { key: "consent", label: "Client consent to be named", type: "select", options: [
      { value: "not confirmed", label: "Not confirmed — anonymise" },
      { value: "confirmed for name only", label: "Confirmed — name only" },
      { value: "confirmed for name and terms", label: "Confirmed — name and terms" },
    ] },
    { key: "embargo", label: "Embargo / timing", type: "text", placeholder: "E.g. announce Tuesday 9am" },
  ],
};

const LINKEDIN: WritingToolConfig = {
  toolId: "linkedin",
  toolLabel: "LinkedIn Post Planner",
  endpoint: "workshop-linkedin",
  titleKey: "source",
  cta: "Plan the week",
  emptyText: "Your week of posts — with first comments and a carousel outline — will appear here.",
  note: "Posts from named lawyers reach further than firm-page posts. Pick who posts what.",
  fields: [
    { key: "source", label: "What to turn into posts", type: "textarea", rows: 8, required: true, receivesHandoff: true,
      hint: "Paste an article, ruling summary or deal news — or use “Send to” from the Article Drafter." },
    { key: "poster", label: "Who is posting", type: "text", placeholder: "E.g. Ana Petrović, Partner" },
    { key: "days", label: "Days", type: "select", options: [
      { value: "5", label: "5 days" }, { value: "3", label: "3 days" }, { value: "7", label: "7 days" },
    ] },
    { key: "audience", label: "Audience", type: "text", placeholder: "E.g. in-house counsel, founders" },
    { key: "goal", label: "Goal", type: "text", placeholder: "E.g. be known for banking regulation" },
  ],
};

const CASE_STUDY: WritingToolConfig = {
  toolId: "casestudy",
  toolLabel: "Case Study Writer",
  endpoint: "workshop-case-study",
  titleKey: "matterType",
  cta: "Write it up",
  emptyText: "A deal announcement, website case study and one-line proof point will appear here.",
  note: "Anonymised unless you confirm the client's consent below.",
  fields: [
    { key: "matterType", label: "Matter", type: "text", required: true, placeholder: "E.g. Cross-border refinancing, merger-control clearance, arbitration win" },
    { key: "client", label: "Client (as it may be described)", type: "text", placeholder: "E.g. a regional bank / Acme d.o.o." },
    { key: "challenge", label: "The challenge", type: "textarea", rows: 3, placeholder: "What made this hard?" },
    { key: "approach", label: "What the firm did", type: "textarea", rows: 3, placeholder: "The judgement calls, not just the services." },
    { key: "outcome", label: "Outcome", type: "textarea", rows: 2, placeholder: "Only what is true and approved." },
    { key: "team", label: "Team", type: "text", placeholder: "Names and titles" },
    { key: "value", label: "Value / scale", type: "text", placeholder: "Only if the client allows it to be shared" },
    { key: "consent", label: "Client consent", type: "select", options: [
      { value: "not confirmed", label: "Not confirmed — anonymise" },
      { value: "confirmed for name only", label: "Confirmed — name only" },
      { value: "confirmed for name and terms", label: "Confirmed — name and terms" },
    ] },
  ],
};

const SUBMISSION: WritingToolConfig = {
  toolId: "submission",
  toolLabel: "Directory Submission Helper",
  endpoint: "workshop-submission",
  titleKey: "practiceArea",
  cta: "Prepare the submission",
  emptyText: "Ranked work highlights, a department narrative, a referee plan and a list of gaps will appear here.",
  note: "Directories change their formats, word limits and deadlines every cycle — check the publisher's current guidelines before you submit. Nothing is invented: missing facts show as [PLACEHOLDERS].",
  fields: [
    { key: "directory", label: "Directory", type: "select", options: [
      { value: "chambers", label: "Chambers" },
      { value: "legal500", label: "The Legal 500" },
      { value: "iflr1000", label: "IFLR1000" },
    ] },
    { key: "practiceArea", label: "Practice area", type: "text", required: true, placeholder: "E.g. Banking & Finance, Dispute Resolution, Competition" },
    { key: "market", label: "Market / jurisdiction", type: "text", placeholder: "E.g. Serbia" },
    { key: "matters", label: "Matters from the review period", type: "textarea", rows: 12, required: true, receivesHandoff: true,
      hint: "One block per matter, rough notes are fine: client (or type), what you did, value, dates, cross-border element, what made it hard, whether it is confidential. About the last 12 months." },
    { key: "team", label: "Team", type: "textarea", rows: 3, placeholder: "Partners and key lawyers in this practice, headcount" },
    { key: "clients", label: "Key clients and sectors", type: "textarea", rows: 2, placeholder: "Only those you may mention" },
    { key: "changes", label: "Team changes this year", type: "textarea", rows: 2, placeholder: "Promotions, lateral hires, departures" },
    { key: "referees", label: "Possible referees", type: "textarea", rows: 2, placeholder: "Client types or relationships, not private contact details" },
    { key: "lastYear", label: "How you were ranked or described last cycle", type: "textarea", rows: 2 },
  ],
};

const PAGE_DRAFT: WritingToolConfig = {
  toolId: "pagedraft",
  pagePreview: true,
  toolLabel: "Page Drafter",
  endpoint: "workshop-page-draft",
  titleKey: "topic",
  cta: "Draft the page",
  emptyText: "A page plan, SEO fields, section copy and clean HTML will appear here.",
  note: "This drafts the words and structure — paste them into your own site or CMS and let your designer style them.",
  fields: [
    { key: "pageType", label: "Page type", type: "select", options: [
      { value: "practice", label: "Practice-area page" },
      { value: "lawyer", label: "Lawyer profile" },
      { value: "about", label: "About the firm" },
      { value: "industry", label: "Industry / sector page" },
      { value: "insight", label: "Insights landing page" },
      { value: "home", label: "Homepage" },
    ] },
    { key: "topic", label: "What is the page about", type: "text", required: true, placeholder: "E.g. Banking & finance for regional lenders" },
    { key: "audience", label: "Who it is for", type: "text", placeholder: "E.g. CFOs and general counsel of mid-size banks" },
    { key: "goal", label: "What visitors should do", type: "text", placeholder: "E.g. Request a 20-minute call" },
    { key: "keywords", label: "Search phrases", type: "text", placeholder: "E.g. banking lawyer Belgrade, loan documentation" },
    { key: "proof", label: "Proof and facts you can use", type: "textarea", rows: 4, receivesHandoff: true, hint: "Credentials, matters you may mention, rankings, numbers. Anything not here becomes a placeholder." },
    { key: "existing", label: "Current page text (optional)", type: "textarea", rows: 5, hint: "Paste it to have it rewritten rather than started from scratch." },
    { key: "vibe", label: "Tone / feel", type: "text", placeholder: "E.g. calm, precise, plain-spoken" },
  ],
};

export const DirectorySubmissionHelper = () => <WritingToolShell config={SUBMISSION} />;
export const PageDrafter = () => <WritingToolShell config={PAGE_DRAFT} />;
export const ArticleDrafter = () => <WritingToolShell config={ARTICLE} />;
export const PressPitchBuilder = () => <WritingToolShell config={PITCH} />;
export const LinkedInPlanner = () => <WritingToolShell config={LINKEDIN} />;
export const CaseStudyWriter = () => <WritingToolShell config={CASE_STUDY} />;
