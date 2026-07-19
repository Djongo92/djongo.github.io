import { useCallback, useEffect, useState } from "react";

/**
 * Lightweight caches for the three analyses that feed the Battle Plan PDF.
 * Persisted in localStorage so the user can build the plan over multiple
 * sessions and it survives page reload.
 */

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

const ROAST_KEY = "guidebook_battleplan_roast";
const COMP_KEY = "guidebook_battleplan_competitor";
const ROADMAP_KEY = "guidebook_battleplan_roadmap";
const MATURITY_KEY = "guidebook_battleplan_maturity";
const HEADLINE_KEY = "guidebook_battleplan_headline";
const BIO_KEY = "guidebook_battleplan_bio";

const read = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const saveRoast = (roast: Omit<RoastCache, "capturedAt">) => {
  localStorage.setItem(ROAST_KEY, JSON.stringify({ ...roast, capturedAt: Date.now() }));
  window.dispatchEvent(new Event("battleplan:update"));
};

export const saveCompetitor = (data: Omit<CompetitorCache, "capturedAt">) => {
  localStorage.setItem(COMP_KEY, JSON.stringify({ ...data, capturedAt: Date.now() }));
  window.dispatchEvent(new Event("battleplan:update"));
};

export const saveRoadmap = (data: Omit<RoadmapCache, "capturedAt">) => {
  localStorage.setItem(ROADMAP_KEY, JSON.stringify({ ...data, capturedAt: Date.now() }));
  window.dispatchEvent(new Event("battleplan:update"));
};

export const saveMaturity = (data: Omit<MaturityCache, "capturedAt">) => {
  localStorage.setItem(MATURITY_KEY, JSON.stringify({ ...data, capturedAt: Date.now() }));
  window.dispatchEvent(new Event("battleplan:update"));
};

export const saveHeadlineWinner = (data: Omit<HeadlineWinnerCache, "capturedAt">) => {
  localStorage.setItem(HEADLINE_KEY, JSON.stringify({ ...data, capturedAt: Date.now() }));
  window.dispatchEvent(new Event("battleplan:update"));
};

export const saveBio = (data: Omit<BioCache, "capturedAt">) => {
  localStorage.setItem(BIO_KEY, JSON.stringify({ ...data, capturedAt: Date.now() }));
  window.dispatchEvent(new Event("battleplan:update"));
};

export const useBattlePlanCache = () => {
  const [roast, setRoast] = useState<RoastCache | null>(() => read<RoastCache>(ROAST_KEY));
  const [competitor, setCompetitor] = useState<CompetitorCache | null>(() => read<CompetitorCache>(COMP_KEY));
  const [roadmap, setRoadmap] = useState<RoadmapCache | null>(() => read<RoadmapCache>(ROADMAP_KEY));
  const [maturity, setMaturity] = useState<MaturityCache | null>(() => read<MaturityCache>(MATURITY_KEY));
  const [headline, setHeadline] = useState<HeadlineWinnerCache | null>(() => read<HeadlineWinnerCache>(HEADLINE_KEY));
  const [bio, setBio] = useState<BioCache | null>(() => read<BioCache>(BIO_KEY));

  const refresh = useCallback(() => {
    setRoast(read<RoastCache>(ROAST_KEY));
    setCompetitor(read<CompetitorCache>(COMP_KEY));
    setRoadmap(read<RoadmapCache>(ROADMAP_KEY));
    setMaturity(read<MaturityCache>(MATURITY_KEY));
    setHeadline(read<HeadlineWinnerCache>(HEADLINE_KEY));
    setBio(read<BioCache>(BIO_KEY));
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

  const clear = useCallback(() => {
    localStorage.removeItem(ROAST_KEY);
    localStorage.removeItem(COMP_KEY);
    localStorage.removeItem(ROADMAP_KEY);
    localStorage.removeItem(MATURITY_KEY);
    localStorage.removeItem(HEADLINE_KEY);
    localStorage.removeItem(BIO_KEY);
    refresh();
  }, [refresh]);

  return { roast, competitor, roadmap, maturity, headline, bio, clear, refresh };
};
