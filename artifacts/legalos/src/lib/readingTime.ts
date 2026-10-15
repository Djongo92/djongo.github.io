import { Chapter } from "@/data/chapters";

const WORDS_PER_MINUTE = 220;

export const getReadingTime = (chapter: Chapter): number => {
  let wordCount = 0;
  for (const section of chapter.content) {
    if (section.paragraphs) {
      for (const p of section.paragraphs) wordCount += p.split(/\s+/).length;
    }
    if (section.bullets) {
      for (const b of section.bullets) wordCount += b.split(/\s+/).length;
    }
    if (section.numbered) {
      for (const n of section.numbered) wordCount += n.split(/\s+/).length;
    }
    if (section.pullQuote) wordCount += section.pullQuote.split(/\s+/).length;
    if (section.heading) wordCount += section.heading.split(/\s+/).length;
  }
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
};

export const getKeyTakeaways = (chapter: Chapter): string[] => {
  const takeaways: string[] = [];
  for (const section of chapter.content) {
    if (section.pullQuote) takeaways.push(section.pullQuote);
  }
  return takeaways.slice(0, 3);
};
