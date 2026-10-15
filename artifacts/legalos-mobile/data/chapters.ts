// GENERATED FILE — do not edit by hand.
// Source of truth: artifacts/legalos/src/data/chapters/
// Regenerate: pnpm --filter @workspace/legalos run generate:mobile-chapters
// Parity is enforced by src/lib/mobileChaptersParity.test.ts (web suite).

export interface ChapterSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  numbered?: string[];
  pullQuote?: string;
  callout?: { type: 'insight' | 'pro-tip' | 'mistake' | 'quick-win'; content: string };
  stat?: { value: string; label: string };
  comparison?: {
    before: { title: string; items: string[] };
    after: { title: string; items: string[] };
  };
}

export interface ActionItem {
  text: string;
  priority: 'quick-win' | 'strategic' | 'long-term';
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  hook: string;
  content: ChapterSection[];
  actionItems: ActionItem[];
}

export const chapters: Chapter[] = [
  {
    id: 'event-marketing',
    number: 1,
    title: 'Maximizing Event Participation',
    subtitle: 'Turn every conference into months of marketing value',
    hook: 'Squeeze 10x the value from every conference',
    actionItems: [
      { text: 'Adopt the T-minus-21 event calendar (Materials below) for your firm\'s next confirmed event — assign an owner today', priority: 'quick-win' },
      { text: 'Build the post-event article series into your editorial calendar as a standing slot, not an afterthought', priority: 'strategic' },
      { text: 'Establish a quarterly speaker-interview program: every event your firm touches produces at least one published interview', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'Law firms spend significant resources on event participation — money, time, strategic planning, and preparation of presentations. Most firms do the basics: a short write-up announcing their participation, a few images on social media shared post-event, and perhaps a quick recap on their blog.',
          'These steps are helpful. They also capture a fraction of what the event was worth.',
        ],
        callout: { type: 'insight', content: 'A single conference can generate 15-20 pieces of unique content when approached strategically — that\'s what the calendar in the Materials below yields. Most firms produce 2-3.' },
      },
      {
        heading: 'The Doctrine',
        paragraphs: [
          'An event is not a date in the calendar. It is three distinct marketing windows — before, during, and after — and most firms only show up for the middle one. Each window has its own audience: the people deciding whether to attend your session, the people generating the buzz you can ride, and the far larger audience that never attended at all.',
        ],
      },
      {
        heading: 'The Play — Run the Three Windows on a Timeline',
        numbered: [
          'T-minus-21 to T-minus-7 (before): publish the speaker interview, the agenda-highlight piece, and one insight article tying a market trend to your topic. Pre-event content is what turns attendance into appointments.',
          'T-0 (during): assign one person to capture — photos of your team, short takeaways from key panels, real-time posts while the conversation is loudest.',
          'T-plus-3 to T-plus-30 (after): the article series, the bundled event report for your mailing list, and direct follow-up interviews with the key contacts you met. The follow-up window is where relationships convert — and where most firms go silent.',
          'Repurpose your own presentation: a standalone article, a downloadable resource, a LinkedIn carousel. You already did the research; the content cost is sunk.',
        ],
        pullQuote: 'The full calendar is in the Materials below. Print it, assign it, and the next conference stops being an expense line and starts being a quarter of content.',
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'The logo announcement — "we\'re attending" tells nobody why they should care; lead with the topic and the takeaway.',
          'Shared ownership — when everyone owns the event coverage, nobody does; assign one name.',
          'The vanishing act — publishing during the event and disappearing after; the post-event window is the longest and least contested.',
          'Capturing nothing — a presentation nobody wrote down is content you paid for and threw away.',
        ],
        callout: { type: 'mistake', content: 'The most common waste: spending partner-hours on a 45-minute panel, then letting the entire output be three photos posted a week late.' },
      },
      {
        paragraphs: [
          'Events are an investment. Run them on a calendar and they compound: visibility, relationships, and a pipeline of material that outlives the venue by months.',
        ],
        pullQuote: 'A conference should not be a date in the calendar — it should be a platform for visibility, relationships, and business development.',
      },
      {
        heading: 'Materials — The Event Content Calendar — T-21 to T+30',
        paragraphs: [
          'T-21 days: Publish the speaker/panelist interview on your site and LinkedIn. Announce participation with the session topic, not just the logo.',
          'T-14: Publish the agenda-highlight piece — the three sessions your firm cares about and why.',
          'T-7: Insight article linking a market trend to your firm\'s presentation topic.',
          'T-0 (during): One team member owns capture — photos of your people, short takeaways from key panels, two real-time posts per day.',
          'T+3: Recap article with your firm\'s point of view on the headline themes.',
          'T+10: First article in the post-event series (one per presentation you gave or panel that mattered).',
          'T+20: Second series article; bundle both into a one-page event report for your client mailing list.',
          'T+30: Follow-up interviews with the two most valuable contacts met on site — published or private, either way the relationship continues.',
          '',
          'Owner rule: one named person is accountable for the whole calendar. Shared ownership is how events produce two photos and nothing else.',
        ],
      },
      {
        heading: 'Materials — The Post-Event Contact Interview — 5 Questions',
        paragraphs: [
          'Fifteen minutes, by phone. For general counsel and key contacts met at the event.',
          '',
          '1. What was the one session or idea at the event that changed how you\'ll work this quarter?',
          '2. What\'s the hardest issue on your desk right now that nobody at the event addressed?',
          '3. How does your team evaluate outside counsel on [the topic your firm presented]?',
          '4. If a firm sent you one short briefing a month on that issue, what would make it worth opening?',
          '5. Who else in your network is thinking about this?',
          '',
          'Then: ask permission to quote them (named or anonymized), and send the published piece before you share it publicly. The interview is the relationship; the article is the excuse.',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Social and Thought Leadership category scores at the next audit — and a concrete count: content pieces generated per event, which should move from 2–3 to 12+.',
        ],
      },
    ],
  },
  {
    id: 'google-search-console',
    number: 2,
    title: 'Google Search Console 101',
    subtitle: 'Data-driven content planning for law firms',
    hook: 'Your audience is already telling you what to write about',
    actionItems: [
      { text: 'Log into Google Search Console today and export your top 50 queries — circle every term with high impressions and low clicks', priority: 'quick-win' },
      { text: 'Run the monthly GSC review (Materials below) and commit the three best near-miss topics to the editorial calendar', priority: 'strategic' },
      { text: 'Make GSC review a fixed monthly routine owned by marketing, with near-miss movement reported to leadership quarterly', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'Writing client-relevant content doesn\'t have to be a guessing game. The data is already there. All you need to do is log in.',
          'Google Search Console (GSC) is a free tool full of actionable insight: what users typed before landing on your site, how often your pages appear, how many people actually click, and which pages carry your visibility.',
        ],
        stat: { value: '91%', label: 'of pages get no organic traffic from Google at all — the firms that plan from data are the other 9% (Ahrefs content study, 2020)' },
      },
      {
        heading: 'A Worked Example',
        paragraphs: [
          'Open a typical mid-size firm\'s Performance report and three patterns appear within minutes:',
        ],
        numbered: [
          '"remote work policy employer obligations" — 1,400 impressions, position 11, zero clicks. A near-miss: one focused, plain-English article answering that exact question has a realistic path to page one.',
          '"cross-border labor compliance CEE" — 60 impressions, position 3, strong click-through. Your language, low volume. Keep the page, but do not build the calendar around it.',
          '"[firm name] + careers" — hundreds of impressions. Reputation traffic, not content demand. Exclude it from topic planning.',
        ],
      },
      {
        paragraphs: [
          'Three rows, three decisions: invest, maintain, ignore. That is the entire discipline — repeated monthly.',
        ],
        callout: { type: 'pro-tip', content: 'Filter by \'Queries\' and sort by impressions descending. Terms with high impressions but low clicks are your biggest missed opportunities — the headline or snippet is failing, not the page.' },
      },
      {
        heading: 'From Insights to Editorial Calendar',
        paragraphs: [
          'Once a month, export your top 20–50 queries and look for patterns. Recurring themes emerge quickly — a spike in searches about remote work clauses, growing interest in ESG disclosures. These are ready-made topics that reflect what your audience is actively thinking about, validated before you write a word.',
        ],
        pullQuote: 'GSC is not an SEO professional\'s toy. It is a window into your target audience\'s intent — and it is free.',
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'Reading GSC quarterly or never — search behavior moves monthly; stale data produces stale topics.',
          'Chasing position-40 vanity terms — a near-miss at position 12 converts with one article; a vanity term at position 40 converts with a year.',
          'Writing for the firm\'s vocabulary instead of the client\'s — the query list is the client\'s vocabulary, verbatim.',
          'Ending the review with observations instead of commitments — three topics and one snippet rewrite, every month.',
        ],
      },
      {
        paragraphs: [
          'The firms that win search are not the ones with the biggest content budgets. They are the ones that let the audience set the agenda — and GSC is where the audience speaks.',
        ],
      },
      {
        heading: 'Materials — The Monthly GSC Review — 30 Minutes',
        paragraphs: [
          '1. Performance report → sort by Queries, impressions descending.',
          '2. Flag every query with high impressions and a click-through rate under 2% — your snippet is losing the click (rewrite the title tag and meta description first).',
          '3. Filter by Pages for your five most-visited pages; note the exact phrasing clients use ("remote work rules in Poland", not "cross-border labor compliance") — that language goes into your headlines.',
          '4. List every query ranking in positions 7–20 with meaningful impressions — the near-miss list.',
          '5. Pick the three near-misses closest to your practice focus; each gets one focused article answering the query in plain English.',
          '6. Log positions for last month\'s picks. Movement into the top 5 is the proof loop; no movement after 90 days means the article needs depth, not patience.',
          '',
          'Rule: decisions leave the room, not observations. Every review ends with three committed topics and one snippet rewrite.',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Search Authority category score at the next audit — and the count of near-miss queries (positions 7–20) your firm has published targeted articles for this quarter.',
        ],
      },
    ],
  },
  {
    id: 'summer-marketing',
    number: 3,
    title: 'The Summer Advantage',
    subtitle: 'Why smart firms never slow down',
    hook: 'While competitors pause, your content has the stage',
    actionItems: [
      { text: 'Publish two finished-but-unreleased articles in the next two weeks — the queue exists, use it', priority: 'quick-win' },
      { text: 'Map the September–December editorial calendar before August (Materials below)', priority: 'strategic' },
      { text: 'Make the summer sprint a standing annual program with a named owner, reviewed every June', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'Every summer, law firms go quiet. Content slows, newsletters pause, and the assumption sets in that July and August are dead months for marketing.',
          'That assumption is the opportunity. The audience does not disappear in summer — the competition does.',
        ],
        comparison: {
          before: { title: 'What Most Firms Do', items: [
            'Pause newsletters in July-August',
            'Delay campaigns until September',
            'Assume nobody\'s reading',
            'Let social media go quiet',
          ] },
          after: { title: 'What Smart Firms Do', items: [
            'Publish while competition is low',
            'Build September pipeline now',
            'Reconnect during downtime',
            'Dominate a quieter news feed',
          ] },
        },
      },
      {
        heading: 'The Doctrine',
        paragraphs: [
          'Decision-makers operate at a different pace in summer — fewer meetings, more reading, more headroom. Content published in a quiet feed earns attention that September content has to fight for. And the work done in July is the pipeline that exists in October: editorial calendars, refreshed profiles, reconnected contacts, booked speaking slots.',
        ],
        pullQuote: 'Everyone waits for September to ramp up again. The firms that win September never slowed down to begin with.',
      },
      {
        heading: 'The Play — An Eight-Week Sprint',
        paragraphs: [
          'The full schedule is in the Materials below. The shape: publish the backlog in weeks one and four, run the reconnect campaign in week three, build the autumn calendar in week five, and ship something public every single week. The sprint works because it is bounded — eight weeks, one owner, visible output.',
        ],
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'Treating the sprint as optional — a summer program that dies the first busy week was never a program; give it an owner and a weekly shipped artifact.',
          'Saving the best material for September — publish the strong pieces when the feed is empty; September has its own calendar.',
          'Reconnecting with a pitch — the summer note works because it asks for nothing; lead with something useful.',
          'Measuring likes instead of pipeline — the metric that matters is October conversations that trace back to July work.',
        ],
      },
      {
        paragraphs: [
          'Summer is the one season where consistency is a differentiator rather than table stakes. Use it once and you will not give it back.',
        ],
      },
      {
        heading: 'Materials — The Summer Sprint Calendar — 8 Weeks',
        paragraphs: [
          'Week 1: Publish the strongest unreleased article in the queue. Update the three highest-traffic pages on the site.',
          'Week 2: LinkedIn series begins — one lighter-format post per week per active partner (a single idea, a short case lesson, a contrarian take).',
          'Week 3: Reconnect week — ten direct notes to dormant clients and contacts. No pitch; a useful article and a question.',
          'Week 4: Publish article two. Refresh expert profile pages: new deals, new photos, current matters.',
          'Week 5: Draft the September–December editorial calendar from the GSC near-miss list (see Google Search Console 101).',
          'Week 6: Repurpose the year\'s best-performing piece into a second format — carousel, short guide, or checklist.',
          'Week 7: Publish article three. Book autumn event/speaking slots while competitors are away.',
          'Week 8: September launch review — calendar locked, first September piece drafted, pipeline notes from the reconnect week routed to partners.',
          '',
          'Constraint: every week ships something public. Momentum is the strategy.',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Social and Thought Leadership category scores at the autumn audit — plus September pipeline: conversations started in September that trace back to summer content.',
        ],
      },
    ],
  },
  {
    id: 'marketer-leadership-gap',
    number: 4,
    title: 'Bridging the Gap',
    subtitle: 'The disconnect between marketers and managing partners',
    hook: 'Why your best marketing hire might be underperforming',
    actionItems: [
      { text: 'Send this chapter to your managing partner with one question attached: what have we said no to lately, and was it for the right reason?', priority: 'quick-win' },
      { text: 'Institute the monthly alignment meeting (agenda in Materials below) and grant marketing editorial sign-off on routine content', priority: 'strategic' },
      { text: 'Establish the one-article-per-month-per-partner commitment as a standing firm expectation, reviewed quarterly', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'Law firms across CEE are investing more in marketing than ever before. Yet inside many firms, marketers still operate without the authority, tools, or backing the role requires.',
          'This is rarely incompetence or malice. It is a misalignment of priorities — and it is expensive.',
        ],
        callout: { type: 'insight', content: 'The gap between marketers and partners isn\'t about skill — it\'s about empowerment. Firms that bridge it publish several times more content with the same team.' },
      },
      {
        heading: 'The Doctrine — Three Fault Lines',
        numbered: [
          'Marketers want manageable websites; partners want standout designs. A site the marketing team cannot update without an agency ticket trades control for aesthetics — and the trade compounds every week a change waits.',
          'Marketers want content; partners don\'t see it as essential. Content is how a firm demonstrates expertise before the first call. If each legal professional committed to one article per month, marketing would have a pipeline of around fifteen pieces to publish, share, and repurpose.',
          'Marketers want responsiveness; partners want perfection. A solid campaign launched this week beats a flawless one launched next quarter. Every round of internal edits has a price measured in missed moments.',
        ],
        pullQuote: 'A brand that moves slowly loses visibility. Progress beats perfection.',
      },
      {
        heading: 'The Play',
        paragraphs: [
          'Close the gap structurally, not rhetorically: a monthly alignment meeting with a fixed agenda (Materials below), editorial sign-off delegated to marketing for routine content, and a standing per-partner content commitment. None of this requires new budget. All of it requires leadership to decide what it will stop holding.',
        ],
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'Alignment as a slogan — without a standing meeting and dated commitments, \'we support marketing\' dissolves by Thursday.',
          'The perfection veto — partners reviewing routine posts rewrite them into their own voice and teach marketing to stop trying.',
          'Delegation without authority — giving marketing responsibility for output while withholding sign-off power guarantees the bottleneck persists.',
          'Hiring experience, assigning errands — a senior marketer given a task list will leave; the firm will conclude \'marketing doesn\'t work here.\'',
        ],
        callout: { type: 'mistake', content: 'If you\'re on the leadership team, the diagnostic is one question: what have you said no to lately — and was it for the right reason?' },
      },
      {
        paragraphs: [
          'Marketers and managing partners want the same thing: a strong reputation, a visible brand, a growing firm. The firms that get there are the ones where the people hired to make it happen are given the tools, the backing, and the freedom to do the job.',
        ],
      },
      {
        heading: 'Materials — The Monthly Alignment Meeting — 45 Minutes',
        paragraphs: [
          'Standing agenda, marketing lead + managing partner (or the partner sponsor):',
          '',
          '1. Scoreboard (10 min) — pieces published, pipeline conversations touched, one metric that moved and one that did not. No vanity metrics.',
          '2. The ask (10 min) — the one thing marketing needs from leadership this month: a partner byline, a decision, a budget line. One ask, not a list.',
          '3. The blockers (10 min) — what is stuck in review, what is waiting on a partner, what is about to miss its window.',
          '4. Delegation check (10 min) — what routine decision is leadership still holding that marketing could own? Move one per month.',
          '5. Commitments (5 min) — each side leaves with a dated deliverable.',
          '',
          'Rules: decisions are made in the room or explicitly delegated. Nothing carries twice. The meeting exists to remove friction, not to perform alignment.',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Content output per month (target: a steady 8–15 pieces) and Thought Leadership category score at the next audit — output volume is the visible symptom of the alignment gap closing.',
        ],
      },
    ],
  },
  {
    id: 'thought-leadership',
    number: 5,
    title: 'Thought Leadership Done Right',
    subtitle: 'Showcase the experts behind the content',
    hook: 'Turn your lawyers into recognized industry voices',
    actionItems: [
      { text: 'Audit your five most recent articles against the byline standard (Materials below) — fix missing photos, profiles, and CTAs this week', priority: 'quick-win' },
      { text: 'Ship \'More by [Author]\' modules and the standard article footer across the insights section', priority: 'strategic' },
      { text: 'Build a standing recognition file per expert — rankings, deals, media, talks — reviewed and refreshed quarterly', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'Most law firms have a thought leadership section on their website. Too often, it showcases content while hiding the people who wrote it — and people, not pages, are what clients hire.',
        ],
      },
      {
        heading: 'The Doctrine — Six Rules',
        numbered: [
          'Always include clear bylines. Full name and professional photo on every article. Readers remember experts, not institutions.',
          'Link to author profiles. A reader who finishes a useful article wants the author next. No link means that momentum dies at the footer.',
          'Recommend more by the same author. Recognition is built by a body of work, not a single piece — \'More by [Author]\' turns one article into a portfolio.',
          'Give every piece a next step. Contact the author, download the guide, subscribe, book a call. An insight that ends nowhere converts no one.',
          'Offer social proof. Awards, rankings, notable deals, media mentions, speaking engagements — evidence the expert is recognized beyond your own website.',
          'Be consistent. Authority is the product of steady visibility over quarters, not one strong article.',
        ],
        pullQuote: 'Over time, steady visibility creates a reputation that no generic, faceless blog ever will.',
      },
      {
        heading: 'The Play',
        paragraphs: [
          'Adopt the Byline Standard (Materials below) as a publishing gate: nothing ships without byline, profile link, related-work module, and a next step. Then build the recognition file — a maintained document per expert that makes social proof a habit rather than a scramble before every directory submission.',
        ],
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'The institutional byline — \'Marketing Team\' or no byline at all tells the reader the firm doesn\'t stand behind its own experts.',
          'The dead-end article — strong content with no next step is a conversation the firm started and then walked out of.',
          'The stale profile — a profile last updated three years ago quietly contradicts every claim of currency the articles make.',
          'Campaign thinking — three articles in one month, then silence; authority compounds on cadence, not bursts.',
        ],
      },
      {
        paragraphs: [
          'Thought leadership is not a section of the website. It is the public record of your people\'s expertise — treat every article as evidence in that record.',
        ],
      },
      {
        heading: 'Materials — The Byline Standard — Every Article, Every Time',
        paragraphs: [
          'Before any article publishes, confirm:',
          '[ ] Full author name and current title in the byline',
          '[ ] Professional photo — recent, consistent in style with the rest of the firm',
          '[ ] Byline links to the author\'s profile page',
          '[ ] Profile page lists representative deals/matters and the clients\' industries (with permission)',
          '[ ] "More by [Author]" module at the foot of the article',
          '[ ] One clear next step: contact the author, download the related guide, subscribe, or book an introductory call',
          '[ ] Author\'s recognition visible somewhere on the profile: rankings, notable matters, media mentions, speaking',
          '',
          'If a box can\'t be checked, the article waits. A faceless article builds the website\'s authority; a bylined one builds the firm\'s.',
        ],
      },
      {
        heading: 'Materials — The Standard Article Footer',
        paragraphs: [
          '[Author photo + name + title, linked to profile]',
          '[Author] leads the firm\'s [practice] work and advises [types of clients] on [types of matters].',
          '',
          'More by [Author]:',
          '• [Related article 1 — linked]',
          '• [Related article 2 — linked]',
          '',
          'Next step: If [the issue in this article] is on your desk this quarter, [Author] is reachable at [email] — or subscribe to our [topic] briefing for monthly updates.',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Thought Leadership category score at the next audit — and the share of published articles carrying a named byline, linked profile, and next-step call to action (target: 100%).',
        ],
      },
    ],
  },
  {
    id: 'writing-that-resonates',
    number: 6,
    title: 'Writing That Resonates',
    subtitle: 'Clarity signals mastery',
    hook: 'Why the best legal writers sound nothing like lawyers',
    actionItems: [
      { text: 'Run your three most recent articles through a readability checker and rewrite the headlines to lead with the client\'s stake', priority: 'quick-win' },
      { text: 'Adopt the eight house style rules (Materials below) as the editing checklist for everything the firm publishes', priority: 'strategic' },
      { text: 'Institute a pre-publish readability gate: no article ships below Flesch 50 without a partner\'s explicit sign-off', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'Some articles stand out — more engaging, easier to follow, more likely to make a reader remember the firm behind them. What sets them apart isn\'t legal knowledge. It\'s how that knowledge is framed.',
          'This isn\'t storytelling in the literary sense. It\'s context, clarity, and relevance — disciplines as learnable as citation format.',
        ],
        comparison: {
          before: { title: 'Typical Legal Writing', items: [
            'Dense paragraphs of legalese',
            'No context for why it matters',
            'Written for lawyers, not clients',
            'Generic conclusions',
          ] },
          after: { title: 'Writing That Resonates', items: [
            'Clear, scannable structure',
            'Leads with \'why it matters to you\'',
            'Written in the client\'s language',
            'Actionable takeaways',
          ] },
        },
      },
      {
        heading: 'An Annotated Rewrite',
        paragraphs: [
          'Before: "Pursuant to the recent amendments to the applicable regulatory framework, undertakings operating within the affected sectors are advised to undertake a comprehensive review of their contractual arrangements in order to ensure ongoing compliance."',
          'After: "The rules changed. If your contracts predate March, review them now — the amended framework applies to every sector agreement signed or renewed this year."',
          'What changed: the actor is named ("your contracts"), the stakes lead ("the rules changed"), one sentence does one job, and the reader leaves with an action instead of an admonition. Nothing about the law was simplified — only the sentence was.',
        ],
        pullQuote: 'True expertise isn\'t the ability to construct a paragraph-long sentence. It\'s making complicated concepts easy to understand.',
      },
      {
        heading: 'Deep dive: The Flesch-Kincaid Readability Test',
        paragraphs: [
          'The Flesch-Kincaid test measures how easy a text is to understand. Most successful business content scores 60-70 (easily understood by a 13-15 year old). In our reviews of firm websites, the average law firm article scores below 30. You don\'t need to dumb anything down — running drafts through a readability checker simply reveals where convoluted sentence structures are hiding clear ideas.',
        ],
      },
      {
        heading: 'The Play',
        paragraphs: [
          'Codify the eight house rules (Materials below), attach the readability gate to the publishing checklist, and measure drafts — not intentions. Within a quarter, clarity stops being a talent some lawyers have and becomes the house standard.',
        ],
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'Complexity as armor — the belief that difficult writing signals deep knowledge; readers read it as a lack of respect for their time.',
          'The disclaimer lede — opening with what the article isn\'t; the reader came for what it is.',
          'Written for peer review — if the imagined reader is another lawyer, the actual reader (a GC, a founder) is gone by paragraph two.',
          'Editing by committee — six partners adding caveats until the point dissolves; one editor owns the final voice.',
        ],
      },
      {
        paragraphs: [
          'In a saturated content landscape, clarity is an edge. That\'s not just good writing — it\'s good marketing.',
        ],
      },
      {
        heading: 'Materials — The House Style — Eight Rules',
        paragraphs: [
          '1. Lead with why it matters to the reader — the stakes come before the statute.',
          '2. One idea per sentence. If a sentence needs a map, split it.',
          '3. Write in the client\'s vocabulary, not the profession\'s ("selling your company", not "divestiture processes").',
          '4. Every section ends with something the reader can do, decide, or watch for.',
          '5. Short paragraphs — three lines is a paragraph, six is a wall.',
          '6. Name the actor. "The court ruled" not "it was ruled."',
          '7. Concrete beats comprehensive: one worked example outweighs three caveats.',
          '8. Read it aloud. Anywhere you run out of breath, the reader runs out of patience.',
          '',
          'Gate: every published draft scores Flesch Reading Ease 50+ (most business writing lands at 60–70; in our reviews of firm websites, the average article scores below 30).',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Thought Leadership category score at the next audit — and average draft readability: every published article at Flesch Reading Ease 50+ (measure drafts, not intentions).',
        ],
      },
    ],
  },
  {
    id: 'website-checklist',
    number: 7,
    title: 'The Website Checklist',
    subtitle: '16 essentials every law firm website needs',
    hook: 'The definitive 16-point inspection for your firm\'s site',
    actionItems: [
      { text: 'Score your site against the 16-point scorecard (Materials below) today — every zero becomes a named fix with an owner', priority: 'quick-win' },
      { text: 'Fix the three highest-impact gaps first: positioning, mobile experience, and conversion points', priority: 'strategic' },
      { text: 'Put the checklist on a quarterly audit cadence so standards don\'t decay as the site evolves', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'When a potential client lands on your firm\'s website, do they instantly know what your firm does, what makes it different, and why they should trust your legal experts? Many firms, chasing the most impressive possible site, get distracted from the real purpose: building trust, fast.',
        ],
        stat: { value: '75%', label: 'of users judge a company\'s credibility from its website design (Stanford Web Credibility Research)' },
      },
      {
        heading: 'The Doctrine',
        paragraphs: [
          'A law firm website is not a portfolio piece; it is a trust machine with sixteen moving parts. The sixteen essentials — positioning, voice, thought leadership, navigation, expert profiles, practice areas, conversion points, social proof, mobile experience, speed, local search, accessibility, privacy, analytics and consent, security, and polish — fail independently and compound positively. Each one is cheap to fix and expensive to lack.',
        ],
        pullQuote: 'Mobile devices now account for the majority of website traffic — a site designed desktop-first is designed for the minority of your visitors. (Statista, 2025)',
      },
      {
        heading: 'The Play — Inspect, Don\'t Admire',
        paragraphs: [
          'Run the scorecard in the Materials below quarterly, in one sitting, with someone who didn\'t build the site. Score honestly — the point of the inspection is the zeros. Fix in the order that costs you trust fastest: positioning first (what you say), mobile and speed second (how it feels), conversion points third (what visitors can do next).',
        ],
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'Scoring with the agency in the room — the builder grades generously; inspect independently.',
          'Half-point thinking — \'the form mostly works\' is a zero that loses inquiries every week.',
          'The launch-day mindset — every item on the list decays; quarterly re-inspection is the whole system.',
          'Chasing redesigns instead of zeros — a beautiful site with broken conversion points is an expensive brochure.',
        ],
      },
      {
        paragraphs: [
          'Sixteen points, one quarterly hour, zero excuses. The firms with trustworthy websites aren\'t the ones with the biggest budgets — they\'re the ones still checking.',
        ],
      },
      {
        heading: 'Materials — The 16-Point Website Scorecard',
        paragraphs: [
          'Score each item 1 (in place and current) or 0 (missing, stale, or untested). No half points — a broken conversion form is a zero.',
          '',
          '1. Positioning — a first-time visitor can say why this firm over another within 10 seconds',
          '2. Distinct voice — clear, direct language; not interchangeable with a competitor',
          '3. Thought leadership section — publishing on a visible cadence',
          '4. Navigation — simple menu; any page reachable in two clicks',
          '5. Expert profiles — deals, client types, and current matters per lawyer',
          '6. Practice area pages — front and center, one page per practice',
          '7. Conversion points — at least one low-commitment step (newsletter, guide, call)',
          '8. Social proof — named testimonials, deals, cases',
          '9. Mobile experience — designed for phones, not merely shrunk',
          '10. Load speed — key pages load fast on a phone connection',
          '11. Local search — consistent name/address/phone across directories',
          '12. Accessibility — readable fonts, contrast, alt text, keyboard navigation',
          '13. Privacy policy and disclaimers — present and current',
          '14. Analytics and consent — tracking with proper cookie consent (GDPR)',
          '15. Security and backups — HTTPS, updates, tested restore',
          '16. Visual polish — consistent typography and spacing; no clutter',
          '',
          '14–16: strong — keep the cadence. 10–13: credible but leaking trust. Below 10: the site is actively costing you work; fix zeros in the order listed.',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Website Experience and Search Authority category scores at the next audit — plus your checklist score out of 16, re-run quarterly until it holds at 15+.',
        ],
      },
    ],
  },
  {
    id: 'practice-area-pages',
    number: 8,
    title: 'Revitalizing Practice Area Pages',
    subtitle: 'Turn boring pages into your site\'s most persuasive asset',
    hook: 'Your most visited pages are probably your weakest',
    actionItems: [
      { text: 'Rewrite your single highest-traffic practice page using the client-first skeleton (Materials below) — one page proves the model', priority: 'quick-win' },
      { text: 'Roll the skeleton across every practice area page, adding case examples and outcomes to each', priority: 'strategic' },
      { text: 'Set a quarterly freshness routine: every practice page gets a recent matter, article, or regulatory update each quarter', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'If there\'s one corner of a law firm website guaranteed to underperform, it\'s the practice area pages. In most cases, visitors get a couple of generic paragraphs followed by a laundry list of services.',
          'These pages segment your audience by intent — that is marketing gold. A visitor on your employment law page has an employment problem. Why greet that moment with boilerplate?',
        ],
        callout: { type: 'mistake', content: '"Our firm is a recognized leader in corporate law" tells the client nothing about how you solve their problem. Lead with their situation instead.' },
      },
      {
        heading: 'An Annotated Rewrite',
        paragraphs: [
          'Before: "Our Corporate Practice provides comprehensive legal services across the full spectrum of corporate matters, leveraging deep expertise and a client-focused approach."',
          'After: "Selling a division? Buying a competitor? The structure you choose in week one determines the tax, liability, and timeline you live with in year three. We structure the deal before the term sheet hardens."',
          'What changed: the reader\'s situation replaced the firm\'s self-description, an outcome replaced a service list, and a concrete claim ("before the term sheet hardens") replaced an unverifiable one ("deep expertise").',
        ],
      },
      {
        heading: 'The Play',
        paragraphs: [
          'Rebuild one page on the client-first skeleton (Materials below): lead with the client\'s challenge, focus on outcomes, show proof through recent matters, name the experts, keep it fresh, and end with a low-commitment next step. Prove the bounce rate moves on one page, then roll the pattern across the practice.',
        ],
        pullQuote: 'Stop letting your practice area pages put clients to sleep. Shift the focus to their problems, show real results, and make the content worth reading.',
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'The laundry list — twenty bullet services tell the client you do everything and specialize in nothing.',
          'The invisible expert — a headshot and a title convey nothing; one line on what the person has actually done conveys everything.',
          'The static page — a practice page untouched since launch quietly claims the firm hasn\'t done anything lately.',
          'Firm-first ordering — accolades before the client\'s problem reads as insecurity, not strength.',
        ],
      },
      {
        paragraphs: [
          'Practice pages are where intent meets your website. They should read like the beginning of the engagement, not the back of a brochure.',
        ],
      },
      {
        heading: 'Materials — The Client-First Practice Page Skeleton',
        paragraphs: [
          '[H1: The client\'s situation, in their words]',
          '"Facing pressure from investors on ESG disclosures?" — not "Corporate Law."',
          '',
          '[Opening: 2–3 sentences naming the challenge and its cost of inaction]',
          '',
          '[How it resolves: the outcome, not the service list]',
          '"You close the round with disclosures investors sign off on."',
          '',
          '[Proof: 2–3 recent matters with outcomes — anonymized where required]',
          '"Advised a regional manufacturer through its first CSRD cycle — zero qualified findings."',
          '',
          '[The people: named experts with one line each on what they\'ve actually done]',
          '',
          '[Keep it current: latest article or regulatory development in this area]',
          '',
          '[Next step: one clear, low-commitment action]',
          '"A 30-minute scoping call — what the new rules mean for your next filing."',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Search Authority and Recognition category scores at the next audit — plus bounce rate and time-on-page for the top three practice pages, which should move measurably within a quarter of the rewrite.',
        ],
      },
    ],
  },
  {
    id: 'website-ownership',
    number: 9,
    title: 'Own Your Website',
    subtitle: 'Why in-house management is a strategic imperative',
    hook: 'Stop outsourcing your most important digital asset',
    actionItems: [
      { text: 'Run the agency dependency audit (Materials below): list every change you cannot make without your vendor, and what each costs in days', priority: 'quick-win' },
      { text: 'Train the marketing team to CMS independence for the ten most common updates (news, profiles, articles, practice pages)', priority: 'strategic' },
      { text: 'If you\'re on a proprietary platform, plan the migration to a widely-supported CMS with full export — before the next invoice cycle, not during a crisis', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'Many law firms treat their website as a project to hand to an external agency. Outsourcing all website management is a strategic — and usually financial — mistake.',
        ],
      },
      {
        heading: 'The Doctrine — Four Reasons',
        numbered: [
          'Your website is an extension of your firm. The strongest firm sites reflect the firm\'s identity authentically; a site managed entirely by a third party drifts out of sync with reality within months.',
          'Agility matters. New deals, regulatory updates, and industry events arrive weekly. Someone in-house can respond the same day; a vendor queue responds the same week — if you\'re lucky.',
          'Control costs. With modest training, your marketers implement changes in minutes. What an agency bills as a week of work is often twenty minutes in a CMS.',
          'Avoid vendor lock-in. Proprietary platforms make leaving painful by design. A widely-supported CMS keeps your website a business asset you own rather than a service you rent.',
        ],
        pullQuote: 'Your website should be an asset you control — not a service you rent at someone else\'s pace.',
      },
      {
        heading: 'The Play',
        paragraphs: [
          'Start with the dependency audit (Materials below) — it converts a vague discomfort into a priced list. Then close the top gaps with training, and let the agency relationship shrink to what agencies are actually for: design systems, complex builds, and specialist work. If the audit reveals a proprietary platform, the CMS scorecard is how you evaluate the way out.',
        ],
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'The big-agency look — a glossy build your team can\'t update trades control for aesthetics, and the bill repeats monthly.',
          'Overpaying for permanence — you are not building the next Facebook; a clean, well-structured site goes live in weeks.',
          'Accepting jargon — any agency that can\'t show you how you\'ll make changes yourself is describing the lock-in, politely.',
          'Migrating in a crisis — platform exits forced by a vendor failure cost triple; plan them in calm quarters.',
        ],
      },
      {
        paragraphs: [
          'A good website is a tool for connecting with clients. Own the tool.',
        ],
      },
      {
        heading: 'Materials — The Agency Dependency Audit',
        paragraphs: [
          'For each item, note whether you can do it in-house today — and if not, the vendor\'s typical turnaround and cost:',
          '[ ] Publish a new article or insight',
          '[ ] Update a lawyer\'s profile (photo, deals, bio)',
          '[ ] Change homepage copy or imagery',
          '[ ] Add or edit a practice area page',
          '[ ] Fix a broken link or form',
          '[ ] Read your own analytics and export the data',
          '[ ] Export your full site content (text, images, structure) in a portable format',
          '[ ] Add a landing page for a campaign',
          '[ ] Update the footer (year, offices, regulatory details)',
          '[ ] Restore the site from a backup you control',
          '',
          'Scoring: 8–10 in-house = healthy. 4–7 = dependent; fix the top three gaps this quarter. 0–3 = dependent to the point of risk; the migration conversation starts now.',
        ],
      },
      {
        heading: 'Materials — The CMS Selection Scorecard',
        paragraphs: [
          'Score any candidate platform 0–2 per line (0 = no, 1 = with effort, 2 = out of the box). Walk away below 12/16.',
          '',
          '1. A non-developer can publish and edit content',
          '2. Full content export in standard formats — no lock-in',
          '3. Large third-party support market (you can hire help anywhere)',
          '4. You own hosting and domain outright',
          '5. Security updates are routine and documented',
          '6. Forms, landing pages, and analytics without vendor tickets',
          '7. Multilingual support (CEE reality)',
          '8. Transparent pricing — no per-change fees',
          '',
          'The tell during any agency pitch: ask them to show you, live, how you would make the ten most common updates yourself. The answer is the relationship.',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Website Experience category score at the next audit — plus update latency: the time from \'this change is approved\' to \'it\'s live,\' which should fall from days to minutes.',
        ],
      },
    ],
  },
  {
    id: 'messaging-positioning',
    number: 10,
    title: 'Messaging & Positioning',
    subtitle: 'Skip the buzzwords. Say something real.',
    hook: 'Stand out in a sea of \'trusted advisors\'',
    actionItems: [
      { text: 'Run the interchangeability test: paste a competitor\'s name into your homepage headline — if it still works, start the positioning statement (Materials below) this week', priority: 'quick-win' },
      { text: 'Rewrite the homepage headline and practice-page ledes from the finished positioning statement', priority: 'strategic' },
      { text: 'Adopt the banned-phrases list (Materials below) into the house style guide and enforce it at the editing gate', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          '"Leading law firm." "Trusted advisors." "Your reliable partner." "First-class services." Add a corporate stock photo of a handshake and the set is complete.',
          'When did the profession agree to say exactly the same thing?',
        ],
        pullQuote: 'Saying you\'re premier on repeat doesn\'t convince a single prospect that you are.',
        callout: { type: 'mistake', content: 'If you replaced your firm\'s name with a competitor\'s on your homepage and the messaging still works — your positioning needs work.' },
      },
      {
        heading: 'The Doctrine',
        paragraphs: [
          'Firms study their competitors and unconsciously fit the mold, producing a sea of sameness with no personality behind the brand. The mold feels safe. It is the most expensive choice available: interchangeable messaging forces every pitch to compete on price and proximity, because nothing else distinguishes you.',
        ],
      },
      {
        heading: 'Boutique vs. Large Firms',
        paragraphs: [
          'Large firms can survive generic messages — they have the name, the history, the headcount. Smaller firms don\'t have that luxury, and they don\'t need it.',
          'What boutique firms have is deep focus, tailored solutions, direct access to senior experts, and speed. Those are the foundations to compete on — and unlike \'excellence,\' each one is checkable by the client within a single engagement.',
        ],
      },
      {
        heading: 'Firms That Stand Out',
        bullets: [
          '"We are problem solvers" — Isikal Law Office',
          '"From legal complexity to business clarity" — AMB Legal Group',
          '"Tell us your target" — Pekin & Pekin',
        ],
        pullQuote: 'The firms that stand out aren\'t necessarily the biggest. They\'re the ones that know who they are, what they\'re good at, and who they\'re here to help.',
      },
      {
        heading: 'The Play',
        paragraphs: [
          'Write the five-line positioning statement (Materials below) in one partner meeting, sharpen line three until it fails under a competitor\'s name, then propagate it: homepage headline, practice-page ledes, pitch decks, proposal covers. Positioning that lives in a workshop document and not on the website is a conversation, not a decision.',
        ],
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'Positioning by committee — every partner adds a constituency until the statement describes everyone and no one.',
          'The unverifiable superlative — \'premier,\' \'leading,\' and \'trusted\' are claims; a client can only verify proof.',
          'Messaging that stops at the homepage — the pitch deck, the proposals, and the email signatures are where positioning actually gets read.',
          'Rewriting annually, deploying never — a positioning statement that doesn\'t change the website within a month was an offsite exercise.',
        ],
      },
      {
        heading: 'Materials — The Positioning Statement — Five Lines',
        paragraphs: [
          'Fill in every line. If a line could describe a competitor, it isn\'t finished.',
          '',
          '1. We exist for: [the specific client — industry, size, situation. "Mid-market manufacturers facing their first cross-border dispute," not "businesses"]',
          '2. Who come to us when: [the triggering moment — the event that makes them call]',
          '3. We are the firm that: [the one thing you do differently — approach, model, or focus]',
          '4. Which means: [the outcome the client gets, in their terms]',
          '5. And we can prove it by: [deals, data, named results]',
          '',
          'Test: read line 3 aloud with a competitor\'s name. If it still sounds true, sharpen it until it doesn\'t.',
        ],
      },
      {
        heading: 'Materials — The Banned-Phrases Starter List',
        paragraphs: [
          'Banned on sight — each claims everything and communicates nothing:',
          '[ ] "Leading law firm"',
          '[ ] "Trusted advisor(s)"',
          '[ ] "Your reliable partner"',
          '[ ] "First-class / world-class services"',
          '[ ] "Full-service"',
          '[ ] "Tailored solutions" (unqualified — tailored to what?)',
          '[ ] "Client-focused approach"',
          '[ ] "Excellence" as a standalone claim',
          '[ ] Stock handshake / skyline photography',
          '',
          'Replacement rule: every banned phrase must be swapped for something verifiable — a number, a named matter type, a deadline you keep, a client situation you recognize. "Responsive" becomes "calls returned within four working hours."',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Recognition category score at the next audit — plus the interchangeability test: your homepage headline should fail word-for-word the moment a competitor\'s name replaces yours.',
        ],
      },
    ],
  },
  {
    id: 'marketing-as-strategy',
    number: 11,
    title: 'Marketing as a Strategic Function',
    subtitle: 'Give marketers a seat at the table',
    hook: 'Marketing isn\'t a cost center — it\'s your growth engine',
    actionItems: [
      { text: 'Invite your marketing lead to the next partners\' meeting with one agenda item: the growth plan for next quarter', priority: 'quick-win' },
      { text: 'Adopt the three-KPI scoreboard (Materials below) and review it at every quarterly partners\' meeting', priority: 'strategic' },
      { text: 'Build the annual one-page marketing strategy (Materials below) aligned to the firm\'s growth objectives — reviewed, not shelved', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'Marketing isn\'t an afterthought. It\'s a strategic function. Yet many law firms still sideline the very people they brought in to help them grow.',
          'Today\'s clients do their own homework — Googling your firm, checking individual lawyers, reading your articles, comparing you to competitors. All before the first call.',
        ],
        stat: { value: '70%', label: 'of the B2B buying journey is completed before a prospect ever contacts the firm (Forrester buyer research)' },
      },
      {
        heading: 'The Doctrine — What Real Marketers Deliver',
        paragraphs: [
          'None of that is a task list. All of it is strategy — and strategy requires a seat where strategy is decided.',
        ],
        bullets: [
          'Crystallize your firm\'s positioning and tone of voice — no more generic buzzwords',
          'Align branding across all channels for consistent trust-building',
          'Unify metrics and analytics — measure what drives new business, not likes',
          'Evaluate and amplify thought leadership — make content more engaging and more visible',
        ],
      },
      {
        heading: 'Consistency Is Everything',
        paragraphs: [
          'One-off LinkedIn posts or occasional event participation won\'t build reputation. Marketing compounds on consistency: content calendars, dedicated resources, performance data, and long-term relationships with industry partners.',
        ],
        pullQuote: 'Good marketing gets visibility. Great marketing gets the right visibility.',
      },
      {
        heading: 'The Play',
        paragraphs: [
          'Put the marketing lead in the partners\' meeting with a one-page strategy (Materials below) and a three-KPI scoreboard that ties spend to pipeline. The page forces choices — one objective, two or three channels, named owners — and the scoreboard makes the function accountable in the same language the firm uses for everything else it values.',
        ],
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'Strategy as ceremony — an annual offsite deck that no one opens until the next offsite.',
          'Vanity dashboards — impressions and likes reported to partners teach leadership that marketing is decoration.',
          'The task-list hire — an experienced marketer handed errands will leave; the firm will conclude marketing doesn\'t work.',
          'Funding tactics, not objectives — a webinar here, a sponsorship there; without the one-page strategy, every yes is random.',
        ],
      },
      {
        paragraphs: [
          'If you\'ve hired a marketer with real experience, don\'t just hand them a list. Give them a seat at the table — and let them challenge the assumptions the firm stopped questioning.',
        ],
      },
      {
        heading: 'Materials — The One-Page Marketing Strategy',
        paragraphs: [
          'Fits on one page. Reviewed quarterly, rewritten annually.',
          '',
          'OBJECTIVE: The business goal marketing serves this year (e.g., "three new retained clients in [practice]"). One objective, not five.',
          'AUDIENCE: The specific buyer (role, industry, situation) — from the positioning statement.',
          'POSITION: The line-three differentiator from the positioning statement.',
          'CHANNELS: The 2–3 channels that reach the audience (e.g., LinkedIn + one flagship newsletter + two industry events). Every channel has an owner and a cadence.',
          'PROOF ASSETS: What we\'ll publish to demonstrate expertise (12 articles, 2 guides, quarterly GC briefing).',
          'MEASUREMENT: The three KPIs below, with current baseline and 12-month target.',
          'BUDGET & PEOPLE: Money, hours, and the name accountable.',
          '',
          'If a tactic can\'t be traced to the objective, it doesn\'t get funded.',
        ],
      },
      {
        heading: 'Materials — The Three-KPI Scoreboard',
        paragraphs: [
          'Track monthly; review with partners quarterly. Each KPI ties to business development — no vanity metrics.',
          '',
          '[ ] 1. Marketing-influenced pipeline — new conversations where the prospect had read, seen, or attended something before the first call (ask at intake; log it)',
          '[ ] 2. Content-influenced inquiries — inbound inquiries citing an article, guide, or briefing',
          '[ ] 3. Cost per qualified inquiry — total marketing spend ÷ qualified inquiries (a qualified inquiry fits the positioning statement\'s audience)',
          '',
          'Baseline first, targets second: three months of honest baselining beats a year of aspirational targets. A KPI that can\'t be measured this month is a wish — simplify it until it can.',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'The existence and use of the three KPIs: marketing-influenced pipeline conversations, content-influenced inquiries, and cost per qualified inquiry — reviewed at partners\' meetings quarterly.',
        ],
      },
    ],
  },
  {
    id: 'building-credibility',
    number: 12,
    title: 'Building Credibility',
    subtitle: 'Three pillars for smaller firms',
    hook: 'Build trust from zero with three proven pillars',
    actionItems: [
      { text: 'Write your firm\'s origin story in plain, human language — one page, no corporate register', priority: 'quick-win' },
      { text: 'Run the credibility audit (Materials below) and fix the cheapest zero first', priority: 'strategic' },
      { text: 'Launch a monthly insight series in your niche and protect the cadence for four consecutive quarters', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'In the legal industry, trust and credibility are foundational. Smaller firms without name recognition have to build both from the ground up.',
          'The hard part is having real expertise. Once the firm has that, projecting credibility is a craft — three pillars, maintained on a cadence.',
        ],
      },
      {
        heading: '1. Authentic Messaging',
        paragraphs: [
          'Projecting credibility isn\'t about sounding grandiose. Focus on what genuinely sets the firm apart — who you serve, what problems you solve, your specific strengths.',
          'Develop a voice for the brand. Professional doesn\'t mean impersonal; the target is the balance between polished and genuine — and it starts with the origin story, told like it happened, not like it was approved.',
        ],
      },
      {
        heading: '2. A Website That Doesn\'t Argue Against You',
        paragraphs: [
          'Your website is often the first touchpoint. Polish here means mobile responsiveness, accessibility, fast loading, easy navigation, clean structure.',
          'A website won\'t win clients by itself. But broken links, clunky layout, and dated profiles create barriers that your expertise then has to climb over.',
        ],
      },
      {
        heading: '3. Thought Leadership in a Niche',
        paragraphs: [
          'Thought leadership isn\'t about being the loudest. It\'s consistently sharing valuable insight in a niche narrow enough to own — until a GC describes the topic by your firm\'s name.',
        ],
        pullQuote: 'Credibility can\'t be conjured out of thin air. It\'s built brick by brick — in how your firm shows up, communicates, and differentiates itself.',
      },
      {
        heading: 'The Play',
        paragraphs: [
          'Run the nine-check audit (Materials below), fix the empty pillar first — messaging is free and fast, the website is cheap and measurable, thought leadership is slow and compounding. Sequence them in that order and the credibility account starts accruing this month.',
        ],
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'Borrowed grandeur — writing like a global firm when you\'re a twelve-person boutique reads as costume, not confidence.',
          'The one-quarter cadence — an insight series that dies after three issues is worse than none; it proves the firm starts things it doesn\'t finish.',
          'Polish without proof — a beautiful site with no named matters or recent writing is a wrapper with nothing inside.',
          'Spreading across niches — credible in five areas is credible in none; own one, expand from strength.',
        ],
      },
      {
        heading: 'Materials — The Credibility Audit — 9 Checks Across 3 Pillars',
        paragraphs: [
          'Score each 1 (in place) or 0 (missing/stale). Group by pillar.',
          '',
          'AUTHENTIC MESSAGING',
          '[ ] The homepage names who you serve and what changes for them',
          '[ ] The origin story exists on the site, written like a human',
          '[ ] No headline survives a competitor\'s name pasted over it',
          '',
          'THE WEBSITE',
          '[ ] Loads fast on a phone connection',
          '[ ] No broken links, empty sections, or dead social icons',
          '[ ] Profiles show real matters and current photos',
          '',
          'THOUGHT LEADERSHIP',
          '[ ] A named-author article published within the last 30 days',
          '[ ] The niche is narrow enough that a GC would say "that\'s their topic"',
          '[ ] Every article ends in a next step',
          '',
          '7–9: credible — protect the cadence. 4–6: credible in places; fix the empty pillar first. 0–3: every claim you make is unsubstantiated; start with messaging, it\'s free.',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Recognition category score at the next audit — plus the credibility audit score (Materials below), re-run after each quarter of pillar work.',
        ],
      },
    ],
  },
  {
    id: 'what-gcs-want',
    number: 13,
    title: 'What General Counsel Really Want',
    subtitle: 'Insights from 130+ in-house interviews',
    hook: 'Direct insights from the people who hire law firms',
    actionItems: [
      { text: 'Score your current pitch deck with the 7-priority self-audit (Materials below) — fix anything scoring 0 before the next pitch goes out', priority: 'quick-win' },
      { text: 'Run the 8-question listening survey with your top 10 clients this quarter — the managing partner makes the call, not the marketing team', priority: 'strategic' },
      { text: 'Stand up a quarterly one-page ideas memo to each key client — one proactive, business-first insight, no billable hook attached', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'Drawn from more than 130 interviews with general counsel across CEE — conducted by our founder over years of covering the in-house legal market — these are the fundamental factors that shape how GCs choose a law firm.',
          'What follows is the doctrine those interviews handed us — seven priorities, in their words — and then the part most firms skip: how to operationalize them into a listening program, a pitch that survives scrutiny, and a rhythm of proactive advice that compounds.',
        ],
        stat: { value: '130+', label: 'in-house counsel interviewed across Central & Eastern Europe (interviews conducted by our founder)' },
      },
      {
        heading: '1. Expertise and Specialization',
        paragraphs: [
          'General counsel engage law firms that showcase deep levels of expertise. They look for firms with a proven track record in a specialized area — not a practice list that reads like a department store directory.',
        ],
        pullQuote: 'One GC\'s checklist for a strategic partner: a wide scope of expertise, strong technical knowledge, the social intelligence to follow the client\'s needs, and a responsive team.',
      },
      {
        heading: '2. Understanding the Business',
        paragraphs: [
          'GCs want advisors who understand their business, not just the law. External counsel becomes a long-term partner when they go beyond handling individual matters.',
          'This is testable, and they test it: read the client\'s annual report before the pitch and reference their margin pressure, their regulator, their expansion market — not "the market" in general. A GC can smell a recycled pitch in the first five minutes.',
        ],
      },
      {
        heading: '3. Trust and Reputation',
        paragraphs: [
          'GCs pay close attention to reputation. Trust is integral to long-term partnership.',
        ],
        pullQuote: 'The consistent verdict: reputation matters most — but not from top-tier rankings. GCs rely on recommendations from other in-house lawyers.',
      },
      {
        heading: '4. Responsiveness and Speed',
        paragraphs: [
          'Law firms that make their experts available and easy to communicate with are more likely to turn into long-term partners.',
          '"Available" claimed is noise. "Your call is returned within four working hours, and you always know who holds your file" is a commitment — put it in the proposal and then keep it. Responsiveness is the one priority a firm can fix this week with zero budget.',
        ],
      },
      {
        heading: '5. Cost and Efficiency',
        paragraphs: [
          'Cost inevitably plays an important role, but GCs don\'t want it to come at the expense of quality.',
        ],
        pullQuote: 'The consistent ask: tailored, relevant advice — not dozens of pages of boilerplate content.',
      },
      {
        heading: '6. Long-Term Partnership',
        paragraphs: [
          'In-house teams value consistency. They want firms that can become strategic partners in the long run — which means the pitch should show what month twelve looks like: the review cadence, the knowledge-sharing, the second matter — not just the first engagement.',
        ],
      },
      {
        heading: '7. Proactive, Solution-Oriented Advice',
        paragraphs: [
          'GCs favor proactive over reactive advisors. They want firms that anticipate challenges and provide grounded advice.',
        ],
        pullQuote: 'The consistent message: nobody wants a firm that merely answers the questionnaire — they want ideas brought to the table. Experience matters, but mindset decides.',
      },
      {
        heading: 'The Play — From Interview Insight to Operating Rhythm',
        numbered: [
          'Listen on a schedule. Run the 8-question listening survey (Materials below) with your top 10 clients once a year — same questions every time, so anecdotes become trend data.',
          'Re-cut the pitch. Score your current deck with the 7-priority self-audit (Materials below); anything at 0 or 1 gets rewritten before the deck goes out again.',
          'Make responsiveness a promise. Name a person and a response commitment in every proposal. It costs nothing and it is the priority GCs feel first.',
          'Institutionalize proactive advice. A quarterly one-page ideas memo per key client: one regulatory or business development, why it matters to them specifically, one suggested move. No billable hook attached — the hook is that you sent it.',
          'Close the loop into messaging. Feed the survey\'s verbatim language back into your positioning (see Messaging & Positioning). GC phrasing beats agency copy every time.',
        ],
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'Surveying clients, then changing nothing — a listening program with no follow-through is worse than none; it teaches clients you collect opinions you ignore.',
          'Treating "we understand your business" as a tagline instead of evidence — GCs test the claim in the first meeting.',
          'Chasing rankings while neglecting recommendations — the interviews were explicit: GCs rely on other in-house lawyers, not league tables.',
          'Sending legal updates instead of business insight — in the interviews, multi-page boilerplate briefings were described as the first thing that gets deleted unread.',
        ],
        callout: { type: 'mistake', content: 'The most expensive misread: hearing these seven priorities as marketing themes. They are operating standards. A GC discovers which one you chose within a single matter.' },
      },
      {
        paragraphs: [
          'None of this requires a rebrand or a budget line. It requires listening on a schedule, pitching against the evidence, and showing up with ideas before you\'re asked. The firms that do it stop competing on price and start getting recommended — which, the interviews make clear, is how the decision actually gets made.',
        ],
        pullQuote: 'Experience matters, but mindset decides.',
      },
      {
        heading: 'Materials — The Annual GC Listening Survey — 8 Questions',
        paragraphs: [
          'Send to your top 10 clients once a year. Fifteen minutes, by phone if you can — the follow-up questions are where the value lives.',
          '',
          '1. Which firms are in your inner circle right now — and what put them there?',
          '2. When you last dropped or replaced a firm, what triggered it?',
          '3. Where does outside counsel most often waste your time or budget?',
          '4. What is one thing you wish your firms would tell you BEFORE you had to ask?',
          '5. How do you actually discover and vet a new firm? (Push past "rankings" — who do you ask?)',
          '6. What does a genuinely useful alert or briefing from a firm look like to you?',
          '7. On a 1–10, how likely are you to recommend us — and what one change would raise the score?',
          '8. Who else in your network should we be talking to?',
          '',
          'The rules: the managing partner makes the call, never the marketing team. Never pitch on a survey call. Log every answer verbatim — that language becomes your messaging (see the Messaging & Positioning chapter). Ask the same questions every year; identical questions are what turn anecdotes into trend data.',
        ],
      },
      {
        heading: 'Materials — Pitch Deck Self-Audit — the 7 GC Priorities',
        paragraphs: [
          'Score each priority 0 (absent), 1 (claimed), or 2 (proven with evidence a GC could verify). Total out of 14.',
          '',
          '1. Expertise & specialization — does the deck prove depth in a niche, or list everything you do?',
          '2. Business understanding — is the client\'s industry problem named before your services appear?',
          '3. Trust & reputation — are there named references, rankings, or deals a GC can check?',
          '4. Responsiveness — is there a concrete commitment (who answers, how fast), not just "available"?',
          '5. Cost & efficiency — is there a pricing model or fee logic, not just "competitive rates"?',
          '6. Long-term partnership — does the deck show what month 12 looks like, not just the first matter?',
          '7. Proactive advice — does it contain one idea the client didn\'t ask for?',
          '',
          '11–14: send it. 7–10: fix the zeros first. Below 7: the deck is about you, not them — start over from priority 2.',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Recognition and Thought Leadership category scores at your next quarterly audit — plus the share of new inquiries that arrive via recommendation, which should grow quarter over quarter.',
        ],
      },
    ],
  },
  {
    id: 'common-mistakes',
    number: 14,
    title: 'Common Website Mistakes',
    subtitle: 'Small oversights that chip away at credibility',
    hook: '10 mistakes that silently hurt your firm\'s reputation',
    actionItems: [
      { text: 'Run the ten-point sweep (Materials below) right now — the footer year and dead social icons take under 30 minutes combined', priority: 'quick-win' },
      { text: 'Fix every failing item with a named owner this week; escalate anything touching templates to your web vendor with a deadline', priority: 'strategic' },
      { text: 'Put the sweep on a monthly recurring calendar invite — these mistakes return quietly after every site update', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'Law firms can claim to be next-generation, world-class, or strategic all day long. None of it matters if clarity and proof are nowhere to be found — and nothing contradicts a claim of excellence faster than a copyright notice from three years ago.',
        ],
      },
      {
        heading: 'The Doctrine',
        paragraphs: [
          'Credibility is lost by accumulation. No single stale footer or dead icon loses a mandate — but clients read a firm\'s website the way lawyers read contracts: the small details are the evidence of how the big work gets done. Ten small oversights, taken together, answer the visitor\'s real question: does this firm sweat details, or just say it does?',
        ],
        callout: { type: 'quick-win', content: 'Most of these fixes take less than 30 minutes each. Start with the footer copyright year and broken social links — the fastest credibility repair available anywhere in marketing.' },
      },
      {
        heading: 'The Play — Sweep Monthly, Fix Immediately',
        paragraphs: [
          'The ten-point sweep is in the Materials below, ordered by check time. The whole pass takes under an hour; most fixes take minutes. The discipline is the cadence: these mistakes don\'t arrive once, they return with every site update, every departed employee\'s profile, every plugin that quietly stops working.',
        ],
      },
      {
        heading: 'What\'s Working Well',
        paragraphs: [
          'Some firms in the region are getting it right — the patterns worth copying:',
        ],
        bullets: [
          'Dedicated notable-clients pages with linked case details',
          'Rankings and recognition sections kept genuinely current',
          'Active newsrooms covering legal developments, not just firm news',
          'Client tools: courses, apps, benchmarking resources',
          'Downloadable guide libraries on practical topics',
          'Clearly defined service packages that set expectations',
          'Consistent LinkedIn presence with updates embedded on the homepage',
          'Expert profiles highlighting the key deals each lawyer has led',
        ],
        pullQuote: 'Sometimes it\'s not a full overhaul. It\'s doing a few important things well — and then not letting them decay.',
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'The one-time sweep — fixing everything in January and watching it rot by June; cadence is the system.',
          '"The vendor will notice" — vendors build; nobody inspects. The sweep needs an owner inside the firm.',
          'Fixing forward only — new pages get the standard while old pages keep the mistakes; the sweep covers the whole site.',
          'Dismissing the small stuff — every item on the list is a detail a detail-oriented client will absolutely find.',
        ],
      },
      {
        heading: 'Materials — The Ten-Point Sweep — Under an Hour',
        paragraphs: [
          'Run monthly, in order. Fix time in brackets.',
          '[ ] 1. Footer copyright year is current [2 min]',
          '[ ] 2. No expandable sections that open to nothing [10 min to find, delete or fill]',
          '[ ] 3. Every social icon links to a live, active profile — or is removed [10 min]',
          '[ ] 4. Internal links open in the same tab; only true external references open new ones [15 min spot-check]',
          '[ ] 5. Footer carries contacts, offices, and regulatory details — it\'s prime real estate [15 min]',
          '[ ] 6. Every testimonial is named — anonymous praise reads as invented praise [5 min to check]',
          '[ ] 7. Maps widget loads and points at the right office [5 min]',
          '[ ] 8. No hamburger menu on desktop — full navigation visible on large screens [check; template fix if failing]',
          '[ ] 9. No "Published by Admin" or stray dates on About / Team / Practice pages [10 min]',
          '[ ] 10. Hover states make buttons clearer, never invisible [5 min spot-check]',
          '',
          'Any zero found two months running isn\'t a mistake — it\'s a process gap. Assign the page an owner.',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Website Experience and Recognition category scores at the next audit — plus a standing zero on the ten-point sweep, re-run monthly; the sweep should take under an hour once the fixes are done.',
        ],
      },
    ],
  },
  {
    id: 'reputation-reviews',
    number: 15,
    title: 'Reputation & Reviews',
    subtitle: 'The proof layer: Google, reviews, and rankings',
    hook: 'Your reputation already has a score — the only question is whether you manage it',
    actionItems: [
      { text: 'Claim and fully complete your Google Business Profile today — categories, services, photos, Q&A — and respond to every existing review', priority: 'quick-win' },
      { text: 'Adopt the review-ask script (Materials below) as a standing step in every matter-closing process', priority: 'strategic' },
      { text: 'Build the annual rankings calendar (Chambers, Legal500, local awards) with submission owners and deadlines — a missed cycle is a silent year', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'When a prospect hears your firm\'s name — from a referral, an event, a search result — the next thing they do is look you up. What they find in that sixty seconds is your reputation layer: the Google Business Profile, the reviews, the rankings, the directory listings.',
          'Most firms treat that layer as weather — something that happens to them. It is closer to a balance sheet: it accrues, it compounds, and it is auditable.',
        ],
        callout: { type: 'insight', content: 'In interview after interview, general counsel said they rely on recommendations from other in-house lawyers more than on rankings. Reviews and rankings are where those recommendations become visible to everyone who didn\'t get the phone call.' },
      },
      {
        heading: 'The Doctrine — Three Machines',
        numbered: [
          'The Google Business Profile is your second homepage. For local and referred searches it is often the first thing seen — before your website. Incomplete profiles, stale photos, and unanswered reviews quietly tax every other marketing effort.',
          'Reviews are the referral made visible. A steady cadence of recent, specific, two-sentence reviews outperforms a handful of glowing ones from 2021 — recency is credibility.',
          'Rankings (Chambers, Legal500, regional awards) are slow-moving but decisive in formal procurement. They reward firms that submit every cycle with real referees — and skip firms that submit occasionally.',
        ],
      },
      {
        heading: 'The Play',
        paragraphs: [
          'Claim and complete the GBP this week. Wire the review ask into matter closings (script in Materials). Put the rankings calendar (Materials) on the same footing as tax deadlines — with named owners and no exceptions. None of this is creative work; it is operational, which is precisely why most firms never do it.',
        ],
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'The silent profile — an unclaimed or half-empty GBP signals a firm that doesn\'t manage details.',
          'The review drought — twelve reviews from three years ago read worse than none; stale proof is doubt.',
          'Arguing with reviewers — respond to every review once, professionally, briefly; the response is written for the next hundred readers, not the reviewer.',
          'Submission-year amnesia — rankings season arrives every year; firms without a calendar discover the deadline a week after it passes.',
        ],
        callout: { type: 'mistake', content: 'Never buy, incentivize, or ghost-write reviews. Beyond the ethics rules most bar associations enforce, a pattern of fake reviews is the single fastest way to convert a reputation asset into a liability.' },
      },
      {
        paragraphs: [
          'Reputation work is unglamorous and cumulative — exactly like compound interest. The firms that start now own the search results their competitors will be trying to rent in three years.',
        ],
      },
      {
        heading: 'Materials — The Review Ask — Matter Closing',
        paragraphs: [
          'Timing: within 48 hours of a successful close, from the partner who ran the matter — never from marketing.',
          '',
          '"It\'s been a pleasure getting this across the line with you. We ask one thing of every client at this point: if the work earned it, would you leave us a short Google review? Two sentences about what we handled and how it went means more to a firm our size than any award — and it takes about two minutes. Here\'s the direct link: [link]"',
          '',
          'Rules: ask every client, not just the enthusiasts. Never script the content. Never incentivize. If the answer suggests hesitation, that\'s a service signal — follow up privately, not with a second ask.',
        ],
      },
      {
        heading: 'Materials — The Rankings Calendar',
        paragraphs: [
          'Annual cycle, one owner per submission. Miss nothing.',
          '',
          'JANUARY: Review last year\'s results; note researcher feedback. Refresh the recognition file per lawyer (deals, rankings, media).',
          'FEBRUARY–MARCH: Chambers submissions — referees briefed (they will be called), matter descriptions written in plain English, one per practice.',
          'APRIL–MAY: Legal500 submissions — same matter base, re-cut to their format.',
          'JUNE–AUGUST: Local and industry awards (regional CEE awards, practice-specific lists) — lower effort, high local visibility.',
          'SEPTEMBER–OCTOBER: Interviews and referee follow-ups; correct factual errors in published research.',
          'NOVEMBER–DECEMBER: Publish results across site, LinkedIn, proposals. Plan next year\'s referee list.',
          '',
          'The compounding truth: rankings reward consistency. Firms that submit every cycle with real referees rise; firms that submit occasionally stay \'notable.\'',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Recognition category score at the next audit — plus review count and average rating on Google (baseline today, target +1 review per matter closed), and at least one directory submission per cycle.',
        ],
      },
    ],
  },
  {
    id: 'referrals-alumni',
    number: 16,
    title: 'Referrals & Alumni Systems',
    subtitle: 'The channel everyone names, almost nobody runs',
    hook: 'Your best source of work is a system, not a hope',
    actionItems: [
      { text: 'Add \'how did you hear about us?\' to every intake conversation and log the answer by name — you cannot grow a channel you don\'t measure', priority: 'quick-win' },
      { text: 'List your top 20 referrers and 20 most-placed alumni; schedule a substantive touch with five of each this quarter (script in Materials)', priority: 'strategic' },
      { text: 'Stand up the alumni program — quarterly bulletin, annual event, matter-alumni congratulations — as a owned, budgeted line, not a sentiment', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'Ask any managing partner where the best work comes from and the answer is instant: referrals. Ask what the firm systematically does to earn them and the answer is usually silence.',
          'Ask general counsel how they choose firms and the answer is consistent: recommendations from other in-house lawyers. The most important channel in legal business development is also the least managed.',
        ],
        pullQuote: 'A referral is a transfer of trust. Trust is built in a system or left to chance — there is no third option.',
      },
      {
        heading: 'The Doctrine — Two Networks',
        paragraphs: [
          'The referral machine has two networks. The first is active referrers: clients, adjacent professionals, and past GCs who already send work. The second is alumni: every lawyer who ever left in good standing, now scattered across in-house teams, other firms, regulators, and startups — the profession\'s most underpriced asset.',
          'Both networks run on the same fuel: being genuinely useful on a cadence, and being remembered at the moment of need. Neither happens by accident.',
        ],
      },
      {
        heading: 'The Play',
        numbered: [
          'Measure first: add referral attribution to intake this week — a named source for every new matter.',
          'Run the referrer rhythm (script in Materials): quarterly value touches, prompt private thanks, an annual face-to-face.',
          'Stand up the minimum viable alumni program (checklist in Materials): the list, the quarterly bulletin, the congratulations, one annual event.',
          'Make referring easy: give every referrer two sentences that describe exactly what you do and for whom — referrals die when the referrer can\'t explain you.',
        ],
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'Gratitude lag — a referral thanked a month later teaches the referrer not to repeat it; thank within 48 hours, privately and specifically.',
          'The pitch-y touch — every contact carrying an ask trains the network to avoid you; value touches outnumber asks ten to one.',
          'Alumni as nostalgia — a program that only sends holiday cards is a mailing list, not a channel; alumni want insider substance.',
          'The unlogged referral — without intake attribution, the firm\'s best channel is invisible in every planning meeting.',
        ],
      },
      {
        paragraphs: [
          'Referrals feel like reputation\'s reward. Run properly, they\'re reputation\'s engine — the one channel where every unit of effort compounds through people who already trust you.',
        ],
      },
      {
        heading: 'Materials — The Referrer Touch — Quarterly',
        paragraphs: [
          'For clients, other professionals (accountants, bankers, consultants), and past GCs who send work your way.',
          '',
          'The touch is value-first, never a reminder invoice:',
          '"Saw [regulatory development / market event] and thought of your situation at [company] — one paragraph on what it means for you: [insight]. No action needed; flag it if it lands."',
          '',
          'Quarterly rhythm per referrer: one value touch, one thank-you (prompt, specific, private) for any referral sent, one personal note (promotion, deal, their firm\'s news). Twice a year: a face-to-face — coffee, event invitation, site visit.',
          '',
          'The ask, used sparingly (once a year at most):',
          '"If someone in your network mentions [the problem you solve], we\'d be glad to be the call you make. Here\'s the two-line description of what we do that makes referring us easy: [lines]."',
        ],
      },
      {
        heading: 'Materials — The Alumni Program — Minimum Viable',
        paragraphs: [
          'Every lawyer who leaves in good standing is a future client, referrer, or boomerang hire. Minimum viable program:',
          '[ ] A maintained alumni list with current roles (reviewed twice a year)',
          '[ ] A quarterly alumni bulletin — firm developments written for insiders, not a client newsletter forwarded',
          '[ ] Congratulations on every move: promotion, in-house transition, new venture — personal note from their former supervising partner',
          '[ ] One alumni event per year — substantive content plus the partners they\'ll refer to',
          '[ ] A "welcome back" path — alumni returning laterally is the cheapest senior hire in the profession',
          '[ ] Alumni who land in-house get the GC treatment from day one (see What GCs Really Want)',
          '',
          'Cost: a few hours a quarter. Return: the profession\'s most trusted referral channel.',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Recognition and Social Presence category scores at the next audit — plus referral attribution: the share of new matters traceable to a named referrer or alumnus, logged at intake. Baseline it this quarter; grow it every quarter after.',
        ],
      },
    ],
  },
  {
    id: 'intake-conversion',
    number: 17,
    title: 'Intake & Conversion',
    subtitle: 'The funnel\'s back half, where inquiries become engagements',
    hook: 'All your marketing ends at one moment — the first response',
    actionItems: [
      { text: 'Set the response SLA today: every inquiry acknowledged within 4 working hours, by a human, with a named next step — publish it internally', priority: 'quick-win' },
      { text: 'Adopt the intake script (Materials below) for every new inquiry and log the answers — source, matter, stakes, timeline', priority: 'strategic' },
      { text: 'Build the 3-touch follow-up sequence (Materials below) into the intake process and review conversion monthly', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'Every chapter in this book — the positioning, the content, the reviews, the referrals — funnels into one moment: a prospective client reaches out. What happens next determines what all the marketing was worth.',
          'Most firms invest heavily in generating inquiries and almost nothing in receiving them. The result is a leaky funnel with an expensive top.',
        ],
        callout: { type: 'insight', content: 'Responsiveness is the priority general counsel feel first — and it starts before they\'re clients. A firm that answers an inquiry in four hours has already demonstrated the one thing every pitch claims.' },
      },
      {
        heading: 'The Doctrine',
        numbered: [
          'Speed is substance. The first firm to respond substantively sets the frame every competitor is judged against — and in most markets, responding within hours (not days) is still rare enough to be a differentiator.',
          'Intake is diagnosis, not administration. The six questions (Materials below) qualify the matter, surface the stakes, and harvest the client\'s own language — which feeds messaging, content, and the proposal.',
          'Every inquiry gets a logged outcome. Consult booked or not, engaged or not, and why. A firm that can\'t say what happened to last month\'s inquiries is flying the funnel blind.',
        ],
      },
      {
        heading: 'The Play',
        paragraphs: [
          'Publish the response SLA internally and keep it. Run every inquiry through the intake script. Follow up consults with the three-touch sequence, then hand non-converters to the nurture list. Review the log monthly: response time, conversion rate, and loss reasons are the three numbers that run the back half of the funnel.',
        ],
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'The shared inbox — inquiries owned by everyone are answered by no one; every inquiry gets a named owner the hour it arrives.',
          'The gatekeeper filter — screening for \'serious\' clients before listening; some of the best matters arrive as vague questions.',
          'Quoting before diagnosing — a fee mentioned before the stakes are understood prices the wrong thing.',
          'The silent loss — consults that fade without follow-up are engagements donated to whichever firm followed up.',
        ],
        callout: { type: 'mistake', content: 'The most expensive sentence in a law firm: \'I thought you were handling that inquiry.\' The SLA and the owner rule exist to make it unsayable.' },
      },
      {
        paragraphs: [
          'Marketing earns the inquiry. Intake earns the engagement. The firms that grow are the ones that refuse to let the second part be improvisational.',
        ],
      },
      {
        heading: 'Materials — The Intake Conversation — 6 Questions',
        paragraphs: [
          'Every inquiry, every channel, same six questions — asked by whoever takes the call, logged immediately.',
          '',
          '1. What\'s the situation? (Their words, uninterrupted — this language is marketing gold)',
          '2. What happens if it\'s not resolved? (The stakes — qualifies urgency and budget)',
          '3. What\'s the timeline? (Now / this quarter / exploring)',
          '4. Who decides? (Them alone, a board, a GC plus CFO)',
          '5. Have you worked with a firm on this before? (First-time buyers need education; switchers need reassurance)',
          '6. How did you hear about us? (By name — this feeds the referral system)',
          '',
          'Close every intake with: who does what by when. "You\'ll have a short note from [partner] by Thursday with how we\'d approach it and what it costs." Then keep the promise.',
        ],
      },
      {
        heading: 'Materials — The Follow-Up Sequence — 3 Touches',
        paragraphs: [
          'For consults that don\'t convert on the spot. Value-first, no pressure.',
          '',
          'TOUCH 1 (next day): Thank-you + the one thing discussed that mattered most + a relevant article or guide. "You mentioned [issue] — this is how we\'ve seen it handled."',
          'TOUCH 2 (one week): A short scoping note — how we\'d approach their matter, in three bullets, with a fee range or model. Clarity is the differentiator.',
          'TOUCH 3 (three weeks): The graceful close — "If the timing\'s moved, no note needed; if it\'s still live, I\'m happy to hold thirty minutes this month." Then stop.',
          '',
          'Rule: three touches, then into the nurture list (see Email Nurture). Persistence past three reads as desperation — and desperation is the one message that converts in the wrong direction.',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Recognition category score at the next audit — plus intake metrics logged per inquiry: response time, consult booked (y/n), and engagement won. Response time is the first number to move.',
        ],
      },
    ],
  },
  {
    id: 'email-nurture',
    number: 18,
    title: 'Email Nurture',
    subtitle: 'The owned channel between attention and engagement',
    hook: 'Social rents the audience. Email owns it.',
    actionItems: [
      { text: 'Draft the 3-email welcome sequence (Materials below) this week — every new subscriber currently gets silence', priority: 'quick-win' },
      { text: 'Launch the flagship monthly briefing (format in Materials) — one insight, one practical tool, one proof point — and protect the send date', priority: 'strategic' },
      { text: 'Integrate the list with intake: every non-converting consult and every event contact joins a segment with a relevant sequence', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'Every other channel in this book rents its audience. LinkedIn can throttle reach, Google can change an algorithm, an event ends on Sunday. An email list is the one audience the firm owns outright.',
          'Between the article that got attention and the matter that pays, there is a long middle where most firms go silent. Nurture is what fills it.',
        ],
      },
      {
        heading: 'The Doctrine',
        numbered: [
          'Email is a trust channel, not a broadcast channel. The metric that matters is replies — a reader who writes back is a relationship; an open rate is a weather report.',
          'Cadence outranks brilliance. A good briefing every month for a year outperforms a brilliant one sent whenever inspiration strikes — the schedule is the promise.',
          'Segmentation is respect. A GC who downloaded your ESG guide should not receive the employment-law briefing; relevance is the whole product.',
        ],
        pullQuote: 'The goal is not a newsletter people tolerate. It\'s a briefing they\'d notice missing.',
      },
      {
        heading: 'The Play',
        paragraphs: [
          'Launch the welcome sequence (Materials below) so no subscriber ever meets silence. Establish the flagship monthly briefing with its fixed format — insight, tool, proof — and protect the send date like a court deadline. Then wire the list into intake: every non-converting consult and every event contact joins a relevant segment, and the funnel\'s middle finally has a floor.',
        ],
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'The firm-news newsletter — \'we attended, we were ranked, we hired\' is a memo to yourselves; readers subscribe for their problems, not your announcements.',
          'The design-first email — heavy templates signal \'marketing blast\'; a partner\'s plain, well-written note signals correspondence.',
          'Buying or scraping lists — beyond the GDPR exposure, a list that didn\'t ask for you converts at zero and damages the domain\'s deliverability.',
          'The disappearing act — three issues then silence is worse than never starting; it demonstrates exactly the inconsistency the channel exists to disprove.',
        ],
        callout: { type: 'mistake', content: 'If your briefing could be sent by any firm in your market, it will be read by no one. The insight must come from your practice, your region, your matters — specificity is the subscription.' },
      },
      {
        paragraphs: [
          'Build the list and the list builds the pipeline. It is the slowest channel in this book to start and the hardest for a competitor to take away.',
        ],
      },
      {
        heading: 'Materials — The Welcome Sequence — 3 Emails',
        paragraphs: [
          'Every new subscriber gets these over ten days. Written from a named partner, plain text style — no banner, no brochure.',
          '',
          'EMAIL 1 (immediately): "You joined because of [the guide/article they downloaded]. Here it is again [link] — and here\'s the one idea in it most firms miss: [two sentences]. Next week I\'ll send how we see clients actually apply it. — [Partner name]"',
          'EMAIL 2 (day 4): The application email — one short anonymized case where the idea changed an outcome. End with a question: "What\'s the situation on your desk right now? Replies come straight to me."',
          'EMAIL 3 (day 10): The orientation — what the monthly briefing covers, when it arrives, and the standing invitation: "Thirty minutes, no pitch, whenever [the topic] lands on your desk."',
          '',
          'Then they join the flagship cadence. No sequence email sells the firm; each sells the next email.',
        ],
      },
      {
        heading: 'Materials — The Flagship Monthly Briefing — Format',
        paragraphs: [
          'Subject: [The insight, stated plainly — "The clause that\'s stalling CEE deals this quarter"]',
          '',
          '1. THE INSIGHT (150 words) — one development, what it means for the reader\'s business, what to do about it. Written to be forwardable.',
          '2. THE TOOL (50 words + link) — one practical artifact: a checklist, a template, a two-question self-test. Useful even to people who never hire you.',
          '3. THE PROOF (30 words) — one line of evidence the firm practices this: a matter, a talk, a result. Restrained, factual.',
          '',
          'Footer: who to reply to (a named partner), one-line unsubscribe, no legal disclaimer longer than the briefing itself.',
          '',
          'Cadence: monthly, same week, same sender. Twelve issues a year, no exceptions — the cadence IS the message.',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Social and Thought Leadership category scores at the next audit — plus list health: subscriber growth month over month, and reply rate on the flagship briefing (replies, not opens, are the trust metric).',
        ],
      },
    ],
  },
  {
    id: 'ai-search-visibility',
    number: 19,
    title: 'AI-Search Visibility',
    subtitle: 'Being the answer when clients ask ChatGPT, not Google',
    hook: 'The next referral question is typed into an AI. Will it name you?',
    actionItems: [
      { text: 'Run the five-question AI-citation check (Materials below) on ChatGPT, Perplexity, and Gemini today — record who gets named instead of you', priority: 'quick-win' },
      { text: 'Reformat your top five practice pages and articles into answer-ready structure: question headings, direct answers up front, named authors with credentials', priority: 'strategic' },
      { text: 'Build the citation moat: original data, named expert commentary, and quotable definitions published on a cadence AI models can observe', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'A growing share of professional research now starts in an AI assistant rather than a search box. The question "which firm handles cross-border employment disputes in Poland?" increasingly gets a synthesized answer — with names — instead of ten blue links.',
          'For law firms this changes the economics of visibility: there is no page two of an AI answer. You are either cited or invisible.',
        ],
        callout: { type: 'insight', content: 'AI assistants don\'t rank pages — they assemble answers from sources they can parse, verify, and quote. The optimization target shifts from keywords to citability.' },
      },
      {
        heading: 'The Doctrine',
        numbered: [
          'Answer-first structure wins. Models extract passages that directly answer questions; a page that buries its answer under three paragraphs of preamble is invisible to the summarizer.',
          'Authority is inferred, not claimed. Named authors, dated pages, consistent facts across sources, and presence in directories and rankings all feed the models\' picture of who is credible — the reputation work in this book doubles as AI-visibility work.',
          'Original material is the moat. An AI can summarize anyone\'s generic overview; it can only cite the firm that published the data, the survey, or the definition. Original research is the one input competitors can\'t replicate.',
        ],
      },
      {
        heading: 'The Play',
        paragraphs: [
          'Baseline yourself with the monthly citation check (Materials below) — most firms have never asked an AI the questions their clients ask, and the answers are clarifying. Then reformat the top pages answer-first (checklist in Materials), and start publishing the kind of original material — survey data, market definitions, regulatory timelines — that makes your firm a source rather than a summary.',
        ],
        pullQuote: 'Classic SEO asked: how do I rank? AI search asks: how do I become quotable? The second question has better answers.',
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'Keyword thinking — stuffing practice-area terms into text a model will never quote; questions and direct answers are the unit now.',
          'The anonymous library — a hundred well-written articles with no byline are a hundred unverifiable sources.',
          'Set-and-forget — AI answers shift monthly as models retrain; the citation check is a standing routine, not a one-off audit.',
          'Contradictory footprint — three different firm descriptions across the site, LinkedIn, and directories teach the model to trust none of them.',
        ],
      },
      {
        paragraphs: [
          'The firms that treated websites as brochures lost the search decade. The firms that treat content as citable source material will own the answer decade.',
        ],
      },
      {
        heading: 'Materials — The Monthly AI-Citation Check',
        paragraphs: [
          'Once a month, ask each major AI assistant (ChatGPT, Perplexity, Gemini) the five questions your clients actually ask. Record the answers in a spreadsheet — dated.',
          '',
          'The five questions (adapt to your practice):',
          '1. "Which law firms in [city/country] specialize in [your niche]?"',
          '2. "What should a [client type] know about [your regulatory area]?"',
          '3. "How much does [your typical matter] usually cost in [market]?"',
          '4. "What changed in [your area] law this year?"',
          '5. "Who are recognized experts on [your niche] in [market]?"',
          '',
          'Log: was the firm named? Was a firm page or article cited? Who was named instead — and what did they publish that you haven\'t?',
          '',
          'The output is an editorial to-do list: every question where a competitor is cited is a piece of content you need to write better.',
        ],
      },
      {
        heading: 'Materials — The Answer-Ready Page Checklist',
        paragraphs: [
          'AI assistants cite pages they can parse and trust. For each key page:',
          '[ ] Headings phrased as the questions clients actually ask',
          '[ ] The direct answer in the first two sentences under each heading — nuance after',
          '[ ] Named author with credentials and a linked profile (anonymous text is unverifiable text)',
          '[ ] A publication and update date, kept honest',
          '[ ] Concrete specifics — numbers, jurisdictions, deadlines — over generalities',
          '[ ] A short FAQ section at the foot of key pages (the exact format AI answers mirror)',
          '[ ] Consistent firm description across the site, directories, and profiles — models reconcile sources, and contradictions cost citations',
          '[ ] Original material AI can\'t get elsewhere: your data, your survey results, your definitions',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Search Authority and Thought Leadership category scores at the next audit — plus the monthly AI-citation check (Materials below): your firm should move from absent to named on at least one tracked question.',
        ],
      },
    ],
  },
  {
    id: 'pricing-packaging',
    number: 20,
    title: 'Pricing & Packaging Communication',
    subtitle: 'The page nobody publishes, the question everybody asks',
    hook: 'Clients don\'t expect cheap. They expect legible.',
    actionItems: [
      { text: 'Publish your fee model in one honest paragraph on the website — not numbers, the logic (how you price, what drives cost, how clients control it)', priority: 'quick-win' },
      { text: 'Package your three most repeatable matters into named, scoped offers (template in Materials below) with a price or price logic', priority: 'strategic' },
      { text: 'Train every partner who pitches on the fee-conversation script (Materials below) — pricing raised early, framed around control', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'Visit a hundred law firm websites and count how many say anything about price. The number is close to zero — in a profession where the first question in every buyer\'s head is "what will this cost me?"',
          'The silence is usually defended as sophistication ("every matter is unique"). Clients experience it as risk: they can\'t budget you, so they delay calling you.',
        ],
        pullQuote: 'Pricing opacity doesn\'t protect your rates. It protects your competitors\' phones from ringing less.',
      },
      {
        heading: 'The Doctrine',
        numbered: [
          'Legibility beats cheapness. General counsel are consistent on this: they don\'t want low cost at the expense of quality — they want tailored advice and no boilerplate. A clear pricing model signals exactly that: you know your work well enough to scope it.',
          'Packaging is positioning. A named, scoped offer ("the funding round package") says more about your expertise than any practice-list bullet — firms that can package a matter have clearly run it dozens of times.',
          'The firm that raises fees first controls the conversation. Bringing up cost before the client asks converts pricing from an objection into a demonstration of how you\'ll behave during the engagement.',
        ],
      },
      {
        heading: 'The Play',
        paragraphs: [
          'Start with the one honest paragraph — the fee model, the cost drivers, how clients control them. Then package the three most repeatable matters using the one-pager in Materials. Then drill the fee-conversation script until raising price first feels like what it is: a competitive advantage hiding in plain sight.',
        ],
      },
      {
        heading: 'Failure Modes',
        bullets: [
          '"Contact us for pricing" as the whole policy — the visitor reads \'expensive and evasive\' and leaves.',
          'Packaging the bespoke — offers built on matters that vary wildly produce scope fights; package only what you\'ve repeated enough to scope honestly.',
          'The hidden variable — a fixed fee with exclusions the client discovers later converts one honest paragraph into a breach of trust.',
          'Race-to-the-bottom packaging — the point of a package is clarity, not discount; a cheap-looking offer undercuts the expertise it was meant to prove.',
        ],
        callout: { type: 'pro-tip', content: 'Test one packaged offer on the practice page where inquiries already arrive. Measure consult bookings for a quarter. The data usually ends the internal pricing debate.' },
      },
      {
        paragraphs: [
          'Every other profession learned this decade ago: clarity about cost is a trust signal, not a concession. The first firm in a market to speak plainly about pricing doesn\'t just win price shoppers — it wins everyone who was afraid to ask.',
        ],
      },
      {
        heading: 'Materials — The Packaged Offer One-Pager',
        paragraphs: [
          '[NAME THE OFFER — the client\'s job-to-be-done, not the legal category]',
          '"Series-Ready" — the funding round legal package',
          'not "Corporate / VC services"',
          '',
          '[THE SITUATION — 2 sentences]',
          'Who it\'s for and the moment it matters.',
          '',
          '[WHAT\'S INCLUDED — 5–7 scoped bullets]',
          'Specific deliverables, drafted documents, number of review rounds, the call cadence.',
          '',
          '[WHAT\'S NOT INCLUDED — 2–3 honest lines]',
          'The exclusions that prevent the awkward month-two conversation.',
          '',
          '[THE PRICE — one of:]',
          '• Fixed fee: EUR X',
          '• Range with drivers: EUR X–Y, depending on [the two real variables]',
          '• Logic: priced at Z% of a full engagement, credited if you proceed',
          '',
          '[THE TIMELINE] — weeks, with client responsibilities noted.',
          '',
          '[NEXT STEP] — the 30-minute scoping call.',
          '',
          'A packaged offer doesn\'t discount your work — it makes buying it feel as professional as doing it.',
        ],
      },
      {
        heading: 'Materials — The Fee Conversation — Raised First',
        paragraphs: [
          'From the partner, in the first substantive call, before the client asks:',
          '',
          '"Before we go further, let me tell you how the money works, because nobody enjoys asking. For a matter like yours we [charge a fixed fee of X / work at hourly rates that typically total between X and Y]. The two things that move it are [variable 1] and [variable 2] — and both are largely within your control: [one sentence each on how]. You\'ll see the full scope in writing before anything starts, and if it changes, you\'ll hear it from me before you see it on an invoice."',
          '',
          'Three commitments inside that paragraph: legibility (they know the shape of the cost), control (they know what moves it), and no surprises (changes are conversations, not invoice line items). That paragraph wins more engagements than any credential slide.',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Recognition category score at the next audit — plus consult-to-engagement conversion before and after adding pricing legibility (a model, a range, a packaged offer) to proposals and the site.',
        ],
      },
    ],
  },
  {
    id: 'measurement',
    number: 21,
    title: 'Measurement for Skeptics',
    subtitle: 'Prove marketing works with numbers partners respect',
    hook: 'The question isn\'t whether marketing works. It\'s whether you can show it.',
    actionItems: [
      { text: 'Build the one-page scorecard (Materials below) with current baselines this week — honest zeros included', priority: 'quick-win' },
      { text: 'Run the first monthly scorecard review with the managing partner — thirty minutes, decisions only', priority: 'strategic' },
      { text: 'After three months of baselines, set 12-month targets per KPI and review quarterly against them', priority: 'long-term' },
    ],
    content: [
      {
        paragraphs: [
          'Every managing partner eventually asks the question: what did we get for that? Marketing that can\'t answer in numbers gets its budget cut in the next downturn — a pattern as predictable as any in this book.',
          'The failure is usually not results but instrumentation: the firm was doing the right things and measuring nothing that could prove it.',
        ],
        callout: { type: 'insight', content: 'Vanity metrics (impressions, likes, follower counts) don\'t just fail to persuade partners — they actively teach leadership that marketing is decoration. Measure money-adjacent numbers or don\'t present numbers at all.' },
      },
      {
        heading: 'The Doctrine',
        numbered: [
          'Baseline before targets. Three months of honest measurement beats a year of aspirational KPIs; a target without a baseline is a wish with a deadline.',
          'Report at each number\'s natural frequency. Activities monthly, outcomes quarterly, revenue annually — forcing everything onto one dashboard manufactures either panic or complacency.',
          'Attribution belongs at intake, not in software. The single highest-value measurement act in this book is asking every new inquiry how they found you and writing down the name.',
          'The scorecard is a decision tool. Every number on it exists to trigger a specific action when it moves; a metric that changes nothing is decoration.',
        ],
      },
      {
        heading: 'The Play',
        paragraphs: [
          'Build the one-page scorecard (Materials below), baseline it for a quarter, then set twelve-month targets. Map every funded activity onto the KPI tree — anything that connects to no number gets defunded without ceremony. Within two quarters the budget conversation changes from \'why do we spend this\' to \'what would doubling it buy.\'',
        ],
      },
      {
        heading: 'Failure Modes',
        bullets: [
          'The data theater — a 30-metric dashboard no one reads; five numbers with owners outperform fifty without.',
          'Precision theater — agonizing over exact session counts while the direction is obvious; measurement exists to make decisions, not to be right.',
          'Monthly revenue attribution — legal sales cycles run months; judging marketing on this month\'s revenue punishes exactly the investments that pay next year.',
          'Measuring to defend, not to decide — a scorecard built to justify last year\'s budget will never find the thing that isn\'t working.',
        ],
      },
      {
        paragraphs: [
          'Twenty chapters of doctrine end here, in five numbers on one page. The firms that measure don\'t just prove their marketing works — they\'re the only ones who actually know whether it does.',
        ],
        pullQuote: 'You don\'t need more metrics. You need five numbers, an owner for each, and the discipline to look at them every month.',
      },
      {
        heading: 'Materials — The Monthly One-Page Scorecard',
        paragraphs: [
          'One page, five numbers, reviewed monthly with leadership. Each line: current month / rolling 3-month trend / 12-month target (set after baseline).',
          '',
          '1. VISIBILITY — qualified website sessions (filter out careers-page and bot traffic; direction matters more than precision)',
          '2. AUTHORITY — pieces published (articles, briefings) and AI/search presence: positions on your tracked near-miss queries',
          '3. REPUTATION — new reviews this month, average rating, referral share of new matters (from intake logging)',
          '4. PIPELINE — marketing-influenced inquiries: new conversations where the prospect had read, seen, or attended something first',
          '5. ECONOMICS — cost per qualified inquiry: total marketing spend ÷ qualified inquiries',
          '',
          'Rules: every number has a named owner. A number that worsens two months running gets an action, not an apology. Anything that can\'t be traced to a decision gets cut from the page — the scorecard\'s power is its size.',
        ],
      },
      {
        heading: 'Materials — The KPI Tree — From Activity to Revenue',
        paragraphs: [
          'Map every marketing activity to the number it actually moves. If it moves nothing, stop funding it.',
          '',
          'ACTIVITIES (inputs you control):',
          '[ ] Articles published → feeds AUTHORITY',
          '[ ] Review asks at matter closing → feeds REPUTATION',
          '[ ] Event calendar (T-21 system) → feeds VISIBILITY + PIPELINE',
          '[ ] Newsletter cadence → feeds PIPELINE (replies, reactivations)',
          '[ ] Intake SLA + follow-up sequence → feeds ECONOMICS (conversion)',
          '',
          'LAGGING OUTCOMES (what partners care about):',
          '[ ] Qualified inquiries per month',
          '[ ] Matters won where marketing touched the journey',
          '[ ] Revenue per marketing euro (annual view only — monthly is noise)',
          '',
          'The tree\'s discipline: report activities monthly, outcomes quarterly, revenue annually. Each has a natural frequency; forcing them onto one timeline manufactures panic.',
        ],
      },
      {
        heading: 'Proof it worked',
        paragraphs: [
          'Website Experience category score at the next audit — plus the monthly scorecard itself: twelve consecutive months of one-page reviews is the metric that proves the measurement system works.',
        ],
      },
    ],
  },
];
