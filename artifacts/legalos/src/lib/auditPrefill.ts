// Cross-page prefill for the Market Visibility Score intake — used by the
// Recognition Index's "Claim your full score" CTA so clicking a firm's own
// name doesn't just land on a blank intake form after a real page
// navigation. sessionStorage (not the Workshop handoff mechanism, which is
// scoped to same-tab tool switches within the Workshop) survives the
// navigation from /recognition-index/:market to / within the same tab.
const KEY = "legalos:audit_prefill";

export interface AuditPrefill {
  displayName?: string;
  auditedDomain?: string;
  market?: string;
}

export function setAuditPrefill(prefill: AuditPrefill) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(prefill));
  } catch { /* ignore */ }
}

export function consumeAuditPrefill(): AuditPrefill | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as AuditPrefill;
  } catch {
    return null;
  }
}
