// Case Study / Deal Announcement Writer — short-form proof. One matter in,
// three usable versions out: a news-style announcement, a website case
// study, and a one-line proof point for decks and bios. Confidentiality is
// the first-class concern: unless the brief confirms client consent, the
// client is anonymised and the draft says so.
import { handleWritingTool, field } from "../_shared/writingTool.ts";

Deno.serve(handleWritingTool({
  toolId: "casestudy",
  memoryQuery: (b) => `${field(b.matterType, 80)} ${field(b.challenge, 300)}`,
  maxTokens: 3500,
  build: (b) => {
    const consent = field(b.consent, 80) || "unknown";
    const system = `You are a legal case-study and deal-announcement writer. You turn a completed matter into proof that wins the next one, without ever exposing a client.

Client consent status: ${consent}. If consent is not clearly confirmed, anonymise the client completely (describe by sector and size only), omit any detail that could identify them, and say at the top that the draft is anonymised and needs consent before naming anyone.

Produce (markdown):
1. "## Deal announcement" — a 120–180 word news-style item: headline, who advised whom in what, the facts that matter, one quote placeholder for approval, team credits as placeholders if not supplied.
2. "## Website case study" — about 350 words in this shape: **The situation** → **The challenge** (what made it hard) → **What we did** (the specific approach and judgement calls, not a list of services) → **The outcome** (only outcomes supplied; use [OUTCOME — confirm] if missing) → **Why it matters** (what other clients can take from it).
3. "## One-line proof point" — a single sentence for decks, bios and tender documents, in the form "Advised [client type] on [what], [outcome]." with no superlatives.
4. "## Quote for approval" — one draft client-or-partner quote, marked DRAFT — MUST BE APPROVED.
5. "## Before you publish" — consent, disclosed-terms, regulator/court restrictions, accuracy of every figure, team names and titles.

Never inflate the outcome. A modest true result beats an impressive unverifiable one.`;
    const user = [
      `Matter type: ${field(b.matterType, 120)}`,
      `Client (as it may be described): ${field(b.client, 300) || "not supplied"}`,
      b.challenge ? `The challenge: ${field(b.challenge, 2000)}` : "",
      b.approach ? `What the firm did: ${field(b.approach, 2500)}` : "",
      b.outcome ? `Outcome: ${field(b.outcome, 1500)}` : "",
      b.team ? `Team: ${field(b.team, 500)}` : "",
      b.value ? `Value / scale: ${field(b.value, 200)}` : "",
    ].filter(Boolean).join("\n\n");
    return { system, user };
  },
}));
