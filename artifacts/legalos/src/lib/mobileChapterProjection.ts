// Single-source projection: the web guidebook (src/data/chapters/) is the
// canonical book; the mobile app's data/chapters.ts is GENERATED from it by
// scripts/generate-mobile-chapters.mjs. The mobile reader renders a simpler
// shape (no artifacts/proofMetric/stat sources/deep dives), so the projection
// folds those rubric fields into plain sections rather than dropping them —
// the materials are the most valuable part of the book.
import type { Chapter, ChapterSection } from "@/data/chapters";

export const MOBILE_HEADER = `// GENERATED FILE — do not edit by hand.
// Source of truth: artifacts/legalos/src/data/chapters/
// Regenerate: pnpm --filter @workspace/legalos run generate:mobile-chapters
// Parity is enforced by src/lib/mobileChaptersParity.test.ts (web suite).
`;

const MOBILE_CALLOUT_TYPES = new Set(["insight", "pro-tip", "mistake", "quick-win"]);

/** Fold rubric-only fields into the mobile-renderable section shape. */
const projectSections = (chapter: Chapter): ChapterSection[] => {
  const out: ChapterSection[] = [];
  for (const s of chapter.content) {
    if (s.callout && !MOBILE_CALLOUT_TYPES.has(s.callout.type)) {
      throw new Error(`mobileChapterProjection: callout type "${s.callout.type}" in ${chapter.id} is not renderable on mobile`);
    }
    const projected: ChapterSection = {
      ...(s.heading ? { heading: s.heading } : {}),
      ...(s.paragraphs ? { paragraphs: s.paragraphs } : {}),
      ...(s.bullets ? { bullets: s.bullets } : {}),
      ...(s.numbered ? { numbered: s.numbered } : {}),
      ...(s.pullQuote ? { pullQuote: s.pullQuote } : {}),
      ...(s.callout
        ? { callout: { type: s.callout.type, content: s.callout.title ? `${s.callout.title}: ${s.callout.content}` : s.callout.content } }
        : {}),
      ...(s.stat ? { stat: { value: s.stat.value, label: s.stat.source ? `${s.stat.label} (${s.stat.source})` : s.stat.label } } : {}),
      ...(s.comparison ? { comparison: s.comparison } : {}),
    };
    out.push(projected);
    if (s.deepDive) {
      out.push({ heading: `Deep dive: ${s.deepDive.title}`, paragraphs: [s.deepDive.content] });
    }
  }
  for (const a of chapter.artifacts ?? []) {
    out.push({ heading: `Materials — ${a.title}`, paragraphs: a.body.split("\n") });
  }
  if (chapter.proofMetric) {
    out.push({ heading: "Proof it worked", paragraphs: [chapter.proofMetric] });
  }
  return out;
};

const q = (s: string): string => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'`;
const strArr = (arr: string[], indent: string): string =>
  `[\n${arr.map((x) => `${indent}${q(x)},`).join("\n")}\n${indent.slice(2)}]`;

const sectionToTs = (s: ChapterSection): string => {
  const lines: string[] = [`      {`];
  if (s.heading) lines.push(`        heading: ${q(s.heading)},`);
  if (s.paragraphs) lines.push(`        paragraphs: ${strArr(s.paragraphs, "          ")},`);
  if (s.bullets) lines.push(`        bullets: ${strArr(s.bullets, "          ")},`);
  if (s.numbered) lines.push(`        numbered: ${strArr(s.numbered, "          ")},`);
  if (s.pullQuote) lines.push(`        pullQuote: ${q(s.pullQuote)},`);
  if (s.callout) lines.push(`        callout: { type: ${q(s.callout.type)}, content: ${q(s.callout.content)} },`);
  if (s.stat) lines.push(`        stat: { value: ${q(s.stat.value)}, label: ${q(s.stat.label)} },`);
  if (s.comparison) {
    lines.push(`        comparison: {`);
    lines.push(`          before: { title: ${q(s.comparison.before.title)}, items: ${strArr(s.comparison.before.items, "            ")} },`);
    lines.push(`          after: { title: ${q(s.comparison.after.title)}, items: ${strArr(s.comparison.after.items, "            ")} },`);
    lines.push(`        },`);
  }
  lines.push(`      },`);
  return lines.join("\n");
};

const MOBILE_TYPES = `export interface ChapterSection {
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
`;

/** Serialize the full mobile data/chapters.ts content deterministically. */
export const projectMobileChapters = (chapters: Chapter[]): string => {
  const body = chapters
    .map((c) => {
      const sections = projectSections(c).map(sectionToTs).join("\n");
      const actions = (c.actionItems ?? [])
        .map((a) => `      { text: ${q(a.text)}, priority: ${q(a.priority)} },`)
        .join("\n");
      return `  {
    id: ${q(c.id)},
    number: ${c.number},
    title: ${q(c.title)},
    subtitle: ${q(c.subtitle)},
    hook: ${q(c.hook ?? c.subtitle)},
    actionItems: [
${actions}
    ],
    content: [
${sections}
    ],
  },`;
    })
    .join("\n");
  return `${MOBILE_HEADER}\n${MOBILE_TYPES}\nexport const chapters: Chapter[] = [\n${body}\n];\n`;
};
