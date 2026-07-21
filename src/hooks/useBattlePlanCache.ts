import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { pushServerState } from "@/lib/serverStateSync";
import { edgeHeaders } from "@/lib/edgeAuth";

/**
 * Lightweight caches for the analyses that feed the Battle Plan PDF.
 * Persisted in localStorage so the user can build the plan over multiple
 * sessions and it survives page reload — and synced to the server for a
 * real account, same pattern as every other localStorage hook (see
 * useReadingProgress.ts). The save* functions are called from plain tool
 * components, not a hook, so they reach the current user via
 * src/lib/currentUser.ts rather than useAuth() directly.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface RoastCache {
  url: string;
  grade: string;
  verdict: string;
  burn: string;
  topThreeFixes: string[];
  annotations: { element: string; whatYouSaid: string; whatItSounds: string; rewrite: string }[];
  redemption?: string;
  pageTitle?: string;
  capturedAt: number;
}

export interface CompetitorCache {
  yourUrl: string;
  competitorUrls: string[];
  executiveSummary: string;
  yourPositioning: { summary: string; strengths: string[]; weaknesses: string[] };
  competitors: { url: string; positioning: string; doingBetter: string[]; doingWorse: string[] }[];
  gaps: { gap: string; why: string }[];
  opportunities: string[];
  recommendedMoves: { move: string; impact: "high" | "medium" | "low"; effort: "low" | "medium" | "high" }[];
  capturedAt: number;
}

export interface RoadmapCache {
  summary: string;
  phases: { label: string; focus: string; actions: { title: string; why: string; chapterRef: string }[] }[];
  capturedAt: number;
}

export interface MaturityCache {
  score: number;            // 0–100
  dimensions: { label: string; score: number }[];
  plan: string;             // markdown
  capturedAt: number;
}

export interface HeadlineWinnerCache {
  text: string;
  angle: string;
  why: string;
  brief: string;
  capturedAt: number;
}

export interface BioCache {
  name?: string;
  role?: string;
  emphases: string[];
  rewrite: string;          // markdown
  capturedAt: number;
}

export interface VisibilityScoreCache {
  auditedDomain: string;
  market: string;
  peerGroup: string;
  totalScore: number;       // / 200
  categories: Record<string, { score: number; provenance: string }>;
  percentile: number | null;
  peerCount: number;
  capturedAt: number;
}

const ROAST_KEY = "guidebook_battleplan_roast";
const COMP_KEY = "guidebook_battleplan_competitor";
const ROADMAP_KEY = "guidebook_battleplan_roadmap";
const MATURITY_KEY = "guidebook_battleplan_maturity";
const HEADLINE_KEY = "guidebook_battleplan_headline";
const BIO_KEY = "guidebook_battleplan_bio";
const VISIBILITY_KEY = "guidebook_battleplan_visibility";

// Server-side keys, distinct from the localStorage keys above only in that
// they don't need the "guidebook_battleplan_" prefix that made sense for
// namespacing many unrelated localStorage keys together.
const SERVER_KEYS = {
  roast: "battleplan_roast",
  competitor: "battleplan_competitor",
  roadmap: "battleplan_roadmap",
  maturity: "battleplan_maturity",
  headline: "battleplan_headline",
  bio: "battleplan_bio",
  visibilityScore: "battleplan_visibility",
} as const;

const LOCAL_KEY_FOR: Record<keyof typeof SERVER_KEYS, string> = {
  roast: ROAST_KEY,
  competitor: COMP_KEY,
  roadmap: ROADMAP_KEY,
  maturity: MATURITY_KEY,
  headline: HEADLINE_KEY,
  bio: BIO_KEY,
  visibilityScore: VISIBILITY_KEY,
};

const read = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const saveRoast = (roast: Omit<RoastCache, "capturedAt">) => {
  const value = { ...roast, capturedAt: Date.now() };
  localStorage.setItem(ROAST_KEY, JSON.stringify(value));
  pushServerState(SERVER_KEYS.roast, value);
  window.dispatchEvent(new Event("battleplan:update"));
};

export const saveCompetitor = (data: Omit<CompetitorCache, "capturedAt">) => {
  const value = { ...data, capturedAt: Date.now() };
  localStorage.setItem(COMP_KEY, JSON.stringify(value));
  pushServerState(SERVER_KEYS.competitor, value);
  window.dispatchEvent(new Event("battleplan:update"));
};

export const saveRoadmap = (data: Omit<RoadmapCache, "capturedAt">) => {
  const value = { ...data, capturedAt: Date.now() };
  localStorage.setItem(ROADMAP_KEY, JSON.stringify(value));
  pushServerState(SERVER_KEYS.roadmap, value);
  window.dispatchEvent(new Event("battleplan:update"));
};

export const saveMaturity = (data: Omit<MaturityCache, "capturedAt">) => {
  const value = { ...data, capturedAt: Date.now() };
  localStorage.setItem(MATURITY_KEY, JSON.stringify(value));
  pushServerState(SERVER_KEYS.maturity, value);
  window.dispatchEvent(new Event("battleplan:update"));
};

export const saveHeadlineWinner = (data: Omit<HeadlineWinnerCache, "capturedAt">) => {
  const value = { ...data, capturedAt: Date.now() };
  localStorage.setItem(HEADLINE_KEY, JSON.stringify(value));
  pushServerState(SERVER_KEYS.headline, value);
  window.dispatchEvent(new Event("battleplan:update"));
};

export const saveBio = (data: Omit<BioCache, "capturedAt">) => {
  const value = { ...data, capturedAt: Date.now() };
  localStorage.setItem(BIO_KEY, JSON.stringify(value));
  pushServerState(SERVER_KEYS.bio, value);
  window.dispatchEvent(new Event("battleplan:update"));
};

export const saveVisibilityScore = (data: Omit<VisibilityScoreCache, "capturedAt">) => {
  const value = { ...data, capturedAt: Date.now() };
  localStorage.setItem(VISIBILITY_KEY, JSON.stringify(value));
  pushServerState(SERVER_KEYS.visibilityScore, value);
  window.dispatchEvent(new Event("battleplan:update"));
};

export const useBattlePlanCache = () => {
  const { user, session } = useAuth();
  const [roast, setRoast] = useState<RoastCache | null>(() => read<RoastCache>(ROAST_KEY));
  const [competitor, setCompetitor] = useState<CompetitorCache | null>(() => read<CompetitorCache>(COMP_KEY));
  const [roadmap, setRoadmap] = useState<RoadmapCache | null>(() => read<RoadmapCache>(ROADMAP_KEY));
  const [maturity, setMaturity] = useState<MaturityCache | null>(() => read<MaturityCache>(MATURITY_KEY));
  const [headline, setHeadline] = useState<HeadlineWinnerCache | null>(() => read<HeadlineWinnerCache>(HEADLINE_KEY));
  const [bio, setBio] = useState<BioCache | null>(() => read<BioCache>(BIO_KEY));
  const [visibilityScore, setVisibilityScore] = useState<VisibilityScoreCache | null>(() => read<VisibilityScoreCache>(VISIBILITY_KEY));
  const syncedForUser = useRef<string | null>(null);

  const refresh = useCallback(() => {
    setRoast(read<RoastCache>(ROAST_KEY));
    setCompetitor(read<CompetitorCache>(COMP_KEY));
    setRoadmap(read<RoadmapCache>(ROADMAP_KEY));
    setMaturity(read<MaturityCache>(MATURITY_KEY));
    setHeadline(read<HeadlineWinnerCache>(HEADLINE_KEY));
    setBio(read<BioCache>(BIO_KEY));
    setVisibilityScore(read<VisibilityScoreCache>(VISIBILITY_KEY));
  }, []);

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener("battleplan:update", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("battleplan:update", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refresh]);

  // One batched round-trip for all 7 slots rather than 7 separate ones.
  useEffect(() => {
    if (!user || syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;
    (async () => {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/user-state-get`, {
          method: "POST",
          headers: edgeHeaders(),
          body: JSON.stringify({ clientId: user.id, accessToken: session?.access_token, keys: Object.values(SERVER_KEYS) }),
        });
        const data = await resp.json();
        const remoteState = (data?.state ?? {}) as Record<string, unknown>;
        let foundAny = false;
        (Object.keys(SERVER_KEYS) as (keyof typeof SERVER_KEYS)[]).forEach((slot) => {
          const remote = remoteState[SERVER_KEYS[slot]];
          if (remote) {
            foundAny = true;
            localStorage.setItem(LOCAL_KEY_FOR[slot], JSON.stringify(remote));
          }
        });
        if (foundAny) {
          refresh();
        } else {
          (Object.keys(SERVER_KEYS) as (keyof typeof SERVER_KEYS)[]).forEach((slot) => {
            const local = read(LOCAL_KEY_FOR[slot]);
            if (local) pushServerState(SERVER_KEYS[slot], local);
          });
        }
      } catch {
        // Local storage already has whatever was there.
      }
    })();
  }, [user, session?.access_token, refresh]);

  const clear = useCallback(() => {
    localStorage.removeItem(ROAST_KEY);
    localStorage.removeItem(COMP_KEY);
    localStorage.removeItem(ROADMAP_KEY);
    localStorage.removeItem(MATURITY_KEY);
    localStorage.removeItem(HEADLINE_KEY);
    localStorage.removeItem(BIO_KEY);
    localStorage.removeItem(VISIBILITY_KEY);
    refresh();
  }, [refresh]);

  return { roast, competitor, roadmap, maturity, headline, bio, visibilityScore, clear, refresh };
};
