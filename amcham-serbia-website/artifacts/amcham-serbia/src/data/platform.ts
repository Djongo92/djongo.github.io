export type Sector = "Manufacturing" | "Pharma" | "IT" | "Logistics" | "Finance" | "FMCG" | "Energy" | "Retail" | "Legal" | "Consulting" | "Banking" | "Services";
export type Tier = "Patron" | "Corporate" | "Business" | "NGO" | "Premium" | "Startup";

export interface Company {
  id: string;
  name: string;
  sector: Sector;
  location: string;
  employees: number;
  exporter: boolean;
  tier: Tier;
  score: number;
  scoreTrend: number;
  since: number;
  fee: string;
  manager: string;
  renewalDate: string;
  avatar: string;
  description: string;
  lifecycle: 'onboarding' | 'active' | 'at-risk' | 'renewing';
  contactFreshness: 'fresh' | 'stale' | 'unknown';
  lastInteraction: string;
}

export const companies: Company[] = [
  { id: "adr", name: "Adriatica Grupa", sector: "Manufacturing", location: "Kragujevac", employees: 1240, exporter: true, tier: "Patron", score: 62, scoreTrend: -9, since: 2004, fee: "€18k", manager: "Marija Jovanović", renewalDate: "Oct 2026", avatar: "A", description: "Leading manufacturer of industrial components for the European automotive supply chain.", lifecycle: 'at-risk', contactFreshness: 'stale', lastInteraction: '12d ago' },
  { id: "hmo", name: "Hemofarm", sector: "Pharma", location: "Vršac", employees: 3400, exporter: true, tier: "Patron", score: 88, scoreTrend: 2, since: 2002, fee: "€18k", manager: "Nikola Krstić", renewalDate: "Jan 2027", avatar: "H", description: "The largest regional pharmaceutical company, producing over 5 billion tablets annually.", lifecycle: 'active', contactFreshness: 'fresh', lastInteraction: '2d ago' },
  { id: "ncr", name: "NCR Atleos", sector: "IT", location: "Belgrade", employees: 5000, exporter: true, tier: "Patron", score: 91, scoreTrend: 5, since: 2011, fee: "€18k", manager: "Ana Savić", renewalDate: "Mar 2027", avatar: "N", description: "Global technology hub driving innovations in ATM and digital banking infrastructure.", lifecycle: 'active', contactFreshness: 'fresh', lastInteraction: '5d ago' },
  { id: "sls", name: "S-Leasing", sector: "Finance", location: "Belgrade", employees: 150, exporter: false, tier: "Corporate", score: 45, scoreTrend: -12, since: 2008, fee: "€5k", manager: "Jelena Kostić", renewalDate: "Aug 2026", avatar: "S", description: "Specialized financial institution focusing on commercial vehicle and equipment leasing.", lifecycle: 'at-risk', contactFreshness: 'stale', lastInteraction: '45d ago' },
  { id: "pmp", name: "Philip Morris", sector: "FMCG", location: "Niš", employees: 900, exporter: true, tier: "Patron", score: 94, scoreTrend: 1, since: 2003, fee: "€18k", manager: "Marko Ristić", renewalDate: "Dec 2026", avatar: "P", description: "Pioneering smoke-free products and modernizing the Serbian tobacco industry.", lifecycle: 'active', contactFreshness: 'fresh', lastInteraction: '1w ago' },
  { id: "ccbc", name: "Coca-Cola HBC", sector: "FMCG", location: "Zemun", employees: 1100, exporter: true, tier: "Patron", score: 85, scoreTrend: 4, since: 2001, fee: "€18k", manager: "Marija Jovanović", renewalDate: "Feb 2027", avatar: "C", description: "Strategic bottling partner serving Serbia and Montenegro with comprehensive beverage portfolio.", lifecycle: 'active', contactFreshness: 'fresh', lastInteraction: '3d ago' },
  { id: "nrb", name: "NIS a.d.", sector: "Energy", location: "Novi Sad", employees: 4000, exporter: true, tier: "Patron", score: 76, scoreTrend: -3, since: 2006, fee: "€18k", manager: "Stefan Mitić", renewalDate: "May 2026", avatar: "N", description: "Integrated energy company managing upstream and downstream operations across the Balkans.", lifecycle: 'renewing', contactFreshness: 'fresh', lastInteraction: '2w ago' },
  { id: "dlz", name: "Delhaize Serbia", sector: "Retail", location: "Belgrade", employees: 13000, exporter: false, tier: "Patron", score: 92, scoreTrend: 8, since: 2011, fee: "€18k", manager: "Ana Savić", renewalDate: "Sep 2026", avatar: "D", description: "Largest retail chain in Serbia, operating Maxi, Mega Maxi, and Shop&Go networks.", lifecycle: 'active', contactFreshness: 'fresh', lastInteraction: '4d ago' },
  { id: "msft", name: "Microsoft", sector: "IT", location: "Belgrade", employees: 600, exporter: true, tier: "Patron", score: 89, scoreTrend: -2, since: 2002, fee: "€18k", manager: "Nikola Krstić", renewalDate: "Nov 2026", avatar: "M", description: "Microsoft Development Center Serbia, one of the most critical engineering hubs in Europe.", lifecycle: 'active', contactFreshness: 'fresh', lastInteraction: '1d ago' },
  { id: "pwc", name: "PwC Serbia", sector: "Consulting", location: "Belgrade", employees: 300, exporter: false, tier: "Corporate", score: 71, scoreTrend: 1, since: 2001, fee: "€5k", manager: "Jelena Kostić", renewalDate: "Jul 2026", avatar: "P", description: "Providing industry-focused assurance, tax, and advisory services to build public trust.", lifecycle: 'renewing', contactFreshness: 'fresh', lastInteraction: '3w ago' },
  { id: "kpmg", name: "KPMG", sector: "Consulting", location: "Belgrade", employees: 350, exporter: false, tier: "Corporate", score: 68, scoreTrend: -4, since: 2001, fee: "€5k", manager: "Marko Ristić", renewalDate: "Jun 2026", avatar: "K", description: "Audit, tax and advisory services designed to mitigate risks and grasp opportunities.", lifecycle: 'renewing', contactFreshness: 'fresh', lastInteraction: '1m ago' },
  { id: "kar", name: "Karanovic & Partners", sector: "Legal", location: "Belgrade", employees: 120, exporter: true, tier: "Business", score: 82, scoreTrend: 5, since: 2005, fee: "€2.5k", manager: "Marija Jovanović", renewalDate: "Apr 2027", avatar: "K", description: "Regional legal practice offering cross-border corporate and commercial legal advice.", lifecycle: 'active', contactFreshness: 'fresh', lastInteraction: '5d ago' },
  { id: "nkt", name: "Nelt Co", sector: "Logistics", location: "Dobanovci", employees: 4200, exporter: true, tier: "Patron", score: 79, scoreTrend: 2, since: 2008, fee: "€18k", manager: "Stefan Mitić", renewalDate: "Oct 2026", avatar: "N", description: "Leading regional distribution and logistics company operating across the Balkans.", lifecycle: 'renewing', contactFreshness: 'fresh', lastInteraction: '2d ago' },
  { id: "mcb", name: "UniCredit Bank", sector: "Finance", location: "Belgrade", employees: 1200, exporter: false, tier: "Patron", score: 81, scoreTrend: 6, since: 2003, fee: "€18k", manager: "Ana Savić", renewalDate: "Dec 2026", avatar: "U", description: "Pan-European commercial bank delivering unique corporate and retail financial solutions.", lifecycle: 'active', contactFreshness: 'fresh', lastInteraction: '1w ago' },
  { id: "sbb", name: "SBB", sector: "IT", location: "Belgrade", employees: 1800, exporter: false, tier: "Corporate", score: 55, scoreTrend: -15, since: 2009, fee: "€5k", manager: "Nikola Krstić", renewalDate: "Jan 2027", avatar: "S", description: "Premier broadband internet and pay-TV provider in Serbia.", lifecycle: 'at-risk', contactFreshness: 'stale', lastInteraction: '2m ago' },
  { id: "ibm", name: "IBM Serbia", sector: "IT", location: "Belgrade", employees: 200, exporter: true, tier: "Corporate", score: 64, scoreTrend: -5, since: 2004, fee: "€5k", manager: "Marko Ristić", renewalDate: "Feb 2027", avatar: "I", description: "Enterprise IT solutions, cloud computing, and AI consulting services.", lifecycle: 'active', contactFreshness: 'fresh', lastInteraction: '3w ago' },
  { id: "bky", name: "Bambi", sector: "FMCG", location: "Požarevac", employees: 800, exporter: true, tier: "Corporate", score: 77, scoreTrend: 3, since: 2010, fee: "€5k", manager: "Jelena Kostić", renewalDate: "May 2026", avatar: "B", description: "Iconic domestic confectionery manufacturer, part of the Coca-Cola HBC family.", lifecycle: 'active', contactFreshness: 'fresh', lastInteraction: '1w ago' },
  { id: "mtk", name: "Metalac", sector: "Manufacturing", location: "Gornji Milanovac", employees: 2100, exporter: true, tier: "Corporate", score: 73, scoreTrend: 1, since: 2012, fee: "€5k", manager: "Stefan Mitić", renewalDate: "Aug 2026", avatar: "M", description: "European leader in cookware manufacturing with a robust regional retail network.", lifecycle: 'renewing', contactFreshness: 'fresh', lastInteraction: '2w ago' },
  { id: "tln", name: "Yettel", sector: "IT", location: "Belgrade", employees: 1400, exporter: false, tier: "Patron", score: 86, scoreTrend: 7, since: 2006, fee: "€18k", manager: "Marija Jovanović", renewalDate: "Mar 2027", avatar: "Y", description: "Digital mobile network operator driving 5G adoption and digital services.", lifecycle: 'active', contactFreshness: 'fresh', lastInteraction: '3d ago' },
  { id: "stada", name: "STADA IT Solutions", sector: "IT", location: "Vršac", employees: 150, exporter: true, tier: "Business", score: 48, scoreTrend: -8, since: 2018, fee: "€2.5k", manager: "Nikola Krstić", renewalDate: "Nov 2026", avatar: "S", description: "Global IT competence center for the STADA Group.", lifecycle: 'at-risk', contactFreshness: 'unknown', lastInteraction: '3m ago' }
];

