import { companies, committeeRosters, type Company, type Sector, type Tier } from './companies';

export { companies, committeeRosters };
export type { Company, Sector, Tier };

export const platformData = {
  member: companies[0],
  allMembers: companies,
  console: {
    ritual: {
      streak: 4,
      items: [
        { id: "rit-1", companyId: "adr", tag: "RENEWAL RISK", text: "Score down 9 points since May. No C-suite event attendance this year.", action: "Needs call", urgency: "High", expectedValue: "€18k", confidence: "95%", source: "Platform Analytics", owner: "Marija J.", dueDate: "Today", channel: "Phone" },
        { id: "rit-2", companyId: "stada", tag: "OPPORTUNITY", text: "Came to 3 Digital Economy events this year but isn't on the committee. A good moment to invite them.", action: "Invite to committee", urgency: "Medium", expectedValue: "€2.5k upgrade", confidence: "70%", source: "Event attendance", owner: "Nikola K.", dueDate: "This Week", channel: "Email" },
        { id: "rit-3", companyId: "sbb", tag: "CHURN WARNING", text: "Score at 55. Primary contact left company.", action: "Find new contact", urgency: "Critical", expectedValue: "€5k", confidence: "99%", source: "Bouncer / Email Bounce", owner: "Nikola K.", dueDate: "Tomorrow", channel: "LinkedIn" },
        { id: "rit-4", companyId: "tmm", tag: "CHURN WARNING", text: "Score down to 58 amid a permitting dispute. No attendance since the Q2 safety incident.", action: "Reconnect once new site manager is named", urgency: "High", expectedValue: "€5k", confidence: "88%", source: "Platform Analytics", owner: "Nikola K.", dueDate: "This Week", channel: "Phone" },
        { id: "rit-5", companyId: "zit", tag: "OPPORTUNITY", text: "Registered for 4 events this quarter and opens nearly every newsletter. Strong candidate for a Patron-tier upgrade conversation.", action: "Suggest Upgrade", urgency: "Low", expectedValue: "€2.5k upgrade", confidence: "65%", source: "Portal & email activity", owner: "Milica K.", dueDate: "Next Week", channel: "Email" }
      ]
    },
    retention: [
      { id: "sls", companyId: "sls", risk: "High", reason: "Zero attendance in 2026", impact: "€5k", intervention: "Broker meeting with Finance Committee chair", stage: "Investigation", owner: "Jelena K.", deadline: "Oct 20", evidence: "No event registrations. Last portal login 45d ago.", measurableOutcome: "Target: 1 C-Level event registration in Q4" },
      { id: "stada", companyId: "stada", risk: "Medium", reason: "Score dropped 8pts", impact: "€2.5k", intervention: "Invite to IT roundtable", stage: "Intervention", owner: "Nikola K.", deadline: "Nov 5", evidence: "Did not join Tech Committee despite mandate.", measurableOutcome: "Target: Committee application submitted" },
      { id: "adr", companyId: "adr", risk: "Medium", reason: "Score dropped 9pts", impact: "€18k", intervention: "Schedule health check with CEO", stage: "Planning", owner: "Marija J.", deadline: "Oct 15", evidence: "Mismatched expectations on policy advocacy.", measurableOutcome: "Target: Health check meeting held" },
      { id: "sbb", companyId: "sbb", risk: "High", reason: "Contact attrition", impact: "€5k", intervention: "Identify new C-level sponsor via LinkedIn", stage: "Action Required", owner: "Nikola K.", deadline: "Oct 12", evidence: "Bounce emails from primary contact.", measurableOutcome: "Target: New primary contact designated" },
      { id: "kpmg", companyId: "kpmg", risk: "Low", reason: "Missed 2 events", impact: "€5k", intervention: "Send policy digest directly", stage: "Monitoring", owner: "Marko R.", deadline: "Nov 30", evidence: "Two no-shows for registered events.", measurableOutcome: "Target: Newsletter open rate > 50%" },
      { id: "tmm", companyId: "tmm", risk: "High", reason: "Score dropped 13pts amid permitting dispute", impact: "€5k", intervention: "Executive briefing once new site manager is named", stage: "Monitoring", owner: "Nikola K.", deadline: "Nov 10", evidence: "No attendance since the Q2 site-safety incident.", measurableOutcome: "Target: Site-manager introduction call held" },
      { id: "mrh", companyId: "mrh", risk: "Medium", reason: "Score dropped 13pts", impact: "€5k", intervention: "Re-engage via a new Retail & Consumer committee seat", stage: "Planning", owner: "Jelena K.", deadline: "Oct 25", evidence: "Category lead departure; store-count growth stalled south of Kruševac.", measurableOutcome: "Target: New primary contact identified" },
      { id: "kpc", companyId: "kpc", risk: "Medium", reason: "Score dropped 14pts", impact: "€5k", intervention: "Loop in the Infrastructure committee chair for tender-pipeline support", stage: "Investigation", owner: "Nikola K.", deadline: "Nov 18", evidence: "Order book thinned amid a public-tender slowdown.", measurableOutcome: "Target: Tender-pipeline consultation scheduled" }
    ],
    savePlays: [
      { id: "sp1", companyId: "mtk", owner: "Stefan Mitić", intervention: "Restructured event invitations around manufacturing-specific content", outcome: "saved", value: "€5k", resolvedDate: "Jul 2026", note: "Attendance recovered within one quarter." },
      { id: "sp2", companyId: "nrb", owner: "Stefan Mitić", intervention: "Direct executive briefing on energy-sector advocacy wins", outcome: "saved", value: "€18k", resolvedDate: "May 2026", note: "Renewed ahead of the May window." },
      { id: "sp3", companyId: "pwc", owner: "Jelena Kostić", intervention: "Fast-tracked a Tax Policy working group seat", outcome: "saved", value: "€5k", resolvedDate: "Aug 2026", note: "Renewed at Corporate tier." },
      { id: "sp4", companyId: "mcb", owner: "Ana Savić", intervention: "Reconnected with the regional CFO after a quarterly check-in lapse", outcome: "saved", value: "€18k", resolvedDate: "Apr 2026", note: "Engagement back on cadence." },
      { id: "sp5", companyId: "bky", owner: "Milica Kostić", intervention: "Looped in the FMCG committee chair directly", outcome: "saved", value: "€5k", resolvedDate: "Mar 2026", note: "Attendance and portal logins recovered." },
      { id: "sp6", companyId: "ibm", owner: "Marko Ristić", intervention: "Offered a Corporate-to-Business step-down to retain partial engagement", outcome: "lost", value: "€5k", resolvedDate: "Jun 2026", note: "Declined; cited an internal budget freeze." },
      { id: "sp7", companyId: "dcb", owner: "Ana Savić", intervention: "Assigned a dedicated trade-finance contact after early-2025 engagement softened", outcome: "saved", value: "€18k", resolvedDate: "Mar 2025", note: "Engagement and event attendance recovered within the quarter." }
    ],
    // Members who canceled outright rather than being retained or lost mid-save plan.
    // Kept separate from `companies` (all current members, at varying risk) rather
    // than folded in with a fake "churned" lifecycle value, since a departed member
    // has no live score/history to keep tracking. Fictional, not modeled on real firms.
    departedMembers: [
      { id: "dep1", name: "Timočka Metalurgija", sector: "Manufacturing", tier: "Corporate", lastScore: 52, departedDate: "2026-07-20", lastManager: "Nikola Krstić", reason: "Acquired by a foreign competitor; the new parent consolidated all regional trade-association memberships." },
      { id: "dep2", name: "Vesna Digital Marketing", sector: "Consulting", tier: "Business", lastScore: 44, departedDate: "2026-02-14", lastManager: "Milica Kostić", reason: "Cited low event ROI relative to fee at renewal, following a difficult Q4 budget cycle." },
      { id: "dep3", name: "Braća Ilić Transport", sector: "Logistics", tier: "Business", lastScore: 38, departedDate: "2025-09-30", lastManager: "Stefan Mitić", reason: "Ceased regional operations after a change in ownership." },
      { id: "dep4", name: "Nordic Consulting Group Belgrade", sector: "Consulting", tier: "Corporate", lastScore: 61, departedDate: "2024-11-05", lastManager: "Jelena Kostić", reason: "Belgrade office closed; membership consolidated into the group's Vienna office instead." }
    ],
    outreach: {
      stats: { queue: 12, onCadence: 247, timePerPerson: "31m" },
      items: [
        { id: "out-1", companyId: "adr", tier: "Patron", overdue: 12, lastTouch: "71d ago", owner: "Marija", reason: "Score drop", channel: "Phone", quietHours: false, context: "Need to address recent complaints about event formats.", status: "overdue" },
        { id: "out-2", companyId: "sls", tier: "Corporate", overdue: 5, lastTouch: "45d ago", owner: "Jelena", reason: "Renewal in 90 days", channel: "Email", quietHours: true, context: "Standard 90-day pre-renewal check-in.", status: "overdue" },
        { id: "out-3", companyId: "ibm", tier: "Corporate", overdue: 2, lastTouch: "30d ago", owner: "Marko", reason: "Follow-up on intro", channel: "Portal Message", quietHours: false, context: "Checking if the meeting with MSFT went well.", status: "due" },
        { id: "out-4", companyId: "kpc", tier: "Corporate", overdue: 7, lastTouch: "38d ago", owner: "Nikola", reason: "Score drop", channel: "Phone", quietHours: false, context: "Order book has thinned; check whether the tender pipeline needs support.", status: "overdue" }
      ]
    },
    team: [
      { id: "staff-1", name: "Milica Kostić", role: "Staffer", avatar: "M", bookSize: 3, compliance: 92, ritualsCompleted: 18, flagAvgTime: "1.2h", atRisk: 2, temperature: [20, 15, 7], workload: "85%", slaAging: "1.5 days", qualityScore: "4.8/5" },
      { id: "staff-2", name: "Marko Ristić", role: "Staffer", avatar: "MR", bookSize: 6, compliance: 85, ritualsCompleted: 15, flagAvgTime: "2.4h", atRisk: 4, temperature: [10, 20, 8], workload: "70%", slaAging: "3.2 days", qualityScore: "4.2/5" },
      { id: "staff-3", name: "Jelena Kostić", role: "Staffer", avatar: "J", bookSize: 7, compliance: 95, ritualsCompleted: 20, flagAvgTime: "0.8h", atRisk: 1, temperature: [25, 15, 5], workload: "92%", slaAging: "0.5 days", qualityScore: "4.9/5" },
      { id: "staff-4", name: "Stefan Mitić", role: "Team Lead", avatar: "S", bookSize: 7, compliance: 88, ritualsCompleted: 16, flagAvgTime: "1.5h", atRisk: 0, temperature: [10, 8, 2], workload: "110%", slaAging: "1.0 days", qualityScore: "4.7/5" },
      { id: "staff-5", name: "Ana Savić", role: "Executive Director", avatar: "A", bookSize: 6, compliance: 100, ritualsCompleted: 22, flagAvgTime: "0.5h", atRisk: 0, temperature: [5, 5, 0], workload: "60%", slaAging: "0.2 days", qualityScore: "5.0/5" }
    ],
    rollup: {
      "Q1 2025": {
        healthTrend: { scoreBands: { high: 32, mid: 45, low: 23 }, delta: "+1" },
        retention: { protected: "€199k", atRisk: "€100k" },
        kpis: { events: 820, intros: 24, marketplace: 98, committee: 58 },
        wins: [
          { title: "Onboarded First Legal-Sector Cohort", action: "Ran a dedicated legal-sector welcome briefing." }
        ],
        risks: [
          { title: "Post-Holiday Engagement Dip", action: "Front-loaded Q1 event calendar to re-engage." }
        ],
        methodology: "Aggregated across the 40 member companies.",
        provenance: "AmCham OS Intelligence Engine v4",
        riskRegister: [{ risk: "Slow Q1 renewal pipeline", severity: "Medium" }],
        owners: ["Ana Savić"]
      },
      "Q2 2025": {
        healthTrend: { scoreBands: { high: 35, mid: 44, low: 21 }, delta: "+3" },
        retention: { protected: "€210k", atRisk: "€91k" },
        kpis: { events: 920, intros: 28, marketplace: 112, committee: 65 },
        wins: [
          { title: "Finance Committee Relaunch", action: "Recruited a new committee chair from S-Leasing's sector." }
        ],
        risks: [
          { title: "IT Sector Renewal Softness", action: "Scheduled one-on-one check-ins with IT-tier accounts." }
        ],
        methodology: "Aggregated across the 40 member companies.",
        provenance: "AmCham OS Intelligence Engine v4",
        riskRegister: [{ risk: "IT sector budget freezes", severity: "Medium" }],
        owners: ["Ana Savić"]
      },
      "Q3 2025": {
        healthTrend: { scoreBands: { high: 38, mid: 43, low: 19 }, delta: "+3" },
        retention: { protected: "€222k", atRisk: "€86.5k" },
        kpis: { events: 1020, intros: 32, marketplace: 126, committee: 71 },
        wins: [
          { title: "Retail Sector Record Attendance", action: "Expanded the retail-track event series." }
        ],
        risks: [
          { title: "Energy Sector Regulatory Uncertainty", action: "Briefed energy-tier members on pending reforms." }
        ],
        methodology: "Aggregated across the 40 member companies.",
        provenance: "AmCham OS Intelligence Engine v4",
        riskRegister: [{ risk: "Energy sector policy volatility", severity: "High" }],
        owners: ["Ana Savić", "Stefan Mitić"]
      },
      "Q4 2025": {
        healthTrend: { scoreBands: { high: 41, mid: 42, low: 17 }, delta: "+3" },
        retention: { protected: "€244k", atRisk: "€79.5k" },
        kpis: { events: 1120, intros: 36, marketplace: 140, committee: 77 },
        wins: [
          { title: "Year-End Renewal Push", action: "Cleared 90% of Q4 renewals ahead of deadline." }
        ],
        risks: [
          { title: "Consulting Sector Engagement Drop", action: "Piloted a consulting-only roundtable format." }
        ],
        methodology: "Aggregated across the 40 member companies.",
        provenance: "AmCham OS Intelligence Engine v4",
        riskRegister: [{ risk: "Consulting sector demand slowdown", severity: "Medium" }],
        owners: ["Ana Savić"]
      },
      "Q1 2026": {
        healthTrend: { scoreBands: { high: 43, mid: 41, low: 16 }, delta: "+2" },
        retention: { protected: "€255k", atRisk: "€73k" },
        kpis: { events: 1180, intros: 39, marketplace: 148, committee: 81 },
        wins: [
          { title: "Manufacturing Cohort Save Plan Wins", action: "Recovered two at-risk manufacturing accounts." }
        ],
        risks: [
          { title: "SBB Contact Attrition Emerging", action: "Flagged for early Retention Control intervention." }
        ],
        methodology: "Aggregated across the 40 member companies.",
        provenance: "AmCham OS Intelligence Engine v4",
        riskRegister: [{ risk: "Key-account contact turnover", severity: "Medium" }],
        owners: ["Ana Savić", "Stefan Mitić"]
      },
      "Q2 2026": {
        healthTrend: { scoreBands: { high: 45, mid: 40, low: 15 }, delta: "+2" },
        retention: { protected: "€266k", atRisk: "€68k" },
        kpis: { events: 1250, intros: 42, marketplace: 156, committee: 85 },
        wins: [
          { title: "Secured Microsoft Patron Upgrade", action: "Assigned dedicated account manager." },
          { title: "Tech Committee Launch", action: "Engaged 15 new corporate members." }
        ],
        risks: [
          { title: "FMCG Sector Engagement Drop", action: "Hosting targeted roundtable next month." },
          { title: "SBB Attrition Risk", action: "Brokering new C-level connections." }
        ],
        methodology: "Aggregated across the 40 member companies.",
        provenance: "AmCham OS Intelligence Engine v4",
        riskRegister: [{ risk: "Regulatory instability", severity: "High" }, { risk: "FDI drop", severity: "Medium" }],
        owners: ["Ana Savić", "Stefan Mitić"]
      },
      "Q3 2026": {
        healthTrend: { scoreBands: { high: 50, mid: 38, low: 12 }, delta: "+5" },
        retention: { protected: "€288k", atRisk: "€45.5k" },
        kpis: { events: 1400, intros: 55, marketplace: 180, committee: 92 },
        wins: [
          { title: "Pharma Sector Record Engagement", action: "Expanding specific event formats." },
          { title: "Delhaize Partnership", action: "Scaling their supply chain initiative." }
        ],
        risks: [
          { title: "Finance Renewals Sluggish", action: "Direct outreach from Exec Director." }
        ],
        methodology: "Aggregated across the 40 member companies.",
        provenance: "AmCham OS Intelligence Engine v4",
        riskRegister: [{ risk: "Election year pausing investments", severity: "High" }],
        owners: ["Ana Savić"]
      },
      "Q4 2026 (Forecast)": {
        isForecast: true,
        healthTrend: { scoreBands: { high: 53, mid: 36, low: 11 }, delta: "+3" },
        retention: { protected: "~€297k", atRisk: "~€41k" },
        kpis: { events: 1460, intros: 58, marketplace: 188, committee: 95 },
        wins: [],
        risks: [
          { title: "Election-Year Investment Pause Persists", action: "Monitoring; no action taken yet." }
        ],
        methodology: "Linear projection from the last four quarters — not measured data.",
        provenance: "AmCham OS Forecast Model (beta)",
        riskRegister: [{ risk: "Renewal softness if election uncertainty extends into Q1 2027", severity: "Medium" }],
        owners: ["Ana Savić"]
      }
    },
    flags: [
      { id: "f1", companyId: "adr", companyName: "Adriatica Grupa", when: "2h ago", status: "pending", note: "Requested introduction to Hemofarm via Directory.", category: "Matchmaking", severity: "Medium", sla: "24h", assignee: "Marija J.", internalNotes: "Ensure Hemofarm is open to manufacturing intros first.", memberVisibleNotes: "We are processing your request and will update you shortly.", replyCount: 1, reopenCount: 0 },
      { id: "f2", companyId: "mtk", companyName: "Metalac", when: "5h ago", status: "pending", note: "Reported missing event attendance on their Score page.", category: "Data Correction", severity: "Low", sla: "48h", assignee: "Milica K.", internalNotes: "Check event roster for 'Energy Transition Roundtable'.", memberVisibleNotes: "Checking attendance logs.", replyCount: 0, reopenCount: 0 },
      { id: "f3", companyId: "kar", companyName: "Karanovic & Partners", when: "1d ago", status: "resolved", note: "Updated their billing contact.", category: "Admin", severity: "Low", sla: "72h", assignee: "Jelena K.", internalNotes: "Updated in Stripe.", memberVisibleNotes: "Billing contact successfully updated.", replyCount: 2, reopenCount: 0 },
      { id: "f4", companyId: "zit", companyName: "Zapad IT Solutions", when: "3h ago", status: "pending", note: "Requested introduction to Microsoft via Directory.", category: "Matchmaking", severity: "Low", sla: "48h", assignee: "Milica K.", internalNotes: "Both nearshore/dev-focused; check for a natural fit before connecting.", memberVisibleNotes: "We are processing your request and will update you shortly.", replyCount: 0, reopenCount: 0 }
    ],
    approvals: [
      { id: "a1", type: "Matchmaking", desc: "Suggest intro: S-Leasing (Finance) to Nelt Co (Logistics)", staff: "Marko", context: "S-Leasing pulse survey indicated a need for logistics partners.", history: "Nelt previously accepted 2 intros from us.", diffs: [], requesterConsent: true, targetConsent: false, policyChecks: ["No direct competitors", "Tier alignment OK"] },
      { id: "a2", type: "Marketplace", desc: "Approve post: 'Office space available in NBG' from MSFT", staff: "Ana", context: "Premium real estate offer, aligns with marketplace guidelines.", history: "MSFT posts 1-2 times a year.", diffs: [{ field: "status", old: "draft", new: "published" }], requesterConsent: true, targetConsent: true, policyChecks: ["No offensive content", "Real estate allowed"] },
      { id: "a3", type: "Dossier Update", desc: "Change primary contact for Adriatica Grupa to Marko Ilić", staff: "Stefan", context: "Automated web signal detected leadership change.", history: "Old contact retired.", diffs: [{ field: "primaryContact", old: "Jovan", new: "Marko Ilić" }], requesterConsent: false, targetConsent: true, policyChecks: ["Data verification required"] },
      // Standing data-hygiene queue — surfaced by the same Approvals
      // workflow instead of a separate tool, sourced from real per-company
      // signals (contactFreshness, lastInteraction) rather than invented.
      { id: "dh1", type: "Data Hygiene", desc: "Possible duplicate contact record for S-Leasing", staff: "System", context: "Two contact entries share the same email domain and phone area code; likely the same person entered twice during onboarding and a later update.", history: "No merge has been attempted for this record pair.", diffs: [], requesterConsent: true, targetConsent: true, policyChecks: ["Duplicate detection", "No data loss on merge"] },
      { id: "dh2", type: "Data Hygiene", desc: "Stale primary contact for SBB — verify before next outreach", staff: "System", context: "Primary contact has not responded in 2 months and email bounces have been logged; contactFreshness is flagged stale.", history: "Last confirmed interaction: 2 months ago.", diffs: [{ field: "contactFreshness", old: "stale", new: "pending verification" }], requesterConsent: true, targetConsent: false, policyChecks: ["Stale-contact detection"] },
      { id: "dh3", type: "Data Hygiene", desc: "Confirm the real decision-maker for STADA IT Solutions", staff: "System", context: "No contact activity has been logged in 3 months and contactFreshness is unknown; the account risks a renewal outreach going to the wrong person.", history: "Original contact freshness set at onboarding; never re-verified.", diffs: [], requesterConsent: true, targetConsent: false, policyChecks: ["Decision-maker verification"] }
    ],
    // Non-dues revenue pipeline — a new surface, not an extension of an
    // existing one. Stages: prospecting -> proposed -> confirmed, or declined.
    sponsorship: [
      { id: "sp1", companyId: "pmp", initiative: "Energy Transition Roundtable — Title Sponsor", stage: "confirmed", value: "€8k", owner: "Ana Savić", notes: "Renewed from 2025; logo on all event materials." },
      { id: "sp2", companyId: "msft", initiative: "Tech Committee Annual Summit", stage: "confirmed", value: "€12k", owner: "Stefan Mitić", notes: "First-time sponsor; exploring a multi-year deal." },
      { id: "sp3", companyId: "nkt", initiative: "Logistics & Supply Chain Forum", stage: "confirmed", value: "€9k", owner: "Stefan Mitić", notes: "Multi-year sponsor since 2024." },
      { id: "sp4", companyId: "dlz", initiative: "Retail & Consumer Forum", stage: "proposed", value: "€6k", owner: "Ana Savić", notes: "Proposal sent; awaiting marketing budget approval." },
      { id: "sp5", companyId: "ncr", initiative: "Digital Banking Roundtable", stage: "proposed", value: "€5k", owner: "Marko Ristić", notes: "Follow-up call scheduled for next week." },
      { id: "sp6", companyId: "mcb", initiative: "AmCham Annual Gala", stage: "prospecting", value: "€15k", owner: "Ana Savić", notes: "Warm relationship from a board seat; not yet approached formally." },
      { id: "sp7", companyId: "ccbc", initiative: "Sustainability Summit", stage: "prospecting", value: "€7k", owner: "Stefan Mitić", notes: "Attended both ESG events this year and named ESG a priority in the annual business climate survey." },
      { id: "sp8", companyId: "kpmg", initiative: "Tax Policy Briefing Series", stage: "declined", value: "€4k", owner: "Marko Ristić", notes: "Budget frozen this cycle; revisit in Q1." },
      { id: "sp9", companyId: "nph", initiative: "Health & Life Sciences Committee Briefing", stage: "proposed", value: "€5k", owner: "Nikola Krstić", notes: "Approached after their generics-distribution approval; awaiting confirmation." }
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
        { from: "sls", to: "nkt", rationale: "S-Leasing posted in Opportunities that it is looking for logistics clients; Nelt runs one of the largest fleets among members.", overlapEvidence: "Both active in Transport sub-committee", conflicts: "None", fromApproved: true, toApproved: false, expiry: "2 days", outcomeState: "pending" },
        { from: "stada", to: "ncr", rationale: "Both sit on the Digital Economy Committee and both spoke on tech-talent panels at AmCham events this year.", overlapEvidence: "Both indicated 'Tech Talent' as a priority in the 2025 business climate survey", conflicts: "Competing for same talent pool", fromApproved: true, toApproved: true, expiry: "5 days", outcomeState: "scheduled" },
        { from: "kar", to: "ibm", rationale: "Both serve multinational clients navigating IT compliance and data protection law.", overlapEvidence: "Both flagged 'regulatory compliance' as a top priority in recent staff notes", conflicts: "None", fromApproved: true, toApproved: false, expiry: "4 days", outcomeState: "pending" },
        { from: "hmo", to: "pwc", rationale: "Hemofarm asked AmCham for an ESG audit partner after the Q3 roundtable; PwC offers dedicated ESG advisory.", overlapEvidence: "Both attended the Q3 ESG roundtable", conflicts: "None", fromApproved: true, toApproved: true, expiry: "3 days", outcomeState: "scheduled" },
        { from: "mtk", to: "mcb", rationale: "Metalac posted an Opportunities request for equipment financing for a line upgrade.", overlapEvidence: "UniCredit answered two similar Opportunities posts this year", conflicts: "None", fromApproved: true, toApproved: false, expiry: "6 days", outcomeState: "pending" },
        { from: "adr", to: "nrb", rationale: "Adriatica asked for this on its last call: the new production line needs a long-term energy supplier, and NIS a.d. offers corporate supply contracts.", overlapEvidence: "Requested by Adriatica; both attended the Energy Transition Roundtable series", conflicts: "None", fromApproved: true, toApproved: false, expiry: "7 days", outcomeState: "pending" }
      ],
      // Deals that made it past "scheduled" to a recorded outcome — the
      // running total the Growth pillar is built to publish ("€X in
      // member-to-member business this year"). Kept separate from `pairs`
      // (still-open suggestions) so closing/declining a pair moves it here
      // instead of erasing it.
      deals: [
        { id: "md1", from: "nkt", to: "ccbc", value: "€25k", outcome: "closed", closedDate: "Jun 2026", note: "Multi-year distribution contract signed." },
        { id: "md2", from: "pwc", to: "kpmg", value: "€8k", outcome: "declined", closedDate: "May 2026", note: "Overlapping service lines; deemed a competitive conflict." },
        { id: "md3", from: "dlz", to: "nkt", value: "€40k", outcome: "closed", closedDate: "Apr 2026", note: "Retail last-mile logistics partnership." },
        { id: "md4", from: "msft", to: "ibm", value: "€15k", outcome: "declined", closedDate: "Mar 2026", note: "Direct competitors; withdrawn after review." },
        { id: "md5", from: "mcb", to: "sls", value: "€12k", outcome: "closed", closedDate: "Feb 2026", note: "Equipment financing referral fee." }
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
        rationale: "Engagement has slipped since May and the renewal is close; a direct conversation is overdue.",
        signals: [
          { text: "Expansion signal: new facility in Kragujevac (web, 6d ago)", type: "web" },
          { text: "Renewal in 12 days", type: "system" },
          { text: "Score 62, -9 trend", type: "system" },
          { text: "Tier: Patron since 2004", type: "system" }
        ],
        agenda: ["09:00 - Arrival", "09:10 - Operations Update", "09:30 - Advocacy Alignment"],
        citations: ["Business climate survey 2025: Manufacturing priority", "Q2 ESG Report"],
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
      },
      "hmo": {
        desiredOutcome: "Explore Board of Governors nomination for their regional director.",
        talkingPoints: [
          "Congratulate them on the new production milestone.",
          "Discuss their interest in the upcoming Health Care Committee chair rotation.",
          "Introduce the Annual Value Statement concept as a board-reporting tool."
        ],
        ask: "Nominate a senior executive for the Board of Governors.",
        rationale: "Consistently highest-scoring Patron account; a natural advocate for the association.",
        signals: [
          { text: "Score 88, +2 trend — highest in the Pharma sector", type: "system" },
          { text: "Active in ESG and Health committees", type: "engagement" },
          { text: "Continued regional expansion (web, 10d ago)", type: "web" },
          { text: "Patron since 2002", type: "system" }
        ],
        agenda: ["09:00 - Arrival", "09:10 - Year in Review", "09:30 - Board Nomination Discussion"],
        citations: ["Business climate survey 2025: Pharma sector leadership", "Q3 2026 Portfolio Rollup"],
        contradictions: [],
        attendeeContext: "Values direct, data-backed conversations; proud of their ESG record.",
        notesCommitments: [],
        followUpActions: ["Send Board of Governors nomination packet", "Loop in Health Care Committee chair"]
      },
      "kar": {
        desiredOutcome: "Explore upgrade from Business to Corporate tier.",
        talkingPoints: [
          "Highlight the growth in their cross-border practice.",
          "Discuss the value of additional committee seats at Corporate tier.",
          "Ask about their expanding IP practice group."
        ],
        ask: "Consider a tier upgrade ahead of their April renewal.",
        rationale: "Fastest-growing Business-tier account; usage patterns already resemble Corporate-tier members.",
        signals: [
          { text: "Score 82, +5 trend — strongest growth in the Legal sector", type: "system" },
          { text: "Active in two policy committees", type: "engagement" },
          { text: "Expanding cross-border practice (web, 9d ago)", type: "web" },
          { text: "Renewal in 7 months", type: "system" }
        ],
        agenda: ["14:00 - Coffee", "14:15 - Growth Review", "14:35 - Tier Options"],
        citations: ["Q3 2026 Portfolio Rollup"],
        contradictions: [],
        attendeeContext: "Pragmatic; wants to see ROI numbers before committing to a higher tier.",
        notesCommitments: [],
        followUpActions: ["Send Corporate tier comparison sheet"]
      },
      "kpmg": {
        desiredOutcome: "Secure renewal commitment and identify the cause of declining engagement.",
        talkingPoints: [
          "Ask directly about the drop in event attendance this year.",
          "Offer a seat on the newly forming Tax Policy working group.",
          "Review which committees align with their current priorities."
        ],
        ask: "Confirm Corporate tier renewal and commit to one committee seat.",
        rationale: "Long-standing member with a quietly declining score; early outreach ahead of the June renewal.",
        signals: [
          { text: "Score 68, -4 trend over the last two quarters", type: "system" },
          { text: "Attended only 2 of 4 major events this year", type: "engagement" },
          { text: "Stable market position, no negative press", type: "web" },
          { text: "Renewal in 9 months", type: "system" }
        ],
        agenda: ["11:00 - Check-in", "11:15 - Engagement Review", "11:35 - Committee Options"],
        citations: [],
        contradictions: ["Consistently rates AmCham highly in pulse surveys despite low attendance."],
        attendeeContext: "Time-constrained; prefers a short, focused agenda.",
        notesCommitments: [],
        followUpActions: ["Send Tax Policy working group invitation"]
      },
      "ncr": {
        desiredOutcome: "Renew their sponsorship commitment for next year's calendar.",
        talkingPoints: ["Open with the relationship: consistent attendance across IT and Trade committees.", "They're sitting on the Digital Economy committee — ask what's working and what isn't.", "This is one of the strongest accounts in IT — worth a direct ask, not just a check-in.", "In the news, for context only: Continued hiring surge at the Belgrade hub."],
        ask: "Confirm sponsorship renewal for the next cycle.",
        rationale: "Score 91 (+5 trend) — one of the stronger accounts in the membership.",
        signals: [{ text: "Continued hiring surge at the Belgrade hub", type: "web" }, { text: "Consistent attendance across IT and Trade committees", type: "engagement" }, { text: "Score 91, +5 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Growth conversation"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: ["Send committee/sponsorship options"]
      },
      "pmp": {
        desiredOutcome: "Renew their sponsorship commitment for next year's calendar.",
        talkingPoints: ["Open with the relationship: near-perfect attendance across major events.", "They're chairing the Trade & Customs committee — ask what's working and what isn't.", "This is one of the strongest accounts in FMCG — worth a direct ask, not just a check-in.", "In the news, for context only: Stable market leadership, no negative press."],
        ask: "Confirm sponsorship renewal for the next cycle.",
        rationale: "Score 94 (+1 trend) — one of the stronger accounts in the membership.",
        signals: [{ text: "Stable market leadership, no negative press", type: "web" }, { text: "Near-perfect attendance across major events", type: "engagement" }, { text: "Score 94, +1 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Growth conversation"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: ["Send committee/sponsorship options"]
      },
      "ccbc": {
        desiredOutcome: "Renew their sponsorship commitment for next year's calendar.",
        talkingPoints: ["Open with the relationship: strong attendance, slight dip in Q3 regional events.", "They're sitting on the ESG & Environment committee — ask what's working and what isn't.", "This is one of the strongest accounts in FMCG — worth a direct ask, not just a check-in.", "In the news, for context only: Expanding bottling capacity signalled in press."],
        ask: "Confirm sponsorship renewal for the next cycle.",
        rationale: "Score 85 (+4 trend) — one of the stronger accounts in the membership.",
        signals: [{ text: "Expanding bottling capacity signalled in press", type: "web" }, { text: "Strong attendance, slight dip in Q3 regional events", type: "engagement" }, { text: "Score 85, +4 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Growth conversation"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: ["Send committee/sponsorship options"]
      },
      "nrb": {
        desiredOutcome: "Confirm Patron renewal ahead of May 2026.",
        talkingPoints: ["Bring up their own news: Energy sector regulatory uncertainty noted.", "Acknowledge their seat on the ESG & Environment committee and ask what they want out of it next year.", "Confirm the renewal terms directly rather than letting it lapse into a reminder email."],
        ask: "Get a verbal renewal commitment at Patron tier before May 2026.",
        rationale: "Score 76 (-3) — steady account, no red flags, but renewal conversations that start early close cleaner than ones that start with a reminder.",
        signals: [{ text: "Energy sector regulatory uncertainty noted", type: "web" }, { text: "Long relationship; renewal conversation underway", type: "staff" }, { text: "Patron since 2006, renews May 2026", type: "system" }],
        agenda: ["Arrival", "Year in review", "Renewal terms"],
        citations: [],
        contradictions: [],
        attendeeContext: "Routine renewal conversation — no known friction, keep it collaborative.",
        notesCommitments: [],
        followUpActions: ["Send renewal confirmation for May 2026"]
      },
      "dlz": {
        desiredOutcome: "Renew their sponsorship commitment for next year's calendar.",
        talkingPoints: ["Open with the relationship: attendance up sharply across all event types.", "They're sitting on the Labor & HR committee — ask what's working and what isn't.", "This is one of the strongest accounts in Retail — worth a direct ask, not just a check-in.", "In the news, for context only: Rapid store network expansion covered in press."],
        ask: "Confirm sponsorship renewal for the next cycle.",
        rationale: "Score 92 (+8 trend) — one of the stronger accounts in the membership.",
        signals: [{ text: "Rapid store network expansion covered in press", type: "web" }, { text: "Attendance up sharply across all event types", type: "engagement" }, { text: "Score 92, +8 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Growth conversation"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: ["Send committee/sponsorship options"]
      },
      "msft": {
        desiredOutcome: "Renew their sponsorship commitment for next year's calendar.",
        talkingPoints: ["Open with the relationship: slight attendance dip from senior team travel.", "They're chairing the Digital Economy committee — ask what's working and what isn't.", "This is one of the strongest accounts in IT — worth a direct ask, not just a check-in.", "In the news, for context only: Stable hiring, no major signals."],
        ask: "Confirm sponsorship renewal for the next cycle.",
        rationale: "Score 89 (-2 trend) — one of the stronger accounts in the membership.",
        signals: [{ text: "Stable hiring, no major signals", type: "web" }, { text: "Slight attendance dip from senior team travel", type: "engagement" }, { text: "Score 89, -2 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Growth conversation"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: ["Send committee/sponsorship options"]
      },
      "pwc": {
        desiredOutcome: "Confirm Corporate renewal ahead of Jul 2026.",
        talkingPoints: ["Bring up their own news: Stable market position.", "Acknowledge their seat on the Compliance & Ethics committee and ask what they want out of it next year.", "Confirm the renewal terms directly rather than letting it lapse into a reminder email."],
        ask: "Get a verbal renewal commitment at Corporate tier before Jul 2026.",
        rationale: "Score 71 (+1) — steady account, no red flags, but renewal conversations that start early close cleaner than ones that start with a reminder.",
        signals: [{ text: "Stable market position", type: "web" }, { text: "Responsive contact; renewal terms still under discussion", type: "staff" }, { text: "Corporate since 2001, renews Jul 2026", type: "system" }],
        agenda: ["Arrival", "Year in review", "Renewal terms"],
        citations: [],
        contradictions: [],
        attendeeContext: "Routine renewal conversation — no known friction, keep it collaborative.",
        notesCommitments: [],
        followUpActions: ["Send renewal confirmation for Jul 2026"]
      },
      "nkt": {
        desiredOutcome: "Confirm Patron renewal ahead of Oct 2026.",
        talkingPoints: ["Bring up their own news: Regional distribution network growing.", "Acknowledge their seat on the Trade & Customs committee and ask what they want out of it next year.", "Confirm the renewal terms directly rather than letting it lapse into a reminder email."],
        ask: "Get a verbal renewal commitment at Patron tier before Oct 2026.",
        rationale: "Score 79 (+2) — steady account, no red flags, but renewal conversations that start early close cleaner than ones that start with a reminder.",
        signals: [{ text: "Regional distribution network growing", type: "web" }, { text: "Cooperative account relationship ahead of renewal", type: "staff" }, { text: "Patron since 2008, renews Oct 2026", type: "system" }],
        agenda: ["Arrival", "Year in review", "Renewal terms"],
        citations: [],
        contradictions: [],
        attendeeContext: "Routine renewal conversation — no known friction, keep it collaborative.",
        notesCommitments: [],
        followUpActions: ["Send renewal confirmation for Oct 2026"]
      },
      "mcb": {
        desiredOutcome: "Renew their sponsorship commitment for next year's calendar.",
        talkingPoints: ["Open with the relationship: attendance climbing steadily this year.", "They're chairing the Tax & Finance committee — ask what's working and what isn't.", "This is one of the strongest accounts in Finance — worth a direct ask, not just a check-in.", "In the news, for context only: Expanding corporate lending signalled in press."],
        ask: "Confirm sponsorship renewal for the next cycle.",
        rationale: "Score 81 (+6 trend) — one of the stronger accounts in the membership.",
        signals: [{ text: "Expanding corporate lending signalled in press", type: "web" }, { text: "Attendance climbing steadily this year", type: "engagement" }, { text: "Score 81, +6 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Growth conversation"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: ["Send committee/sponsorship options"]
      },
      "ibm": {
        desiredOutcome: "Keep the relationship warm and confirm nothing has slipped since the last touchpoint.",
        talkingPoints: ["Open with the relationship: attendance down from prior year.", "Ask whether a committee seat would be worth their time this year.", "Nothing urgent here — the goal is simply staying visible.", "In the news, for context only: No major signals this quarter."],
        ask: "No specific ask this cycle — relationship maintenance.",
        rationale: "Score 64 (-5 trend) — stable, healthy account.",
        signals: [{ text: "No major signals this quarter", type: "web" }, { text: "Attendance down from prior year", type: "engagement" }, { text: "Score 64, -5 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Open floor"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: []
      },
      "bky": {
        desiredOutcome: "Keep the relationship warm and confirm nothing has slipped since the last touchpoint.",
        talkingPoints: ["Open with the relationship: solid attendance across FMCG-track events.", "They're chairing the Labor & HR committee — ask what's working and what isn't.", "Nothing urgent here — the goal is simply staying visible.", "In the news, for context only: Stable domestic market position."],
        ask: "No specific ask this cycle — relationship maintenance.",
        rationale: "Score 77 (+3 trend) — stable, healthy account.",
        signals: [{ text: "Stable domestic market position", type: "web" }, { text: "Solid attendance across FMCG-track events", type: "engagement" }, { text: "Score 77, +3 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Open floor"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: []
      },
      "mtk": {
        desiredOutcome: "Confirm Corporate renewal ahead of Aug 2026.",
        talkingPoints: ["Bring up their own news: Stable export demand for the cookware line.", "Acknowledge their seat on the Real Estate & Construction committee and ask what they want out of it next year.", "Confirm the renewal terms directly rather than letting it lapse into a reminder email."],
        ask: "Get a verbal renewal commitment at Corporate tier before Aug 2026.",
        rationale: "Score 73 (+1) — steady account, no red flags, but renewal conversations that start early close cleaner than ones that start with a reminder.",
        signals: [{ text: "Stable export demand for the cookware line", type: "web" }, { text: "Reliable, long-standing contact", type: "staff" }, { text: "Corporate since 2012, renews Aug 2026", type: "system" }],
        agenda: ["Arrival", "Year in review", "Renewal terms"],
        citations: [],
        contradictions: [],
        attendeeContext: "Routine renewal conversation — no known friction, keep it collaborative.",
        notesCommitments: [],
        followUpActions: ["Send renewal confirmation for Aug 2026"]
      },
      "tln": {
        desiredOutcome: "Explore a deeper commitment — committee leadership or sponsorship — while engagement is at its peak.",
        talkingPoints: ["Open with the relationship: attendance rising sharply this year.", "They're sitting on the Digital Economy committee — ask what's working and what isn't.", "This is one of the strongest accounts in IT — worth a direct ask, not just a check-in.", "In the news, for context only: 5G rollout coverage driving visibility."],
        ask: "Propose a committee leadership role or sponsorship slot.",
        rationale: "Score 86 (+7 trend) — one of the stronger accounts in the membership.",
        signals: [{ text: "5G rollout coverage driving visibility", type: "web" }, { text: "Attendance rising sharply this year", type: "engagement" }, { text: "Score 86, +7 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Growth conversation"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: ["Send committee/sponsorship options"]
      },
      "stada": {
        desiredOutcome: "Stop the slide before the Nov 2026 renewal — score dropped 8pts.",
        talkingPoints: ["Address it directly: Did not join Tech Committee despite mandate.", "Walk through what \"Invite to IT roundtable\" would look like in practice.", "Confirm who the right day-to-day contact is now — IT accounts this size shouldn't be running through a single relationship."],
        ask: "Invite to IT roundtable.",
        rationale: "Medium-risk account per Retention Control: score dropped 8pts. Did not join Tech Committee despite mandate.",
        signals: [{ text: "Did not join Tech Committee despite mandate", type: "engagement" }, { text: "Growing local team, potential upgrade signal", type: "web" }, { text: "Score 48, -8 trend", type: "system" }, { text: "Retention stage: Medium risk, owner Nikola K., due Nov 5", type: "system" }],
        agenda: ["Arrival", "Direct check-in on recent disengagement", "Agree next step and owner"],
        citations: [],
        contradictions: [],
        attendeeContext: "Engagement has gone quiet — confirm attendance ahead of time and keep the agenda short and concrete.",
        notesCommitments: [],
        followUpActions: ["Invite to IT roundtable", "Committee application submitted"]
      },
      "bsw": {
        desiredOutcome: "Keep the relationship warm and confirm nothing has slipped since the last touchpoint.",
        talkingPoints: ["Open with the relationship: sent two engineers to the Infrastructure & Construction forum this quarter.", "Ask whether a committee seat would be worth their time this year.", "Nothing urgent here — the goal is simply staying visible.", "In the news, for context only: Won a regional highway-bridge supply contract."],
        ask: "No specific ask this cycle — relationship maintenance.",
        rationale: "Score 74 (-1 trend) — stable, healthy account.",
        signals: [{ text: "Won a regional highway-bridge supply contract", type: "web" }, { text: "Sent two engineers to the Infrastructure & Construction forum this quarter", type: "engagement" }, { text: "Score 74, -1 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Open floor"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: []
      },
      "sav": {
        desiredOutcome: "Confirm Patron renewal ahead of Jul 2026.",
        talkingPoints: ["Bring up their own news: Announced a new solar co-generation pilot in Vojvodina.", "Gauge interest in a committee seat for the renewal term — none currently held.", "Confirm the renewal terms directly rather than letting it lapse into a reminder email."],
        ask: "Get a verbal renewal commitment at Patron tier before Jul 2026.",
        rationale: "Score 80 (-1) — steady account, no red flags, but renewal conversations that start early close cleaner than ones that start with a reminder.",
        signals: [{ text: "Announced a new solar co-generation pilot in Vojvodina", type: "web" }, { text: "Renewal terms in discussion; relationship remains warm", type: "staff" }, { text: "Patron since 2009, renews Jul 2026", type: "system" }],
        agenda: ["Arrival", "Year in review", "Renewal terms"],
        citations: [],
        contradictions: [],
        attendeeContext: "Routine renewal conversation — no known friction, keep it collaborative.",
        notesCommitments: [],
        followUpActions: ["Send renewal confirmation for Jul 2026"]
      },
      "mrh": {
        desiredOutcome: "Stop the slide before the Sep 2026 renewal — score dropped 13pts.",
        talkingPoints: ["Address it directly: Category lead departure; store-count growth stalled south of Kruševac.", "Walk through what \"Re-engage via a new Retail & Consumer committee seat\" would look like in practice.", "Confirm who the right day-to-day contact is now — Retail accounts this size shouldn't be running through a single relationship."],
        ask: "Re-engage via a new Retail & Consumer committee seat.",
        rationale: "Medium-risk account per Retention Control: score dropped 13pts. Category lead departure; store-count growth stalled south of Kruševac.",
        signals: [{ text: "Category lead departure; store-count growth stalled south of Kruševac", type: "engagement" }, { text: "Store-count growth has stalled south of Kruševac", type: "web" }, { text: "Score 68, -3 trend", type: "system" }, { text: "Retention stage: Medium risk, owner Jelena K., due Oct 25", type: "system" }],
        agenda: ["Arrival", "Direct check-in on recent disengagement", "Agree next step and owner"],
        citations: [],
        contradictions: [],
        attendeeContext: "Engagement has gone quiet — confirm attendance ahead of time and keep the agenda short and concrete.",
        notesCommitments: [],
        followUpActions: ["Re-engage via a new Retail & Consumer committee seat", "New primary contact identified"]
      },
      "dcb": {
        desiredOutcome: "Explore a deeper commitment — committee leadership or sponsorship — while engagement is at its peak.",
        talkingPoints: ["Open with the relationship: sent senior trade-finance staff to every Q3 event.", "Ask whether a committee seat would be worth their time this year.", "This is one of the strongest accounts in Banking — worth a direct ask, not just a check-in.", "In the news, for context only: Expanded working-capital lending line for SME exporters."],
        ask: "Propose a committee leadership role or sponsorship slot.",
        rationale: "Score 86 (+2 trend) — one of the stronger accounts in the membership.",
        signals: [{ text: "Expanded working-capital lending line for SME exporters", type: "web" }, { text: "Sent senior trade-finance staff to every Q3 event", type: "engagement" }, { text: "Score 86, +2 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Growth conversation"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: ["Send committee/sponsorship options"]
      },
      "nvl": {
        desiredOutcome: "Keep the relationship warm and confirm nothing has slipped since the last touchpoint.",
        talkingPoints: ["Open with the relationship: attended the Danube corridor logistics briefing in force.", "Ask whether a committee seat would be worth their time this year.", "Nothing urgent here — the goal is simply staying visible.", "In the news, for context only: Added a second river-port warehouse this year."],
        ask: "No specific ask this cycle — relationship maintenance.",
        rationale: "Score 71 (+0 trend) — stable, healthy account.",
        signals: [{ text: "Added a second river-port warehouse this year", type: "web" }, { text: "Attended the Danube corridor logistics briefing in force", type: "engagement" }, { text: "Score 71, 0 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Open floor"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: []
      },
      "vat": {
        desiredOutcome: "Confirm Business renewal ahead of May 2026.",
        talkingPoints: ["Bring up their own news: Grain export volumes up on last season's harvest.", "Gauge interest in a committee seat for the renewal term — none currently held.", "Confirm the renewal terms directly rather than letting it lapse into a reminder email."],
        ask: "Get a verbal renewal commitment at Business tier before May 2026.",
        rationale: "Score 77 (-2) — steady account, no red flags, but renewal conversations that start early close cleaner than ones that start with a reminder.",
        signals: [{ text: "Grain export volumes up on last season's harvest", type: "web" }, { text: "Renewal conversation underway; contact remains engaged", type: "staff" }, { text: "Business since 2018, renews May 2026", type: "system" }],
        agenda: ["Arrival", "Year in review", "Renewal terms"],
        citations: [],
        contradictions: [],
        attendeeContext: "Routine renewal conversation — no known friction, keep it collaborative.",
        notesCommitments: [],
        followUpActions: ["Send renewal confirmation for May 2026"]
      },
      "bcp": {
        desiredOutcome: "Confirm Business renewal ahead of Aug 2026.",
        talkingPoints: ["Bring up their own news: Landed a manufacturing-sector engagement in Niš.", "Gauge interest in a committee seat for the renewal term — none currently held.", "Confirm the renewal terms directly rather than letting it lapse into a reminder email."],
        ask: "Get a verbal renewal commitment at Business tier before Aug 2026.",
        rationale: "Score 65 (-1) — steady account, no red flags, but renewal conversations that start early close cleaner than ones that start with a reminder.",
        signals: [{ text: "Landed a manufacturing-sector engagement in Niš", type: "web" }, { text: "Billing contact responsive; renewal terms nearly settled", type: "staff" }, { text: "Business since 2015, renews Aug 2026", type: "system" }],
        agenda: ["Arrival", "Year in review", "Renewal terms"],
        citations: [],
        contradictions: [],
        attendeeContext: "Routine renewal conversation — no known friction, keep it collaborative.",
        notesCommitments: [],
        followUpActions: ["Send renewal confirmation for Aug 2026"]
      },
      "slg": {
        desiredOutcome: "Keep the relationship warm and confirm nothing has slipped since the last touchpoint.",
        talkingPoints: ["Open with the relationship: regular presence at the Legal & Regulatory Affairs sessions.", "Ask whether a committee seat would be worth their time this year.", "Nothing urgent here — the goal is simply staying visible.", "In the news, for context only: Advised on two cross-border supply contracts this quarter."],
        ask: "No specific ask this cycle — relationship maintenance.",
        rationale: "Score 72 (+1 trend) — stable, healthy account.",
        signals: [{ text: "Advised on two cross-border supply contracts this quarter", type: "web" }, { text: "Regular presence at the Legal & Regulatory Affairs sessions", type: "engagement" }, { text: "Score 72, +1 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Open floor"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: []
      },
      "zit": {
        desiredOutcome: "Explore a deeper commitment — committee leadership or sponsorship — while engagement is at its peak.",
        talkingPoints: ["Open with the relationship: sent a delegation to the nearshoring & talent panel.", "Ask whether a committee seat would be worth their time this year.", "This is one of the strongest accounts in IT — worth a direct ask, not just a check-in.", "In the news, for context only: Opened a second delivery office to handle Western-Europe demand."],
        ask: "Propose a committee leadership role or sponsorship slot.",
        rationale: "Score 83 (+2 trend) — one of the stronger accounts in the membership.",
        signals: [{ text: "Opened a second delivery office to handle Western-Europe demand", type: "web" }, { text: "Sent a delegation to the nearshoring & talent panel", type: "engagement" }, { text: "Score 83, +2 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Growth conversation"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: ["Send committee/sponsorship options"]
      },
      "tmm": {
        desiredOutcome: "Stop the slide before the Jun 2026 renewal — score dropped 13pts amid permitting dispute.",
        talkingPoints: ["Address it directly: No attendance since the Q2 site-safety incident.", "Walk through what \"Executive briefing once new site manager is named\" would look like in practice.", "Confirm who the right day-to-day contact is now — Energy accounts this size shouldn't be running through a single relationship."],
        ask: "Executive briefing once new site manager is named.",
        rationale: "High-risk account per Retention Control: score dropped 13pts amid permitting dispute. No attendance since the Q2 site-safety incident.",
        signals: [{ text: "No attendance since the Q2 site-safety incident", type: "engagement" }, { text: "Copper output down amid a permitting dispute", type: "web" }, { text: "Score 58, -4 trend", type: "system" }, { text: "Retention stage: High risk, owner Nikola K., due Nov 10", type: "system" }],
        agenda: ["Arrival", "Direct check-in on recent disengagement", "Agree next step and owner"],
        citations: [],
        contradictions: [],
        attendeeContext: "Engagement has gone quiet — confirm attendance ahead of time and keep the agenda short and concrete.",
        notesCommitments: [],
        followUpActions: ["Executive briefing once new site manager is named", "Site-manager introduction call held"]
      },
      "jpl": {
        desiredOutcome: "Confirm Business renewal ahead of Oct 2026.",
        talkingPoints: ["Bring up their own news: Freight volumes flat along the southern rail corridor.", "Gauge interest in a committee seat for the renewal term — none currently held.", "Confirm the renewal terms directly rather than letting it lapse into a reminder email."],
        ask: "Get a verbal renewal commitment at Business tier before Oct 2026.",
        rationale: "Score 69 (-1) — steady account, no red flags, but renewal conversations that start early close cleaner than ones that start with a reminder.",
        signals: [{ text: "Freight volumes flat along the southern rail corridor", type: "web" }, { text: "Owner-operator responsive; renewal expected to proceed", type: "staff" }, { text: "Business since 2017, renews Oct 2026", type: "system" }],
        agenda: ["Arrival", "Year in review", "Renewal terms"],
        citations: [],
        contradictions: [],
        attendeeContext: "Routine renewal conversation — no known friction, keep it collaborative.",
        notesCommitments: [],
        followUpActions: ["Send renewal confirmation for Oct 2026"]
      },
      "pnf": {
        desiredOutcome: "Keep the relationship warm and confirm nothing has slipped since the last touchpoint.",
        talkingPoints: ["Open with the relationship: strong turnout at FMCG and export-compliance events.", "Ask whether a committee seat would be worth their time this year.", "Nothing urgent here — the goal is simply staying visible.", "In the news, for context only: Added two new EU retail-chain listings this quarter."],
        ask: "No specific ask this cycle — relationship maintenance.",
        rationale: "Score 79 (-1 trend) — stable, healthy account.",
        signals: [{ text: "Added two new EU retail-chain listings this quarter", type: "web" }, { text: "Strong turnout at FMCG and export-compliance events", type: "engagement" }, { text: "Score 79, -1 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Open floor"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: []
      },
      "srb": {
        desiredOutcome: "Get them to their first committee seat and full portal adoption within the onboarding window.",
        talkingPoints: ["Walk through what \"Cloud infrastructure and DevOps consultancy for regional scale-ups\" means for which committees are the best fit.", "Confirm the primary contact is set up in the portal and knows what \"good\" looks like at 90 days.", "Ask what almost stopped them from joining — it's the cheapest signal for fixing onboarding for the next cohort."],
        ask: "Get a committee-seat commitment before the onboarding window closes.",
        rationale: "New member (since 2024) — the first 90 days set the tone for everything after.",
        signals: [{ text: "Recently closed a seed round to fund regional expansion", type: "web" }, { text: "Founder highly engaged during onboarding calls", type: "staff" }, { text: "Onboarding since 2024, tier Startup", type: "system" }],
        agenda: ["Welcome & introductions", "Committee fit discussion", "Portal walkthrough"],
        citations: [],
        contradictions: [],
        attendeeContext: "Still forming their impression of the association — over-deliver on responsiveness here.",
        notesCommitments: [],
        followUpActions: ["Send committee shortlist", "Confirm portal login and first login walkthrough"]
      },
      "ztg": {
        desiredOutcome: "Confirm Business renewal ahead of Mar 2027.",
        talkingPoints: ["Bring up their own news: Resort occupancy steady year over year.", "Gauge interest in a committee seat for the renewal term — none currently held.", "Confirm the renewal terms directly rather than letting it lapse into a reminder email."],
        ask: "Get a verbal renewal commitment at Business tier before Mar 2027.",
        rationale: "Score 66 (+1) — steady account, no red flags, but renewal conversations that start early close cleaner than ones that start with a reminder.",
        signals: [{ text: "Resort occupancy steady year over year", type: "web" }, { text: "General manager responsive but slow to confirm renewal", type: "staff" }, { text: "Business since 2012, renews Mar 2027", type: "system" }],
        agenda: ["Arrival", "Year in review", "Renewal terms"],
        citations: [],
        contradictions: [],
        attendeeContext: "Routine renewal conversation — no known friction, keep it collaborative.",
        notesCommitments: [],
        followUpActions: ["Send renewal confirmation for Mar 2027"]
      },
      "fgw": {
        desiredOutcome: "Keep the relationship warm and confirm nothing has slipped since the last touchpoint.",
        talkingPoints: ["Open with the relationship: attended the export-readiness workshop and the FMCG mixer.", "Ask whether a committee seat would be worth their time this year.", "Nothing urgent here — the goal is simply staying visible.", "In the news, for context only: New EU import license opened three additional markets."],
        ask: "No specific ask this cycle — relationship maintenance.",
        rationale: "Score 75 (+1 trend) — stable, healthy account.",
        signals: [{ text: "New EU import license opened three additional markets", type: "web" }, { text: "Attended the export-readiness workshop and the FMCG mixer", type: "engagement" }, { text: "Score 75, +1 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Open floor"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: []
      },
      "kpc": {
        desiredOutcome: "Stop the slide before the Nov 2026 renewal — score dropped 14pts.",
        talkingPoints: ["Address it directly: Order book thinned amid a public-tender slowdown.", "Walk through what \"Loop in the Infrastructure committee chair for tender-pipeline support\" would look like in practice.", "Confirm who the right day-to-day contact is now — Manufacturing accounts this size shouldn't be running through a single relationship."],
        ask: "Loop in the Infrastructure committee chair for tender-pipeline support.",
        rationale: "Medium-risk account per Retention Control: score dropped 14pts. Order book thinned amid a public-tender slowdown.",
        signals: [{ text: "Order book thinned amid a public-tender slowdown", type: "engagement" }, { text: "Order book has thinned amid a slowdown in public contracts", type: "web" }, { text: "Score 63, -5 trend", type: "system" }, { text: "Retention stage: Medium risk, owner Nikola K., due Nov 18", type: "system" }],
        agenda: ["Arrival", "Direct check-in on recent disengagement", "Agree next step and owner"],
        citations: [],
        contradictions: [],
        attendeeContext: "Engagement has gone quiet — confirm attendance ahead of time and keep the agenda short and concrete.",
        notesCommitments: [],
        followUpActions: ["Loop in the Infrastructure committee chair for tender-pipeline support", "Tender-pipeline consultation scheduled"]
      },
      "bfa": {
        desiredOutcome: "Keep the relationship warm and confirm nothing has slipped since the last touchpoint.",
        talkingPoints: ["Open with the relationship: consistent attendance at the Banking & Finance briefings.", "Ask whether a committee seat would be worth their time this year.", "Nothing urgent here — the goal is simply staying visible.", "In the news, for context only: Advised on a mid-market cross-border transaction this quarter."],
        ask: "No specific ask this cycle — relationship maintenance.",
        rationale: "Score 70 (-1 trend) — stable, healthy account.",
        signals: [{ text: "Advised on a mid-market cross-border transaction this quarter", type: "web" }, { text: "Consistent attendance at the Banking & Finance briefings", type: "engagement" }, { text: "Score 70, -1 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Open floor"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: []
      },
      "nph": {
        desiredOutcome: "Renew their sponsorship commitment for next year's calendar.",
        talkingPoints: ["Open with the relationship: sent regulatory-affairs staff to every Pharma & Health session.", "Thank them for last year's sponsorship and gauge appetite for the next cycle.", "This is one of the strongest accounts in Pharma — worth a direct ask, not just a check-in.", "In the news, for context only: Received approval to distribute two additional generics regionally."],
        ask: "Confirm sponsorship renewal for the next cycle.",
        rationale: "Score 81 (+0 trend) — one of the stronger accounts in the membership.",
        signals: [{ text: "Received approval to distribute two additional generics regionally", type: "web" }, { text: "Sent regulatory-affairs staff to every Pharma & Health session", type: "engagement" }, { text: "Score 81, 0 trend", type: "system" }],
        agenda: ["Arrival", "Check-in", "Growth conversation"],
        citations: [],
        contradictions: [],
        attendeeContext: "No known friction — straightforward, positive relationship.",
        notesCommitments: [],
        followUpActions: ["Send committee/sponsorship options"]
      },
      "dhp": {
        desiredOutcome: "Confirm Corporate renewal ahead of Aug 2026.",
        talkingPoints: ["Bring up their own news: Basin output stable; no new capacity announced this year.", "Gauge interest in a committee seat for the renewal term — none currently held.", "Confirm the renewal terms directly rather than letting it lapse into a reminder email."],
        ask: "Get a verbal renewal commitment at Corporate tier before Aug 2026.",
        rationale: "Score 76 (+1) — steady account, no red flags, but renewal conversations that start early close cleaner than ones that start with a reminder.",
        signals: [{ text: "Basin output stable; no new capacity announced this year", type: "web" }, { text: "Plant director responsive; renewal expected to be routine", type: "staff" }, { text: "Corporate since 2010, renews Aug 2026", type: "system" }],
        agenda: ["Arrival", "Year in review", "Renewal terms"],
        citations: [],
        contradictions: [],
        attendeeContext: "Routine renewal conversation — no known friction, keep it collaborative.",
        notesCommitments: [],
        followUpActions: ["Send renewal confirmation for Aug 2026"]
      },
      "dmg": {
        desiredOutcome: "Get them to their first committee seat and full portal adoption within the onboarding window.",
        talkingPoints: ["Walk through what \"Marina operations and river-tourism services along the Danube\" means for which committees are the best fit.", "Confirm the primary contact is set up in the portal and knows what \"good\" looks like at 90 days.", "Ask what almost stopped them from joining — it's the cheapest signal for fixing onboarding for the next cohort."],
        ask: "Get a committee-seat commitment before the onboarding window closes.",
        rationale: "New member (since 2026) — the first 90 days set the tone for everything after.",
        signals: [{ text: "Opened a second marina berth ahead of the summer season", type: "web" }, { text: "New owner enthusiastic but still learning the membership benefits", type: "staff" }, { text: "Onboarding since 2026, tier Startup", type: "system" }],
        agenda: ["Welcome & introductions", "Committee fit discussion", "Portal walkthrough"],
        citations: [],
        contradictions: [],
        attendeeContext: "Still forming their impression of the association — over-deliver on responsiveness here.",
        notesCommitments: [],
        followUpActions: ["Send committee shortlist", "Confirm portal login and first login walkthrough"]
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
        { id: "i6", companyId: "sbb", source: "web", text: "CTO departed for competitor.", date: "2d ago", sentiment: "negative", scoreImpact: "-5 (Exec Churn)", state: "confirmed", provenance: "LinkedIn", confidence: "95%", duplicate: false, suppressed: false },
        { id: "i7", companyId: "mrh", source: "web", text: "Regional trade press: store-count growth has stalled south of Kruševac.", date: "3w ago", sentiment: "negative", scoreImpact: "-3 (Market Contraction)", state: "confirmed", provenance: "Danas Biznis", confidence: "88%", duplicate: false, suppressed: false },
        { id: "i8", companyId: "tmm", source: "web", text: "Copper output down amid an ongoing permitting dispute in Zaječar.", date: "1m ago", sentiment: "negative", scoreImpact: "-4 (Regulatory Delay)", state: "confirmed", provenance: "Mining.rs", confidence: "91%", duplicate: false, suppressed: false },
        { id: "i9", companyId: "zit", source: "web", text: "Opened a second delivery office in Čačak to handle Western-Europe demand.", date: "10d ago", sentiment: "positive", scoreImpact: "+3 (Expansion)", state: "confirmed", provenance: "eKapija", confidence: "94%", duplicate: false, suppressed: false }
      ],
      scoreFactors: {
        "adr": {
          total: 62,
          confidence: "High",
          signalsCount: 14,
          factors: [
            { name: "Event Attendance", weight: 30, value: 12, max: 30, signals: [{ text: "Missed 2 major events in Q2", source: "engagement", date: "Jun 2026" }] },
            { name: "Committee Activity", weight: 20, value: 5, max: 20, signals: [{ text: "No active committee members", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 18, max: 20, signals: [{ text: "Opens almost every AmCham email; logs in to the portal weekly", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 27, max: 30, signals: [{ text: "Strong alignment on ESG", source: "staff", date: "15d ago" }] }
          ]
        },
        "hmo": {
          total: 88,
          confidence: "High",
          signalsCount: 11,
          factors: [
            { name: "Event Attendance", weight: 30, value: 27, max: 30, signals: [{ text: "Attended every major event this year", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 18, max: 20, signals: [{ text: "Active in ESG and Health committees", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 19, max: 20, signals: [{ text: "Opens almost every AmCham email; logs in to the portal weekly", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 24, max: 30, signals: [{ text: "Highly engaged executive sponsor", source: "staff", date: "5d ago" }] }
          ]
        },
        "sbb": {
          total: 55,
          confidence: "High",
          signalsCount: 9,
          factors: [
            { name: "Event Attendance", weight: 30, value: 15, max: 30, signals: [{ text: "Missed all Q3 events following primary contact's departure", source: "engagement", date: "Q3 2026" }] },
            { name: "Committee Activity", weight: 20, value: 5, max: 20, signals: [{ text: "No active committee members currently", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 8, max: 20, signals: [{ text: "Opens few AmCham emails; last portal login over a month ago", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 27, max: 30, signals: [{ text: "Strong historical relationship; actively working to identify a new sponsor", source: "staff", date: "1d ago" }] }
          ]
        },
        "sls": {
          total: 45,
          confidence: "Medium",
          signalsCount: 8,
          factors: [
            { name: "Event Attendance", weight: 30, value: 8, max: 30, signals: [{ text: "Zero event registrations in 2026", source: "engagement", date: "YTD" }] },
            { name: "Committee Activity", weight: 20, value: 4, max: 20, signals: [{ text: "Not active in Finance Committee despite invitation", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 10, max: 20, signals: [{ text: "Opens about half of AmCham emails; logs in about once a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 23, max: 30, signals: [{ text: "New marketing lead engaged; budget confirmed for Q4", source: "staff", date: "3d ago" }] }
          ]
        },
        "kar": {
          total: 82,
          confidence: "High",
          signalsCount: 10,
          factors: [
            { name: "Event Attendance", weight: 30, value: 24, max: 30, signals: [{ text: "Consistent attendance across Legal & Trade committees", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 17, max: 20, signals: [{ text: "Active member of two policy committees", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 17, max: 20, signals: [{ text: "Opens almost every AmCham email; logs in to the portal weekly", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 24, max: 30, signals: [{ text: "Reliable primary contact, quick to respond", source: "staff", date: "5d ago" }] }
          ]
        },
        "kpmg": {
          total: 68,
          confidence: "Medium",
          signalsCount: 7,
          factors: [
            { name: "Event Attendance", weight: 30, value: 18, max: 30, signals: [{ text: "Attended 2 of 4 major events this year", source: "engagement", date: "YTD" }] },
            { name: "Committee Activity", weight: 20, value: 10, max: 20, signals: [{ text: "Limited committee engagement this quarter", source: "engagement", date: "Q3 2026" }] },
            { name: "Portal & Email Activity", weight: 20, value: 14, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 26, max: 30, signals: [{ text: "Long-standing relationship, responsive to outreach", source: "staff", date: "1m ago" }] }
          ]
        },
        "stada": {
          total: 48,
          confidence: "Medium",
          signalsCount: 8,
          factors: [
            { name: "Event Attendance", weight: 30, value: 9, max: 30, signals: [{ text: "Did not join Tech Committee despite mandate", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 4, max: 20, signals: [{ text: "No committee participation", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 13, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 22, max: 30, signals: [{ text: "Positive relationship with regional IT lead", source: "staff", date: "3w ago" }] }
          ]
        },
        "ncr": {
          total: 91,
          confidence: "High",
          signalsCount: 12,
          factors: [
            { name: "Event Attendance", weight: 30, value: 27, max: 30, signals: [{ text: "Consistent attendance across IT and Trade committees", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 18, max: 20, signals: [{ text: "Active sponsor of two working groups", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 19, max: 20, signals: [{ text: "Opens almost every AmCham email; logs in to the portal weekly", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 27, max: 30, signals: [{ text: "Highly responsive account contact", source: "staff", date: "2w ago" }] }
          ]
        },
        "pmp": {
          total: 94,
          confidence: "High",
          signalsCount: 10,
          factors: [
            { name: "Event Attendance", weight: 30, value: 28, max: 30, signals: [{ text: "Near-perfect attendance across major events", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 19, max: 20, signals: [{ text: "Chairs the Trade Facilitation working group", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 19, max: 20, signals: [{ text: "Opens almost every AmCham email; logs in to the portal weekly", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 28, max: 30, signals: [{ text: "Long-tenured relationship, highly engaged", source: "staff", date: "1m ago" }] }
          ]
        },
        "ccbc": {
          total: 85,
          confidence: "High",
          signalsCount: 9,
          factors: [
            { name: "Event Attendance", weight: 30, value: 25, max: 30, signals: [{ text: "Strong attendance, slight dip in Q3 regional events", source: "engagement", date: "Q3 2026" }] },
            { name: "Committee Activity", weight: 20, value: 16, max: 20, signals: [{ text: "Active in FMCG and Trade committees", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 17, max: 20, signals: [{ text: "Opens almost every AmCham email; logs in to the portal weekly", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 27, max: 30, signals: [{ text: "Reliable, proactive account contact", source: "staff", date: "10d ago" }] }
          ]
        },
        "nrb": {
          total: 76,
          confidence: "Medium",
          signalsCount: 8,
          factors: [
            { name: "Event Attendance", weight: 30, value: 20, max: 30, signals: [{ text: "Attendance softened this quarter", source: "engagement", date: "Q3 2026" }] },
            { name: "Committee Activity", weight: 20, value: 12, max: 20, signals: [{ text: "One active committee seat, down from two", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 16, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 28, max: 30, signals: [{ text: "Long relationship; renewal conversation underway", source: "staff", date: "5d ago" }] }
          ]
        },
        "dlz": {
          total: 92,
          confidence: "High",
          signalsCount: 11,
          factors: [
            { name: "Event Attendance", weight: 30, value: 28, max: 30, signals: [{ text: "Attendance up sharply across all event types", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 18, max: 20, signals: [{ text: "Newly active in two committees", source: "engagement", date: "1m ago" }] },
            { name: "Portal & Email Activity", weight: 20, value: 19, max: 20, signals: [{ text: "Opens almost every AmCham email; logs in to the portal weekly", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 27, max: 30, signals: [{ text: "Executive sponsor highly engaged this year", source: "staff", date: "4d ago" }] }
          ]
        },
        "msft": {
          total: 89,
          confidence: "High",
          signalsCount: 9,
          factors: [
            { name: "Event Attendance", weight: 30, value: 26, max: 30, signals: [{ text: "Slight attendance dip from senior team travel", source: "engagement", date: "Q3 2026" }] },
            { name: "Committee Activity", weight: 20, value: 17, max: 20, signals: [{ text: "Active in Tech Committee leadership", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 18, max: 20, signals: [{ text: "Opens almost every AmCham email; logs in to the portal weekly", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 28, max: 30, signals: [{ text: "Consistently responsive engineering-hub contact", source: "staff", date: "1w ago" }] }
          ]
        },
        "pwc": {
          total: 71,
          confidence: "Medium",
          signalsCount: 7,
          factors: [
            { name: "Event Attendance", weight: 30, value: 19, max: 30, signals: [{ text: "Moderate attendance, mostly junior staff", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 12, max: 20, signals: [{ text: "One committee seat, inconsistent attendance", source: "engagement", date: "Q3 2026" }] },
            { name: "Portal & Email Activity", weight: 20, value: 14, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 26, max: 30, signals: [{ text: "Responsive contact; renewal terms still under discussion", source: "staff", date: "2w ago" }] }
          ]
        },
        "nkt": {
          total: 79,
          confidence: "Medium",
          signalsCount: 8,
          factors: [
            { name: "Event Attendance", weight: 30, value: 23, max: 30, signals: [{ text: "Steady attendance across logistics-focused events", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 14, max: 20, signals: [{ text: "Active in Transport sub-committee", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 16, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 26, max: 30, signals: [{ text: "Cooperative account relationship ahead of renewal", source: "staff", date: "6d ago" }] }
          ]
        },
        "mcb": {
          total: 81,
          confidence: "High",
          signalsCount: 9,
          factors: [
            { name: "Event Attendance", weight: 30, value: 24, max: 30, signals: [{ text: "Attendance climbing steadily this year", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 15, max: 20, signals: [{ text: "Newly active in Finance Committee", source: "engagement", date: "6w ago" }] },
            { name: "Portal & Email Activity", weight: 20, value: 17, max: 20, signals: [{ text: "Opens almost every AmCham email; logs in to the portal weekly", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 25, max: 30, signals: [{ text: "Engaged relationship manager, quick to respond", source: "staff", date: "1w ago" }] }
          ]
        },
        "ibm": {
          total: 64,
          confidence: "Medium",
          signalsCount: 7,
          factors: [
            { name: "Event Attendance", weight: 30, value: 17, max: 30, signals: [{ text: "Attendance down from prior year", source: "engagement", date: "Q3 2026" }] },
            { name: "Committee Activity", weight: 20, value: 10, max: 20, signals: [{ text: "Reduced committee participation", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 13, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 24, max: 30, signals: [{ text: "Contact remains responsive despite lower activity", source: "staff", date: "3w ago" }] }
          ]
        },
        "bky": {
          total: 77,
          confidence: "Medium",
          signalsCount: 8,
          factors: [
            { name: "Event Attendance", weight: 30, value: 22, max: 30, signals: [{ text: "Solid attendance across FMCG-track events", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 14, max: 20, signals: [{ text: "One active committee seat", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 16, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 25, max: 30, signals: [{ text: "Consistent, positive relationship", source: "staff", date: "2w ago" }] }
          ]
        },
        "mtk": {
          total: 73,
          confidence: "Medium",
          signalsCount: 7,
          factors: [
            { name: "Event Attendance", weight: 30, value: 20, max: 30, signals: [{ text: "Flat attendance year over year", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 12, max: 20, signals: [{ text: "Limited committee engagement", source: "engagement", date: "Q3 2026" }] },
            { name: "Portal & Email Activity", weight: 20, value: 15, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 26, max: 30, signals: [{ text: "Reliable, long-standing contact", source: "staff", date: "2w ago" }] }
          ]
        },
        "tln": {
          total: 86,
          confidence: "High",
          signalsCount: 10,
          factors: [
            { name: "Event Attendance", weight: 30, value: 26, max: 30, signals: [{ text: "Attendance rising sharply this year", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 16, max: 20, signals: [{ text: "Newly active in Tech Committee", source: "engagement", date: "1m ago" }] },
            { name: "Portal & Email Activity", weight: 20, value: 18, max: 20, signals: [{ text: "Opens almost every AmCham email; logs in to the portal weekly", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 26, max: 30, signals: [{ text: "Highly engaged since new digital lead joined", source: "staff", date: "1w ago" }] }
          ]
        },
        "bsw": {
          total: 74,
          confidence: "Medium",
          signalsCount: 12,
          factors: [
            { name: "Event Attendance", weight: 30, value: 24, max: 30, signals: [{ text: "Sent two engineers to the Infrastructure & Construction forum this quarter", source: "engagement", date: "Q3 2026" }] },
            { name: "Committee Activity", weight: 20, value: 13, max: 20, signals: [{ text: "Newly joined the Infrastructure committee as a working member", source: "engagement", date: "1m ago" }] },
            { name: "Portal & Email Activity", weight: 20, value: 14, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 23, max: 30, signals: [{ text: "Responsive plant-operations contact, quick to confirm event attendance", source: "staff", date: "1w ago" }] }
          ]
        },
        "sav": {
          total: 80,
          confidence: "High",
          signalsCount: 13,
          factors: [
            { name: "Event Attendance", weight: 30, value: 22, max: 30, signals: [{ text: "Attended the Energy Transition roundtable, skipped the summer mixer", source: "engagement", date: "Q3 2026" }] },
            { name: "Committee Activity", weight: 20, value: 13, max: 20, signals: [{ text: "Long-standing seat on the Energy committee, steady but not expanding", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 17, max: 20, signals: [{ text: "Opens almost every AmCham email; logs in to the portal weekly", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 28, max: 30, signals: [{ text: "Renewal terms in discussion; relationship remains warm", source: "staff", date: "2w ago" }] }
          ]
        },
        "mrh": {
          total: 68,
          confidence: "Medium",
          signalsCount: 12,
          factors: [
            { name: "Event Attendance", weight: 30, value: 16, max: 30, signals: [{ text: "Missed both retail-sector briefings since the category lead left", source: "engagement", date: "Q3 2026" }] },
            { name: "Committee Activity", weight: 20, value: 8, max: 20, signals: [{ text: "No representative on the Retail & Consumer committee this cycle", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 16, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 28, max: 30, signals: [{ text: "New finance contact still getting oriented; first proper call scheduled", source: "staff", date: "6d ago" }] }
          ]
        },
        "dcb": {
          total: 86,
          confidence: "High",
          signalsCount: 13,
          factors: [
            { name: "Event Attendance", weight: 30, value: 26, max: 30, signals: [{ text: "Sent senior trade-finance staff to every Q3 event", source: "engagement", date: "Q3 2026" }] },
            { name: "Committee Activity", weight: 20, value: 15, max: 20, signals: [{ text: "Chairs the Banking & Finance sub-committee", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 18, max: 20, signals: [{ text: "Opens almost every AmCham email; logs in to the portal weekly", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 27, max: 30, signals: [{ text: "Relationship manager consistently proactive on scheduling", source: "staff", date: "6d ago" }] }
          ]
        },
        "nvl": {
          total: 71,
          confidence: "Medium",
          signalsCount: 12,
          factors: [
            { name: "Event Attendance", weight: 30, value: 23, max: 30, signals: [{ text: "Attended the Danube corridor logistics briefing in force", source: "engagement", date: "1m ago" }] },
            { name: "Committee Activity", weight: 20, value: 12, max: 20, signals: [{ text: "First-time participant in the Transport working group", source: "engagement", date: "6w ago" }] },
            { name: "Portal & Email Activity", weight: 20, value: 14, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 22, max: 30, signals: [{ text: "Operations lead responsive within a day on outreach", source: "staff", date: "6d ago" }] }
          ]
        },
        "vat": {
          total: 77,
          confidence: "Medium",
          signalsCount: 12,
          factors: [
            { name: "Event Attendance", weight: 30, value: 22, max: 30, signals: [{ text: "Steady attendance at agribusiness and export-focused events", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 12, max: 20, signals: [{ text: "Active in the FMCG committee's export subgroup", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 16, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 27, max: 30, signals: [{ text: "Renewal conversation underway; contact remains engaged", source: "staff", date: "2w ago" }] }
          ]
        },
        "bcp": {
          total: 65,
          confidence: "Medium",
          signalsCount: 11,
          factors: [
            { name: "Event Attendance", weight: 30, value: 19, max: 30, signals: [{ text: "Attendance thinned out after their senior partner's parental leave", source: "engagement", date: "Q3 2026" }] },
            { name: "Committee Activity", weight: 20, value: 10, max: 20, signals: [{ text: "One associate still seated on the SME Advisory committee", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 13, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 23, max: 30, signals: [{ text: "Billing contact responsive; renewal terms nearly settled", source: "staff", date: "2w ago" }] }
          ]
        },
        "slg": {
          total: 72,
          confidence: "Medium",
          signalsCount: 12,
          factors: [
            { name: "Event Attendance", weight: 30, value: 23, max: 30, signals: [{ text: "Regular presence at the Legal & Regulatory Affairs sessions", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 12, max: 20, signals: [{ text: "Active voice in the automotive-supply-chain working group", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 14, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 23, max: 30, signals: [{ text: "Managing partner engaged, quick to confirm attendance", source: "staff", date: "6d ago" }] }
          ]
        },
        "zit": {
          total: 83,
          confidence: "High",
          signalsCount: 13,
          factors: [
            { name: "Event Attendance", weight: 30, value: 26, max: 30, signals: [{ text: "Sent a delegation to the nearshoring & talent panel", source: "engagement", date: "3w ago" }] },
            { name: "Committee Activity", weight: 20, value: 15, max: 20, signals: [{ text: "Newly active in the Digital Economy committee", source: "engagement", date: "1m ago" }] },
            { name: "Portal & Email Activity", weight: 20, value: 17, max: 20, signals: [{ text: "Opens almost every AmCham email; logs in to the portal weekly", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 25, max: 30, signals: [{ text: "Founder personally engaged with AmCham outreach", source: "staff", date: "6d ago" }] }
          ]
        },
        "tmm": {
          total: 58,
          confidence: "Medium",
          signalsCount: 11,
          factors: [
            { name: "Event Attendance", weight: 30, value: 13, max: 30, signals: [{ text: "No attendance recorded since the site-safety incident in Q2", source: "engagement", date: "Q2 2026" }] },
            { name: "Committee Activity", weight: 20, value: 6, max: 20, signals: [{ text: "Dropped off the Energy & Extractives committee roster", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 13, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 26, max: 30, signals: [{ text: "Regional contact still willing to talk; awaiting a new site manager", source: "staff", date: "38d ago" }] }
          ]
        },
        "jpl": {
          total: 69,
          confidence: "Medium",
          signalsCount: 12,
          factors: [
            { name: "Event Attendance", weight: 30, value: 20, max: 30, signals: [{ text: "Modest attendance, mostly dispatch-level staff", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 11, max: 20, signals: [{ text: "One seat on the Transport committee, low activity", source: "engagement", date: "Q3 2026" }] },
            { name: "Portal & Email Activity", weight: 20, value: 14, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 24, max: 30, signals: [{ text: "Owner-operator responsive; renewal expected to proceed", source: "staff", date: "2w ago" }] }
          ]
        },
        "pnf": {
          total: 79,
          confidence: "Medium",
          signalsCount: 13,
          factors: [
            { name: "Event Attendance", weight: 30, value: 25, max: 30, signals: [{ text: "Strong turnout at FMCG and export-compliance events", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 14, max: 20, signals: [{ text: "Active in the FMCG committee's EU market-access track", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 16, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 24, max: 30, signals: [{ text: "Export manager proactive, flags opportunities early", source: "staff", date: "6d ago" }] }
          ]
        },
        "srb": {
          total: 61,
          confidence: "Medium",
          signalsCount: 11,
          factors: [
            { name: "Event Attendance", weight: 30, value: 16, max: 30, signals: [{ text: "Attended its first AmCham event within a month of joining", source: "engagement", date: "3w ago" }] },
            { name: "Committee Activity", weight: 20, value: 8, max: 20, signals: [{ text: "Expressed interest in the Digital Economy committee, not yet seated", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 14, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 23, max: 30, signals: [{ text: "Founder highly engaged during onboarding calls", source: "staff", date: "3d ago" }] }
          ]
        },
        "ztg": {
          total: 66,
          confidence: "Medium",
          signalsCount: 12,
          factors: [
            { name: "Event Attendance", weight: 30, value: 19, max: 30, signals: [{ text: "Seasonal attendance pattern, quiet outside peak season", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 10, max: 20, signals: [{ text: "Occasional participant in the Tourism & Services roundtable", source: "engagement", date: "Q3 2026" }] },
            { name: "Portal & Email Activity", weight: 20, value: 13, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 24, max: 30, signals: [{ text: "General manager responsive but slow to confirm renewal", source: "staff", date: "2w ago" }] }
          ]
        },
        "fgw": {
          total: 75,
          confidence: "Medium",
          signalsCount: 12,
          factors: [
            { name: "Event Attendance", weight: 30, value: 24, max: 30, signals: [{ text: "Attended the export-readiness workshop and the FMCG mixer", source: "engagement", date: "3w ago" }] },
            { name: "Committee Activity", weight: 20, value: 13, max: 20, signals: [{ text: "Active in the FMCG committee's boutique-exporter cohort", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 15, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 23, max: 30, signals: [{ text: "Owner personally engaged, enthusiastic about member events", source: "staff", date: "6d ago" }] }
          ]
        },
        "kpc": {
          total: 63,
          confidence: "Medium",
          signalsCount: 11,
          factors: [
            { name: "Event Attendance", weight: 30, value: 14, max: 30, signals: [{ text: "Attendance dropped off after two stalled public tenders", source: "engagement", date: "Q3 2026" }] },
            { name: "Committee Activity", weight: 20, value: 7, max: 20, signals: [{ text: "No longer represented on the Infrastructure committee", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 15, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 27, max: 30, signals: [{ text: "Long-tenured contact still responsive despite the account's drift", source: "staff", date: "38d ago" }] }
          ]
        },
        "bfa": {
          total: 70,
          confidence: "Medium",
          signalsCount: 12,
          factors: [
            { name: "Event Attendance", weight: 30, value: 23, max: 30, signals: [{ text: "Consistent attendance at the Banking & Finance briefings", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 12, max: 20, signals: [{ text: "Active associate member of the Finance committee", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 13, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 22, max: 30, signals: [{ text: "Managing director engaged, responds within days", source: "staff", date: "6d ago" }] }
          ]
        },
        "nph": {
          total: 81,
          confidence: "High",
          signalsCount: 13,
          factors: [
            { name: "Event Attendance", weight: 30, value: 25, max: 30, signals: [{ text: "Sent regulatory-affairs staff to every Pharma & Health session", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 15, max: 20, signals: [{ text: "Active in the Health & Life Sciences committee", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 16, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 25, max: 30, signals: [{ text: "Quality-affairs contact reliable and quick to respond", source: "staff", date: "6d ago" }] }
          ]
        },
        "dhp": {
          total: 76,
          confidence: "Medium",
          signalsCount: 12,
          factors: [
            { name: "Event Attendance", weight: 30, value: 21, max: 30, signals: [{ text: "Attends the Energy committee's quarterly briefings reliably", source: "engagement", date: "Ongoing" }] },
            { name: "Committee Activity", weight: 20, value: 12, max: 20, signals: [{ text: "Steady, unchanged seat on the Energy & Extractives committee", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 16, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 27, max: 30, signals: [{ text: "Plant director responsive; renewal expected to be routine", source: "staff", date: "2w ago" }] }
          ]
        },
        "dmg": {
          total: 55,
          confidence: "Medium",
          signalsCount: 11,
          factors: [
            { name: "Event Attendance", weight: 30, value: 14, max: 30, signals: [{ text: "Attended its welcome briefing and one river-tourism mixer", source: "engagement", date: "3w ago" }] },
            { name: "Committee Activity", weight: 20, value: 6, max: 20, signals: [{ text: "Not yet placed on a committee; still in its first year", source: "engagement", date: "Ongoing" }] },
            { name: "Portal & Email Activity", weight: 20, value: 13, max: 20, signals: [{ text: "Opens most AmCham emails; logs in to the portal a few times a month", source: "engagement", date: "This month" }] },
            { name: "Staff Assessment", weight: 30, value: 22, max: 30, signals: [{ text: "New owner enthusiastic but still learning the membership benefits", source: "staff", date: "3d ago" }] }
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
    scoreNarrative: {
      recentOutcomes: [
        "A direct introduction to Banca Intesa was completed in August.",
        "Your team contributed to the Environment Committee's current work on packaging regulations.",
        "Two advocacy priorities connected to your sector moved forward this quarter."
      ],
      committeeNote: "Ana Ilić actively participated in the Environment Committee"
    },
    peerBenchmarks: {
      Patron: { introsBrokered: 5, eventsAttended: 16, advocacyWins: 2, marketplaceResponses: 5 },
      Corporate: { introsBrokered: 2, eventsAttended: 7, advocacyWins: 1, marketplaceResponses: 2 },
      Business: { introsBrokered: 2, eventsAttended: 6, advocacyWins: 1, marketplaceResponses: 2 }
    },
    laptimeSectorBreakdown: {
      "2025": {
        Manufacturing: { climate: 2.5, innovation: 60, revenueGrowth: 65 },
        Pharma: { climate: 3.4, innovation: 74, revenueGrowth: 80 },
        IT: { climate: 3.1, innovation: 82, revenueGrowth: 78 },
        Logistics: { climate: 2.8, innovation: 65, revenueGrowth: 70 },
        Finance: { climate: 2.3, innovation: 58, revenueGrowth: 55 },
        FMCG: { climate: 3.0, innovation: 70, revenueGrowth: 75 },
        Energy: { climate: 2.2, innovation: 55, revenueGrowth: 50 },
        Retail: { climate: 3.2, innovation: 68, revenueGrowth: 82 },
        Legal: { climate: 2.9, innovation: 63, revenueGrowth: 68 },
        Consulting: { climate: 2.6, innovation: 66, revenueGrowth: 60 }
      },
      "2024": {
        Manufacturing: { climate: 2.7, innovation: 54, revenueGrowth: 78 },
        Pharma: { climate: 3.6, innovation: 68, revenueGrowth: 93 },
        IT: { climate: 3.3, innovation: 76, revenueGrowth: 91 },
        Logistics: { climate: 3.0, innovation: 59, revenueGrowth: 83 },
        Finance: { climate: 2.5, innovation: 52, revenueGrowth: 68 },
        FMCG: { climate: 3.2, innovation: 64, revenueGrowth: 88 },
        Energy: { climate: 2.4, innovation: 49, revenueGrowth: 63 },
        Retail: { climate: 3.4, innovation: 62, revenueGrowth: 95 },
        Legal: { climate: 3.1, innovation: 57, revenueGrowth: 81 },
        Consulting: { climate: 2.8, innovation: 60, revenueGrowth: 73 }
      }
    },
    sinceLastVisit: { introsProgressed: 1, newMatches: 2, eventReminder: "Tomorrow, 10:00" },
    glance: {
      eventSeats: { used: 6, total: 10 },
      committeeSeats: { used: 4, total: 6 },
      cadence: "90d"
    },
    // "View portal as" overrides for the demo — the fields above are Adriatica
    // Grupa's (the default member). These layer on top for a couple of other
    // companies so a viewer can contrast a thriving Patron and a growing
    // Business-tier member against the at-risk default. Any id not listed
    // here just falls back to the default fields above.
    memberOverrides: {
      hmo: {
        billing: {
          renewalDate: "Jan 15, 2027",
          seatsUsed: "10 of 10",
          autoRenew: true,
          invoices: [
            { id: "INV-2025-0212", date: "Jan 15, 2026", amount: "€18,000", status: "Paid" },
            { id: "INV-2024-0212", date: "Jan 15, 2025", amount: "€18,000", status: "Paid" },
            { id: "INV-2023-0212", date: "Jan 15, 2024", amount: "€17,000", status: "Paid" }
          ],
          paymentMethod: { type: "Bank Transfer", details: "Ending in ...2210" },
          documents: [
            { id: "doc1", name: "AmCham Membership Agreement 2025.pdf", type: "Contract" },
            { id: "doc2", name: "Membership Certificate 2026.pdf", type: "Certificate" },
            { id: "doc3", name: "Tax Residency Document (W-8BEN).pdf", type: "Tax" }
          ]
        },
        valueReceipt: { introsBrokered: 7, eventsAttended: 22, advocacyWins: 3, marketplaceResponses: 6 },
        scoreNarrative: {
          recentOutcomes: [
            "A direct introduction to a regional distribution partner was completed in August.",
            "Your team chaired the Health Care Committee's Q3 session on export licensing.",
            "Two ESG-aligned advocacy priorities for the pharma sector moved forward this quarter."
          ],
          committeeNote: "Your regional director chairs the ESG and Health Care committees"
        },
        glance: {
          eventSeats: { used: 9, total: 10 },
          committeeSeats: { used: 5, total: 6 },
          cadence: "90d"
        }
      },
      kar: {
        billing: {
          renewalDate: "Apr 20, 2027",
          seatsUsed: "3 of 4",
          autoRenew: true,
          invoices: [
            { id: "INV-2025-0337", date: "Apr 20, 2026", amount: "€2,500", status: "Paid" },
            { id: "INV-2024-0337", date: "Apr 20, 2025", amount: "€2,500", status: "Paid" },
            { id: "INV-2023-0337", date: "Apr 20, 2024", amount: "€2,000", status: "Paid" }
          ],
          paymentMethod: { type: "Bank Transfer", details: "Ending in ...7734" },
          documents: [
            { id: "doc1", name: "AmCham Membership Agreement 2025.pdf", type: "Contract" },
            { id: "doc2", name: "Membership Certificate 2026.pdf", type: "Certificate" }
          ]
        },
        valueReceipt: { introsBrokered: 4, eventsAttended: 9, advocacyWins: 1, marketplaceResponses: 2 },
        scoreNarrative: {
          recentOutcomes: [
            "A direct introduction to IBM Serbia's compliance team was completed in September.",
            "Your team contributed to the Legal & Trade Committee's review of data protection rules.",
            "One advocacy priority connected to cross-border practice moved forward this quarter."
          ],
          committeeNote: "Your firm is active in two policy committees this year"
        },
        glance: {
          eventSeats: { used: 4, total: 5 },
          committeeSeats: { used: 2, total: 3 },
          cadence: "180d"
        }
      }
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
      reportName: "Business climate survey 2025",
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
        { domain: "Privacy & Sharing", crosses: true, desc: "Anonymized aggregation, explicit intro requests." },
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
      { id: "d3", name: "Microsoft", sector: "IT", tier: "Patron", desc: "Global technology and software provider.", saved: false, recommended: true, recReason: "Both are investing in digital transformation" }
    ],
    homeInbox: [
      { id: "h1", type: "action", urgency: "high", text: "Complete your profile to unlock committee recommendations.", action: "Complete Profile", route: "onboarding" },
      { id: "h2", type: "update", urgency: "normal", text: "Your intro to Nelt Co was accepted. Meeting scheduled for Tuesday.", action: "View Intro", route: "directory" },
      { id: "h3", type: "update", urgency: "normal", text: "Environment Committee published a new draft on Renewables.", action: "Read Draft", route: "committee" }
    ]
  }
};

// Real committee rosters (not just names + icons) — who actually chairs and
// sits on each committee, consistent with the "Committee Activity" signals
// already authored per-company in scoreFactors above. Shared by the public
// Advocacy page and the console's Committees view so both tell the same
// story. Committee names/order match advocacy.tsx and mock.ts's policyWins.

// Resolves which company the member portal is currently being viewed as, and
// that company's billing/home/glance data — the default company's own data
// when no override exists, or when the id isn't recognized at all.
export const VIEW_AS_OPTIONS = ["adr", "hmo", "kar"] as const;

export function resolveViewAsMember(id: string | null | undefined) {
  const member = platformData.allMembers.find(c => c.id === id) || platformData.member;
  const overrides = (platformData.portal.memberOverrides as Record<string, any>)[member.id];
  const peerBenchmarks = platformData.portal.peerBenchmarks as Record<string, any>;
  return {
    member,
    billing: { ...platformData.portal.billing, ...(overrides?.billing || {}) },
    valueReceipt: overrides?.valueReceipt || platformData.portal.valueReceipt,
    scoreNarrative: overrides?.scoreNarrative || platformData.portal.scoreNarrative,
    peerBenchmark: peerBenchmarks[member.tier] || null,
    glance: { ...platformData.portal.glance, tier: member.tier, ...(overrides?.glance || {}) }
  };
}
