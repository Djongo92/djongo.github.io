// The marketing site and the app are two artifacts on one origin: the app
// lives in an "app/" sub-path (BASE_URL) of wherever the site is served —
// "/app/" at a domain root, "/<repo>/app/" on a GitHub Pages project site.
// So "home" for anyone who arrived from the site — a demo visitor, most of
// all — is the app's parent path, not the app's own dashboard.
//
// Root-relative rather than absolute so this works unchanged across the dev
// preview, a deploy preview, and the published domain.
export const MARKETING_HOME = import.meta.env.BASE_URL.replace(/app\/?$/, "") || "/";

/** Leaves the app entirely and returns to the public site. */
export function goToMarketingHome() {
  window.location.href = MARKETING_HOME;
}
