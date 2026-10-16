import type { WorkshopToolId } from "@/lib/handoff";

/**
 * Canonical label for every Workshop tool, keyed by id — single source of
 * truth for anything outside Workshop.tsx itself that needs to name a tool
 * (the command palette, the "jump back into your last tool" sidebar
 * shortcut) without importing the whole Workshop bundle just for strings.
 * Workshop.tsx's own TOOLS array sources its `title` field from here too,
 * so the two can't drift.
 */
export const WORKSHOP_TOOL_LABELS: Record<WorkshopToolId, string> = {
  swipe: "Swipe File",
  copywriter: "AI Copywriter",
  rewrite: "Rewrite Tool",
  autopsy: "Copy Autopsy",
  audit: "Practice Page Audit",
  headlines: "Headline Lab",
  teardown: "Competitor Teardown",
  deck: "Pitch Deck Drafter",
  deckroast: "Roast My Deck",
  bio: "Bio Rewriter",
  calendar: "12-Month Calendar",
};

export const WORKSHOP_TOOL_IDS = Object.keys(WORKSHOP_TOOL_LABELS) as WorkshopToolId[];