export const platformData = {
  member: companies[0],
  allMembers: companies,
  console: {
    ritual: {
      streak: 4,
      items: [
        { id: "rit-1", companyId: "adr", tag: "RENEWAL RISK", text: "Score dropped 15 points this quarter. No portal logins from C-suite.", action: "Needs call", urgency: "High", expectedValue: "€18k", confidence: "95%", source: "Platform Analytics", owner: "Marija J.", dueDate: "Today", channel: "Phone" },
        { id: "rit-2", companyId: "stada", tag: "OPPORTUNITY", text: "Growing team in Vršac. Might be interested in Tech Committee.", action: "Suggest Intro", urgency: "Medium", expectedValue: "€2.5k upgrade", confidence: "70%", source: "LinkedIn Alert", owner: "Nikola K.", dueDate: "This Week", channel: "Email" },
        { id: "rit-3", companyId: "sbb", tag: "CHURN WARNING", text: "Score at 55. Primary contact left company.", action: "Find new contact", urgency: "Critical", expectedValue: "€5k", confidence: "99%", source: "Bouncer / Email Bounce", owner: "Nikola K.", dueDate: "Tomorrow", channel: "LinkedIn" }
      ]
    },
    retention: [
      { id: "sls", companyId: "sls", risk: "High", reason: "Zero attendance in 2026", impact: "€5k", intervention: "Broker meeting with Finance Committee chair", stage: "Investigation", owner: "Jelena K.", deadline: "Oct 20", evidence: "No event registrations. Last portal login 45d ago.", measurableOutcome: "Target: 1 C-Level event registration in Q4" },
      { id: "stada", companyId: "stada", risk: "Medium", reason: "Score dropped 8pts", impact: "€2.5k", intervention: "Invite to IT roundtable", stage: "Intervention", owner: "Nikola K.", deadline: "Nov 5", evidence: "Did not join Tech Committee despite mandate.", measurableOutcome: "Target: Committee application submitted" },
      { id: "adr", companyId: "adr", risk: "Medium", reason: "Score dropped 9pts", impact: "€18k", intervention: "Schedule health check with CEO", stage: "Planning", owner: "Marija J.", deadline: "Oct 15", evidence: "Mismatched expectations on policy advocacy.", measurableOutcome: "Target: Health check meeting held" },
      { id: "sbb", companyId: "sbb", risk: "High", reason: "Contact attrition", impact: "€5k", intervention: "Identify new C-level sponsor via LinkedIn", stage: "Action Required", owner: "Nikola K.", deadline: "Oct 12", evidence: "Bounce emails from primary contact.", measurableOutcome: "Target: New primary contact designated" },
      { id: "kpmg", companyId: "kpmg", risk: "Low", reason: "Missed 2 events", impact: "€5k", intervention: "Send policy digest directly", stage: "Monitoring", owner: "Marko R.", deadline: "Nov 30", evidence: "Two no-shows for registered events.", measurableOutcome: "Target: Newsletter open rate > 50%" }
    ],
    outreach: {
      stats: { queue: 12, onCadence: 247, timePerPerson: "31m" },
      items: [
        { id: "out-1", companyId: "adr", tier: "Patron", overdue: 12, lastTouch: "71d ago", owner: "Marija", reason: "Score drop", channel: "Phone", quietHours: false, context: "Need to address recent complaints about event formats.", status: "overdue" },
        { id: "out-2", companyId: "sls", tier: "Corporate", overdue: 5, lastTouch: "45d ago", owner: "Jelena", reason: "Renewal in 90 days", channel: "Email", quietHours: true, context: "Standard 90-day pre-renewal check-in.", status: "overdue" },
        { id: "out-3", companyId: "ibm", tier: "Corporate", overdue: 2, lastTouch: "30d ago", owner: "Marko", reason: "Follow-up on intro", channel: "Portal Message", quietHours: false, context: "Checking if the meeting with MSFT went well.", status: "due" }
      ]
    },
    team: [
      { id: "staff-1", name: "Milica Kostić", role: "Staffer", avatar: "M", bookSize: 42, compliance: 92, ritualsCompleted: 18, flagAvgTime: "1.2h", atRisk: 2, temperature: [20, 15, 7], workload: "85%", slaAging: "1.5 days", qualityScore: "4.8/5" },
      { id: "staff-2", name: "Marko Ristić", role: "Staffer", avatar: "MR", bookSize: 38, compliance: 85, ritualsCompleted: 15, flagAvgTime: "2.4h", atRisk: 4, temperature: [10, 20, 8], workload: "70%", slaAging: "3.2 days", qualityScore: "4.2/5" },
      { id: "staff-3", name: "Jelena Kostić", role: "Staffer", avatar: "J", bookSize: 45, compliance: 95, ritualsCompleted: 20, flagAvgTime: "0.8h", atRisk: 1, temperature: [25, 15, 5], workload: "92%", slaAging: "0.5 days", qualityScore: "4.9/5" },
      { id: "staff-4", name: "Stefan Mitić", role: "Team Lead", avatar: "S", bookSize: 20, compliance: 88, ritualsCompleted: 16, flagAvgTime: "1.5h", atRisk: 0, temperature: [10, 8, 2], workload: "110%", slaAging: "1.0 days", qualityScore: "4.7/5" },
      { id: "staff-5", name: "Ana Savić", role: "Executive Director", avatar: "A", bookSize: 10, compliance: 100, ritualsCompleted: 22, flagAvgTime: "0.5h", atRisk: 0, temperature: [5, 5, 0], workload: "60%", slaAging: "0.2 days", qualityScore: "5.0/5" }
    ],
    rollup: {
      "Q2 2026": {
        healthTrend: { scoreBands: { high: 45, mid: 40, low: 15 }, delta: "+2" },
        retention: { protected: "€1.2M", atRisk: "€150k" },
        kpis: { events: 1250, intros: 42, marketplace: 156, committee: 85 },
        wins: [
          { title: "Secured Microsoft Patron Upgrade", action: "Assigned dedicated account manager." },
          { title: "Tech Committee Launch", action: "Engaged 15 new corporate members." }
        ],
        risks: [
          { title: "FMCG Sector Engagement Drop", action: "Hosting targeted roundtable next month." },
          { title: "SBB Attrition Risk", action: "Brokering new C-level connections." }
        ],
        methodology: "Data aggregated from 145 active members.",
        provenance: "AmCham OS Intelligence Engine v4",
        riskRegister: [{ risk: "Regulatory instability", severity: "High" }, { risk: "FDI drop", severity: "Medium" }],
        owners: ["Ana Savić", "Stefan Mitić"]
      },
      "Q3 2026": {
        healthTrend: { scoreBands: { high: 50, mid: 38, low: 12 }, delta: "+5" },
        retention: { protected: "€1.3M", atRisk: "€100k" },
        kpis: { events: 1400, intros: 55, marketplace: 180, committee: 92 },
        wins: [
          { title: "Pharma Sector Record Engagement", action: "Expanding specific event formats." },
          { title: "Delhaize Partnership", action: "Scaling their supply chain initiative." }
        ],
        risks: [
          { title: "Finance Renewals Sluggish", action: "Direct outreach from Exec Director." }
        ],
        methodology: "Data aggregated from 152 active members.",
        provenance: "AmCham OS Intelligence Engine v4",
        riskRegister: [{ risk: "Election year pausing investments", severity: "High" }],
        owners: ["Ana Savić"]
      }
    },
    flags: [
      { id: "f1", companyId: "adr", companyName: "Adriatica Grupa", when: "2h ago", status: "pending", note: "Requested introduction to Hemofarm via Directory.", category: "Matchmaking", severity: "Medium", sla: "24h", assignee: "Marija J.", internalNotes: "Ensure Hemofarm is open to manufacturing intros first.", memberVisibleNotes: "We are processing your request and will update you shortly.", replyCount: 1, reopenCount: 0 },
      { id: "f2", companyId: "mtk", companyName: "Metalac", when: "5h ago", status: "pending", note: "Reported missing event attendance on their Score page.", category: "Data Correction", severity: "Low", sla: "48h", assignee: "Milica K.", internalNotes: "Check event roster for 'Energy Transition Roundtable'.", memberVisibleNotes: "Checking attendance logs.", replyCount: 0, reopenCount: 0 },
      { id: "f3", companyId: "kar", companyName: "Karanovic & Partners", when: "1d ago", status: "resolved", note: "Updated their billing contact.", category: "Admin", severity: "Low", sla: "72h", assignee: "Jelena K.", internalNotes: "Updated in Stripe.", memberVisibleNotes: "Billing contact successfully updated.", replyCount: 2, reopenCount: 0 }
    ],
    approvals: [
      { id: "a1", type: "Matchmaking", desc: "Suggest intro: S-Leasing (Finance) to Nelt Co (Logistics)", staff: "Marko", context: "S-Leasing pulse survey indicated a need for logistics partners.", history: "Nelt previously accepted 2 intros from us.", diffs: [], requesterConsent: true, targetConsent: false, policyChecks: ["No direct competitors", "Tier alignment OK"] },
      { id: "a2", type: "Marketplace", desc: "Approve post: 'Office space available in NBG' from MSFT", staff: "Ana", context: "Premium real estate offer, aligns with marketplace guidelines.", history: "MSFT posts 1-2 times a year.", diffs: [{ field: "status", old: "draft", new: "published" }], requesterConsent: true, targetConsent: true, policyChecks: ["No offensive content", "Real estate allowed"] },
      { id: "a3", type: "Dossier Update", desc: "Change primary contact for Adriatica Grupa to Marko Ilić", staff: "Stefan", context: "Automated web signal detected leadership change.", history: "Old contact retired.", diffs: [{ field: "primaryContact", old: "Jovan", new: "Marko Ilić" }], requesterConsent: false, targetConsent: true, policyChecks: ["Data verification required"] }
    ],
    digests: {
      nextSend: "Friday, 09:00",
      audience: 245,
      deliveryMetrics: { openRate: "62%", clickRate: "18%", bounceRate: "0.5%" },
      variants: [
        { 
          id: "patron", name: "Patron Tier", 
          subject: "AmCham Exec Brief: Policy shifts & your next introduction", 
          content: "Good morning. Here is your weekly executive summary. We've identified two policy drafts impacting the manufacturing sector, and have a recommended introduction to Nelt Co regarding supply chain synergies.",
          draftStatus: "schedule"
        },
        { 
          id: "corporate", name: "Corporate Tier", 
          subject: "AmCham Weekly: Upcoming events & market insights", 
          content: "Hello. This week we are highlighting the new Tech Committee roadmap and three marketplace offers from the community that match your sector profile.",
          draftStatus: "draft"
        }
      ]
    },
    matchmaking: {
      pairs: [
        { from: "sls", to: "nkt", rationale: "Nelt is expanding fleet; S-Leasing offers commercial vehicle financing.", overlapEvidence: "Both active in Transport sub-committee", conflicts: "None", fromApproved: true, toApproved: false, expiry: "2 days", outcomeState: "pending" },
        { from: "stada", to: "ncr", rationale: "Both expanding R&D operations in Serbia.", overlapEvidence: "Both indicated 'Tech Talent' as priority in Lap Time 2025", conflicts: "Competing for same talent pool", fromApproved: true, toApproved: true, expiry: "5 days", outcomeState: "scheduled" }
      ]
    },
    briefs: {
      "adr": {
        desiredOutcome: "Secure commitment for Q4 Patron sponsorship.",
        talkingPoints: [
          "Ask about the new facility in Kragujevac.",
          "Discuss the recent supply chain law changes.",
          "Check on their transition to green energy."
        ],
        ask: "Upgrade to Board level participation.",
        rationale: "They are expanding massively and need stronger policy leverage.",
        signals: [
          { text: "Expansion signal: new facility in Kragujevac (web, 6d ago)", type: "web" },
          { text: "Renewal in 12 days", type: "system" },
          { text: "Score 62, -9 trend", type: "system" },
          { text: "Tier: Patron since 2004", type: "system" }
        ],
        agenda: ["09:00 - Arrival", "09:10 - Operations Update", "09:30 - Advocacy Alignment"],
        citations: ["LapTime 2025: Manufacturing Priority", "Q2 ESG Report"],
        contradictions: ["They complained about lack of ESG events, but didn't attend the last two."],
        attendeeContext: "CEO prefers direct data over fluff.",
        notesCommitments: [],
        followUpActions: ["Send Q3 summary", "Introduce to Hemofarm"]
      },
      "sbb": {
        desiredOutcome: "Identify new executive sponsor.",
        talkingPoints: [
          "Address primary contact departure.",
          "Discuss telecom sector regulatory updates."
        ],
        ask: "Identify and onboard new C-level sponsor.",
        rationale: "Risk of churn is high without an active executive sponsor.",
        signals: [
          { text: "Primary contact updated on LinkedIn (web, 2d ago)", type: "web" },
          { text: "Zero event attendance in Q3 (engagement)", type: "engagement" },
          { text: "Score dropped to 55, lowest in cohort", type: "system" }
        ],
        agenda: ["10:00 - Coffee", "10:15 - Review team transition"],
        citations: [],
        contradictions: [],
        attendeeContext: "New interim contact is defensive.",
        notesCommitments: [],
        followUpActions: []
      },
      "sls": {
        desiredOutcome: "Solidify value proposition ahead of renewal.",
        talkingPoints: [
          "Explore fleet financing for logistics members.",
          "Offer to host the next Finance Committee meeting."
        ],
        ask: "Secure commitment for Q4 event sponsorship.",
        rationale: "They need visibility to drive originations among the SME cohort.",
        signals: [
          { text: "Pulse survey: 'Need more networking' (feedback, 1w ago)", type: "feedback" },
          { text: "Upcoming renewal in 90 days", type: "system" },
          { text: "Finance sector engagement is up 12% overall", type: "system" }
        ],
        agenda: ["11:00 - Value Review", "11:30 - Event Planning"],
        citations: [],
        contradictions: [],
        attendeeContext: "Very ROI focused.",
        notesCommitments: [],
        followUpActions: []
      }
    },
    intelligence: {
      sources: {
        web: { status: "Online", lastSync: "10m ago", ingested: 142, auto: "Auto", asOf: "Today", permissionScope: "Public", failureMode: "Retry with backoff; alert after 3 failed pulls", dataClassification: "Public web content", gdprErasure: "Remove company-linked extracts within 30 days", owner: "Intelligence team" },
        engagement: { status: "Online", lastSync: "Realtime", ingested: 840, auto: "Auto", asOf: "Realtime", permissionScope: "Internal", failureMode: "Queue events until service recovers", dataClassification: "Member activity metadata", gdprErasure: "Honor account erasure request and rebuild aggregates", owner: "Member platform" },
        feedback: { status: "Online", lastSync: "2h ago", ingested: 15, auto: "Auto", asOf: "2h ago", permissionScope: "Internal", failureMode: "Hold last confirmed batch and mark stale", dataClassification: "Member-provided feedback", gdprErasure: "Delete raw response; retain only approved aggregates", owner: "Research team" },
        staff: { status: "Online", lastSync: "1d ago", ingested: 8, auto: "Semi", asOf: "1d ago", permissionScope: "Confidential", failureMode: "Require manual retry and owner review", dataClassification: "Staff-entered relationship notes", gdprErasure: "Redact personal details on approved request", owner: "Member success leads" },
        email: { status: "Degraded", lastSync: "4h ago", ingested: 45, auto: "Semi", asOf: "4h ago", permissionScope: "Internal", failureMode: "Suppress new imports until connector health returns", dataClassification: "Consent-bound correspondence metadata", gdprErasure: "Purge contact-level records on erasure request", owner: "Operations team" }
      },
      pipeline: { total: 1050, companiesFresh: 42, health: 95 },
      feed: [
        { id: "i1", companyId: "adr", source: "web", text: "Announced new €15M production line in Kragujevac.", date: "6d ago", sentiment: "positive", scoreImpact: "+2 (Market Expansion)", state: "confirmed", provenance: "Tanjug News", confidence: "99%", duplicate: false, suppressed: false },
        { id: "i2", companyId: "adr", source: "engagement", text: "CEO logged into Portal.", date: "12d ago", sentiment: "neutral", scoreImpact: "0", state: "raw", provenance: "System Logs", confidence: "100%", duplicate: false, suppressed: false },
        { id: "i3", companyId: "adr", source: "email", text: "Follow-up email summary: Discussed ESG compliance; promised to send whitepaper.", date: "15d ago", sentiment: "positive", scoreImpact: "+1 (Touchpoint)", state: "extracted", provenance: "Outlook Sync", confidence: "85%", duplicate: false, suppressed: false },
        { id: "i4", companyId: "sls", source: "feedback", text: "Pulse score 6/10. Comment: 'Need more targeted matchmaking.'", date: "1w ago", sentiment: "negative", scoreImpact: "-3 (Feedback)", state: "confirmed", provenance: "Typeform", confidence: "100%", duplicate: false, suppressed: false },
        { id: "i5", companyId: "sls", source: "staff", text: "Met with new marketing lead. They have budget for Q4 events.", date: "3d ago", sentiment: "positive", scoreImpact: "+5 (Staff Note)", state: "confirmed", provenance: "CRM", confidence: "100%", duplicate: false, suppressed: false },
        { id: "i6", companyId: "sbb", source: "web", text: "CTO departed for competitor.", date: "2d ago", sentiment: "negative", scoreImpact: "-5 (Exec Churn)", state: "confirmed", provenance: "LinkedIn", confidence: "95%", duplicate: false, suppressed: false }
      ],
      scoreFactors: {
        "adr": {
          total: 62,
          confidence: "High",
          signalsCount: 14,
          factors: [
            { name: "Event Attendance", weight: 30, value: 12, max: 30, signals: [{ text: "Missed 2 major events in Q2", source: "engagement", date: "Jun 2026" }] },
            { name: "Committee Activity", weight: 20, value: 5, max: 20, signals: [{ text: "No active committee members", source: "engagement", date: "Ongoing" }] },
            { name: "Market Signals", weight: 20, value: 18, max: 20, signals: [{ text: "€15M production line", source: "web", date: "6d ago" }] },
            { name: "Staff Assessment", weight: 30, value: 27, max: 30, signals: [{ text: "Strong alignment on ESG", source: "staff", date: "15d ago" }] }
          ]
        }
      }
    }
  },
  portal: {
    billing: {
      tier: "Patron",
      renewalDate: "Oct 15, 2026",
      seatsUsed: "8 of 10",
      autoRenew: true,
      invoices: [
        { id: "INV-2025-0104", date: "Oct 15, 2025", amount: "€4,500", status: "Paid" },
        { id: "INV-2024-0104", date: "Oct 15, 2024", amount: "€4,500", status: "Paid" },
        { id: "INV-2023-0104", date: "Oct 15, 2023", amount: "€4,000", status: "Paid" }
      ],
      paymentMethod: { type: "Bank Transfer", details: "Ending in ...4567" },
      documents: [
        { id: "doc1", name: "AmCham Membership Agreement 2025.pdf", type: "Contract" },
        { id: "doc2", name: "Membership Certificate 2026.pdf", type: "Certificate" },
        { id: "doc3", name: "Tax Residency Document (W-8BEN).pdf", type: "Tax" }
      ]
    },
    home: {
      attentionCount: 2,
      nextEvent: { time: "18:00, Tomorrow", location: "Belgrade, Hyatt", title: "Energy Transition Roundtable", registered: true },
      meet: [
        { id: "nkt", abbr: "NKT", name: "Nelt Co", reason: "Similar supply chain challenges" },
        { id: "ccbc", abbr: "CC", name: "Coca-Cola HBC", reason: "FMCG overlap" }
      ]
    },
    notifications: [
      { id: "n1", text: "Intro request to Nelt Co moved to 'Being Brokered'.", unread: true, time: "2h ago", type: "intro" },
      { id: "n2", text: "Event reminder: Energy Transition Roundtable tomorrow.", unread: true, time: "4h ago", type: "event" },
      { id: "n3", text: "Your activity record update was acknowledged.", unread: false, time: "1d ago", type: "value" }
    ],
    intros: [
      { id: "i1", target: "Nelt Co", status: "Being brokered", date: "Oct 12", broker: "Milica K.", lastUpdate: "Milica reached out to supply chain lead." },
      { id: "i2", target: "Microsoft", status: "Meeting scheduled", date: "Sep 28", broker: "Stefan M.", lastUpdate: "Meeting confirmed for Oct 20." },
      { id: "i3", target: "Banca Intesa", status: "Connected", date: "Aug 15", broker: "Ana S.", lastUpdate: "Direct introduction made via email." }
    ],
    valueReceipt: { introsBrokered: 3, eventsAttended: 12, advocacyWins: 2, marketplaceResponses: 4 },
    sinceLastVisit: { introsProgressed: 1, newMatches: 2, eventReminder: "Tomorrow, 10:00" },
    glance: {
      eventSeats: { used: 6, total: 10 },
      committeeSeats: { used: 4, total: 6 },
      tier: "Corporate",
      cadence: "90d"
    },
    onboarding: {
      step: 3,
      total: 5,
      day: 34,
      timeline: "First 90 Days",
      manager: { name: "Tina Kostić", role: "Membership Manager", avatar: "T" },
      phases: [
        {
          id: "ph1",
          title: "Setup & Access",
          timeframe: "Days 1-14",
          status: "completed",
          steps: [
            { id: "s1", title: "Complete Profile", desc: "Add your company description and sectors for better matchmaking.", done: true, route: "profile" },
            { id: "s2", title: "Add Team Members", desc: "Invite colleagues from policy, sales, and leadership to use the portal.", done: true, route: "people" }
          ]
        },
        {
          id: "ph2",
          title: "First Engagement",
          timeframe: "Days 15-45",
          status: "active",
          steps: [
            { id: "s3", title: "Review Committees", desc: "Find working groups aligned with your regulatory priorities.", done: false, route: "committee" },
            { id: "s4", title: "First Intro Request", desc: "Use the directory to request a connection to another member.", done: false, route: "directory" }
          ]
        },
        {
          id: "ph3",
          title: "Community Integration",
          timeframe: "Days 46-90",
          status: "locked",
          steps: [
            { id: "s5", title: "Attend First Event", desc: "Join a roundtable or briefing to meet the community in person.", done: false, route: "events" },
            { id: "s6", title: "Quarterly Review", desc: "Check your Membership Value page to see initial outcomes.", done: false, route: "score" }
          ]
        }
      ]
    },
    people: [
      { id: "p1", name: "Ana Jokić", role: "admin", title: "CEO", avatar: "AJ" },
      { id: "p2", name: "Marko Ristić", role: "member", title: "Head of Sales", avatar: "MR" },
      { id: "p3", name: "Jelena N.", role: "member", title: "HR Director", avatar: "JN" }
    ],
    committee: {
      name: "Environment & Energy",
      mandate: "Advocating for sustainable energy policies, ESG compliance, and circular economy integration.",
      chair: { name: "Jovan Ristić", company: "Hemofarm" },
      nextMeeting: { date: "Oct 24, 2026", type: "Hybrid", topic: "Renewables Subsidies Draft Review" },
      memberStatus: { role: "Active Participant", member: "Marko Ristić", joined: "Jan 2026" },
      openSeats: 1,
      advocacy: [
        { title: "Renewables Subsidies Draft", stage: "Drafting", date: "Oct 1", desc: "Formulating industry response to the Ministry's initial draft on solar and wind subsidies.", impact: "High relevance for manufacturing and energy sectors." },
        { title: "Waste Management Law", stage: "Public Hearing", date: "Sep 15", desc: "Consolidating feedback on extended producer responsibility.", impact: "Affects FMCG and retail packaging compliance." },
        { title: "Green Energy Transition Framework", stage: "Research", date: "Aug 20", desc: "Benchmarking regional approaches to carbon pricing.", impact: "Strategic long-term impact across all heavy industries." }
      ],
      documents: [
        { name: "Q3 Sector Report.pdf", type: "Report", date: "Oct 5", size: "2.4 MB" },
        { name: "Meeting Minutes - Sep.docx", type: "Minutes", date: "Sep 10", size: "1.1 MB" },
        { name: "Draft Position Paper - Renewables.pdf", type: "Draft", date: "Sep 2", size: "3.5 MB" }
      ],
      discussions: [
        { author: "Vera Nikolić", time: "2 days ago", text: "Please review the attached draft position paper before our next meeting." },
        { author: "Marko Ristić", time: "1 day ago", text: "We will provide our technical team's input by Friday." }
      ]
    },
    lapTime: {
      reportYear: 2025,
      reportName: "Thirteenth Lap Time",
      methodology: {
        partner: "Ipsos Strategic Marketing",
        period: "August–September 2025",
        sampleMembers: 153,
        sampleMSE: 155,
        memberMix: { large: 32, medium: 32, small: 22, micro: 14 },
        caveat: "This data reflects anonymized, aggregated market sentiment as of late Q3 2025. It is not an evaluation of any individual member, and recent late-2025 events may not be fully captured."
      },
      climate: {
        satisfaction: 2.6,
        maxSatisfaction: 5,
        dissatisfied: 36
      },
      performance: {
        revenueGrowth2025: 51,
        revenueGrowth2024: 71,
        expectInvestment2026: 59,
        expectGrowth2026: 52,
        expectEmployment2026: 35
      },
      priorities: {
        general: [
          { id: "corruption", label: "Reducing corruption", value: 73 },
          { id: "judiciary", label: "Improving judiciary and rule of law", value: 65 },
          { id: "grey_economy", label: "Reducing grey economy", value: 46 }
        ],
        labor: [
          { id: "dig_labor", label: "Digitization of labor relations", value: 61 },
          { id: "remote_work", label: "Remote/platform/agency work regulation", value: 53 },
          { id: "salary_struct", label: "Salary structure simplification", value: 49 }
        ],
        shifts: [
          { id: "green_agenda", label: "Green Agenda", value2024: 43, value2025: 21 },
          { id: "egov", label: "E-government / Digital transformation", value2024: 48, value2025: 34 }
        ]
      },
      readiness: {
        innovation: 76
      }
    },
    seam: {
      toggles: [
        { id: "t1", label: "Share event attendance with network", active: true },
        { id: "t2", label: "Allow intro requests from other members", active: true },
        { id: "t3", label: "Publish score on public directory", active: false }
      ],
      visualization: [
        { domain: "AmCham Console", crosses: false, desc: "Internal notes, exact risk scores." },
        { domain: "The Seam", crosses: true, desc: "Anonymized aggregation, explicit intro requests." },
        { domain: "Member Portal", crosses: false, desc: "Your specific touchpoint history." }
      ]
    },
    events: [
      { 
        id: "e1", title: "Energy Transition Roundtable", date: "Oct 14, 18:00", location: "Hyatt Regency", 
        registered: true, attendees: ["Ana Jokić"],
        agenda: [{ time: "18:00", desc: "Registration & Welcome" }, { time: "18:30", desc: "Keynote" }, { time: "19:15", desc: "Panel Discussion" }],
        speakers: ["Marko Ilić, Ministry of Energy", "Jovan Ristić, Hemofarm"],
        audience: ["CEOs", "Energy Leads", "Policy Directors"],
        capacity: { total: 50, booked: 45 }
      },
      { 
        id: "e2", title: "C-Level Breakfast", date: "Oct 22, 09:00", location: "Hilton", 
        registered: false, attendees: [],
        agenda: [{ time: "09:00", desc: "Breakfast & Networking" }, { time: "09:30", desc: "Economic Briefing" }],
        speakers: ["Ana Savić, AmCham"],
        audience: ["C-Level Executives Only"],
        capacity: { total: 30, booked: 30 }
      }
    ],
    marketplace: {
      offers: [
        { id: "m1", author: "PwC Serbia", title: "Free ESG Workshop for AmCham SMEs", type: "Offer", date: "2 days ago", status: "active", intent: "We are offering pro-bono consulting to help SMEs prepare for the new supply chain laws." }
      ],
      asks: [
        { id: "m2", author: "Metalac", title: "Looking for sustainable packaging suppliers", type: "Ask", date: "1 week ago", status: "active", intent: "We need a local supplier for biodegradable shrink wrap." }
      ],
      myListings: [
        { id: "m3", title: "Seeking IT compliance auditor", type: "Ask", date: "3 weeks ago", status: "closed", intent: "Need ISO 27001 audit." }
      ]
    },
    directory: [
      { id: "d1", name: "Banca Intesa", sector: "Finance", tier: "Patron", desc: "Leading retail and corporate bank in Serbia.", saved: true, recommended: false },
      { id: "d2", name: "Nelt Co", sector: "Logistics", tier: "Corporate", desc: "Supply chain and distribution experts.", saved: false, recommended: true, recReason: "Shared supply chain challenges" },
      { id: "d3", name: "Microsoft", sector: "IT", tier: "Patron", desc: "Global technology and software provider.", saved: false, recommended: true, recReason: "Digital transformation synergy" }
    ],
    homeInbox: [
      { id: "h1", type: "action", urgency: "high", text: "Complete your profile to unlock committee recommendations.", action: "Complete Profile", route: "onboarding" },
      { id: "h2", type: "update", urgency: "normal", text: "Your intro to Nelt Co was accepted. Meeting scheduled for Tuesday.", action: "View Intro", route: "directory" },
      { id: "h3", type: "update", urgency: "normal", text: "Environment Committee published a new draft on Renewables.", action: "Read Draft", route: "committee" }
    ]
  }
};
