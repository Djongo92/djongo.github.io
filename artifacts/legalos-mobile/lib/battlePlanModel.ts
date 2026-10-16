/**
 * Mobile port of the web app's shared Battle Plan model
 * (artifacts/legalos/src/components/battleplan/battlePlanModel.ts).
 * Same seven slots, same core/bonus split, same badge rules, same 30-day
 * staleness window — the mobile screen and the web page read the same
 * server-synced state, so they must agree on the plan's shape. Pure and
 * framework-free. Keep in sync with the web model when either changes.
 */

// Slot shapes are trimmed to the fields the mobile screen renders; the
// server-synced payloads (written by the web app) are supersets of these.
export interface RoastSlot {
  grade: string;
  verdict: string;
  topThreeFixes: string[];
  capturedAt: number;
}
export interface CompetitorSlot {
  executiveSummary: string;
  recommendedMoves: { move: string; impact: 'high' | 'medium' | 'low' }[];
  capturedAt: number;
}
export interface RoadmapSlot {
  summary: string;
  phases: { label: string; actions: { title: string }[] }[];
  capturedAt: number;
}
export interface MaturitySlot {
  score: number; // 0–100
  dimensions: { label: string; score: number }[];
  capturedAt: number;
}
export interface HeadlineSlot {
  text: string;
  angle: string;
  capturedAt: number;
}
export interface BioSlot {
  rewrite: string;
  capturedAt: number;
}
export interface VisibilitySlot {
  totalScore: number;
  percentile: number | null;
  peerCount: number;
  capturedAt: number;
}

export interface BattlePlanSlots {
  roast: RoastSlot | null;
  competitor: CompetitorSlot | null;
  roadmap: RoadmapSlot | null;
  maturity: MaturitySlot | null;
  headline: HeadlineSlot | null;
  bio: BioSlot | null;
  visibilityScore: VisibilitySlot | null;
}

export type StepKey = keyof BattlePlanSlots;

export const EMPTY_SLOTS: BattlePlanSlots = {
  roast: null,
  competitor: null,
  roadmap: null,
  maturity: null,
  headline: null,
  bio: null,
  visibilityScore: null,
};

/** Server-side user-state keys — identical to the web app's SERVER_KEYS in
 *  useBattlePlanCache.ts. These are the contract that makes the same signed-in
 *  account see the same plan on web and mobile. */
export const SERVER_KEYS: Record<StepKey, string> = {
  roast: 'battleplan_roast',
  competitor: 'battleplan_competitor',
  roadmap: 'battleplan_roadmap',
  maturity: 'battleplan_maturity',
  headline: 'battleplan_headline',
  bio: 'battleplan_bio',
  visibilityScore: 'battleplan_visibility',
};

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

/** Inputs older than this still count as done, but the plan nudges for a
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

const STEP_DEFS: ReadonlyArray<Omit<BattlePlanStep, 'done' | 'capturedAt'>> = [
  { key: 'roast', label: 'Roast My Homepage', core: true, adds: 'An honest grade on your first impression, plus the three fixes that matter most.' },
  { key: 'competitor', label: 'Competitor Analysis', core: true, adds: 'Where rivals outposition you and the moves with the highest impact.' },
  { key: 'roadmap', label: '30/60/90 Roadmap', core: true, adds: 'The campaign itself — sequenced moves for the next ninety days.' },
  { key: 'visibilityScore', label: 'Market Visibility Score', core: false, adds: 'Your measurable position against peer firms, across five categories.' },
  { key: 'maturity', label: 'Firm Maturity Score', core: false, adds: 'How developed the firm’s marketing engine is, dimension by dimension.' },
  { key: 'headline', label: 'Headline Lab champion', core: false, adds: 'The winning line for your homepage, chosen by testing angles.' },
  { key: 'bio', label: 'Bio Rewriter result', core: false, adds: 'A lawyer bio that sounds like someone clients actually want to call.' },
];

export const buildSteps = (slots: BattlePlanSlots): BattlePlanStep[] =>
  STEP_DEFS.map((def) => {
    const value = slots[def.key];
    return { ...def, done: value !== null, capturedAt: value?.capturedAt };
  });

export const hasAnyInput = (slots: BattlePlanSlots): boolean =>
  Object.values(slots).some((v) => v !== null);

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

export type BadgeId = 'foundation-builder' | 'voice-found' | 'battle-ready' | 'fully-armed';

export interface BadgeDef {
  id: BadgeId;
  label: string;
  /** Shown under locked badges so the page teaches how to earn them. */
  requirement: string;
}

export const BADGE_DEFS: readonly BadgeDef[] = [
  { id: 'foundation-builder', label: 'Foundation Builder', requirement: 'Visibility Score + Maturity Score' },
  { id: 'voice-found', label: 'Voice Found', requirement: 'Headline champion + Bio rewrite' },
  { id: 'battle-ready', label: 'Battle Ready', requirement: 'All 3 core inputs' },
  { id: 'fully-armed', label: 'Fully Armed', requirement: 'Every section filled' },
] as const;

export const earnedBadgeIds = (slots: BattlePlanSlots): Set<BadgeId> => {
  const earned = new Set<BadgeId>();
  if (slots.visibilityScore && slots.maturity) earned.add('foundation-builder');
  if (slots.bio && slots.headline) earned.add('voice-found');
  if (slots.roast && slots.competitor && slots.roadmap) earned.add('battle-ready');
  if (Object.values(slots).every((v) => v !== null)) earned.add('fully-armed');
  return earned;
};
