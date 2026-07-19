import { useCallback, useEffect, useMemo, useState } from "react";

const SESSIONS_KEY = "guidebook_sessions"; // array of ISO date strings (one per day visited)
const TIME_KEY = "guidebook_time_seconds"; // total seconds spent

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

  return { streak, totalMinutes, thisWeekMinutes, badges, sessionCount: sessions.length };
};
