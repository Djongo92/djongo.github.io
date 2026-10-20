// Page Drafter — "vibe-draft" a website page the firm can paste into its own
// site. Output is the page as copy sections plus SEO fields plus clean,
// unstyled semantic HTML the firm's developer or CMS can restyle. It never
// builds a site; it drafts the words and structure.
import { handleWritingTool, field } from "../_shared/writingTool.ts";

const PAGE_TYPES: Record<string, string> = {
  practice: "a practice-area page: who it is for, the problems solved, how the firm approaches the work, proof, and a clear next step",
  lawyer: "a lawyer profile page: what this person is known for, the kinds of matters they handle, credentials, and how to contact them",
  about: "an About / firm page: what the firm stands for in concrete terms, who it serves, how it works, and what is different",
  insight: "an insights landing page: what the firm writes about, who it is for, featured pieces, and how to subscribe or get in touch",
  industry: "an industry/sector page: the sector's legal pressure points, how the firm helps, proof, and a next step",
  home: "a homepage: a one-line positioning promise, who it serves, the main practice areas, proof, and a clear call to action",
};

Deno.serve(handleWritingTool({
  toolId: "pagedraft",
  memoryQuery: (b) => `${field(b.pageType, 40)} ${field(b.topic, 200)}`,
  maxTokens: 5000,
  build: (b) => {
    const pageType = field(b.pageType, 40) || "practice";
    const shape = PAGE_TYPES[pageType] ?? PAGE_TYPES.practice;
    const system = `You are a website copywriter and information architect for law firms. Draft ${shape}.

You are drafting the words and structure for the firm to paste into its own site. You are not building the site: no CSS, no scripts, no frameworks, no images except described placeholders.

Rules for the page:
- Lead with what the visitor needs, not the firm's history. One H1 that says plainly what the page is and for whom.
- Concrete over generic. Name the situations clients are in. Never use "full-service", "trusted advisor", "committed to excellence".
- Every claim of experience, ranking, client or result must come from the brief; otherwise use a [PLACEHOLDER].
- One primary call to action; write the CTA text itself.
- Plain language a non-lawyer can follow; 8th–10th grade reading level where the subject allows.

Produce exactly these parts (markdown):
## Page plan
A 3–5 line plan: the visitor, what they want, the single action you want, and the order of sections and why.
## SEO fields
- Title tag (under 60 characters)
- Meta description (under 155 characters)
- URL slug suggestion
- Primary keyword and 3 supporting phrases
## Page copy
The page as sections. For each: a "### Section name (purpose)" heading, then the final copy. Include a short FAQ (3–5 real client questions with answers of 2–3 sentences) where it fits the page type.
## Clean HTML
One fenced \`\`\`html block with the same page as minimal semantic HTML: a single <h1>, <h2>/<h3> for sections, <p>, <ul>, <a> for the CTA (href="#contact"), and an FAQ list. No inline styles, classes, scripts or images (use <!-- IMAGE: description --> comments). Escape ampersands and angle brackets in text.
## Before you publish
Checklist: facts verified, ranking/credential claims allowed under local advertising rules, consent for any client named, internal links to add, and where to place this page in the site navigation.`;
    const user = [
      `Page type: ${pageType}`,
      `Topic / subject: ${field(b.topic, 400)}`,
      b.audience ? `Who the page is for: ${field(b.audience, 400)}` : "",
      b.goal ? `What visitors should do next: ${field(b.goal, 300)}` : "",
      b.keywords ? `Search phrases to target: ${field(b.keywords, 300)}` : "",
      b.proof ? `Proof, credentials and facts we can use:\n${field(b.proof, 3000)}` : "",
      b.existing ? `Current page text to improve or replace:\n${field(b.existing, 5000)}` : "",
      b.vibe ? `Tone / feel: ${field(b.vibe, 200)}` : "",
    ].filter(Boolean).join("\n\n");
    return { system, user };
  },
}));
