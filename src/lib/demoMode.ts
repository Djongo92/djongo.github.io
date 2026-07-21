// Demo mode: lets a first-time visitor preview the fully populated Command
// Center (sample audit, trend, workshop history, battle plan pieces)
// without weeks of real usage. Entirely local — never touches the real
// Supabase project, so it's safe to toggle on/off freely.
import { seedDemoData, clearDemoData } from "@/data/demoData";
import { setSessionMode, clearSession } from "@/lib/session";

const KEY = "legalos_demo_mode";
// One-shot flag so Index.tsx knows to greet a *freshly entered* demo
// session with the onboarding wizard — sessionStorage rather than
// localStorage so it fires again each time someone re-enters demo mode
// (exit and click "See it with sample data" again) but not on every
// ordinary reload of an already-open demo tab.
const WIZARD_PENDING_KEY = "legalos_demo_wizard_pending";

export const isDemoMode = (): boolean => localStorage.getItem(KEY) === "1";

export function enableDemoMode() {
  localStorage.setItem(KEY, "1");
  seedDemoData();
  setSessionMode("demo");
  sessionStorage.setItem(WIZARD_PENDING_KEY, "1");
  window.location.reload();
}

export function consumeDemoWizardPending(): boolean {
  const pending = sessionStorage.getItem(WIZARD_PENDING_KEY) === "1";
  if (pending) sessionStorage.removeItem(WIZARD_PENDING_KEY);
  return pending;
}

export function disableDemoMode() {
  localStorage.removeItem(KEY);
  clearDemoData();
  clearSession();
  window.location.reload();
}
