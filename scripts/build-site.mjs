#!/usr/bin/env node
// Builds the deployable static site into ./site-dist:
//   /            marketing site (artifacts/legalos-marketing)
//   /app/        the web app    (artifacts/legalos)
//   /404.html    the app shell, so deep links into /app/… survive a hard refresh
//
// SITE_BASE is the path the site is served from: "/" on Vercel or a custom
// domain, "/djongo.github.io/" on this repo's GitHub Pages project site.
// Everything dynamic lives in Supabase (edge functions + Postgres), so the
// output is plain static files — no server to host.
//
// Usage: SITE_BASE=/djongo.github.io/ node scripts/build-site.mjs
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "site-dist");

export function normalizeBase(raw) {
  const trimmed = String(raw ?? "/").trim() || "/";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}/`.replace(/^\/\/$/, "/");
}

/**
 * The generated static pages (benchmarks, guidebook excerpts) are written
 * with root-absolute links. Under a sub-path base, prefix every
 * root-absolute href/src/url() so they keep resolving. Protocol-relative
 * ("//host") URLs are left alone.
 */
export function prefixRootPaths(html, base) {
  if (base === "/") return html;
  const prefix = base.replace(/\/$/, "");
  return html
    .replace(/\b(href|src|content)="\/(?!\/)/g, `$1="${prefix}/`)
    .replace(/url\((['"]?)\/(?!\/)/g, `url($1${prefix}/`);
}

function run(cmd, env = {}) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...env } });
}

function htmlFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return htmlFiles(p);
    return name.endsWith(".html") ? [p] : [];
  });
}

function main() {
  const base = normalizeBase(process.env.SITE_BASE);
  console.log(`Building site for base ${base}`);

  run("pnpm --filter @workspace/uvid-marketing run build", { BASE_PATH: base });
  run("pnpm --filter @workspace/uvid run build", { BASE_PATH: `${base}app/` });

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  cpSync(join(ROOT, "artifacts/legalos-marketing/dist/public"), OUT, { recursive: true });
  cpSync(join(ROOT, "artifacts/legalos/dist/public"), join(OUT, "app"), { recursive: true });
  // The app's own 404.html is a root-level redirect meant for a different
  // layout; the site-wide fallback below replaces it.
  rmSync(join(OUT, "app", "404.html"), { force: true });

  for (const dir of ["benchmarks", "guidebook"]) {
    for (const file of htmlFiles(join(OUT, dir))) {
      writeFileSync(file, prefixRootPaths(readFileSync(file, "utf8"), base));
    }
  }

  // Static hosts serve /404.html for any unknown path: hand it the app shell
  // so /app/<route> deep links boot the SPA, whose router renders its own
  // not-found page for anything it doesn't know.
  cpSync(join(OUT, "app", "index.html"), join(OUT, "404.html"));
  writeFileSync(join(OUT, ".nojekyll"), "");
  console.log(`Site written to ${OUT}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
