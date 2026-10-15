import { useCallback, useRef, useState } from "react";

const KEY = "legalos_tour_progress";
/** The original flag — a bare "1" meaning "seen". Read once, then migrated. */
const LEGACY_KEY = "legalos_coachmarks_seen";
/** Bumped whenever the stored shape changes; anything else is discarded. */
const SCHEMA = 4;

/**
 * `offered` is the welcome screen: raised, but not yet answered.
 *
 * It has to be persisted rather than held in component state, for the same
 * reason `running` is. The thing that raises it is a one-shot session flag, so
 * a visitor who reloads while the welcome is on screen would otherwise get
 * neither the welcome nor the tour — silently dropped, with no way to know
 * they'd been offered anything.
 */
type TourStatus = "idle" | "offered" | "running" | "done";
/** Demo and real accounts run tours that end differently — see `variant` below. */
export type TourVariant = "demo" | "account";

interface VariantState {
  status: TourStatus;
  step: number;
}

/**
 * v4 keeps each variant's state independently — `hasSeen` is scoped to the
 * variant being asked about, because the two tours are different products'
 * onboarding: finishing the fictional-firm demo tour says nothing about
 * whether a real account has been walked through its own dashboard (and vice
 * versa). It also lets a fresh showcase grant reset the *demo* side without
 * clobbering a finished *account* tour on the same browser.
 */
type TourProgress = { v: number } & Record<TourVariant, VariantState>;

const STATUSES: readonly string[] = ["idle", "offered", "running", "done"];
/** What a v2 record was allowed to say, for validating one before migrating it. */
const V2_STATUSES: readonly string[] = ["idle", "running", "done"];
const VARIANTS: readonly TourVariant[] = ["demo", "account"];

const idleState = (): VariantState => ({ status: "idle", step: 0 });
const fresh = (): TourProgress => ({ v: SCHEMA, demo: idleState(), account: idleState() });

const isVariantState = (s: unknown): s is VariantState => {
  if (!s || typeof s !== "object") return false;
  const v = s as Partial<VariantState>;
  return (
    typeof v.status === "string" &&
    STATUSES.includes(v.status) &&
    Number.isInteger(v.step) &&
    (v.step as number) >= 0
  );
};

/**
 * Anything that isn't an exact, current-schema record is treated as absent
 * (after attempting migration). A half-understood record is worse than no
 * record: it resumes the tour into a state nobody designed.
 */
function parse(raw: string | null): TourProgress | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (!p) return null;

    if (p.v === SCHEMA) {
      if (!isVariantState(p.demo) || !isVariantState(p.account)) return null;
      return p as unknown as TourProgress;
    }

    // v2/v3 were a single record carrying a `variant` field. Fold one into
    // v4: the variant it describes keeps its state, the other starts idle —
    // the record says nothing about the other tour, and guessing "done" for
    // it would suppress onboarding the visitor never had.
    //
    // v2 → v3 only *added* the `offered` status, so a v2 record is held to
    // the v2 vocabulary: stamping the new version on first and validating
    // afterwards would let a hand-edited record claim a status v2 could
    // never have written.
    const isV2 = p.v === 2;
    if (!isV2 && p.v !== 3) return null;
    const allowedStatuses = isV2 ? V2_STATUSES : STATUSES;
    if (typeof p.status !== "string" || !allowedStatuses.includes(p.status)) return null;
    if (typeof p.variant !== "string" || !VARIANTS.includes(p.variant as TourVariant)) return null;
    if (!Number.isInteger(p.step) || (p.step as number) < 0) return null;
    const migrated = fresh();
    migrated[p.variant as TourVariant] = { status: p.status as TourStatus, step: p.step as number };
    return migrated;
  } catch {
    return null;
  }
}

function write(progress: TourProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Best-effort: a tour that re-offers itself is a far smaller problem than
    // a crash on a private-mode browser.
  }
}

