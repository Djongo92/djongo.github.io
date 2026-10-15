/**
 * Site-absolute path under the deploy base. The marketing site and the app
 * share one origin — at the root on a custom domain or Vercel, or under a
 * project subpath on GitHub Pages — so every internal link goes through
 * here instead of hardcoding "/".
 */
export function site(path: string): string {
  if (!path.startsWith("/")) return path;
  return import.meta.env.BASE_URL.replace(/\/$/, "") + path;
}
