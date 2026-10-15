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
  /** Where the number comes from. Rubric chapters must cite or cut. */
  source?: string;
}

/** The five audit score categories — kept in sync with the scoring pipeline. */
export type AuditCategory = "performance" | "social" | "seoAuthority" | "thoughtLeadership" | "reputation";

/** A copy-paste material shipped with a chapter (rubric): the doctrine tells,
 *  the artifact lets the firm DO. Rendered as copyable cards by ChapterArtifacts. */
export interface ChapterArtifact {
  type: "template" | "checklist" | "script" | "scorecard";
  title: string;
  body: string; // plain text / markdown, copied verbatim
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
  // ── Rubric fields (guidebook program) — optional during the legacy→rubric
  // migration; chapters.rubric.test.ts enforces them on rewritten chapters.
  /** Audit categories this chapter moves — powers the weak-score→chapter map. */
  categories?: AuditCategory[];
  /** The number to watch at the next audit to prove the chapter worked. */
  proofMetric?: string;
  /** Copy-paste materials (templates, checklists, scripts, scorecards). */
  artifacts?: ChapterArtifact[];
}