function read(): TourProgress {
  try {
    const parsed = parse(localStorage.getItem(KEY));
    if (parsed) return parsed;
    // Anyone who finished the tour under the old flag has genuinely seen it;
    // don't make them sit through it again just because storage changed shape.
    // The flag predates variants, when there was one tour — so it marks both.
    if (localStorage.getItem(LEGACY_KEY) === "1") {
      const migrated: TourProgress = {
        v: SCHEMA,
        demo: { status: "done", step: 0 },
        account: { status: "done", step: 0 },
      };
      write(migrated);
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
  } catch {
    // Unavailable storage shouldn't stop the app rendering; treat as first run.
  }
  return fresh();
}

/**
 * A fresh showcase grant means someone is being *shown* the product via an
 * access code — a sales moment, not an ordinary visit. The demo welcome and
 * tour must greet them even if this browser finished (or dismissed) the demo
 * tour on an earlier visit: the progress record lives in localStorage and
 * outlives the tab, while the grant deliberately doesn't, so without this
 * reset a stored "done" would veto the welcome on every access-code entry
 * after the first. Called once per fresh grant, at the single point grants
 * are issued (demoAccess.verifyShowcaseCode) — a plain reload of an open demo
 * tab never passes through there, so it doesn't re-greet. Only the demo side
 * is reset; a finished account tour on the same browser stays finished.
 */
export function resetTourForFreshShowcase() {
  const current = read();
  write({ ...current, demo: idleState() });
}

/**
 * Progress state for the guided tour.
 *
 * Two behaviours the original single "seen" flag couldn't express, both of
 * which made the tour feel like a trap rather than a guide:
 *
 * - **Resume.** Progress is written on every step, so refreshing or navigating
 *   away mid-tour picks up where the visitor left off instead of losing the
 *   tour permanently (the flag was only ever set at the *end*, and the trigger
 *   that started it was a one-shot, so an interrupted tour simply never came
 *   back).
 * - **Replay.** "Done" and "Skip" both mean *don't interrupt me again*, not
 *   *never show me this*. `restart` re-runs it on demand from the command
 *   palette or the sidebar.
 *
 * Progress lives in a ref, not React state, so recording a step doesn't
 * re-render the whole page mid-tour — and, more subtly, so the `startStep`
 * handed to the overlay stays stable for the life of one run instead of
 * changing under it on every Next.
 *
 * @param variant Which tour this session would run. The two variants share
 *   their middle but end on different hand-offs, are free to diverge in
 *   length, and keep entirely independent progress — a step index (or a
 *   "done") saved by one says nothing about the other.
 */
export function useCoachMarks(variant: TourVariant) {
  const progress = useRef<TourProgress>(read());
  // One object so `active` and the step it started from always change
  // together — the overlay resets itself off this pair.
  const [session, setSession] = useState<{ active: boolean; startStep: number }>({
    active: false,
    startStep: 0,
  });

  const setVariantState = useCallback(
    (state: VariantState) => {
      progress.current = { ...progress.current, [variant]: state };
      write(progress.current);
    },
    [variant],
  );

  /** True once *this* variant's tour was finished or dismissed. */
  const hasSeen = useCallback(
    (): boolean => progress.current[variant].status === "done",
    [variant],
  );

  /** True when *this* variant's tour was interrupted partway through. */
  const isResumable = useCallback(
    (): boolean => progress.current[variant].status === "running",
    [variant],
  );

  /**
   * True when the welcome was raised for this variant and never answered —
   * so a reload puts the question back rather than losing it.
   */
  const isOffered = useCallback(
    (): boolean => progress.current[variant].status === "offered",
    [variant],
  );

  /**
   * Raises the welcome. Deliberately does *not* activate the overlay: the
   * tour is now something the visitor opts into, so nothing takes over the
   * screen until they say yes.
   */
  const offer = useCallback(() => {
    setVariantState({ status: "offered", step: 0 });
  }, [setVariantState]);

  /**
   * "Just explore." Lands in the same terminal state as finishing, because
   * both mean *don't interrupt me again* — and, like finishing, leaves the
   * tour replayable from the command palette or the sidebar.
   */
  const decline = useCallback(() => {
    setVariantState({ status: "done", step: 0 });
  }, [setVariantState]);

  /**
   * Begins the tour, resuming from a previously interrupted step if there is
   * one for this variant.
   *
   * @param stepCount Length of the step list about to be shown. The saved
   *   index is clamped into it, so a stale or oversized value can't leave the
   *   overlay mounted on a step that doesn't exist — invisible, undismissable,
   *   and still blocking everything that waits on the tour.
   */
  const start = useCallback(
    (stepCount: number) => {
      const saved = progress.current[variant];
      const last = Math.max(stepCount - 1, 0);
      const from = saved.status === "running" ? Math.min(saved.step, last) : 0;
      setVariantState({ status: "running", step: from });
      setSession({ active: true, startStep: from });
    },
    [variant, setVariantState],
  );

  /** Runs the tour again from the beginning, however it ended last time. */
  const restart = useCallback(() => {
    setVariantState({ status: "running", step: 0 });
    setSession({ active: true, startStep: 0 });
  }, [setVariantState]);

  /** Called by the overlay on each step change so an interruption is recoverable. */
  const recordStep = useCallback(
    (step: number) => {
      setVariantState({ status: "running", step });
    },
    [setVariantState],
  );

  const finish = useCallback(() => {
    setVariantState({ status: "done", step: 0 });
    setSession({ active: false, startStep: 0 });
  }, [setVariantState]);

  return {
    active: session.active,
    startStep: session.startStep,
    start,
    restart,
    recordStep,
    finish,
    hasSeen,
    isResumable,
    isOffered,
    offer,
    decline,
  };
}
