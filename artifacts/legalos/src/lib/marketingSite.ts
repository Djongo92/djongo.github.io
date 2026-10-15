// The marketing site and the app are two artifacts on one origin: the site is
// served from the root, the app from a sub-path (BASE_URL, "/app/"). So "home"
// for anyone who arrived from the site — a demo visitor, most of all — is the
// origin root, not the app's own dashboard.
//
// Root-relative rather than absolute so this works unchanged across the dev
// preview, a deploy preview, and the published domain.
export const MARKETING_HOME = "/";

/** Leaves the app entirely and returns to the public site. */
export function goToMarketingHome() {
  window.location.href = MARKETING_HOME;
}
