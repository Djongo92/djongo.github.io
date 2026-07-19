export interface SwipeItem {
  id: string;
  category: "Hero" | "Intake form" | "Bio page" | "Email sequence" | "Google Ad" | "LinkedIn post" | "Case study" | "Newsletter";
  practiceArea: string;
  title: string;
  why: string;
  copy: string;
}

export const swipeFile: SwipeItem[] = [
  {
    id: "hero-litigation",
    category: "Hero",
    practiceArea: "Commercial Litigation",
    title: "When the bet-the-company lawsuit lands on your desk.",
    why: "Names the moment of pain instead of describing the firm. Forces the visitor to self-identify. No 'trusted advisor' filler.",
    copy: `H1: When the bet-the-company lawsuit lands on your desk.\nSub: We're the firm general counsel calls when losing isn't an option. Federal trial experience across 14 states. 91% favorable outcomes since 2018.\nCTA: Book a confidential strategy call →`,
  },
  {
    id: "hero-ip",
    category: "Hero",
    practiceArea: "Intellectual Property",
    title: "Patents that survive litigation. Not just ones that get granted.",
    why: "Differentiates on the only metric that matters to a sophisticated buyer of patent prosecution.",
    copy: `H1: Patents that survive litigation. Not just ones that get granted.\nSub: Every claim we draft is reviewed by a former Federal Circuit clerk. Because issuance is the easy part.\nCTA: Get a portfolio audit →`,
  },
  {
    id: "intake-pi",
    category: "Intake form",
    practiceArea: "Personal Injury",
    title: "3-question intake that triples qualified consultations",
    why: "Asks the disqualifying questions first (date of incident, jurisdiction, treatment status) so you stop wasting partner time on bad fits.",
    copy: `Step 1 of 3: When did the incident happen?\n[ ] Within the last 30 days\n[ ] 1–6 months ago\n[ ] More than 6 months ago\n[ ] Not sure\n\nStep 2 of 3: Where did it happen?\n[State dropdown]\n\nStep 3 of 3: Have you spoken to insurance yet?\n[ ] No, not yet\n[ ] Yes, but only to report\n[ ] Yes, they made an offer\n\n→ Show calendar only if qualified.`,
  },
  {
    id: "bio-corporate",
    category: "Bio page",
    practiceArea: "Corporate / M&A",
    title: "Bio that opens with a deal, not a degree.",
    why: "Buyers want pattern-matching: 'has she done a deal like mine?' Lead with proof, not provenance.",
    copy: `Sarah closed a $1.2B cross-border carve-out from signing to close in 47 days — the fastest in her firm's history.\n\nShe's spent 14 years guiding founders, PE sponsors, and strategic acquirers through the deals that define their careers. Clients call her 'the closer' because once she's in the room, the deal gets done.\n\nRecent: Lead counsel on 9 transactions over $250M in the past 18 months. Speaks German and Mandarin. JD, Harvard. Was a chess national before law school — and it shows.`,
  },
  {
    id: "email-nurture-1",
    category: "Email sequence",
    practiceArea: "Estate Planning",
    title: "Day-1 email that doesn't sound like a law firm",
    why: "First sentence creates curiosity. No 'Welcome to our newsletter.' No legal disclaimers in the opener.",
    copy: `Subject: The thing nobody tells you about your will\n\nMost people think a will is the finish line.\n\nIt's actually the starting gun.\n\nTomorrow I'll send you the 4 documents that matter more than your will — and the one that almost nobody has, until it's too late.\n\nSee you tomorrow,\nElizabeth\n\nP.S. Reply with the word 'family' if you have minor kids. I'll send you something specific.`,
  },
  {
    id: "google-ad-divorce",
    category: "Google Ad",
    practiceArea: "Family Law",
    title: "Headline that converts at 14% on 'high-asset divorce'",
    why: "Speaks to the silent fear (asset hiding) instead of generic 'compassionate representation'.",
    copy: `H1: When Your Spouse Has Hired the Best Forensic Accountant\nH2: We've Found $40M in Hidden Assets Across 200 Cases\nDesc: Confidential consultation. No paperwork required to start. Discreet office entry.`,
  },
  {
    id: "linkedin-tax",
    category: "LinkedIn post",
    practiceArea: "Tax",
    title: "Hook formula: contrarian + specific + named",
    why: "Pattern interrupts the 'thought leadership' sludge. Three specific numbers > one vague principle.",
    copy: `Most tax lawyers get this backwards.\n\nThey optimize for the lowest effective rate this year.\n\nWe just helped a founder pay 4.7% MORE this year — to save $11.3M over the next decade.\n\nHere's the framework we used (and why your CPA probably won't suggest it):\n\n[1] Look at your exit window, not your fiscal year.\n[2] Map your future basis events.\n[3] Optimize across the holding period, not the tax year.\n\nYour CPA's job is to win the year. Your tax lawyer's job is to win the decade.`,
  },
  {
    id: "case-study-employment",
    category: "Case study",
    practiceArea: "Employment",
    title: "Case study that reads like a thriller",
    why: "Story structure: stakes → twist → outcome. Numbers are specific. No legal jargon.",
    copy: `THE CALL: 4:47 PM on a Friday. The CEO of a 2,400-person manufacturer. A class action filed that morning. 380 plaintiffs. $94M in claimed damages. Trial date in 6 months.\n\nTHE TWIST: On day 9, our team found a single misclassified document in their HR archive. It changed everything.\n\nTHE OUTCOME: Class certification denied. Settled the remaining 11 individual claims for $240K combined. The CEO kept his job. The company kept its credit rating.\n\nElapsed time: 4 months, 3 weeks. From $94M exposure to $240K resolution.`,
  },
  {
    id: "newsletter-realestate",
    category: "Newsletter",
    practiceArea: "Real Estate",
    title: "Monthly note that gets 64% open rate",
    why: "One useful idea, two minutes to read, ends with a soft signal of what you do.",
    copy: `Subject: The clause that just cost a developer $3.2M\n\nIn September, a Chicago developer lost a $3.2M arbitration over 11 words.\n\nThe clause: 'Tenant shall be responsible for all repairs of a non-structural nature.'\n\nThe building's HVAC failed. The arbitrator ruled HVAC = non-structural. The developer paid.\n\nIf you have a commercial lease drafted before 2021, those 11 words might be in yours. We're offering a free 20-minute review for the next 10 readers who reply.\n\nReply 'review' and we'll send a calendar link.`,
  },
  {
    id: "hero-immigration",
    category: "Hero",
    practiceArea: "Immigration",
    title: "EB-5 hero that names the buyer's exact fear",
    why: "Visa rejection is an existential, not commercial, fear. Lead with the fear, not the credential.",
    copy: `H1: Your green card. Approved on the first filing. Or we work for free.\nSub: 1,400 EB-5 approvals. 0 denials in the past 36 months. Backed by a refund guarantee no other firm offers.\nCTA: See if you qualify in 90 seconds →`,
  },
];