import { useEffect, useState } from "react";

export interface BattlePlanBadge {
  id: string;
  headline: string;
  body: string;
}

const KEY = "legalos_battleplan_badges_seen";

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...seen]));
  } catch {
    /* localStorage unavailable/full — badge just won't persist, not fatal */
  }
}

interface Slots {
  roast: boolean;
  competitor: boolean;
  roadmap: boolean;
  maturity: boolean;
  headline: boolean;
  bio: boolean;
  visibilityScore: boolean;
}

/**
 * Gamifies the Battle Plan: a one-time-ever celebration for a real
 * milestone combo, tracked in localStorage so it never repeats — same
 * mechanic as useMilestoneCelebration.ts for the score, reusing the same
 * MilestoneCelebration component. Priority order matters when a firm
 * completes multiple combos in one sitting; only the highest shows per
 * render, the rest surface on the next recompute since they stay
 * earned-but-unseen until individually dismissed.
 */
export function useBattlePlanMilestones(slots: Slots): { badge: BattlePlanBadge | null; dismiss: () => void } {
  const [badge, setBadge] = useState<BattlePlanBadge | null>(null);

  useEffect(() => {
    const seen = loadSeen();
    const candidates: BattlePlanBadge[] = [];

    if (slots.roast && slots.competitor && slots.roadmap && slots.maturity && slots.headline && slots.bio && slots.visibilityScore) {
      candidates.push({ id: "fully-armed", headline: "Fully Armed", body: "Every one of the 7 Battle Plan sections is filled in — this is as complete a plan as the app can build." });
    }
    if (slots.roast && slots.competitor && slots.roadmap) {
      candidates.push({ id: "battle-ready", headline: "Battle Ready", body: "All 3 core sections are done — Roast, Competitor Analysis, and your 90-day Roadmap." });
    }
    if (slots.bio && slots.headline) {
      candidates.push({ id: "voice-found", headline: "Voice Found", body: "Your Bio Rewriter result and Headline Lab champion are both in — your written voice is set." });
    }
    if (slots.visibilityScore && slots.maturity) {
      candidates.push({ id: "foundation-builder", headline: "Foundation Builder", body: "Your Market Visibility Score and Firm Maturity Score are both in — the diagnostic groundwork is done." });
    }

    const unseen = candidates.find((c) => !seen.has(c.id));
    if (unseen) setBadge(unseen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.roast, slots.competitor, slots.roadmap, slots.maturity, slots.headline, slots.bio, slots.visibilityScore]);

  const dismiss = () => {
    if (!badge) return;
    const seen = loadSeen();
    seen.add(badge.id);
    saveSeen(seen);
    setBadge(null);
  };

  return { badge, dismiss };
}
