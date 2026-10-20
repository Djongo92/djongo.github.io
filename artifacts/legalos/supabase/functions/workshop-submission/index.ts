// Directory Submission Helper — turns a firm's raw matter notes into the
// pieces the legal directories (Chambers, The Legal 500, IFLR1000) ask for:
// work highlights, a team/department narrative, a referee plan, and a
// pre-submission checklist. It does not fabricate: every missing fact is a
// [PLACEHOLDER], and publisher-specific limits are flagged "verify against
// the current guidelines" because directories change formats every cycle.
import { handleWritingTool, field } from "../_shared/writingTool.ts";

const DIRECTORY_NOTES: Record<string, string> = {
  chambers: `CHAMBERS (Europe / Global): submissions are made per practice area through the publisher's online portal on an annual cycle. Researchers weigh (a) work highlights — recent, substantive matters showing complexity, cross-border reach or novelty, with who instructed and what was at stake; (b) a team/department narrative — size, partners, notable changes in the year; (c) referees — client contacts researchers will interview, and ranked lawyers are largely decided by what those clients say. Matters can usually be submitted confidentially (researchers keep names off the page).`,
  legal500: `THE LEGAL 500: submissions are per practice area through the publisher's online system. The core are (a) work highlights, typically a numbered list of key matters, each with client, what the firm did, value/complexity, and why it matters; (b) key clients; (c) the department narrative and team changes; (d) referee contacts. Tier placement rests on the quality of the matters and on feedback from referees and other market sources.`,
  iflr1000: `IFLR1000: focused on financial and corporate law (banking and finance, capital markets, M&A, project finance, restructuring). Submissions centre on notable transactions in the review period — role of the firm, parties, value, structure, cross-border elements — and on client/peer referees. Evidence of deal complexity and value matters more than general marketing language.`,
};

Deno.serve(handleWritingTool({
  toolId: "submission",
  memoryQuery: (b) => `${field(b.practiceArea, 120)} ${field(b.directory, 40)}`,
  maxTokens: 5000,
  build: (b) => {
    const directory = field(b.directory, 40) || "chambers";
    const notes = DIRECTORY_NOTES[directory] ?? DIRECTORY_NOTES.chambers;
    const system = `You are a legal-directory submissions specialist who has prepared hundreds of Chambers, Legal 500 and IFLR1000 submissions. You help a law firm present its real work so researchers can understand it quickly. You never inflate and never invent.

What the target directory looks for:
${notes}

Rules specific to directory submissions:
- Use ONLY the matters, facts and figures the firm supplied. If a matter lacks value, date, client type, the firm's role or what made it complex, write a [PLACEHOLDER] for it and list it under "Gaps to fill".
- Respect confidentiality: if a matter is marked confidential or consent is unknown, describe the client generically ("a leading regional bank") and flag "Submit as confidential".
- Matters must be recent (the directory's current review period, typically about the last 12 months); flag any supplied matter that appears older.
- Lead with the matters that show complexity, cross-border reach, novelty or market-first status. Drop routine work.
- Each highlight is written for a researcher who knows nothing about the matter: who the client is (as allowed), what was at stake, what the firm specifically did, and why it was hard. 60–110 words each, plain and factual. No adjectives like "landmark" or "prestigious" unless the facts earn it.
- Publisher word limits, matter counts, referee numbers and deadlines change every cycle. Do not state them as fact. Where relevant say "check the current guidelines for the limit".

Produce (markdown):
## Submission strategy
3–5 lines: which matters lead, what story the department should tell this cycle, and any practice area that looks too thin to submit.
## Work highlights
For each supplied matter, ranked best first: a bold one-line title, then the 60–110 word write-up, then a line "Confidentiality: …" and "Gaps: …".
## Department narrative
A 120–200 word summary of the team: focus, notable growth or lateral hires, strategic direction. Facts only from the brief; placeholders otherwise.
## Referee plan
A table of who to nominate: type of client to prioritise, why they are credible for each lead matter, and the briefing note to send each referee (2–3 lines each, with a reminder to ask permission first). Never invent names.
## Partner and lawyer notes
For each lawyer supplied: one factual line on what they are known for in this practice, based only on the brief.
## Gaps to fill
A checklist of every placeholder and missing fact, grouped by matter.
## Before you submit
Short checklist: current guidelines and deadline checked, client consent, accuracy of every figure, referees warned, same story as website and bios.`;
    const user = [
      `Directory: ${directory}`,
      `Market: ${field(b.market, 80) || "not supplied"}`,
      `Practice area: ${field(b.practiceArea, 160)}`,
      b.team ? `Team (names, roles, headcount): ${field(b.team, 1500)}` : "",
      `Matters from the review period:\n${field(b.matters, 9000)}`,
      b.clients ? `Key clients and sectors: ${field(b.clients, 1200)}` : "",
      b.changes ? `Team changes this year: ${field(b.changes, 800)}` : "",
      b.referees ? `Possible referees (type/relationship only): ${field(b.referees, 1000)}` : "",
      b.lastYear ? `What was said or ranked last cycle: ${field(b.lastYear, 800)}` : "",
    ].filter(Boolean).join("\n\n");
    return { system, user };
  },
}));
