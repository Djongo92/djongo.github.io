// The mocked "signed in" gate — separate from demo mode's own flag (which
// decides *which dataset* renders). This one decides whether the sign-in
// screen shows at all. Session persists across reloads until "Sign out" so
// a pitch demo survives an accidental refresh; explicit sign-out is what
// resets the front door for the next walkthrough.
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
