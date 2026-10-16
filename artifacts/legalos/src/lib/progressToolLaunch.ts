// Launch bus for the analysis tools embedded in the Progress page
// (RoastHomepage, CompetitorAnalysis, RoadmapGenerator, MarketVisibilityScore).
// Their open state is private to each component, so a deep link — currently
// the Battle Plan page's "Run it now" / "Rerun it" CTAs — can't just
// navigate to the section; it also has to tell the specific tool to open.
// Mirrors the Workshop's pending-tool handoff: a pending id survives the
// lazy mount, and already-mounted tools hear the launch event directly.
import { useEffect } from "react";

export type ProgressToolId = "roast" | "competitor" | "roadmap" | "visibilityScore";

let pending: ProgressToolId | null = null;
const listeners = new Set<(id: ProgressToolId) => void>();

/** Ask a Progress-page tool to open. Works whether the (lazy) Progress
 *  section is already mounted or still loading. */
export const launchProgressTool = (id: ProgressToolId): void => {
  pending = id;
  listeners.forEach((cb) => cb(id));
};

export const peekPendingProgressTool = (): ProgressToolId | null => pending;

export const clearPendingProgressTool = (): void => {
  pending = null;
};

/** Tool side: a Progress-page tool calls this with its id and its setOpen.
 *  Opens on a matching launch event, or immediately on mount if a launch is
 *  still pending (the Progress section lazy-loads, so CTAs can arrive
 *  before the tool exists). */
export const useAutoOpenTool = (id: ProgressToolId, setOpen: (open: boolean) => void): void => {
  useEffect(() => {
    if (peekPendingProgressTool() === id) {
      clearPendingProgressTool();
      setOpen(true);
    }
    const onLaunch = (launched: ProgressToolId) => {
      if (launched !== id) return;
      clearPendingProgressTool();
      setOpen(true);
    };
    listeners.add(onLaunch);
    return () => {
      listeners.delete(onLaunch);
    };
  }, [id, setOpen]);
};
