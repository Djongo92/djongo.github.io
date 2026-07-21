// Central registry of every localStorage key this app writes for a given
// browser, plus the export/clear operations Settings exposes. New
// per-browser state should be added to LOCAL_DATA_KEYS so it participates
// in both — this list is intentionally the one place that has to know
// about every hook's storage key.
export const LOCAL_DATA_KEYS = [
  "guidebook_firm_context",
  "guidebook_reading_progress",
  "guidebook_last_read",
  "guidebook_bookmarks",
  "guidebook_checklists",
  "guidebook_annotations",
  "guidebook_implementation",
  "workshop_run_history",
  "guidebook_battleplan_roast",
  "guidebook_battleplan_competitor",
  "guidebook_battleplan_roadmap",
  "guidebook_battleplan_maturity",
  "guidebook_battleplan_headline",
  "guidebook_battleplan_bio",
  "guidebook_battleplan_visibility",
  "legalos_score_goals",
  "legalos_tracked_competitors",
];

export function buildExportBundle(): Record<string, unknown> {
  const bundle: Record<string, unknown> = { exportedAt: new Date().toISOString() };
  for (const key of LOCAL_DATA_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      bundle[key] = JSON.parse(raw);
    } catch {
      bundle[key] = raw;
    }
  }
  return bundle;
}

export function downloadExportBundle() {
  const bundle = buildExportBundle();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `legalos-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Clears everything gathered by the guidebook/workshop/battle-plan/goals/
 * competitors hooks. Deliberately does NOT touch legalos_session_mode,
 * legalos_demo_mode, or legalos_client_id — this is "clear my local
 * activity," not "sign out," and it can't delete a previously-published
 * audit row from the server (writes there are service_role-only; that
 * would need its own delete flow, out of scope for this pass).
 */
export function clearAllLocalData() {
  for (const key of LOCAL_DATA_KEYS) localStorage.removeItem(key);
  window.dispatchEvent(new Event("battleplan:update"));
  window.dispatchEvent(new Event("workshop:history-update"));
  window.dispatchEvent(new Event("score-goals:update"));
  window.dispatchEvent(new Event("competitors:update"));
}
