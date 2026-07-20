// Demo mode: lets a first-time visitor preview the fully populated Command
// Center (sample audit, trend, workshop history, battle plan pieces)
// without weeks of real usage. Entirely local — never touches the real
// Supabase project, so it's safe to toggle on/off freely.
import { seedDemoData, clearDemoData } from "@/data/demoData";
import { setSessionMode, clearSession } from "@/lib/session";

const KEY = "legalos_demo_mode";

export const isDemoMode = (): boolean => localStorage.getItem(KEY) === "1";

export function enableDemoMode() {
  localStorage.setItem(KEY, "1");
  seedDemoData();
  setSessionMode("demo");
  window.location.reload();
}

export function disableDemoMode() {
  localStorage.removeItem(KEY);
  clearDemoData();
  clearSession();
  window.location.reload();
}
