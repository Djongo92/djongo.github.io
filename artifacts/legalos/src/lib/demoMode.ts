// Demo mode: lets a first-time visitor preview the fully populated Command
// Center (sample audit, trend, workshop history, battle plan pieces)
// without weeks of real usage. Entirely local — never touches the real
// Supabase project, so it's safe to toggle on/off freely.
import { seedDemoData, clearDemoData } from "@/data/demoData";
import { setSessionMode, clearSession } from "@/lib/session";
import { goToMarketingHome } from "@/lib/marketingSite";
import { hasShowcaseGrant, clearShowcaseGrant } from "@/lib/demoAccess";

const KEY = "legalos_demo_mode";
// One-shot flag so Index.tsx knows to greet a *freshly entered* demo
// session with the onboarding wizard — sessionStorage rather than
// localStorage so it fires again each time someone re-enters demo mode
// (exit and click "See it with sample data" again) but not on every
// ordinary reload of an already-open demo tab.
const WIZARD_PENDING_KEY = "legalos_demo_wizard_pending";

export const isDemoMode = (): boolean => localStorage.getItem(KEY) === "1";

/** The showcase door, for sending an ungranted visitor to ask for access. */
export const SHOWCASE_GATE_PATH = `${import.meta.env.BASE_URL}demo`;

export function enableDemoMode() {
  // An ungranted visitor asked to see the demo. The honest answer is the door,
  // not silence — and not the showcase.
  if (!primeDemoMode()) {
    window.location.assign(SHOWCASE_GATE_PATH);
    return;
  }
  window.location.reload();
}

/**
 * Seeds demo state without navigating anywhere. Split out of enableDemoMode so
 * the /demo deep link (ShowcaseGate.tsx) can seed and then send the visitor on to
 * the dashboard, instead of reloading /demo into itself forever.
 *
 * Fails closed without a showcase grant, and returns whether it seeded.
 *
 * The check lives here, at the single function every entry point funnels
 * through, rather than at each call site. Call-site gating is the version that
 * rots: the next "just want to see it populated?" button someone adds inherits
 * this one, where it would have quietly reopened a per-call-site gate.
 */
export function primeDemoMode(): boolean {
  if (!hasShowcaseGrant()) return false;
  localStorage.setItem(KEY, "1");
  seedDemoData();
  setSessionMode("demo");
  sessionStorage.setItem(WIZARD_PENDING_KEY, "1");
  return true;
}

/**
 * Peek at the one-shot without spending it.
 *
 * Index.tsx decides whether this is a fresh demo entry well before it can act
 * on the answer — it first waits for the dashboard to actually render. Reading
 * destructively at decision time meant that if the wait was aborted in between
 * (a section change, a demo/auth flip), the flag was already gone and had
 * never been used, leaving that visitor with no onboarding at all and no way
 * to ask for it back.
 */
export function isDemoWizardPending(): boolean {
  return sessionStorage.getItem(WIZARD_PENDING_KEY) === "1";
}

export function consumeDemoWizardPending(): boolean {
  const pending = isDemoWizardPending();
  if (pending) sessionStorage.removeItem(WIZARD_PENDING_KEY);
  return pending;
}

/**
 * True only for the app's own demo entry URL — BASE_URL + "demo", with or
 * without a trailing slash.
 *
 * Deliberately an exact match rather than a "ends with /demo" test: this gates
 * a side effect that overwrites local state with fixtures, so it must not fire
 * on some unrelated route that happens to end in the same segment. Pure and
 * exported so the boundaries are covered by tests without a live document.
 */
export function isDemoEntryPath(pathname: string, base: string): boolean {
  const root = base && base.endsWith("/") ? base : `${base || ""}/`;
  const trimTrailing = (p: string) => p.replace(/\/+$/, "");
  return trimTrailing(pathname) === trimTrailing(`${root}demo`);
}

/**
 * Seeds demo mode from the URL *before* React mounts, when the visitor landed
 * on the /demo deep link.
 *
 * The obvious implementation — a /demo route that seeds state and then hard-
 * redirects — makes the visitor boot the whole app twice for one click, which
 * is the bulk of the wait crossing over from the marketing site. Doing it here
 * instead means the router never sees /demo at all: it sees the dashboard URL,
 * with the fixtures already in localStorage where app boot expects to find
 * them, and the app mounts exactly once.
 *
 * Must stay cheap and synchronous — this runs ahead of first paint on every
 * single load. It's a regex against the path plus, only on the demo entry
 * itself, a dozen localStorage writes.
 *
 * Only takes the fast path for a visitor already holding a grant. Checking an
 * access code costs a network round trip, which by definition can't finish
 * before first paint, so an ungranted arrival is left on /demo for the router
 * to hand to ShowcaseGate.
 */
export function primeDemoFromLocation(): boolean {
  if (typeof window === "undefined") return false;
  if (!isDemoEntryPath(window.location.pathname, import.meta.env.BASE_URL)) return false;
  if (!hasShowcaseGrant()) return false;

  if (!isDemoMode()) primeDemoMode();
  // Replace rather than push, so Back returns to the marketing site instead of
  // bouncing through the demo entry point again.
  window.history.replaceState(null, "", import.meta.env.BASE_URL);
  return true;
}

/**
 * Ends a showcase session whose grant is gone, before anything renders.
 *
 * Demo fixtures live in localStorage and so outlive the tab, while the grant
 * deliberately doesn't. Without this, "was granted once on this browser" would
 * quietly become "has the showcase forever", and the gate would only be a gate
 * for people who had never been through it. Returns whether it revoked.
 */
export function revokeUngrantedDemo(): boolean {
  if (typeof window === "undefined") return false;
  if (!isDemoMode() || hasShowcaseGrant()) return false;
  teardownDemo();
  return true;
}

/** Tears down every trace of the showcase, without deciding where to go next. */
function teardownDemo() {
  localStorage.removeItem(KEY);
  clearDemoData();
  clearSession();
  clearShowcaseGrant();
}

/**
 * Leaves the demo. A demo visitor came from the marketing site and has no
 * account, so dropping them on the app's sign-in wall is a dead end — send
 * them back where they came from.
 */
export function disableDemoMode() {
  teardownDemo();
  goToMarketingHome();
}

/**
 * Leaves the demo *towards* the product, for the visitor who has seen enough
 * and wants their own account. The sign-in wall is a dead end when we drop
 * someone on it, and the destination when they ask for it — same screen, and
 * the difference is entirely whose idea it was.
 *
 * A full document load rather than a client-side route change: demo fixtures
 * are read at boot in several places, so the cleanest guarantee that none of
 * them survive into a real session is to start a new one.
 */
export function exitDemoToApp() {
  teardownDemo();
  window.location.assign(import.meta.env.BASE_URL);
}

/**
 * Leaves the demo and reloads *the page the visitor is already on* — for
 * public surfaces (like the market visibility index) where the same URL
 * serves live data once the demo flag is gone. Going anywhere else (the
 * app root, the marketing home) would strand the visitor off the page they
 * explicitly asked to see the real version of.
 */
export function exitDemoInPlace() {
  teardownDemo();
  window.location.reload();
}
