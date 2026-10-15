// Shared Battle Plan logic — the shape of the plan (which inputs exist,
// which are core vs bonus), badge rules, and staleness. Pure and
// framework-free so the teaser card, the full page, and tests all agree
// on the same numbers. Content previews stay in the components; this is
// only the structure.
import type {
  RoastCache,
  CompetitorCache,
  RoadmapCache,
  MaturityCache,
  HeadlineWinnerCache,
  BioCache,
  VisibilityScoreCache,
} from "@/hooks/useBattlePlanCache";

export interface BattlePlanSlots {
  roast: RoastCache | null;
  competitor: CompetitorCache | null;
  roadmap: RoadmapCache | null;
  maturity: MaturityCache | null;
  headline: HeadlineWinnerCache | null;
  bio: BioCache | null;
  visibilityScore: VisibilityScoreCache | null;
}

export type StepKey = keyof BattlePlanSlots;

export interface BattlePlanStep {
  key: StepKey;
  label: string;
  core: boolean;
  done: boolean;
  capturedAt?: number;
  /** What the input adds to the plan — shown on empty cards so a missing
   *  section reads as an opportunity, not a gap. */
  adds: string;
}

/** Inputs older than this still count as done, but the page nudges for a
 *  refresh — a living plan should admit when its intel has gone stale. */
export const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export const isStale = (capturedAt: number | undefined, now: number = Date.now()): boolean =>
  capturedAt !== undefined && now - capturedAt > STALE_AFTER_MS;

export const timeAgo = (ts: number, now: number = Date.now()): string => {
  const mins = Math.max(0, Math.round((now - ts) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

const STEP_DEFS: ReadonlyArray<Omit<BattlePlanStep, "done" | "capturedAt"> & { key: StepKey }> = [
  { key: "roast", label: "Roast My Homepage", core: true, adds: "An honest grade on your first impression, plus the three fixes that matter most." },
  { key: "competitor", label: "Competitor Analysis", core: true, adds: "Where rivals outposition you and the moves with the highest impact." },
  { key: "roadmap", label: "30/60/90 Roadmap", core: true, adds: "The campaign itself — sequenced moves for the next ninety days." },
  { key: "visibilityScore", label: "Market Visibility Score", core: false, adds: "Your measurable position against peer firms, across five categories." },
  { key: "maturity", label: "Firm Maturity Score", core: false, adds: "How developed the firm's marketing engine is, dimension by dimension." },
  { key: "headline", label: "Headline Lab champion", core: false, adds: "The winning line for your homepage, chosen by testing angles." },
  { key: "bio", label: "Bio Rewriter result", core: false, adds: "A lawyer bio that sounds like someone clients actually want to call." },
];

export const buildSteps = (slots: BattlePlanSlots): BattlePlanStep[] =>
  STEP_DEFS.map((def) => {
    const value = slots[def.key];
    return { ...def, done: value !== null, capturedAt: value?.capturedAt };
  });

export const hasAnyInput = (slots: BattlePlanSlots): boolean => Object.values(slots).some((v) => v !== null);

export interface PlanTotals {
  done: number;
  total: number;
  coreDone: number;
  coreTotal: number;
}

export const planTotals = (steps: BattlePlanStep[]): PlanTotals => ({
  done: steps.filter((s) => s.done).length,
  total: steps.length,
  coreDone: steps.filter((s) => s.core && s.done).length,
  coreTotal: steps.filter((s) => s.core).length,
});

export type BadgeId = "foundation-builder" | "voice-found" | "battle-ready" | "fully-armed";

export interface BadgeDef {
  id: BadgeId;
  label: string;
  /** Shown under locked badges so the page teaches how to earn them. */
  requirement: string;
}

export const BADGE_DEFS: readonly BadgeDef[] = [
  { id: "foundation-builder", label: "Foundation Builder", requirement: "Visibility Score + Maturity Score" },
  { id: "voice-found", label: "Voice Found", requirement: "Headline champion + Bio rewrite" },
  { id: "battle-ready", label: "Battle Ready", requirement: "All 3 core inputs" },
  { id: "fully-armed", label: "Fully Armed", requirement: "Every section filled" },
] as const;

export const earnedBadgeIds = (slots: BattlePlanSlots): Set<BadgeId> => {
  const earned = new Set<BadgeId>();
  if (slots.visibilityScore && slots.maturity) earned.add("foundation-builder");
  if (slots.bio && slots.headline) earned.add("voice-found");
  if (slots.roast && slots.competitor && slots.roadmap) earned.add("battle-ready");
  if (Object.values(slots).every((v) => v !== null)) earned.add("fully-armed");
  return earned;
};
