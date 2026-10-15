// Shared sign-in + overlay-dismissal flow for the signed-in live smokes.
//
// Every signed-in browser smoke needs the same sequence: sign in through the
// gate (only when the gate actually shows — after a reload the session is
// restored from localStorage), wait for the gate to clear, then dismiss
// whatever overlays the app decides to show a signed-in account. The
// overlay list has already grown once without warning (the guided-tour
// offer appeared when the smoke account gained audit data and silently
// intercepted clicks in every smoke that hadn't copied the newest
// dismissal). Keeping the list HERE means the next overlay — a
// reactivation prompt, a what's-new dialog — is added in one place and
// every smoke inherits it.
//
// NOT for smokes that fabricate a session or pre-seed overlay-suppression
// storage keys (battleplan-smoke) or that assert a specific overlay's own
// behaviour (entry-paths-smoke's demo-tour leg) — those flows are custom on
// purpose.

/** Text the sign-in gate shows; hidden ⇔ the app considers us signed in. */
export const GATE_HEADING_TEXT = "What's your firm's real visibility score?";

// Overlays that can cover the app right after sign-in, in the order they
// tend to appear. Each entry is the accessible name of its dismiss button.
// ADD NEW OVERLAYS HERE — every smoke using this helper picks them up.
const OVERLAY_DISMISS_BUTTONS = [
  // PersonalizeOnboarding wizard: opens for accounts that haven't completed it.
  { name: "Skip for now", why: "PersonalizeOnboarding wizard" },
  // Guided-tour offer ("Your dashboard is ready"): opens once the account HAS
  // audit data; its backdrop intercepts sidebar clicks.
  { name: "Just explore", why: "guided-tour offer" },
];

/** Thrown when the gate never clears; carries any visible auth error text. */
export class SignInGateError extends Error {
  constructor(message, visibleError) {
    super(message);
    this.name = "SignInGateError";
    this.visibleError = visibleError ?? null;
  }
}

/**
 * Sign in through the gate when it shows, wait for it to clear, and dismiss
 * any post-sign-in overlays.
 *
 * @param {import("playwright-core").Page} page - already navigated to the app
 * @param {{ email: string, password: string }} creds
 * @param {{ gateTimeout?: number, overlayTimeout?: number,
 *           onSubmitted?: (via: "gate"|"restored-session") => void }} [opts]
 *   onSubmitted fires after the form is submitted (or the session was
 *   restored without needing the gate) — lets callers log a granular PASS.
 * @returns {Promise<{ signedInVia: "gate"|"restored-session",
 *                     dismissedOverlays: string[] }>}
 * @throws {SignInGateError} when the gate does not clear within gateTimeout.
 */
export async function signInAndDismissOverlays(page, { email, password }, opts = {}) {
  const { gateTimeout = 20000, overlayTimeout = 3000, onSubmitted } = opts;

  // Only sign in when the gate button actually shows — after a reload the
  // session is restored from localStorage and the gate may never render.
  const gateButton = page.getByRole("button", { name: /sign in \/ create account/i });
  const needsSignIn = await gateButton
    .waitFor({ state: "visible", timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  if (needsSignIn) {
    await gateButton.click();
    await page.getByPlaceholder("Work email").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.keyboard.press("Enter");
  }
  const signedInVia = needsSignIn ? "gate" : "restored-session";
  onSubmitted?.(signedInVia);

  // The gate must clear (the app considers us signed in).
  try {
    await page.getByText(GATE_HEADING_TEXT).waitFor({ state: "hidden", timeout: gateTimeout });
  } catch {
    const visibleError = await page
      .locator("text=/invalid|error|expired/i")
      .first()
      .textContent()
      .catch(() => null);
    throw new SignInGateError(
      `sign-in gate did not clear${visibleError ? ` (visible error: ${visibleError.trim()})` : ""}`,
      visibleError,
    );
  }

  // Dismiss each known overlay when it shows. Sequential on purpose: they
  // stack (wizard first, tour offer after), and each dismissal can reveal
  // the next.
  const dismissedOverlays = [];
  for (const { name } of OVERLAY_DISMISS_BUTTONS) {
    const dismiss = page.getByRole("button", { name });
    const showed = await dismiss
      .waitFor({ state: "visible", timeout: overlayTimeout })
      .then(() => true)
      .catch(() => false);
    if (showed) {
      await dismiss.click();
      dismissedOverlays.push(name);
    }
  }

  return { signedInVia, dismissedOverlays };
}
