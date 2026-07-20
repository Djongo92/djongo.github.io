import { CalloutType } from "@/components/CalloutBox";

export interface ActionItem {
  text: string;
  priority: "quick-win" | "strategic" | "long-term";
}

export interface RichCallout {
  type: CalloutType;
  title?: string;
  content: string;
}

export interface RichStat {
  value: string;
  label: string;
  suffix?: string;
}

export interface RichComparison {
  before: { title: string; items: string[] };
  after: { title: string; items: string[] };
}

export interface RichDeepDive {
  title: string;
  content: string;
}

export interface ChapterSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  numbered?: string[];
  pullQuote?: string;
  callout?: RichCallout;
  stat?: RichStat;
  comparison?: RichComparison;
  deepDive?: RichDeepDive;
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  hook?: string;
  content: ChapterSection[];
  actionItems?: ActionItem[];
}

export const chapters: Chapter[] = [
  {
    id: "event-marketing",
    number: 1,
    title: "Maximizing Event Participation",
    subtitle: "Turn every conference into months of marketing value",
    hook: "Squeeze 10x the value from every conference",
    actionItems: [
      { text: "Create a pre-event content calendar (social posts, speaker interviews, agenda highlights)", priority: "strategic" },
      { text: "Assign a team member to capture live photos and real-time social updates during next event", priority: "quick-win" },
      { text: "Build a post-event article series template to repurpose presentations", priority: "strategic" },
      { text: "Schedule follow-up interviews with key contacts met at events", priority: "long-term" },
    ],
    content: [
      {
        paragraphs: [
          "Law firms spend significant resources on event participation — money, time, strategic planning, and preparation of presentations. Most firms do the basics: a short write-up announcing their participation, a few images on social media shared post-event, and perhaps a quick recap on their blog.",
          "While these steps are certainly helpful, they barely scratch the surface of what is possible."
        ],
        callout: {
          type: "insight",
          content: "A single conference can generate 15-20 pieces of unique content when approached strategically. Most firms produce 2-3."
        }
      },
      {
        heading: "1. Promote Proactively Before the Event",
        paragraphs: [
          "Pre-event marketing can help set the stage for meaningful on-site engagements. Instead of a single announcement, consider:"
        ],
        bullets: [
          "Weekly social media posts highlighting your team's participation",
          "An interview with the speaker/panelist from your firm published on your website and LinkedIn",
          "Agenda highlights where you review the sessions and panels and write about the topics you're most excited to hear",
          "Insight articles that link market trends to the issues your firm will present on"
        ],
        pullQuote: "These activities help increase awareness and position your firm as engaged, knowledgeable, and prepared."
      },
      {
        heading: "2. Share Live Updates During the Event",
        paragraphs: [
          "The event itself is a content goldmine. It's during the event that the social media buzz is most active. Ride that wave by being an active part of the conversation."
        ],
        bullets: [
          "Take photos of your team and panelists/presenters",
          "Write short updates or takeaways of key panels or discussions",
          "Coordinate with your marketing team to post real-time content to social media and your website"
        ]
      },
      {
        heading: "3. Extend the Event with Post-Event Content",
        paragraphs: [
          "The follow-up is where many firms miss out. Expand your reach by:"
        ],
        bullets: [
          "Publishing a series of articles, each covering a presentation or panel from the event",
          "Bundling these into post-event reports and distributing them to your network",
          "Adding your firm's unique insights or point of view on each topic"
        ],
        pullQuote: "This contributes to your firm's thought leadership and gives you an excellent opportunity to share insights with those who were not able to attend."
      },
      {
        heading: "4. Engage with Key Contacts Directly",
        paragraphs: [
          "Most law firms attend events to build relationships. Work with your marketing team to interview general counsels and other key contacts your firm met. Use these interviews to deepen relationships and generate content that reinforces your firm's position as a trusted partner."
        ],
        pullQuote: "This helps convert one-off event interactions into ongoing engagement opportunities."
      },
      {
        heading: "5. Repurpose Your Firm's Presentation",
        paragraphs: [
          "If your firm presented at the event, that's ready-to-go content. Turn your presentation into:"
        ],
        bullets: [
          "A standalone article presenting key points and insights",
          "A downloadable resource or report for clients and prospects",
          "A LinkedIn carousel highlighting takeaways"
        ],
        pullQuote: "Events are an investment. A conference should not just be a date in the calendar — it should be a platform for visibility, relationships, and business development."
      }
    ]
  },
  {
    id: "google-search-console",
    number: 2,
    title: "Google Search Console 101",
    subtitle: "Data-driven content planning for law firms",
    hook: "Your audience is already telling you what to write about",
    actionItems: [
      { text: "Log into Google Search Console and export your top 50 queries this month", priority: "quick-win" },
      { text: "Identify 3 'near-miss' queries (positions 7-20) and plan articles for each", priority: "strategic" },
      { text: "Set up a monthly routine to review GSC data and feed your editorial calendar", priority: "long-term" },
    ],
    content: [
      {
        paragraphs: [
          "Writing client-relevant content doesn't have to be a guessing game. The data is already there. All you need to do is log in.",
          "Google Search Console (GSC) is a free, intuitive tool full of actionable insights. It shows what users type into Google before landing on your firm's website."
        ],
        bullets: [
          "How often your site's pages appear in search results (impressions)",
          "How many people actually click through",
          "Which pages are most visible"
        ],
        stat: {
          value: "91%",
          label: "of web pages get zero organic traffic from Google. GSC helps you be in the other 9%."
        }
      },
      {
        heading: "Why Search Behavior Matters",
        paragraphs: [
          "GSC is the easiest way to compile a list of topics that resonate with your audience."
        ],
        numbered: [
          "Check the Performance report. Sort by queries to see which search terms are bringing people to your site. If a term has lots of impressions but few clicks, that's your golden opportunity — your headline or snippet isn't compelling enough.",
          "Filter by specific pages. Select a URL and see the search terms leading users there. You'll discover the language clients actually use. For example, \"remote work rules in Poland\" versus the more lawyerly \"cross-border labor compliance.\"",
          "Spot \"near-miss\" queries. Identify queries ranking between positions 7–20. A single focused article answering one of these queries in plain English can push your page to the top of Page 1."
        ],
        callout: {
          type: "pro-tip",
          content: "Filter by 'Queries' and sort by impressions descending. Look for terms with high impressions but low clicks — these are your biggest missed opportunities."
        }
      },
      {
        heading: "Turning Insights into Editorial Calendars",
        paragraphs: [
          "Once a month, export your top 20 or top 50 queries and look for patterns. You'll start noticing recurring themes — maybe a spike in searches about remote work clauses or growing interest in ESG disclosures. These are all ready-made topics that reflect what your audience is actually thinking."
        ],
        pullQuote: "Don't overlook GSC thinking it's for SEO professionals. It's a window into your target audience's intent."
      }
    ]
  },
  {
    id: "summer-marketing",
    number: 3,
    title: "The Summer Advantage",
    subtitle: "Why smart firms never slow down",
    hook: "While competitors pause, your content has the stage",
    actionItems: [
      { text: "Publish 2 articles this summer that you've been sitting on", priority: "quick-win" },
      { text: "Map out your September-December content calendar before August", priority: "strategic" },
      { text: "Build a 'summer series' of lighter-format LinkedIn content", priority: "quick-win" },
    ],
    content: [
      {
        paragraphs: [
          "Every summer, law firms go quiet. Content slows down, newsletters get paused, and the assumption is that July and August are \"dead months\" for marketing.",
          "But that's exactly when you should lean in. While others are snoozing on a beach, your content faces far less competition."
        ],
        pullQuote: "Decision-makers aren't disappearing during summer. They're simply operating at a different pace.",
        comparison: {
          before: { title: "What Most Firms Do", items: ["Pause newsletters in July-August", "Delay campaigns until September", "Assume nobody's reading", "Let social media go quiet"] },
          after: { title: "What Smart Firms Do", items: ["Publish while competition is low", "Build September pipeline now", "Reconnect during downtime", "Dominate a quieter news feed"] }
        }
      },
      {
        paragraphs: [
          "With fewer meetings and distractions, they often use the quieter season to catch up on reading. Your content has a better chance of being seen and absorbed."
        ],
        bullets: [
          "Publish that article you've been sitting on",
          "Share a thoughtful LinkedIn post while the feed is less crowded",
          "Reconnect with clients and contacts while everyone's less stressed",
          "Clean up and update your website and profiles",
          "Repurpose your existing content into something new",
          "Map out your content calendar for September and beyond"
        ],
        pullQuote: "Everyone waits for September to ramp up again. But the smart firms? They never slowed down to begin with."
      }
    ]
  },
  {
    id: "marketer-leadership-gap",
    number: 4,
    title: "Bridging the Gap",
    subtitle: "The disconnect between marketers and managing partners",
    hook: "Why your best marketing hire might be underperforming",
    actionItems: [
      { text: "Hold a monthly alignment meeting between marketing and leadership", priority: "strategic" },
      { text: "Ask each partner to commit to one article per month", priority: "long-term" },
      { text: "Give marketing editorial sign-off authority for routine content", priority: "strategic" },
    ],
    content: [
      {
        paragraphs: [
          "Law firms across CEE are investing more in marketing than ever before. Unfortunately, for many marketers working inside these firms, it still feels like trying to assemble IKEA furniture while leadership debates the legal accuracy of the instructions.",
          "This has nothing to do with incompetence or malice. It stems from misalignment of priorities."
        ],
        callout: {
          type: "insight",
          content: "The gap between marketers and partners isn't about skill — it's about empowerment. Firms that bridge this gap see 3-5x more content output."
        }
      },
      {
        heading: "1. Marketers Want Manageable Websites. Partners Want Standout Designs.",
        paragraphs: [
          "Marketers want websites they can actually use and manage — clean designs that make it easy to update without submitting a ticket to an external agency. Their goal is agility.",
          "But many managing partners still chase \"the big agency\" look — glossy designs that charge a fortune and leave firms with beautiful but bloated websites."
        ],
        pullQuote: "Flash is great. But to what end? If your marketing team can't update your site, you've traded control for aesthetics."
      },
      {
        heading: "2. Marketers Want Content. Partners Don't See It as Essential.",
        paragraphs: [
          "Content fuels visibility. It's how a law firm showcases its expertise and builds trust. Marketers know this — it's why they spend so much time chasing partners for articles, quotes, and insights.",
          "Change needs to start at the top. If each legal professional commits to writing just one article per month, marketers would have a steady pipeline of around 15 pieces to publish, share, and repurpose."
        ]
      },
      {
        heading: "3. Marketers Want Responsiveness. Partners Want Perfection.",
        paragraphs: [
          "A solid campaign launched this week beats a flawless one launched next quarter. However, many managing partners get stuck chasing perfection. Every post, every article, every campaign goes through rounds of internal edits."
        ],
        pullQuote: "A brand that moves slowly loses visibility. Progress beats perfection."
      },
      {
        paragraphs: [
          "The irony is that marketers and managing partners want the same thing: a strong reputation, a visible brand, and a growing firm. But too often, the people hired to make that happen aren't given the tools, backing, or freedom to do their job.",
          "If you're a part of the leadership team, ask yourself: what have you said \"no\" to lately — and was it for the right reason?"
        ]
      }
    ]
  },
  {
    id: "thought-leadership",
    number: 5,
    title: "Thought Leadership Done Right",
    subtitle: "Showcase the experts behind the content",
    hook: "Turn your lawyers into recognized industry voices",
    actionItems: [
      { text: "Add clear author bylines with photos to every published article", priority: "quick-win" },
      { text: "Create 'More by [Author]' modules on your insights pages", priority: "strategic" },
      { text: "Build a social proof section for each expert's profile", priority: "long-term" },
    ],
    content: [
      {
        paragraphs: [
          "Most law firms have a thought leadership section on their website. But too often, these sections miss the opportunity to truly showcase the legal experts behind the content."
        ]
      },
      {
        heading: "1. Always Include Clear Bylines",
        paragraphs: [
          "Clearly display the author's full name and a professional photo for every article. It's an easy way to help readers remember the legal expert behind the piece."
        ]
      },
      {
        heading: "2. Link to Authors' Profiles",
        paragraphs: [
          "Connect each author to their profile page. When a prospective client reads a useful article, their next instinct is to learn more about the author. If there's no clear link, that momentum is lost."
        ]
      },
      {
        heading: "3. Recommend Related Articles by the Same Author",
        paragraphs: [
          "It's a body of work, not a single piece of content, that builds recognition and trust. Add a \"More by [Author Name]\" module at the end of each article."
        ]
      },
      {
        heading: "4. Call-to-Actions",
        paragraphs: [
          "Your insights section should guide users to the next step:"
        ],
        bullets: [
          "Reaching out to the author directly",
          "Downloading a related resource or guide",
          "Subscribing to updates on similar topics",
          "Scheduling an introductory call"
        ]
      },
      {
        heading: "5. Offer Social Proof",
        paragraphs: [
          "Reinforce credibility by showing that your experts are recognized beyond your own website — awards, rankings, notable deals, media mentions, and speaking engagements."
        ]
      },
      {
        heading: "6. Consistency Builds Authority",
        paragraphs: [
          "Authority isn't built by a single article. It requires consistency."
        ],
        pullQuote: "Over time, steady visibility creates a reputation that no generic, faceless blog ever will."
      }
    ]
  },
  {
    id: "writing-that-resonates",
    number: 6,
    title: "Writing That Resonates",
    subtitle: "Clarity signals mastery",
    hook: "Why the best legal writers sound nothing like lawyers",
    actionItems: [
      { text: "Review your 3 most recent articles — rewrite headlines for clarity and engagement", priority: "quick-win" },
      { text: "Create an internal style guide that prioritizes plain language", priority: "strategic" },
      { text: "Implement a 'client readability test' before publishing any article", priority: "long-term" },
    ],
    content: [
      {
        paragraphs: [
          "Some articles stand out — they are more engaging, easier to follow, and more likely to make you remember the firms behind them. What sets them apart isn't just legal knowledge. It's how that knowledge is framed.",
          "This isn't about storytelling in a literary sense. It's about adding context, clarity, and relevance."
        ],
        comparison: {
          before: { title: "Typical Legal Writing", items: ["Dense paragraphs of legalese", "No context for why it matters", "Written for lawyers, not clients", "Generic conclusions"] },
          after: { title: "Writing That Resonates", items: ["Clear, scannable structure", "Leads with 'why it matters to you'", "Written in the client's language", "Actionable takeaways"] }
        }
      },
      {
        heading: "The Power of Simplicity",
        paragraphs: [
          "Many legal professionals believe that to appear credible, they need to write in highly technical, complex language. However, even readers fluent in legalese appreciate writing that respects their time."
        ],
        pullQuote: "True expertise isn't about the ability to construct a paragraph-long sentence. It's about making complicated concepts easy to understand.",
        deepDive: {
          title: "The Flesch-Kincaid Readability Test",
          content: "The Flesch-Kincaid readability test measures how easy a text is to understand. Most successful business content scores between 60-70 (easily understood by 13-15 year olds). The average law firm article scores below 30. While you don't need to 'dumb down' your content, running your drafts through a readability checker can reveal where overly complex sentence structures are hiding clear ideas."
        }
      },
      {
        heading: "What Good Legal Writing Looks Like",
        paragraphs: [
          "The best legal writing goes beyond sharing what the law says. It highlights why it matters. It starts with clear context, explains who will benefit in concrete terms, and anticipates practical challenges."
        ],
        pullQuote: "In a saturated content landscape, clarity is an edge. That's not just good writing — that's good marketing."
      }
    ]
  },
  {
    id: "website-checklist",
    number: 7,
    title: "The Website Checklist",
    subtitle: "16 essentials every law firm website needs",
    hook: "The definitive 16-point inspection for your firm's site",
    actionItems: [
      { text: "Run through the 16-point checklist against your current website", priority: "quick-win" },
      { text: "Fix the top 3 gaps identified in your audit", priority: "strategic" },
      { text: "Schedule quarterly website audits using this checklist", priority: "long-term" },
    ],
    content: [
      {
        paragraphs: [
          "When a potential client lands on your firm's website, do they instantly know what your firm does, what makes it different, and why they should trust your legal experts? Many law firms, chasing the fanciest possible version of their site, get distracted from the real purpose: to build trust, fast."
        ],
        stat: {
          value: "75%",
          label: "of users judge a company's credibility based on their website design"
        }
      },
      {
        heading: "The Essentials",
        numbered: [
          "Strong positioning — Why should someone choose you over another firm?",
          "A clear, authoritative voice — Don't try to sound like every other firm. Communicate your personality through clear, direct language.",
          "A thought leadership section — Regularly publishing insights showcases expertise and improves search visibility.",
          "Easy navigation — Keep your menu simple and intuitive.",
          "Detailed profiles of legal experts — Highlight deals and types of clients each lawyer has experience with.",
          "Clear practice areas — Make your practice areas front and center with individual pages.",
          "Conversion points — Give visitors a low-commitment way to stay connected (newsletters, guides).",
          "Social proof — Testimonials, deals, and cases your firm has handled.",
          "Mobile-optimized design — As of 2025, mobile devices account for 63.58% of all website traffic.",
          "Fast loading — A slow site feels outdated and unprofessional.",
          "Local SEO — A large volume of legal searches is local. Ensure consistency across directories.",
          "Accessibility compliance — Readable fonts, clear structure, alt text, keyboard navigation, sharp contrasts.",
          "Privacy policy and disclaimers — They build trust and show you take compliance seriously.",
          "Analytics, tracking, and GDPR compliance — Proper cookie consent and tracking notices.",
          "Secure hosting and backups — HTTPS-secure, regularly updated, and backed up.",
          "Clean, polished design — Consistent fonts, spacing, and visuals. No clutter."
        ]
      }
    ]
  },
  {
    id: "practice-area-pages",
    number: 8,
    title: "Revitalizing Practice Area Pages",
    subtitle: "Turn boring pages into your site's most persuasive asset",
    hook: "Your most visited pages are probably your weakest",
    actionItems: [
      { text: "Rewrite your top practice area page to lead with client challenges", priority: "quick-win" },
      { text: "Add case examples and outcomes to each practice area page", priority: "strategic" },
      { text: "Build a practice area page template with client-centric structure", priority: "long-term" },
    ],
    content: [
      {
        paragraphs: [
          "If there's one corner of a law firm website guaranteed to induce a yawn, it's the practice area pages. In 99% of cases, users are greeted with a couple of generic paragraphs followed by a laundry list of services.",
          "These pages segment your audience by practice area — that's marketing gold. So why waste that moment with dull paragraphs no one reads?"
        ],
        callout: {
          type: "mistake",
          content: "\"Our firm is a recognized leader in corporate law\" — This tells the client nothing about how you solve their problems. Lead with their challenge instead."
        }
      },
      {
        heading: "Current Issues",
        bullets: [
          "They are firm-centric, not client-centric. \"Our firm is a recognized leader\" vs. \"Facing pressure from investors on ESG disclosures?\"",
          "They offer laundry lists without explaining the value behind services",
          "The experts are practically invisible — a headshot and title tell visitors almost nothing",
          "They have a high bounce rate due to lack of focused messaging",
          "They are often static and outdated"
        ]
      },
      {
        heading: "A Quick Checklist to Revitalize",
        bullets: [
          "Lead with the client's challenge",
          "Focus on outcomes, not just services",
          "Show examples of client impact",
          "Keep things fresh with recent articles and regulatory updates",
          "Make it easy to navigate with clear headings and short paragraphs",
          "Nudge visitors toward the next step — guides, calls, self-assessment tools",
          "Use the client's language — their pain points first, your accolades second"
        ],
        pullQuote: "Stop letting your practice area pages put clients to sleep. Shift the focus to their problems, show real results, and make your content worth reading."
      }
    ]
  },
  {
    id: "website-ownership",
    number: 9,
    title: "Own Your Website",
    subtitle: "Why in-house management is a strategic imperative",
    hook: "Stop outsourcing your most important digital asset",
    actionItems: [
      { text: "Audit your current agency dependency — list what you can't update yourself", priority: "quick-win" },
      { text: "Train your marketing team on CMS basics for independent updates", priority: "strategic" },
      { text: "Migrate to a CMS your team can manage without agency support", priority: "long-term" },
    ],
    content: [
      {
        paragraphs: [
          "Many law firms treat their website as a project to be handed off to an external agency. However, outsourcing all website management is a strategic — and, more often than not, financial — mistake."
        ]
      },
      {
        heading: "1. Your Website Is an Extension of Your Firm",
        paragraphs: [
          "The strongest law firm websites reflect their identity in an authentic way. Relying on an external party ensures the site quickly falls out of sync with the firm's reality."
        ]
      },
      {
        heading: "2. Agility Matters",
        paragraphs: [
          "There are daily or weekly developments that websites should accommodate: new deals, regulatory updates, industry events. Having someone in-house means having the ability to respond instantly."
        ]
      },
      {
        heading: "3. Control Costs",
        paragraphs: [
          "With just a bit of training, your marketers can implement changes in minutes. What takes an agency a week could take your team literal minutes."
        ]
      },
      {
        heading: "4. Avoid Vendor Lock-Ins",
        paragraphs: [
          "Many agencies build on proprietary platforms. By maintaining in-house ownership on a widely-supported CMS, firms retain control over their business asset."
        ],
        pullQuote: "Your website management shouldn't feel like a hostage negotiation."
      },
      {
        heading: "Building a Professional Website",
        bullets: [
          "Get moving — A clean, well-structured site can go live in weeks",
          "Don't overpay — You're not building the next Facebook",
          "Stay in control — Avoid proprietary systems",
          "Cut through the jargon — Ask agencies to show you how you'll make changes yourself"
        ],
        pullQuote: "A good website is a tool to connect with clients. It shouldn't be a soul-sucking project that drains your time and budget."
      }
    ]
  },
  {
    id: "messaging-positioning",
    number: 10,
    title: "Messaging & Positioning",
    subtitle: "Skip the buzzwords. Say something real.",
    hook: "Stand out in a sea of 'trusted advisors'",
    actionItems: [
      { text: "List your firm's top 3 genuine differentiators — no buzzwords allowed", priority: "quick-win" },
      { text: "Rewrite your homepage headline to reflect what makes you different", priority: "strategic" },
      { text: "Develop a brand voice guide with approved and banned phrases", priority: "long-term" },
    ],
    content: [
      {
        paragraphs: [
          "\"Leading law firm.\" \"Trusted advisors.\" \"Your reliable partner.\" \"First-class services.\" Throw in a corporate stock photo of a handshake and you've got the full set.",
          "When did law firms get together and agree to say exactly the same thing?"
        ],
        pullQuote: "Saying you're premier on repeat doesn't magically convince prospects that you are.",
        callout: {
          type: "mistake",
          content: "If you replaced your firm's name with any competitor's name on your homepage and the messaging still works — your positioning needs work."
        }
      },
      {
        heading: "The Sea of Sameness",
        paragraphs: [
          "Firms look at their competitors and try to \"fit the mold.\" This cookie-cutter approach creates a sea of sameness with no personality behind the brand."
        ]
      },
      {
        heading: "Boutique vs. Large Firms",
        paragraphs: [
          "Large firms can get away with generic messages — they've got the name, the history, the army of lawyers. Small firms don't have that luxury.",
          "What boutique firms have is deep focus, tailored solutions, direct access to senior experts, and speed. These are the foundations they should compete on."
        ]
      },
      {
        heading: "Firms That Stand Out",
        bullets: [
          "\"We are problem solvers\" — Isikal Law Office",
          "\"From legal complexity to business clarity\" — AMB Legal Group",
          "\"Tell us your target\" — Pekin & Pekin"
        ],
        pullQuote: "The firms that stand out aren't necessarily the biggest. They're the ones that know who they are, what they're good at, and who they're here to help."
      }
    ]
  },
  {
    id: "marketing-as-strategy",
    number: 11,
    title: "Marketing as a Strategic Function",
    subtitle: "Give marketers a seat at the table",
    hook: "Marketing isn't a cost center — it's your growth engine",
    actionItems: [
      { text: "Include your marketing lead in the next partners' meeting", priority: "quick-win" },
      { text: "Define 3 measurable marketing KPIs tied to business development goals", priority: "strategic" },
      { text: "Build an annual marketing strategy aligned with firm growth objectives", priority: "long-term" },
    ],
    content: [
      {
        paragraphs: [
          "Marketing isn't an afterthought. It's a strategic function. Yet many law firms still sideline the very people they've brought in to help them grow.",
          "Today's clients do their own homework — Googling your firm, checking out individual lawyers, reading your articles, and comparing you to competitors. All before they make the first call."
        ],
        stat: {
          value: "70%",
          label: "of the buying decision is made before a prospect ever contacts your firm"
        }
      },
      {
        heading: "What Real Marketers Deliver",
        bullets: [
          "Crystallize your firm's positioning and tone of voice — no more generic buzzwords",
          "Align branding across all channels for consistent trust-building",
          "Unify metrics and analytics — measure what drives new business, not just likes",
          "Evaluate and amplify thought leadership — make content more engaging and visible"
        ]
      },
      {
        heading: "Consistency Is Everything",
        paragraphs: [
          "One-off LinkedIn posts or occasional event participation won't build reputation. Marketing thrives on consistency: content calendars, dedicated resources, performance data, and long-term relationships with industry partners."
        ],
        pullQuote: "Good marketing gets visibility. Great marketing gets the right visibility."
      },
      {
        paragraphs: [
          "If you've hired a marketer with real experience, don't just give them a laundry list of tasks. Give them a seat at the table. Let them challenge outdated assumptions and push your firm forward."
        ]
      }
    ]
  },
  {
    id: "building-credibility",
    number: 12,
    title: "Building Credibility",
    subtitle: "Three pillars for smaller firms",
    hook: "Build trust from zero with three proven pillars",
    actionItems: [
      { text: "Write your firm's 'origin story' in authentic, non-corporate language", priority: "quick-win" },
      { text: "Run a website performance audit (speed, mobile, accessibility)", priority: "strategic" },
      { text: "Launch a monthly thought leadership article series in your niche", priority: "long-term" },
    ],
    content: [
      {
        paragraphs: [
          "In the legal industry, trust and credibility are foundational. Smaller firms that don't yet have name recognition have to build trust from the ground up.",
          "The hard part is having real expertise. But once your firm has that, projecting credibility isn't rocket science."
        ]
      },
      {
        heading: "1. Authentic Messaging",
        paragraphs: [
          "Projecting credibility isn't about sounding grandiose or using buzzwords. Focus on what truly sets your firm apart — who you cater to, what problems you solve, your specific strengths.",
          "Develop a voice for your brand. Sounding professional doesn't mean being impersonal. Find the balance between polished and genuine."
        ]
      },
      {
        heading: "2. A Sleek Website",
        paragraphs: [
          "Your website is often the first touchpoint. A polished website is about mobile responsiveness, accessibility, fast loading times, easy navigation, and clean structure.",
          "Your website won't magically win clients by itself. But a clunky design, broken links, and confusing layout will create unnecessary barriers."
        ]
      },
      {
        heading: "3. Thought Leadership",
        paragraphs: [
          "Thought leadership isn't about being the loudest. It's about consistently sharing valuable insights that demonstrate your expertise in a niche area."
        ],
        pullQuote: "Credibility in the legal industry can't be conjured out of thin air. It's built brick by brick — how your firm shows up, communicates, and differentiates itself."
      }
    ]
  },
  {
    id: "what-gcs-want",
    number: 13,
    title: "What General Counsel Really Want",
    subtitle: "Insights from 130+ in-house interviews",
    hook: "Direct insights from the people who hire law firms",
    actionItems: [
      { text: "Review your firm's pitch deck through the lens of the 7 GC priorities", priority: "quick-win" },
      { text: "Train client-facing lawyers on proactive advisory approaches", priority: "strategic" },
      { text: "Build a GC feedback program — annual survey of your top 10 clients", priority: "long-term" },
    ],
    content: [
      {
        paragraphs: [
          "Based on extensive interviews with general counsel across CEE, we've identified the fundamental factors that play a role in their decision-making process when choosing a law firm."
        ],
        stat: {
          value: "130+",
          label: "in-house counsel interviewed across Central & Eastern Europe"
        }
      },
      {
        heading: "1. Expertise and Specialization",
        paragraphs: [
          "General counsel engage law firms that showcase deep levels of expertise. They look for firms with a proven track record in a specialized area."
        ],
        pullQuote: "\"Various competencies are required from a strategic partner — a wide scope of expertise, strong technical knowledge, social intelligence to follow your needs, responsive team.\""
      },
      {
        heading: "2. Understanding the Business",
        paragraphs: [
          "GCs want advisors who understand their business, not just the law. External counsel becomes a long-term partner when they go beyond handling individual matters."
        ]
      },
      {
        heading: "3. Trust and Reputation",
        paragraphs: [
          "GCs pay close attention to reputation. Trust is integral to long-term partnership."
        ],
        pullQuote: "\"Reputation is the most important factor, though not necessarily based on top-tier rankings. We rely more on recommendations from other in-house lawyers.\""
      },
      {
        heading: "4. Responsiveness and Speed",
        paragraphs: [
          "Law firms that make their experts available and easy to communicate with are more likely to turn into long-term partners."
        ]
      },
      {
        heading: "5. Cost and Efficiency",
        paragraphs: [
          "Cost inevitably plays an important role, but GCs don't want it to come at the expense of quality."
        ],
        pullQuote: "\"I want tailored, relevant advice — not dozens of pages of boilerplate content.\""
      },
      {
        heading: "6. Long-Term Partnership",
        paragraphs: [
          "In-house teams value consistency. They want firms that can become strategic partners in the long run."
        ]
      },
      {
        heading: "7. Proactive, Solution-Oriented Advice",
        paragraphs: [
          "GCs favor proactive over reactive advisors. They want firms that anticipate challenges and provide grounded advice."
        ],
        pullQuote: "\"I don't want someone who only responds to a questionnaire. I want someone who brings ideas to the table. Experience matters, but it's really about mindset.\""
      }
    ]
  },
  {
    id: "common-mistakes",
    number: 14,
    title: "Common Website Mistakes",
    subtitle: "Small oversights that chip away at credibility",
    hook: "10 mistakes that silently hurt your firm's reputation",
    actionItems: [
      { text: "Check your website footer — is the copyright year current?", priority: "quick-win" },
      { text: "Test all expandable sections and social links for broken functionality", priority: "quick-win" },
      { text: "Conduct a full UX audit covering all 10 mistake categories", priority: "strategic" },
    ],
    content: [
      {
        paragraphs: [
          "Law firms can claim to be next-gen, world-class, or strategic until the cows come home. None of it matters if clarity and proof are nowhere to be found."
        ]
      },
      {
        heading: "The Mistakes to Avoid",
        numbered: [
          "Outdated copyright year in the footer — a simple update that shows your site is current",
          "Expandable sections with no content — if you're not ready to fill it, leave the feature out",
          "Social media icons that don't link anywhere — better to leave them out until they're ready",
          "Opening every link in a new window — keep browsing smooth and uncluttered",
          "Neglected footers — this is prime real estate for contacts, offices, and regulatory details",
          "Anonymous testimonials — credibility grows when praise is linked to a name",
          "Broken Google Maps widgets — a quick fix that ensures clients can find you",
          "Hamburger menus on desktop — on larger screens, clear navigation is better",
          "Pages showing \"Published by Admin\" — pages like \"About\" or \"Our Team\" shouldn't display author or publication dates",
          "Hover-over effects as afterthoughts — buttons and links should become clearer, not disappear, when interacted with"
        ],
        callout: {
          type: "quick-win",
          content: "Most of these fixes take less than 30 minutes each. Start with the footer copyright year and broken social links — they're the quickest wins with immediate credibility impact."
        }
      },
      {
        heading: "What's Working Well",
        paragraphs: [
          "Some firms in the region are getting it right:"
        ],
        bullets: [
          "Showcasing experience through dedicated notable clients pages with linked case details",
          "Keeping rankings and recognition sections up to date",
          "Active newsrooms with legal developments, not just firm news",
          "Client tools sections offering courses, apps, and benchmarking resources",
          "Downloadable guide libraries covering practical topics",
          "Clearly defined service packages that bring clarity to what clients can expect",
          "Consistent LinkedIn presence with daily updates embedded on the homepage",
          "Expert profiles highlighting key deals individual lawyers have led"
        ],
        pullQuote: "These examples show how even small, well-executed choices can make a difference. Sometimes, it's not about a full overhaul. It's about doing a few important things well."
      }
    ]
  }
];
