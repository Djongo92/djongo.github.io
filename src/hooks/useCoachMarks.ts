import { useCallback, useState } from "react";

const KEY = "legalos_coachmarks_seen";

// Gates the first-open guided tour to once ever per browser — same
// localStorage-flag shape as guidebook_badges_seen. Deliberately simple:
// no per-step tracking, since re-showing a step a user already dismissed
// once (e.g. after a "reset" the app doesn't offer) isn't a real scenario.
export function useCoachMarks() {
  const [active, setActive] = useState(false);

  const hasSeen = useCallback((): boolean => localStorage.getItem(KEY) === "1", []);

  const start = useCallback(() => setActive(true), []);

  const finish = useCallback(() => {
    setActive(false);
    localStorage.setItem(KEY, "1");
  }, []);

  return { active, start, finish, hasSeen };
}
