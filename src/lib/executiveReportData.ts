// §9 — Reports and exports: the one data shape every export format (PDF,
// PPTX, DOCX, "Excel"/CSV) reads from, so the four generators can never
// silently drift apart on what an executive report actually contains.
import type { CategoryKey } from "@/lib/visibilityCategories";

export interface ExecutiveReportData {
  firmName: string;
  domain: string;
  market: string;
  peerGroup: string;
  totalScore: number;
  percentile: number | null;
  peerCount: number;
  narrative: string | null;
  categories: Record<CategoryKey, { score: number; provenance: string }>;
  history: { recordedAt: string; totalScore: number }[];
  generatedAt: Date;
}
