// Some firm sites answer only on the www host (or only the bare one) —
// try both before declaring the homepage unfetchable. Kept dependency-free
// so it can be unit-tested without the Deno/esm.sh module graph.
export function homepageVariants(normalizedUrl: string): string[] {
  return normalizedUrl.includes("://www.")
    ? [normalizedUrl, normalizedUrl.replace("://www.", "://")]
    : [normalizedUrl, normalizedUrl.replace("://", "://www.")];
}
