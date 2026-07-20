import { Chapter } from "@/data/chapters";

/** Flattens a chapter into a plain-text representation for AI prompts. */
export const chapterToText = (chapter: Chapter): string => {
  const parts: string[] = [];
  parts.push(`# Chapter ${chapter.number}: ${chapter.title}`);
  if (chapter.subtitle) parts.push(chapter.subtitle);
  for (const s of chapter.content) {
    if (s.heading) parts.push(`\n## ${s.heading}`);
    if (s.paragraphs) for (const p of s.paragraphs) parts.push(p);
    if (s.bullets) for (const b of s.bullets) parts.push(`- ${b}`);
    if (s.numbered) s.numbered.forEach((n, i) => parts.push(`${i + 1}. ${n}`));
    if (s.pullQuote) parts.push(`> ${s.pullQuote}`);
    if (s.callout) parts.push(`[${s.callout.type}] ${s.callout.title || ""}: ${s.callout.content}`);
    if (s.stat) parts.push(`${s.stat.value}${s.stat.suffix || ""} — ${s.stat.label}`);
    if (s.comparison) {
      parts.push(`Comparison — ${s.comparison.before.title}: ${s.comparison.before.items.join("; ")}`);
      parts.push(`Comparison — ${s.comparison.after.title}: ${s.comparison.after.items.join("; ")}`);
    }
    if (s.deepDive) parts.push(`Deep dive — ${s.deepDive.title}: ${s.deepDive.content}`);
  }
  if (chapter.actionItems?.length) {
    parts.push("\nAction items:");
    for (const a of chapter.actionItems) parts.push(`- [${a.priority}] ${a.text}`);
  }
  return parts.join("\n");
};

export const guidebookSummary = (chapters: Chapter[]): string => {
  return chapters
    .map((c) => `Ch ${c.number}. ${c.title} — ${c.hook || c.subtitle}`)
    .join("\n");
};
