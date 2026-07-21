// Demo-mode bookkeeping, kept alongside demoMode.ts's own flag. Real signed-in
// sessions are tracked by supabase-js itself (see useAuth.ts) — this file no
// longer gates anything on its own, only demo mode still writes to it.
const KEY = "legalos_session_mode";

export type SessionMode = "demo" | "live";

export function getSessionMode(): SessionMode | null {
  const v = localStorage.getItem(KEY);
  return v === "demo" || v === "live" ? v : null;
}

export function setSessionMode(mode: SessionMode) {
  localStorage.setItem(KEY, mode);
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
