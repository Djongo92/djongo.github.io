// Name of the firm behind the currently-pinned consultant workspace — the
// same localStorage pin styleMemoryIdentity uses for edge-call identity —
// so Workshop output (deck builder preview + PPTX/PDF/PNG exports) brands
// itself for the firm the user is actually working on, not "Uvid".
import { useMemo } from "react";
import { useConsultantWorkspaces } from "./useConsultantWorkspaces";

export const ACTIVE_WORKSPACE_KEY = "legalos_active_workspace";

export function useActiveFirmName(): string | null {
  const { workspaces } = useConsultantWorkspaces();
  return useMemo(() => {
    if (workspaces.length === 0) return null; // anonymous or no membership → renderers' default
    let pinned: string | null = null;
    try {
      pinned = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    } catch { /* ignore */ }
    const match = pinned ? workspaces.find((w) => w.firmId === pinned) : undefined;
    return (match ?? workspaces[0]).firmName;
  }, [workspaces]);
}
