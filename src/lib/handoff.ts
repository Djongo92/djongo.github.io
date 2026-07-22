/**
 * Cross-tool handoff: pass a payload from one Workshop tool into another.
 * Mechanism: sessionStorage + a custom event that Workshop listens to and
 * uses to switch the active tool. The receiving tool consumes the payload
 * via `useHandoffReceive` on mount and immediately clears it.
 */
import { useEffect } from "react";

export type HandoffPayload =
  | { kind: "text"; text: string; source?: string; title?: string }
  | { kind: "url"; url: string; source?: string; title?: string };

const KEY = (toolId: string) => `workshop:handoff:${toolId}`;

export type WorkshopToolId =
  | "swipe" | "copywriter" | "rewrite" | "autopsy" | "audit"
  | "headlines" | "teardown" | "deck" | "bio" | "calendar" | "deckroast";

/** Compatibility map: which destinations can receive which payload kinds. */
export const HANDOFF_TARGETS: { id: WorkshopToolId; label: string; accepts: HandoffPayload["kind"][] }[] = [
  { id: "rewrite",    label: "Rewrite Tool",         accepts: ["text"] },
  { id: "autopsy",    label: "Copy Autopsy",         accepts: ["text"] },
  { id: "headlines",  label: "Headline Lab",         accepts: ["text"] },
  { id: "bio",        label: "Bio Rewriter",         accepts: ["text"] },
  { id: "copywriter", label: "AI Copywriter",        accepts: ["text"] },
  { id: "audit",      label: "Practice Page Audit",  accepts: ["url"] },
  { id: "teardown",   label: "Competitor Teardown",  accepts: ["url", "text"] },
];

export function sendTo(toolId: WorkshopToolId, payload: HandoffPayload) {
  try {
    sessionStorage.setItem(KEY(toolId), JSON.stringify(payload));
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent("workshop:switch-tool", { detail: { toolId } }));
}

export function consumeHandoff(toolId: WorkshopToolId): HandoffPayload | null {
  try {
    const raw = sessionStorage.getItem(KEY(toolId));
    if (!raw) return null;
    sessionStorage.removeItem(KEY(toolId));
    return JSON.parse(raw) as HandoffPayload;
  } catch { return null; }
}

/** Hook for receiving tools — fires the callback once on mount if a payload is waiting. */
export function useHandoffReceive(toolId: WorkshopToolId, onReceive: (p: HandoffPayload) => void) {
  useEffect(() => {
    const p = consumeHandoff(toolId);
    if (p) onReceive(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId]);
}