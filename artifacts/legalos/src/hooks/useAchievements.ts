import { useCallback, useEffect, useMemo, useState } from "react";

const SESSIONS_KEY = "guidebook_sessions"; // array of ISO date strings (one per day visited)
const TIME_KEY = "guidebook_time_seconds"; // total seconds spent
const SEEN_BADGES_KEY = "guidebook_badges_seen"; // badge ids already celebrated, so a badge only unlocks once

// null means "never initialized" (distinct from an empty set) — lets the
// hook seed it with whatever's already earned on first load instead of
// celebrating pre-existing progress as brand new the moment this ships.
const readSeenBadges = (): Set<string> | null => {
  const raw = localStorage.getItem(SEEN_BADGES_KEY);
  if (raw === null) return null;
  try {
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const readSessions = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
  } catch {
    return [];
  }
};

const computeStreak = (sessions: string[]): number => {
  if (sessions.length === 0) return 0;
  const set = new Set(sessions);
  let streak = 0;
  const d = new Date();
  for (;;) {
    const iso = d.toISOString().slice(0, 10);
    if (set.has(iso)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

export const useAchievements = (opts: {
  readChaptersCount: number;
  implementedCount: number;
}) => {
  const [sessions, setSessions] = useState<string[]>(readSessions);
  const [totalSeconds, setTotalSeconds] = useState<number>(() => {
    return Number(localStorage.getItem(TIME_KEY) || "0");
  });
  const [seenBadges, setSeenBadges] = useState<Set<string> | null>(readSeenBadges);

  // Mark today as a session on mount
  useEffect(() => {
    const today = todayISO();
    setSessions((prev) => {
      if (prev.includes(today)) return prev;
      const next = [...prev, today].slice(-365); // keep 1 year
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Tick time spent every 30s while page is visible
  useEffect(() => {
    let timer: number | undefined;
    const start = () => {
      if (timer) return;
      timer = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          setTotalSeconds((prev) => {
            const next = prev + 30;
            localStorage.setItem(TIME_KEY, String(next));
            return next;
          });
        }
      }, 30_000);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    };
    start();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") start();
      else stop();
    });
    return stop;
  }, []);

  const streak = useMemo(() => computeStreak(sessions), [sessions]);

  const totalMinutes = Math.floor(totalSeconds / 60);

  // "This week" minutes — a fair estimate based on session days this week
  // (we don't track per-day time, so we attribute average minutes-per-session
  //  to days where the user actually opened the guidebook this week).
  const thisWeekMinutes = useMemo(() => {
    if (sessions.length === 0 || totalMinutes === 0) return 0;
    const d = new Date();
    const day = d.getDay(); // 0 Sun..6 Sat
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const cutoff = monday.toISOString().slice(0, 10);
    const daysThisWeek = sessions.filter((s) => s >= cutoff).length;
    if (daysThisWeek === 0) return 0;
    const avgPerSession = totalMinutes / sessions.length;
    return Math.round(avgPerSession * daysThisWeek);
  }, [sessions, totalMinutes]);

  const badges = useMemo(() => {
    const list: { id: string; label: string; earned: boolean; description: string }[] = [
      { id: "first-step", label: "First Step", earned: opts.readChaptersCount >= 1, description: "Read your first chapter" },
      { id: "explorer", label: "Explorer", earned: opts.readChaptersCount >= 5, description: "Read 5 chapters" },
      { id: "scholar", label: "Scholar", earned: opts.readChaptersCount >= 14, description: "Read every chapter" },
      { id: "implementer", label: "Implementer", earned: opts.implementedCount >= 5, description: "Implement 5 actions" },
      { id: "closer", label: "Closer", earned: opts.implementedCount >= 20, description: "Implement 20 actions" },
      { id: "streak-3", label: "On Fire", earned: streak >= 3, description: "3-day streak" },
      { id: "streak-7", label: "Dedicated", earned: streak >= 7, description: "7-day streak" },
    ];
    return list;
  }, [opts.readChaptersCount, opts.implementedCount, streak]);

  // First load ever (seenBadges still null): seed it with whatever's
  // already earned, silently — otherwise a returning user with 8 chapters
  // already read would see every one of those badges "unlock" the moment
  // this feature ships, which isn't what actually happened.
  useEffect(() => {
    if (seenBadges !== null) return;
    const initial = new Set(badges.filter((b) => b.earned).map((b) => b.id));
    localStorage.setItem(SEEN_BADGES_KEY, JSON.stringify([...initial]));
    setSeenBadges(initial);
  }, [seenBadges, badges]);

  // Badges are recomputed live every render, so "earned" alone can't tell
  // you whether this is the moment it happened or the hundredth time
  // you've revisited a page showing an already-old badge — seenBadges is
  // what distinguishes "just unlocked" from "already knew about this."
  const newlyUnlocked = useMemo(
    () => (seenBadges === null ? [] : badges.filter((b) => b.earned && !seenBadges.has(b.id))),
    [badges, seenBadges],
  );

  const acknowledge = useCallback((id: string) => {
    setSeenBadges((prev) => {
      const base = prev ?? new Set<string>();
      if (base.has(id)) return prev;
      const next = new Set(base).add(id);
      localStorage.setItem(SEEN_BADGES_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { streak, totalMinutes, thisWeekMinutes, badges, sessionCount: sessions.length, newlyUnlocked, acknowledge };
};
