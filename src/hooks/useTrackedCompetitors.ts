import { useCallback, useEffect, useState } from "react";

export interface TrackedCompetitor {
  domain: string;
  displayName?: string;
}

const KEY = "legalos_tracked_competitors";
const MAX = 5;

const read = (): TrackedCompetitor[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TrackedCompetitor[]) : [];
  } catch {
    return [];
  }
};

const write = (list: TrackedCompetitor[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("competitors:update"));
};

const normalizeDomain = (input: string) =>
  input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

/**
 * Firms a user wants tracked alongside their own score. Purely a local
 * watchlist — comparison data comes from other firms' already-published
 * (is_public = true) audits, read directly via the public RLS policy, so
 * no new backend surface is needed.
 */
export const useTrackedCompetitors = () => {
  const [competitors, setCompetitors] = useState<TrackedCompetitor[]>(() => read());

  const refresh = useCallback(() => setCompetitors(read()), []);

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener("competitors:update", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("competitors:update", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refresh]);

  const add = useCallback((domainInput: string, displayName?: string) => {
    const domain = normalizeDomain(domainInput);
    if (!domain) return false;
    const current = read();
    if (current.length >= MAX || current.some((c) => c.domain === domain)) return false;
    write([...current, { domain, displayName: displayName?.trim() || undefined }]);
    return true;
  }, []);

  const remove = useCallback((domain: string) => {
    write(read().filter((c) => c.domain !== domain));
  }, []);

  return { competitors, add, remove, maxReached: competitors.length >= MAX, max: MAX };
};
